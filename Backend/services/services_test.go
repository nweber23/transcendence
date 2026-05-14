package services

import (
	"testing"
	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func InitMockDB(testInterface *testing.T) (*gorm.DB) {
	mock_db, _, _ := sqlmock.New()
	mock_dialector := postgres.New(postgres.Config{
		Conn:       mock_db,
		DriverName: "postgres",
	})
	db, _ := gorm.Open(mock_dialector, &gorm.Config{})
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

func TestAccountService(testInterface *testing.T) {
	accountService, userService := createMockServices(testInterface)
	createMockUsers(testInterface, userService)
	_ = accountService
}