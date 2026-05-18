package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type Account struct {
	ID           uint            `gorm:"primaryKey"`
	UserID       uint            `gorm:"uniqueIndex"`
	Balance      decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
	TotalWagered decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
	TotalWon     decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
	TotalLost    decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (Account) TableName() string {
	return "accounts"
}
