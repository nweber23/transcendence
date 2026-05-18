package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type Transaction struct {
	ID           uint `gorm:"primaryKey"`
	AccountID    uint
	Type         string          `gorm:"type:varchar(20);index"`
	Amount       decimal.Decimal `gorm:"type:numeric(19,2)"`
	BalanceAfter decimal.Decimal `gorm:"type:numeric(19,2)"`
	Status       string          `gorm:"type:varchar(20);default:'completed'"`
	Metadata     []byte          `gorm:"type:jsonb;default:'{}'"`
	CreatedAt    time.Time       `gorm:"index:idx_transactions_created_at"`
}

func (Transaction) TableName() string {
	return "transactions"
}

const (
	TransactionTypeDeposit  = "deposit"
	TransactionTypeWithdraw = "withdrawal"
	TransactionTypeBet      = "bet"
	TransactionTypeWin      = "win"
	TransactionTypeCashout  = "cashout"
	TransactionTypeRefund   = "refund"

	TransactionStatusPending   = "pending"
	TransactionStatusCompleted = "completed"
	TransactionStatusFailed    = "failed"
	TransactionStatusCancelled = "cancelled"
)
