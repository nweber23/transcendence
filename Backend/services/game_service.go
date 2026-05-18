package services

import (
	"errors"
	"fmt"

	"transcendence/models"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GameService struct {
	db *gorm.DB
}

func NewGameService(db *gorm.DB) *GameService {
	return &GameService{db: db}
}

// CreateGame starts a new game session with initial bet validation
func (gs *GameService) CreateGame(userID uint, gameType string, initialBet decimal.Decimal) (*models.Game, error) {
	if initialBet.LessThanOrEqual(decimal.Zero) {
		return nil, errors.New("bet amount must be greater than zero")
	}
	var account models.Account
	if err := gs.db.Clauses(clause.Locking{Strength: "UPDATE"}).First(&account, "user_id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("account not found")
		}
		return nil, fmt.Errorf("failed to fetch account: %w", err)
	}
	if account.Balance.LessThan(initialBet) {
		return nil, errors.New("insufficient balance for this bet")
	}
	var game *models.Game
	err := gs.db.Transaction(func(tx *gorm.DB) error {
		game = &models.Game{
			UserID:     userID,
			GameType:   gameType,
			Status:     models.GameStatusInProgress,
			InitialBet: initialBet,
			Winnings:   decimal.Zero,
		}
		if err := tx.Create(game).Error; err != nil {
			return fmt.Errorf("failed to create game: %w", err)
		}
		// Deduct bet from account balance
		account.Balance = account.Balance.Sub(initialBet)
		account.TotalWagered = account.TotalWagered.Add(initialBet)
		if err := tx.Model(&account).Updates(account).Error; err != nil {
			return fmt.Errorf("failed to update account balance: %w", err)
		}
		// Create transaction record for the bet
		transaction := &models.Transaction{
			AccountID:    account.ID,
			Type:         models.TransactionTypeBet,
			Amount:       initialBet,
			Status:       models.TransactionStatusCompleted,
			BalanceAfter: account.Balance,
			Metadata:     []byte(fmt.Sprintf(`{"game_type": "%s", "game_id": %d}`, gameType, game.ID)),
		}
		if err := tx.Create(transaction).Error; err != nil {
			return fmt.Errorf("failed to create bet transaction: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return game, nil
}

// ExecuteAction runs a game action and stores the result
func (gs *GameService) ExecuteAction(userID uint, gameID uint, action string) (*models.Game, error) {
	var game models.Game
	if err := gs.db.First(&game, "id = ? AND user_id = ?", gameID, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("game not found")
		}
		return nil, fmt.Errorf("failed to fetch game: %w", err)
	}
	if game.Status != models.GameStatusInProgress {
		return nil, fmt.Errorf("game is not in progress (status: %s)", game.Status)
	}
	// TODO: Call C++ engine via gRPC to get result and payout
	isWin := true
	payout := game.InitialBet.Mul(decimal.NewFromInt(2))
	err := gs.db.Transaction(func(tx *gorm.DB) error {
		// Update game status
		game.Status = models.GameStatusCompleted
		if isWin {
			game.Winnings = payout
		}
		if err := tx.Model(&game).Updates(game).Error; err != nil {
			return fmt.Errorf("failed to update game: %w", err)
		}
		// Update account balance
		var account models.Account
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&account, "user_id = ?", userID).Error; err != nil {
			return fmt.Errorf("failed to fetch account: %w", err)
		}
		if isWin {
			account.Balance = account.Balance.Add(payout)
			account.TotalWon = account.TotalWon.Add(payout)
		} else {
			account.TotalLost = account.TotalLost.Add(game.InitialBet)
		}
		if err := tx.Model(&account).Updates(account).Error; err != nil {
			return fmt.Errorf("failed to update account: %w", err)
		}
		// Create win transaction if applicable
		if isWin {
			transaction := &models.Transaction{
				AccountID:    account.ID,
				Type:         models.TransactionTypeWin,
				Amount:       payout,
				Status:       models.TransactionStatusCompleted,
				BalanceAfter: account.Balance,
				Metadata:     []byte(fmt.Sprintf(`{"action": "%s", "game_id": %d}`, action, game.ID)),
			}
			if err := tx.Create(transaction).Error; err != nil {
				return fmt.Errorf("failed to create win transaction: %w", err)
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &game, nil
}

// GetGameByID retrieves a game by ID with user ownership check
func (gs *GameService) GetGameByID(userID uint, gameID uint) (*models.Game, error) {
	var game models.Game
	if err := gs.db.First(&game, "id = ? AND user_id = ?", gameID, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("game not found")
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
