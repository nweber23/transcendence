package services

import (
	"fmt"

	"transcendence/models"
	"transcendence/utils"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AccountService struct {
	db *gorm.DB
}

func NewAccountService(db *gorm.DB) *AccountService {
	return &AccountService{db: db}
}

// GetAccount retrieves account by user ID
func (s *AccountService) GetAccount(userID uint) (*models.Account, error) {
	var account models.Account
	if err := s.db.Where("user_id = ?", userID).First(&account).Error; err != nil {
		return nil, fmt.Errorf("failed to find account: %w", err)
	}
	return &account, nil
}

// Helper: get account with row lock for concurrent update safety
func (s *AccountService) getAccountForUpdate(tx *gorm.DB, userID uint) (*models.Account, error) {
	var account models.Account
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("user_id = ?", userID).
		First(&account).Error; err != nil {
		return nil, fmt.Errorf("account not found: %w", err)
	}
	return &account, nil
}

// Deposit adds funds to account with transaction record
func (s *AccountService) Deposit(userID uint, amount decimal.Decimal) error {
	if amount.LessThan(decimal.Zero) {
		return utils.ErrAmountNotPositive
	}
	if amount.GreaterThan(decimal.NewFromInt(utils.MaxTransactionAmount)) {
		return utils.ErrAmountTooLarge
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		account, err := s.getAccountForUpdate(tx, userID)
		if err != nil {
			return err
		}
		newBalance := account.Balance.Add(amount)
		if err := tx.Model(account).Update("balance", newBalance).Error; err != nil {
			return fmt.Errorf("failed to update balance: %w", err)
		}
		transaction := &models.Transaction{
			AccountID:    account.ID,
			Type:         models.TransactionTypeDeposit,
			Amount:       amount,
			BalanceAfter: newBalance,
			Status:       models.TransactionStatusCompleted,
		}
		if err := tx.Create(transaction).Error; err != nil {
			return fmt.Errorf("failed to create transaction: %w", err)
		}
		return nil
	})
}

func (s *AccountService) Deposit_f(userID uint, amount float64) error {
	return s.Deposit(userID, decimal.NewFromFloat(amount))
}

// Withdraw removes the funds from accounts with transaction record
func (s *AccountService) Withdraw(userID uint, amount decimal.Decimal) error {
	if amount.LessThanOrEqual(decimal.Zero) {
		return utils.ErrAmountNotPositive
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		account, err := s.getAccountForUpdate(tx, userID)
		if err != nil {
			return err
		}
		if account.Balance.LessThan(amount) {
			return utils.ErrInsufficientBalance
		}
		newBalance := account.Balance.Sub(amount)
		if err := tx.Model(account).Update("balance", newBalance).Error; err != nil {
			return fmt.Errorf("failed to update balance: %w", err)
		}
		transaction := &models.Transaction{
			AccountID:    account.ID,
			Type:         models.TransactionTypeWithdraw,
			Amount:       amount,
			BalanceAfter: newBalance,
			Status:       models.TransactionStatusCompleted,
		}
		if err := tx.Create(transaction).Error; err != nil {
			return fmt.Errorf("failed to create transaction: %w", err)
		}
		return nil
	})
}

func (s *AccountService) Withdraw_f(userID uint, amount float64) error {
	return s.Withdraw(userID, decimal.NewFromFloat(amount))
}

// GetTransactionHistory retrieves users transaction history, optionally filtered by transaction type
func (s *AccountService) GetTransactionHistory(userID uint, limit, offset int, types []string) ([]models.Transaction, error) {
	var transactions []models.Transaction
	account, err := s.GetAccount(userID)
	if err != nil {
		return nil, err
	}
	query := s.db.Where("account_id = ?", account.ID)
	if len(types) > 0 {
		query = query.Where("type IN ?", types)
	}
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&transactions).Error; err != nil {
		return nil, fmt.Errorf("failed to find transactions: %w", err)
	}
	return transactions, nil
}
