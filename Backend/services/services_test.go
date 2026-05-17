package services

import (
	"strings"
	"fmt"
	"testing"
	"reflect"

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

func displayTransactions(testInterface *testing.T, expected *models.Transaction, actual *models.Transaction) {
	var transactionType reflect.Type  = reflect.TypeFor[models.Transaction]()
	var expectedValue   reflect.Value = reflect.ValueOf(*expected)
	var actualValue     reflect.Value = reflect.ValueOf(*actual)
	var fieldIndex int
	fieldIndex = 0
	for fieldIndex < transactionType.NumField() {
		var field         reflect.StructField = transactionType.Field(fieldIndex)
		var expectedField reflect.Value       = expectedValue.Field(fieldIndex)
		var actualField   reflect.Value       = actualValue.Field(fieldIndex)
		testInterface.Errorf("| %20s | %20s | %20s |", field.Name, expectedField.String(), actualField.String())
		fieldIndex++
	}
}

func getTransactionHistoryExpect(
	testInterface        *testing.T,
	accountService       *AccountService,
	expectedTransactions []models.Transaction,
	userID               uint,
	limit                int,
	offset               int,
) {
	var length int = len(expectedTransactions)
	actualTransactions, err := accountService.GetTransactionHistory(userID, limit, offset)
	if err != nil {
		testInterface.Errorf("Getting transaction history should not fail")
		testInterface.FailNow()
	}
	if length != len(actualTransactions) {
		testInterface.Errorf("Actual transactions don't matcht the expected ones in terms of length")
		return
	}
	transactionIndex := 0
	for transactionIndex < length {
		expected := &expectedTransactions[transactionIndex]
		actual   := &actualTransactions[transactionIndex]
		if reflect.DeepEqual(*expected, *actual) {
			testInterface.Errorf("Transactions differ at index %d, here is a breakdown of their differences:\n",
				transactionIndex)
			displayTransactions(testInterface, expected, actual)
		}
		transactionIndex++
	}
}

const STRESS_TEST_AMOUNT int = 500

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

	// Vibe check
	fetchMockUsers(testInterface, userService)

	// Simple deposit and withdraw tests
	err := accountService.Withdraw_f(2, 50)
	if err == nil {
		testInterface.Errorf("withdrawal from empty account should not succeed")
	}
	if err.Error() != "insufficient funds" {
		testInterface.Errorf("withdrawal failed for unexpected reason %s", err)
	}
	accountService.Deposit_f(2, 50)
	var userID uint = 1
	for userID < 5 {
		if userID != 2 && accountService.Withdraw_f(userID, 10) == nil {
			testInterface.Errorf("withdrawal from unrelated account %d should not succeed after deposit to account 2", userID)
		}
		userID++
	} 
	if accountService.Withdraw_f(2, 40) != nil {
		testInterface.Errorf("withdrawal should succeed after deposit")
	}
	if accountService.Withdraw_f(2, 40) == nil {
		testInterface.Errorf("just because the account has SOME money, doesn't mean withdrawals of excessive amounts should work")
	}
	if accountService.Deposit_f(2, -700) == nil {
		testInterface.Errorf("deposit should fail with negative values")
	}
	if accountService.Withdraw_f(2, -700) == nil {
		testInterface.Errorf("withdraw should fail with negative values")
	}

	// Vibe check
	fetchMockUsers(testInterface, userService)

	var transactions []models.Transaction
	transactions, err = accountService.GetTransactionHistory(2, 50, 0)
	index := 0
	for index < len(transactions) {
		transaction := &transactions[index]
		fmt.Printf("%s\n", transaction.Type)
		index++
	}
}