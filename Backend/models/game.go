package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type Game struct {
	ID          uint `gorm:"primaryKey"`
	UserID      uint
	GameType    string          `gorm:"type:varchar(20);index"`
	Status      string          `gorm:"type:varchar(20);index:idx_games_status"`
	InitialBet  decimal.Decimal `gorm:"type:numeric(19,2)"`
	Winnings    decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
	CreatedAt   time.Time       `gorm:"index:idx_games_created_at"`
	CompletedAt *time.Time
	DurationMs  *int
}

func (Game) TableName() string {
	return "games"
}

type BlackjackGame struct {
	ID          uint   `gorm:"primaryKey"`
	GameID      uint   `gorm:"uniqueIndex"`
	PlayerHand  []byte `gorm:"type:jsonb"`
	DealerHand  []byte `gorm:"type:jsonb"`
	PlayerScore *int
	DealerScore *int
	Result      string `gorm:"type:varchar(20)"`
}

func (BlackjackGame) TableName() string {
	return "blackjack_games"
}

type PokerGame struct {
	ID             uint `gorm:"primaryKey"`
	GameID         uint `gorm:"uniqueIndex"`
	TableID        uint
	PlayerPosition string `gorm:"type:varchar(20)"`
	HoleCards      []byte `gorm:"type:jsonb"`
	CommunityCards []byte `gorm:"type:jsonb"`
	FinalHand      []byte `gorm:"type:jsonb"`
	Result         string `gorm:"type:varchar(30)"`
}

func (PokerGame) TableName() string {
	return "poker_games"
}

type SlotsGame struct {
	ID               uint   `gorm:"primaryKey"`
	GameID           uint   `gorm:"uniqueIndex"`
	Reels            []byte `gorm:"type:jsonb"`
	PaylineResult    string `gorm:"type:varchar(50)"`
	Multiplier       int    `gorm:"default:1"`
	IsBonusTriggered bool   `gorm:"default:false"`
}

func (SlotsGame) TableName() string {
	return "slots_games"
}

type GameStatistics struct {
	ID                    uint            `gorm:"primaryKey"`
	UserID                uint            `gorm:"uniqueIndex"`
	BlackjackGamesPlayed  int             `gorm:"default:0"`
	BlackjackWins         int             `gorm:"default:0"`
	BlackjackWinrate      float64         `gorm:"type:numeric(5,2);default:0"`
	BlackjackTotalWagered decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
	PokerGamesPlayed      int             `gorm:"default:0"`
	PokerWins             int             `gorm:"default:0"`
	PokerWinrate          float64         `gorm:"type:numeric(5,2);default:0"`
	PokerTotalWagered     decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
	SlotsGamesPlayed      int             `gorm:"default:0"`
	SlotsWins             int             `gorm:"default:0"`
	SlotsWinrate          float64         `gorm:"type:numeric(5,2);default:0"`
	SlotsTotalWagered     decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
	TotalGamesPlayed      int             `gorm:"default:0"`
	OverallWinrate        float64         `gorm:"type:numeric(5,2);default:0"`
	LastUpdated           time.Time
}

func (GameStatistics) TableName() string {
	return "game_statistics"
}

const (
	GameTypeBlackjack = "blackjack"
	GameTypePoker     = "poker"
	GameTypeSlots     = "slots"

	GameStatusInProgress = "in_progress"
	GameStatusCompleted  = "completed"
	GameStatusAbandoned  = "abandoned"
)
