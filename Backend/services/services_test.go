package services

import (
	"fmt"

	"testing"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"transcendence/models"
)

func InitMockDB(testInterface *testing.T) (*gorm.DB) {
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
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
		fmt.Errorf(`failed to run migrations: %w`, err)
		testInterface.FailNow()
	}
	return db
}

func createMockServices(testInterface *testing.T) (*AccountService, *UserService) {
	db := InitMockDB(testInterface)
	accountService := NewAccountService(db)
	userService := NewUserService(db)
	return accountService, userService
}

func createMockUsers(testInterface *testing.T, userService *UserService) {
	index := '0'
	for index < '5' {
		testName := "test" + string(index)
		_, err := userService.RegisterUser(testName, testName + "@gatherate.net", testName)
		if err != nil {
			testInterface.Errorf(`Failed to create user %s`, testName)
		}
		index++
	}
}

// GetUserByName retrieves a user by username
func (s *UserService) tbr_GetUserByName(username string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("username = ? AND deleted_at IS NULL", username).First(&user).Error; err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return &user, nil
}

func fetchMockUsers(testInterface *testing.T, userService *UserService) {
	index := '5'
	for index > '0' {
		index--
		testName := "test" + string(index)
		_, err := userService.tbr_GetUserByName(testName)
		if err != nil {
			testInterface.Errorf(`User %s was expected to be in the database but wasn't`, testName)
		}
	}
}

func TestAccountService(testInterface *testing.T) {
	accountService, userService := createMockServices(testInterface)
	_ = accountService

	createMockUsers(testInterface, userService)
	fetchMockUsers(testInterface, userService)
}