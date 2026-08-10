package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"transcendence/models"
	"transcendence/utils"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// The engine only ships one slot machine configuration right now.
const SlotsConfigName = "lucky-sevens"

type GameService struct {
	db            *gorm.DB
	engineService *EngineService
}

func NewGameService(db *gorm.DB, engineService *EngineService) *GameService {
	return &GameService{db: db, engineService: engineService}
}

// MARK: shared ledger helpers

// debitBet deducts a bet from the account and records it as its own
// transaction so BalanceAfter reflects the balance at that point in time.
func (gs *GameService) debitBet(tx *gorm.DB, account *models.Account, gameID uint, gameType string, bet decimal.Decimal) error {
	account.Balance = account.Balance.Sub(bet)
	account.TotalWagered = account.TotalWagered.Add(bet)
	if err := tx.Model(account).Updates(map[string]interface{}{
		"balance":       account.Balance,
		"total_wagered": account.TotalWagered,
	}).Error; err != nil {
		return fmt.Errorf("failed to update account balance: %w", err)
	}
	transaction := &models.Transaction{
		AccountID:    account.ID,
		Type:         models.TransactionTypeBet,
		Amount:       bet,
		Status:       models.TransactionStatusCompleted,
		BalanceAfter: account.Balance,
		Metadata:     []byte(fmt.Sprintf(`{"game_type": "%s", "game_id": %d}`, gameType, gameID)),
	}
	if err := tx.Create(transaction).Error; err != nil {
		return fmt.Errorf("failed to create bet transaction: %w", err)
	}
	return nil
}

// creditPayout applies the result of a settled bet — a win adds the payout
// and records a win transaction, a loss just updates the running total.
func (gs *GameService) creditPayout(tx *gorm.DB, account *models.Account, gameID uint, bet decimal.Decimal, payout decimal.Decimal, action string) error {
	if payout.GreaterThan(decimal.Zero) {
		account.Balance = account.Balance.Add(payout)
		account.TotalWon = account.TotalWon.Add(payout)
	} else {
		account.TotalLost = account.TotalLost.Add(bet)
	}
	if err := tx.Model(account).Updates(map[string]interface{}{
		"balance":    account.Balance,
		"total_won":  account.TotalWon,
		"total_lost": account.TotalLost,
	}).Error; err != nil {
		return fmt.Errorf("failed to update account balance: %w", err)
	}
	if payout.GreaterThan(decimal.Zero) {
		transaction := &models.Transaction{
			AccountID:    account.ID,
			Type:         models.TransactionTypeWin,
			Amount:       payout,
			Status:       models.TransactionStatusCompleted,
			BalanceAfter: account.Balance,
			Metadata:     []byte(fmt.Sprintf(`{"action": "%s", "game_id": %d}`, action, gameID)),
		}
		if err := tx.Create(transaction).Error; err != nil {
			return fmt.Errorf("failed to create win transaction: %w", err)
		}
	}
	return nil
}

func (gs *GameService) lockAccount(tx *gorm.DB, userID uint) (*models.Account, error) {
	var account models.Account
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&account, "user_id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, utils.ErrAccountNotFound
		}
		return nil, fmt.Errorf("failed to fetch account: %w", err)
	}
	return &account, nil
}

// MARK: Blackjack

func blackjackPayoutMultiplier(outcome string) decimal.Decimal {
	switch outcome {
	case "player_blackjack":
		return decimal.NewFromFloat(2.5)
	case "player_win":
		return decimal.NewFromInt(2)
	case "push":
		return decimal.NewFromInt(1)
	default: // "dealer_win"
		return decimal.Zero
	}
}

func blackjackResult(state BlackjackEngineGameState) string {
	if state.Phase != "settled" {
		return ""
	}
	switch state.Outcome {
	case "player_blackjack":
		return "blackjack"
	case "player_win":
		return "win"
	case "push":
		return "push"
	default:
		if state.PlayerValue > 21 {
			return "bust"
		}
		return "loss"
	}
}

