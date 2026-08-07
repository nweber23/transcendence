package services

import (
	"errors"
	"fmt"
	"time"

	"transcendence/models"
	"transcendence/utils"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PokerTableService struct {
	db *gorm.DB
}

func NewPokerTableService(db *gorm.DB) *PokerTableService {
	return &PokerTableService{db: db}
}

// ValidateSettings applies the same rules at creation and at update time:
// buy-in/blinds must be positive whole numbers (the in-memory runtime only
// ever deals in int64 chips, so a fractional amount is rejected outright
// rather than silently truncated), small blind must be less than big blind,
// and max seats must fall within the app-level bound. Exported so the
// handler can validate a settings change before asking the ws layer to
// apply it, without duplicating these rules.
func (s *PokerTableService) ValidateSettings(maxSeats int, buyIn, smallBlind, bigBlind decimal.Decimal) error {
	if maxSeats < models.PokerTableMinSeats || maxSeats > models.PokerTableMaxSeats {
		return utils.ErrPokerInvalidSeatCount
	}
	for _, amount := range []decimal.Decimal{buyIn, smallBlind, bigBlind} {
		if amount.LessThanOrEqual(decimal.Zero) {
			return utils.ErrAmountNotPositive
		}
		if !amount.Equal(amount.Truncate(0)) {
			return utils.ErrPokerFractionalAmount
		}
	}
	if !smallBlind.LessThan(bigBlind) {
		return utils.ErrPokerInvalidBlinds
	}
	return nil
}

// CreateTable validates and persists a new open poker table.
func (s *PokerTableService) CreateTable(
	hostUserID uint,
	name string,
	isPrivate bool,
	maxSeats int,
	buyIn, smallBlind, bigBlind decimal.Decimal,
) (*models.PokerTable, error) {
	if err := s.ValidateSettings(maxSeats, buyIn, smallBlind, bigBlind); err != nil {
		return nil, err
	}
	table := &models.PokerTable{
		HostUserID: hostUserID,
		Name:       name,
		Status:     models.PokerTableStatusOpen,
		IsPrivate:  isPrivate,
		MaxSeats:   maxSeats,
		BuyIn:      buyIn,
		SmallBlind: smallBlind,
		BigBlind:   bigBlind,
	}
	if err := s.db.Create(table).Error; err != nil {
		return nil, fmt.Errorf("failed to create poker table: %w", err)
	}
	return table, nil
}

// GetTable returns the row regardless of access — used internally and by
// host-authorized callers that already know they're allowed to see it.
func (s *PokerTableService) GetTable(tableID uint) (*models.PokerTable, error) {
	var table models.PokerTable
	if err := s.db.First(&table, "id = ?", tableID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, utils.ErrPokerTableNotFound
		}
		return nil, fmt.Errorf("failed to fetch poker table: %w", err)
	}
	return &table, nil
}

// CanAccess is the single source of truth for "may userID join or spectate
// tableID": the table must be open, and if private, userID must be the
// host or hold an invite. Called from both the REST GetTable handler and
// the ws layer's pokerJoin/pokerSpectate/pokerSync.
func (s *PokerTableService) CanAccess(tableID, userID uint) (*models.PokerTable, error) {
	table, err := s.GetTable(tableID)
	if err != nil {
		return nil, err
	}
	if table.Status != models.PokerTableStatusOpen {
		return nil, utils.ErrPokerTableClosed
	}
	if !table.IsPrivate || table.HostUserID == userID {
		return table, nil
	}
	var invite models.PokerTableInvite
	err = s.db.First(&invite, "poker_table_id = ? AND user_id = ?", tableID, userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, utils.ErrPokerTableAccessDenied
	}
	if err != nil {
		return nil, fmt.Errorf("failed to check poker table invite: %w", err)
	}
	return table, nil
}

// IsInvited reports whether userID holds an invite to tableID, independent
// of the table's current status/privacy — used when a table is flipped
// public-to-private and existing spectators need to be re-checked before
// the DB row's is_private column has necessarily caught up with the
// in-memory table that's applying the change.
func (s *PokerTableService) IsInvited(tableID, userID uint) (bool, error) {
	var invite models.PokerTableInvite
	err := s.db.First(&invite, "poker_table_id = ? AND user_id = ?", tableID, userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to check poker table invite: %w", err)
	}
	return true, nil
}

// RequireHost loads the table and confirms hostUserID is its host. Shared
// by every host-only mutation.
func (s *PokerTableService) RequireHost(hostUserID, tableID uint) (*models.PokerTable, error) {
	table, err := s.GetTable(tableID)
	if err != nil {
		return nil, err
	}
	if table.HostUserID != hostUserID {
		return nil, utils.ErrPokerNotTableHost
	}
	return table, nil
}

