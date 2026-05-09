package config

import (
	"fmt"

	"transcendence/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// InitDB initializes PostgreSQL database connection and runs migrations
func initDB(cfg *Config) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL()), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}
	// Auto-migrate models
	if err := db.AutoMigrate(
		&models.User{},
		&models.Account{},
		&models.Transaction{},
		&models.Game{},
		&models.BlackjackGame{},
		&models.PokerGame{},
		&models.SlotsGame{},
		&models.GameStatistics{},
	); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}
	return db, nil
}