func blackjackGameFields(gameID uint, state BlackjackEngineGameState) (*models.BlackjackGame, error) {
	playerCards, err := json.Marshal(state.PlayerCards)
	if err != nil {
		return nil, fmt.Errorf("failed to encode player hand: %w", err)
	}
	dealerCards, err := json.Marshal(state.DealerCards)
	if err != nil {
		return nil, fmt.Errorf("failed to encode dealer hand: %w", err)
	}
	playerValue := int(state.PlayerValue)
	dealerValue := int(state.DealerValue)
	return &models.BlackjackGame{
		GameID:      gameID,
		PlayerHand:  playerCards,
		DealerHand:  dealerCards,
		PlayerScore: &playerValue,
		DealerScore: &dealerValue,
		Result:      blackjackResult(state),
	}, nil
}

// settleBlackjack finalizes a completed hand: computes the payout from the
// engine's outcome, closes out the game row, and credits the account.
func (gs *GameService) settleBlackjack(tx *gorm.DB, game *models.Game, account *models.Account, state BlackjackEngineGameState, action string) error {
	payout := game.InitialBet.Mul(blackjackPayoutMultiplier(state.Outcome))
	now := time.Now()
	game.Status = models.GameStatusCompleted
	game.Winnings = payout
	game.CompletedAt = &now
	game.EngineGameID = nil
	if err := tx.Model(game).Updates(map[string]interface{}{
		"status":         game.Status,
		"winnings":       game.Winnings,
		"completed_at":   game.CompletedAt,
		"engine_game_id": nil,
	}).Error; err != nil {
		return fmt.Errorf("failed to update game: %w", err)
	}
	return gs.creditPayout(tx, account, game.ID, game.InitialBet, payout, action)
}

// CreateBlackjackGame deals a fresh hand against the engine, deducting the
// bet immediately. A natural blackjack settles in the same call.
func (gs *GameService) CreateBlackjackGame(userID uint, bet decimal.Decimal) (*models.Game, error) {
	if bet.LessThanOrEqual(decimal.Zero) {
		return nil, utils.ErrAmountNotPositive
	}
	var game *models.Game
	err := gs.db.Transaction(func(tx *gorm.DB) error {
		account, err := gs.lockAccount(tx, userID)
		if err != nil {
			return err
		}
		if account.Balance.LessThan(bet) {
			return utils.ErrInsufficientBalance
		}

		engineGame, err := gs.engineService.CreateBlackjackGame(bet.IntPart())
		if err != nil {
			return fmt.Errorf("engine failed to deal blackjack: %w", err)
		}
		state := engineGame.State()

		game = &models.Game{
			UserID:       userID,
			GameType:     models.GameTypeBlackjack,
			Status:       models.GameStatusInProgress,
			InitialBet:   bet,
			Winnings:     decimal.Zero,
			EngineGameID: &engineGame.ID,
		}
		if err := tx.Create(game).Error; err != nil {
			return fmt.Errorf("failed to create game: %w", err)
		}

		blackjackRow, err := blackjackGameFields(game.ID, state)
		if err != nil {
			return err
		}
		if err := tx.Create(blackjackRow).Error; err != nil {
			return fmt.Errorf("failed to create blackjack game row: %w", err)
		}

		if err := gs.debitBet(tx, account, game.ID, models.GameTypeBlackjack, bet); err != nil {
			return err
		}

		if state.Phase == "settled" {
			return gs.settleBlackjack(tx, game, account, state, "deal")
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return game, nil
}

// ExecuteBlackjackAction plays a hit or stand against the engine and
// settles the game if that ends the hand.
func (gs *GameService) ExecuteBlackjackAction(userID uint, gameID uint, action string) (*models.Game, error) {
	if action != "hit" && action != "stand" {
		return nil, utils.ErrInvalidPlayAction
	}
	var game models.Game
	err := gs.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&game, "id = ? AND user_id = ? AND game_type = ?", gameID, userID, models.GameTypeBlackjack).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return utils.ErrGameNotFound
			}
			return fmt.Errorf("failed to fetch game: %w", err)
		}
		if game.Status != models.GameStatusInProgress || game.EngineGameID == nil {
			return fmt.Errorf("game is not in progress (status: %s)", game.Status)
		}

		state, err := gs.engineService.PlayBlackjack(*game.EngineGameID, action)
		if err != nil {
			return fmt.Errorf("engine action failed: %w", err)
		}

		blackjackRow, err := blackjackGameFields(game.ID, *state)
		if err != nil {
			return err
		}
		if err := tx.Model(&models.BlackjackGame{}).Where("game_id = ?", game.ID).Updates(blackjackRow).Error; err != nil {
			return fmt.Errorf("failed to update blackjack game row: %w", err)
		}

		if state.Phase != "settled" {
			return nil
		}

		account, err := gs.lockAccount(tx, userID)
		if err != nil {
			return err
		}
		return gs.settleBlackjack(tx, &game, account, *state, action)
	})
	if err != nil {
		return nil, err
	}
	return &game, nil
}

