package services

import (
	"errors"
	"fmt"

	"transcendence/models"
	"transcendence/utils"

	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

func ValidateUsername(username string) error {
	if len(username) < 3 || len(username) > 32 {
		return errors.New("username must be between 3 and 32 characters")
	}
	return nil
}

func reinterpretNotFound(err error) (error) {
	if err == nil {
		return errors.New("username or email already exists")
	} else if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	} else {
		return err
	}
}

// RegisterUser creates a new user with hashed password and initializes account
func (s *UserService) RegisterUser(username, email, password string) (*models.User, error) {
	if err := ValidateUsername(username); err != nil {
		return nil, err
	}
	if !utils.ValidateEmail(email) {
		return nil, errors.New("invalid email")
	}
	var existingUser models.User
	if err := reinterpretNotFound(s.db.Where("username = ? OR email = ?", username, email).First(&existingUser).Error); err != nil {
		return nil, err
	}
	passwordHash, err := utils.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}
	user := &models.User{
		Username:     username,
		Email:        email,
		PasswordHash: passwordHash,
	}
	if err := s.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	account := &models.Account{
		UserID: user.ID,
	}
	if err := s.db.Create(account).Error; err != nil {
		return nil, fmt.Errorf("failed to create account: %w", err)
	}
	stats := &models.GameStatistics{
		UserID: user.ID,
	}
	if err := s.db.Create(stats).Error; err != nil {
		return nil, fmt.Errorf("failed to create stats: %w", err)
	}
	return user, nil
}

// LoginUser authenticates user and returns user if valid
func (s *UserService) LoginUser(username string, password string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("username = ? and deleted_at IS NULL", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid username or password")
		}
		return nil, fmt.Errorf("failed to login: %w", err)
	}
	if !utils.VerifyPassword(user.PasswordHash, password) {
		return nil, errors.New("invalid username or password")
	}
	return &user, nil
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(userID uint) (*models.User, error) {
	var user models.User
	if err := s.db.Where("id = ? AND deleted_at IS NULL", userID).First(&user).Error; err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return &user, nil
}

// UpdateUser updates a user by userID
func (s *UserService) UpdateUser(
	userID       uint,
	username     string,
	email        string,
	passwordHash string,
	avatarURL    string,
) (*models.User, error) {
	if err := ValidateUsername(username); err != nil {
		return nil, errors.New("invalid username")
	}
	if !utils.ValidateEmail(email) {
		return nil, errors.New("invalid email")
	}
	var duplicateUser models.User
	var err error
	err = reinterpretNotFound(s.db.Where("username = ? AND id <> ?", username, userID).First(&duplicateUser).Error)
	if err != nil {
		return nil, err
	}
	err = reinterpretNotFound(s.db.Where("email = ?    AND id <> ?", email,    userID).First(&duplicateUser).Error)
	if err != nil {
		return nil, err
	}
	user, err := s.GetUserByID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	user.Username     = username
	user.Email        = email
	user.PasswordHash = passwordHash
	user.AvatarURL    = avatarURL
	if err := s.db.Where("id = ?", userID).UpdateColumns(user).Error; err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	return user, nil
}