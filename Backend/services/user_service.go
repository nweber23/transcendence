package services

import (
	"errors"
	"fmt"
	"strings"

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

func validateUsername(username string) error {
	if len(username) < 3 || len(username) > 32 {
		return utils.ErrUsernameWrongLength
	}
	return nil
}

// RegisterUser creates a new user with hashed password and initializes account
func (s *UserService) RegisterUser(username, email, password string) (*models.User, error) {
	if err := validateUsername(username); err != nil {
		return nil, err
	}
	if !utils.ValidateEmail(email) {
		return nil, utils.ErrInvalidEmail
	}
	var existingUser models.User
	if err := utils.ReinterpretNotFound(s.db.Where("username = ? OR email = ?", username, email).First(&existingUser).Error); err != nil {
		return nil, err
	}
	passwordHash, err := utils.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}
	user := &models.User{
		Username:          username,
		Email:             email,
		PasswordHash:      passwordHash,
		AvatarURL:         models.DefaultAvatarURL,
		NotificationTypes: JoinAllNotificationTypes(),
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
			return nil, utils.ErrInvalidUsername
		}
		return nil, fmt.Errorf("failed to login: %w", err)
	}
	if user.PasswordHash == "" {
		// account was created via OAuth and has no local password
		return nil, utils.ErrInvalidUsername
	}
	if !utils.VerifyPassword(user.PasswordHash, password) {
		return nil, utils.ErrInvalidPassword
	}
	return &user, nil
}

// FindOrCreateOauthUser looks up a user by provider+providerID, creating one
// (plus account and stats rows) if none exists yet.
func (s *UserService) FindOrCreateOauthUser(provider, providerID, username, email, avatarURL string) (*models.User, error) {
	var user models.User
	err := s.db.Where("provider = ? AND provider_id = ? AND deleted_at IS NULL", provider, providerID).First(&user).Error
	if err == nil {
		return &user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to look up oauth user: %w", err)
	}

	uniqueUsername, err := s.resolveUniqueUsername(username, email)
	if err != nil {
		return nil, err
	}

	pid := providerID
	newUser := &models.User{
		Username:          uniqueUsername,
		Email:             email,
		AvatarURL:         avatarURL,
		Provider:          provider,
		ProviderID:        pid,
		NotificationTypes: JoinAllNotificationTypes(),
	}
	if newUser.AvatarURL == "" {
		newUser.AvatarURL = models.DefaultAvatarURL
	}
	if err := s.db.Create(newUser).Error; err != nil {
		return nil, fmt.Errorf("failed to create oauth user: %w", err)
	}
	account := &models.Account{UserID: newUser.ID}
	if err := s.db.Create(account).Error; err != nil {
		return nil, fmt.Errorf("failed to create account: %w", err)
	}
	stats := &models.GameStatistics{UserID: newUser.ID}
	if err := s.db.Create(stats).Error; err != nil {
		return nil, fmt.Errorf("failed to create stats: %w", err)
	}
	return newUser, nil
}

// resolveUniqueUsername sanitizes the provider username to fit constraints
// and appends a numeric suffix if it's already taken by another account.
func (s *UserService) resolveUniqueUsername(candidate, email string) (string, error) {
	base := strings.TrimSpace(candidate)
	if base == "" {
		if at := strings.Index(email, "@"); at > 0 {
			base = email[:at]
		} else {
			base = "user"
		}
	}
	if len(base) > 28 {
		base = base[:28]
	}
	for len(base) < 3 {
		base = base + "0"
	}

	name := base
	for i := 0; i < 1000; i++ {
		if i > 0 {
			name = fmt.Sprintf("%s%d", base, i)
			if len(name) > 32 {
				name = name[len(name)-32:]
			}
		}
		var existing models.User
		err := s.db.Where("username = ?", name).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return name, nil
		}
		if err != nil {
			return "", fmt.Errorf("failed to check username availability: %w", err)
		}
	}
	return "", errors.New("could not resolve a unique username")
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(userID uint) (*models.User, error) {
	var user models.User
	if err := s.db.Where("id = ? AND deleted_at IS NULL", userID).First(&user).Error; err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return &user, nil
}

// GetUsersByIDs retrieves multiple users in a single query, keyed by ID
func (s *UserService) GetUsersByIDs(userIDs []uint) (map[uint]*models.User, error) {
	if len(userIDs) == 0 {
		return map[uint]*models.User{}, nil
	}
	var users []models.User
	if err := s.db.Where("id IN ? AND deleted_at IS NULL", userIDs).Find(&users).Error; err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}
	usersByID := make(map[uint]*models.User, len(users))
	for i := range users {
		usersByID[users[i].ID] = &users[i]
	}
	return usersByID, nil
}

// UpdateUser updates a user by userID
func (s *UserService) UpdateUser(
	userID            uint,
	username          string,
	email             string,
	passwordHash      string,
	avatarURL         string,
	notificationTypes string,
) (*models.User, error) {
	if err := validateUsername(username); err != nil {
		return nil, utils.ErrInvalidUsername
	}
	if !utils.ValidateEmail(email) {
		return nil, utils.ErrInvalidEmail
	}
	for _, notificationType := range utils.OrdinalSplit(notificationTypes, ",") {
		if NotificationTypeInformations[notificationType] == nil {
			return nil, utils.ErrInvalidNotificationType
		}
	}
	var duplicateUser models.User
	var err error
	err = utils.ReinterpretNotFound(s.db.Where("username = ? AND id <> ?", username, userID).First(&duplicateUser).Error)
	if err != nil {
		return nil, err
	}
	err = utils.ReinterpretNotFound(s.db.Where("email = ?    AND id <> ?", email,    userID).First(&duplicateUser).Error)
	if err != nil {
		return nil, err
	}
	user, err := s.GetUserByID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	user.Username          = username
	user.Email             = email
	user.PasswordHash      = passwordHash
	user.AvatarURL         = avatarURL	
	if err := s.db.Where("id = ?", userID).UpdateColumns(user).Error; err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	if user.NotificationTypes != notificationTypes {
		user.NotificationTypes = notificationTypes
		if err := s.db.Model(user).Select("notification_types").Updates(user).Error; err != nil {
			return nil, fmt.Errorf("failed to update notification_types column of user: %w", err)
		}
	}
	return user, nil
}

type UserSearchResult struct {
	ID        uint   `json:"id"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatarURL"`
}

// escapeLike escapes LIKE wildcard characters so user input is matched literally.
func escapeLike(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "%", "\\%")
	s = strings.ReplaceAll(s, "_", "\\_")
	return s
}

// SearchUsers returns users whose username starts with query (case-insensitive).
func (s *UserService) SearchUsers(query string, limit int) ([]UserSearchResult, error) {
	if len(query) == 0 {
		return nil, errors.New("query must not be empty")
	}
	var users []models.User
	if err := s.db.
		Where("LOWER(username) LIKE LOWER(?) AND deleted_at IS NULL", escapeLike(query)+"%").
		Order("username ASC").
		Limit(limit).
		Find(&users).Error; err != nil {
		return nil, err
	}
	results := make([]UserSearchResult, len(users))
	for i, u := range users {
		results[i] = UserSearchResult{
			ID:        u.ID,
			Username:  u.Username,
			AvatarURL: u.AvatarURL,
		}
	}
	return results, nil
}