func (gs *GameService) GetBlackjackDetail(gameID uint) (*models.BlackjackGame, error) {
	var detail models.BlackjackGame
	if err := gs.db.Where("game_id = ?", gameID).First(&detail).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, utils.ErrGameNotFound
		}
		return nil, fmt.Errorf("failed to fetch blackjack detail: %w", err)
	}
	return &detail, nil
}

// MARK: Slots

// CreateSlotsGame spins the reels for betPerLine across the given number of
// lines. Unlike blackjack, a spin is a single atomic RPC — there is no
// in-progress state to resume, so the game is created already completed.
func (gs *GameService) CreateSlotsGame(userID uint, betPerLine decimal.Decimal, lines int) (*models.Game, error) {
	if betPerLine.LessThanOrEqual(decimal.Zero) {
		return nil, utils.ErrAmountNotPositive
	}
	if lines <= 0 {
		return nil, utils.ErrInvalidLineCount
	}
	totalBet := betPerLine.Mul(decimal.NewFromInt(int64(lines)))

	var game *models.Game
	err := gs.db.Transaction(func(tx *gorm.DB) error {
		account, err := gs.lockAccount(tx, userID)
		if err != nil {
			return err
		}
		if account.Balance.LessThan(totalBet) {
			return utils.ErrInsufficientBalance
		}

		result, err := gs.engineService.SpinSlots(SlotsConfigName, uint8(lines), uint32(betPerLine.IntPart()))
		if err != nil {
			return fmt.Errorf("engine failed to spin: %w", err)
		}
		payout := decimal.NewFromInt(int64(result.TotalOverallWin))

		now := time.Now()
		game = &models.Game{
			UserID:      userID,
			GameType:    models.GameTypeSlots,
			Status:      models.GameStatusCompleted,
			InitialBet:  totalBet,
			Winnings:    payout,
			CompletedAt: &now,
		}
		if err := tx.Create(game).Error; err != nil {
			return fmt.Errorf("failed to create game: %w", err)
		}

		timeline, err := json.Marshal(result.Timeline)
		if err != nil {
			return fmt.Errorf("failed to encode spin timeline: %w", err)
		}
		slotsRow := &models.SlotsGame{
			GameID:           game.ID,
			Reels:            timeline,
			PaylineResult:    result.GameName,
			Multiplier:       lines,
			IsBonusTriggered: result.BonusTriggered,
		}
		if err := tx.Create(slotsRow).Error; err != nil {
			return fmt.Errorf("failed to create slots game row: %w", err)
		}

		if err := gs.debitBet(tx, account, game.ID, models.GameTypeSlots, totalBet); err != nil {
			return err
		}
		return gs.creditPayout(tx, account, game.ID, totalBet, payout, "spin")
	})
	if err != nil {
		return nil, err
	}
	return game, nil
}

func (gs *GameService) GetSlotsDetail(gameID uint) (*models.SlotsGame, error) {
	var detail models.SlotsGame
	if err := gs.db.Where("game_id = ?", gameID).First(&detail).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, utils.ErrGameNotFound
		}
		return nil, fmt.Errorf("failed to fetch slots detail: %w", err)
	}
	return &detail, nil
}

