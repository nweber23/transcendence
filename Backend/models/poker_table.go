package models

import (
	"time"

	"github.com/shopspring/decimal"
)

// PokerTable is the persisted configuration and lifecycle state of a poker
// table — the live seats/hand/turn-timer state lives only in memory (see
// ws.PokerTable), so this row is deliberately just what needs to survive a
// restart or be queried from a lobby listing.
type PokerTable struct {
	ID         uint            `gorm:"primaryKey"`
	HostUserID uint            `gorm:"index"`
	Name       string          `gorm:"type:varchar(64)"`
	Status     string          `gorm:"type:varchar(20);index;default:'open'"`
	IsPrivate  bool            `gorm:"default:false"`
	MaxSeats   int             `gorm:"default:6"`
	BuyIn      decimal.Decimal `gorm:"type:numeric(19,2)"`
	SmallBlind decimal.Decimal `gorm:"type:numeric(19,2)"`
	BigBlind   decimal.Decimal `gorm:"type:numeric(19,2)"`
	CreatedAt  time.Time
	ClosedAt   *time.Time
}

func (PokerTable) TableName() string {
	return "poker_tables"
}

const (
	PokerTableStatusOpen   = "open"
	PokerTableStatusClosed = "closed"

	PokerTableMinSeats = 2
	PokerTableMaxSeats = 9
)

// PokerTableInvite grants UserID access to a private PokerTableID — for
// both taking a seat and spectating (the same gate covers both).
type PokerTableInvite struct {
	ID           uint `gorm:"primaryKey"`
	PokerTableID uint `gorm:"uniqueIndex:idx_poker_table_invite_binding"`
	UserID       uint `gorm:"uniqueIndex:idx_poker_table_invite_binding"`
	CreatedAt    time.Time
}

func (PokerTableInvite) TableName() string {
	return "poker_table_invites"
}
