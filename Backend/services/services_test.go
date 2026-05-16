package services

import (
	"fmt"
	"strings"
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
		if index == '3' {
			_, err := userService.RegisterUser("herold", "herold@yahoo.com", "ILIKECOOKIES")
			if err != nil {
				testInterface.Errorf(`Failed to create user herold`)
			}
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
	_, err := userService.tbr_GetUserByName("herold")
	if err != nil {
		testInterface.Errorf(`User herold was expected to be in the database but wasn't`)
	}
}

func loginExpect(testInterface *testing.T, userService *UserService, username string, password string, expectSuccess bool) {
	_, err := userService.LoginUser(username, password)
	if (err == nil) != expectSuccess {
		testInterface.Errorf(`Login of user %s with password %s did not go as expected`, username, password)
	}
}

func testPasswords(testInterface *testing.T, userService *UserService, username string, password string) {
	loginExpect(testInterface, userService, username, password,                     true)  // Correct password
	loginExpect(testInterface, userService, username, "weijfiwjerfiwe",             false) // Random bullshit
	loginExpect(testInterface, userService, username, "",                           false) // Empty password
	loginExpect(testInterface, userService, username, password[:len(password) - 1], false) // Remove last character from actual password
	loginExpect(testInterface, userService, username, password[len(password) - 1:], false) // Remove first character from actual password
	loginExpect(testInterface, userService, username, password + "a",               false) // Append character to actual password
	loginExpect(testInterface, userService, username, "a" + password,               false) // Preprend character to actual password
	loginExpect(testInterface, userService, username[:len(username) - 1], password, false) // Remove last character from username
	loginExpect(testInterface, userService, username[len(username) - 1:], password, false) // Remove first character from username
	loginExpect(testInterface, userService, username + "a",               password, false) // Append character to username
	loginExpect(testInterface, userService, "a" + username,               password, false) // Preprend character to username
}

const STRESS_TEST_AMOUNT int = 50000

func TestAccountService(testInterface *testing.T) {
	accountService, userService := createMockServices(testInterface)
	_ = accountService

	// Create test users and check if they exist after
	createMockUsers(testInterface, userService)
	fetchMockUsers(testInterface, userService)

	// Simple password tests on herold and arbitrary incremental test user
	testPasswords(testInterface, userService, "herold", "ILIKECOOKIES")
	testPasswords(testInterface, userService,  "test3",        "test3")

	// Login with inexistent users
	loginExpect(testInterface, userService, "jefferson", "flufferson", false)
	loginExpect(testInterface, userService,       "jug",           "", false)
	loginExpect(testInterface, userService,          "",        "jug", false)
	loginExpect(testInterface, userService,          "",           "", false)

	// Stress test
	var stressTest string
	count := 0
	for count < STRESS_TEST_AMOUNT {
		stressTest = strings.Join([]string {stressTest, "a"}, "")
		count++
	}
	loginExpect(testInterface, userService, stressTest,        "a", false)
	loginExpect(testInterface, userService,        "a", stressTest, false)
	loginExpect(testInterface, userService, stressTest, stressTest, false)
}