// MARK: shared game history

// GetGameByID retrieves a game by ID with user ownership check
func (gs *GameService) GetGameByID(userID uint, gameID uint) (*models.Game, error) {
	var game models.Game
	if err := gs.db.First(&game, "id = ? AND user_id = ?", gameID, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, utils.ErrGameNotFound
		}
		return nil, fmt.Errorf("failed to fetch game: %w", err)
	}
	return &game, nil
}

// GetUserGames retrieves paginated game history for a user
func (gs *GameService) GetUserGames(userID uint, limit int, offset int) ([]models.Game, int64, error) {
	var games []models.Game
	var total int64
	if err := gs.db.Model(&models.Game{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count games: %w", err)
	}
	if err := gs.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&games).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to fetch games: %w", err)
	}
	return games, total, nil
}

// MARK: Poker
//
// Unlike blackjack and slots, poker is played over the WebSocket "game"
// topic rather than through the REST /games resource (see ws.PokerTable) —
// these methods only handle the money side: reserving a seat's buy-in when
// a player joins, and settling it once their part in the hand is over.

// CreatePokerGame reserves a seat's buy-in when a player sits down at the
// table. The game stays in_progress until the hand is settled or the seat
// is vacated before a hand starts.
func (gs *GameService) CreatePokerGame(userID uint, buyIn decimal.Decimal, seat int, tableID uint) (*models.Game, error) {
	if buyIn.LessThanOrEqual(decimal.Zero) {
		return nil, utils.ErrAmountNotPositive
	}
	var game *models.Game
	err := gs.db.Transaction(func(tx *gorm.DB) error {
		account, err := gs.lockAccount(tx, userID)
		if err != nil {
			return err
		}
		if account.Balance.LessThan(buyIn) {
			return utils.ErrInsufficientBalance
		}

		game = &models.Game{
			UserID:     userID,
			GameType:   models.GameTypePoker,
			Status:     models.GameStatusInProgress,
			InitialBet: buyIn,
			Winnings:   decimal.Zero,
		}
		if err := tx.Create(game).Error; err != nil {
			return fmt.Errorf("failed to create game: %w", err)
		}

		pokerRow := &models.PokerGame{
			GameID:         game.ID,
			TableID:        tableID,
			PlayerPosition: fmt.Sprintf("seat_%d", seat),
			HoleCards:      []byte("[]"),
		}
		if err := tx.Create(pokerRow).Error; err != nil {
			return fmt.Errorf("failed to create poker game row: %w", err)
		}

		return gs.debitBet(tx, account, game.ID, models.GameTypePoker, buyIn)
	})
	if err != nil {
		return nil, err
	}
	return game, nil
}

// SettlePokerGame closes out a seat's session once it ends — whether that's
// the player leaving between hands or busting out — crediting back whatever
// stack they had at that point. A session can now span many hands (see
// ws.PokerTable), so this is no longer called after every single hand.
func (gs *GameService) SettlePokerGame(gameID uint, userID uint, finalStack decimal.Decimal, result string) error {
	return gs.db.Transaction(func(tx *gorm.DB) error {
		var game models.Game
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&game, "id = ? AND user_id = ?", gameID, userID).Error; err != nil {
			return fmt.Errorf("failed to fetch poker game: %w", err)
		}

		if err := tx.Model(&models.PokerGame{}).Where("game_id = ?", game.ID).
			Update("result", result).Error; err != nil {
			return fmt.Errorf("failed to update poker game row: %w", err)
		}

		now := time.Now()
		game.Status = models.GameStatusCompleted
		game.Winnings = finalStack
		game.CompletedAt = &now
		if err := tx.Model(&game).Updates(map[string]interface{}{
			"status":       game.Status,
			"winnings":     game.Winnings,
			"completed_at": game.CompletedAt,
		}).Error; err != nil {
			return fmt.Errorf("failed to update game: %w", err)
		}

		account, err := gs.lockAccount(tx, userID)
		if err != nil {
			return err
		}
		return gs.creditPayout(tx, account, game.ID, game.InitialBet, finalStack, result)
	})
}