// UpdateSettings persists new settings for a table the caller has already
// confirmed is host-owned. The handler always calls this only with the
// buy-in/blinds/max-seats values that ws.WebSocketState.PokerUpdateSettings
// actually applied to the live table (it may have rejected a resize if
// seats were occupied at apply time) — this method itself has no way to
// know the live seat count, so it trusts the caller for those three fields.
func (s *PokerTableService) UpdateSettings(
	hostUserID, tableID uint,
	name string,
	isPrivate bool,
	maxSeats int,
	buyIn, smallBlind, bigBlind decimal.Decimal,
) (*models.PokerTable, error) {
	table, err := s.RequireHost(hostUserID, tableID)
	if err != nil {
		return nil, err
	}
	if err := s.ValidateSettings(maxSeats, buyIn, smallBlind, bigBlind); err != nil {
		return nil, err
	}
	table.Name = name
	table.IsPrivate = isPrivate
	table.MaxSeats = maxSeats
	table.BuyIn = buyIn
	table.SmallBlind = smallBlind
	table.BigBlind = bigBlind
	if err := s.db.Save(table).Error; err != nil {
		return nil, fmt.Errorf("failed to update poker table: %w", err)
	}
	return table, nil
}

// CloseTable marks the table closed, guarded by a row lock (mirrors
// GameService.lockAccount) so two concurrent close requests can't both
// succeed.
func (s *PokerTableService) CloseTable(hostUserID, tableID uint) (*models.PokerTable, error) {
	var table *models.PokerTable
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var row models.PokerTable
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&row, "id = ?", tableID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return utils.ErrPokerTableNotFound
			}
			return fmt.Errorf("failed to fetch poker table: %w", err)
		}
		if row.HostUserID != hostUserID {
			return utils.ErrPokerNotTableHost
		}
		if row.Status != models.PokerTableStatusOpen {
			return utils.ErrPokerTableClosed
		}
		now := time.Now()
		row.Status = models.PokerTableStatusClosed
		row.ClosedAt = &now
		if err := tx.Save(&row).Error; err != nil {
			return fmt.Errorf("failed to close poker table: %w", err)
		}
		table = &row
		return nil
	})
	if err != nil {
		return nil, err
	}
	return table, nil
}

// MarkClosed is the system-initiated counterpart to CloseTable — used by
// the abandoned-table garbage collector, which has no host to authorize
// against.
func (s *PokerTableService) MarkClosed(tableID uint) error {
	now := time.Now()
	return s.db.Model(&models.PokerTable{}).Where("id = ? AND status = ?", tableID, models.PokerTableStatusOpen).
		Updates(map[string]interface{}{"status": models.PokerTableStatusClosed, "closed_at": now}).Error
}

// CloseStaleOpenTables closes every table still marked "open" in the DB.
// Seat/hand state only ever lives in the ws package's in-memory registry —
// it's never persisted — so any table that was open when the process last
// stopped is unrecoverable: there's no live runtime to reattach to it. Call
// this once at startup, before the registry starts accepting new tables,
// so a restart can't leave permanently unjoinable rows sitting in every
// user's lobby listing forever.
func (s *PokerTableService) CloseStaleOpenTables() error {
	now := time.Now()
	return s.db.Model(&models.PokerTable{}).Where("status = ?", models.PokerTableStatusOpen).
		Updates(map[string]interface{}{"status": models.PokerTableStatusClosed, "closed_at": now}).Error
}

// Invite grants tableID access to inviteeUserID. Idempotent — a duplicate
// invite is a no-op success, not an error, thanks to the unique index on
// (poker_table_id, user_id).
func (s *PokerTableService) Invite(hostUserID, tableID, inviteeUserID uint) (*models.PokerTableInvite, error) {
	if _, err := s.RequireHost(hostUserID, tableID); err != nil {
		return nil, err
	}
	invite := &models.PokerTableInvite{PokerTableID: tableID, UserID: inviteeUserID}
	if err := s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(invite).Error; err != nil {
		return nil, fmt.Errorf("failed to create poker table invite: %w", err)
	}
	if invite.ID == 0 {
		if err := s.db.First(invite, "poker_table_id = ? AND user_id = ?", tableID, inviteeUserID).Error; err != nil {
			return nil, fmt.Errorf("failed to fetch existing poker table invite: %w", err)
		}
	}
	return invite, nil
}

// ListTables returns open tables userID may see — public ones, tables they
// host, and tables they're invited to — most recent first.
func (s *PokerTableService) ListTables(userID uint, limit, offset int) ([]models.PokerTable, int64, error) {
	var tables []models.PokerTable
	var total int64

	visible := s.db.Model(&models.PokerTable{}).Where("status = ?", models.PokerTableStatusOpen).
		Where(
			"is_private = ? OR host_user_id = ? OR id IN (?)",
			false, userID,
			s.db.Model(&models.PokerTableInvite{}).Select("poker_table_id").Where("user_id = ?", userID),
		)

	if err := visible.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count poker tables: %w", err)
	}
	if err := visible.Session(&gorm.Session{}).Order("created_at DESC").Limit(limit).Offset(offset).Find(&tables).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to fetch poker tables: %w", err)
	}
	return tables, total, nil
}
