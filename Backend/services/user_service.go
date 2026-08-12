package services

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"transcendence/models"
	"transcendence/utils"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
	"gorm.io/gorm"
)

const twoFactorIssuer = "Transcendence Casino"
const backupCodeCount = 10

// twoFactorSecretEncryptionKey returns the key material used to encrypt
// TOTP secrets at rest. It's derived from JWT_SECRET (prefixed so it's not
// literally the same key used to sign tokens) rather than requiring a
// separate deployment secret.
func twoFactorSecretEncryptionKey() string {
	base := os.Getenv("JWT_SECRET")
	if base == "" {
		base = "secret" // matches config.LoadConfig's fallback for JWT_SECRET
	}
	return "totp-secret-encryption:" + base
}
// usernamePattern restricts usernames to characters that are safe to render
// and search on: letters, digits, underscore, hyphen, and dot.
var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_.-]+$`)

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
	if !usernamePattern.MatchString(username) {
		return utils.ErrInvalidUsername
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
		if avatarURL != "" && avatarURL != user.AvatarURL {
			oldURL := user.AvatarURL
			user.AvatarURL = avatarURL
			if err := s.db.Save(&user).Error; err != nil {
				return nil, fmt.Errorf("failed to update oauth user avatar: %w", err)
			}
			if oldURL != "" && oldURL != models.DefaultAvatarURL {
				_ = os.Remove(filepath.Join("./uploads/", oldURL))
			}
		}
		return &user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to look up oauth user: %w", err)
	}
	if !utils.ValidateEmail(email) {
		return nil, utils.ErrInvalidEmail
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
var usernameDisallowedChars = regexp.MustCompile(`[^a-zA-Z0-9_.-]`)

func (s *UserService) resolveUniqueUsername(candidate, email string) (string, error) {
	base := usernameDisallowedChars.ReplaceAllString(strings.Join(strings.Fields(candidate), ""), "")
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

// SetupTwoFactor generates a new (unconfirmed) TOTP secret for the user and
// returns the otpauth key so the caller can render a QR code / show the
// secret for manual entry. 2FA isn't enabled until ConfirmTwoFactor succeeds.
func (s *UserService) SetupTwoFactor(userID uint) (*otp.Key, error) {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return nil, err
	}
	if user.TwoFactorEnabled {
		return nil, utils.ErrTwoFactorAlreadyEnabled
	}
	if user.PasswordHash == "" {
		return nil, utils.ErrTwoFactorRequiresPassword
	}
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      twoFactorIssuer,
		AccountName: user.Username,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate TOTP secret: %w", err)
	}
	encryptedSecret, err := utils.EncryptString(key.Secret(), twoFactorSecretEncryptionKey())
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt TOTP secret: %w", err)
	}
	if err := s.db.Model(&models.User{}).Where("id = ?", userID).Update("two_factor_secret", encryptedSecret).Error; err != nil {
		return nil, fmt.Errorf("failed to store TOTP secret: %w", err)
	}
	return key, nil
}

// ConfirmTwoFactor verifies a TOTP code against the secret staged by
// SetupTwoFactor and, if valid, enables 2FA and issues one-time backup
// codes. The codes are returned in plaintext exactly once; only their
// bcrypt hashes are persisted.
func (s *UserService) ConfirmTwoFactor(userID uint, code string) ([]string, error) {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return nil, err
	}
	if user.TwoFactorEnabled {
		return nil, utils.ErrTwoFactorAlreadyEnabled
	}
	if user.TwoFactorSecret == "" {
		return nil, utils.ErrTwoFactorNotSetUp
	}
	secret, err := utils.DecryptString(user.TwoFactorSecret, twoFactorSecretEncryptionKey())
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt TOTP secret: %w", err)
	}
	if !isSixDigitCode(code) || !totp.Validate(code, secret) {
		return nil, utils.ErrInvalidTwoFactorCode
	}
	backupCodes, hashedCodes, err := generateBackupCodes()
	if err != nil {
		return nil, err
	}
	if err := s.db.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"two_factor_enabled":      true,
		"two_factor_backup_codes": strings.Join(hashedCodes, ","),
	}).Error; err != nil {
		return nil, fmt.Errorf("failed to enable two-factor authentication: %w", err)
	}
	return backupCodes, nil
}

// VerifyTwoFactorCode checks a login-time code against the user's TOTP
// secret, falling back to single-use backup codes. A matching backup code is
// consumed (removed) so it can't be replayed.
func (s *UserService) VerifyTwoFactorCode(userID uint, code string) (bool, error) {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return false, err
	}
	if !user.TwoFactorEnabled {
		return false, utils.ErrTwoFactorNotEnabled
	}
	if isSixDigitCode(code) {
		secret, err := utils.DecryptString(user.TwoFactorSecret, twoFactorSecretEncryptionKey())
		if err != nil {
			return false, fmt.Errorf("failed to decrypt TOTP secret: %w", err)
		}
		if totp.Validate(code, secret) {
			return true, nil
		}
	}
	hashedCodes := utils.OrdinalSplit(user.TwoFactorBackupCodes, ",")
	for i, hashedCode := range hashedCodes {
		if utils.VerifyPassword(hashedCode, code) {
			remaining := append(hashedCodes[:i:i], hashedCodes[i+1:]...)
			// Conditional update (compare-and-swap on the stored codes
			// string) so two concurrent requests racing on the same
			// backup code can't both succeed — the loser sees no rows
			// affected and reports the code as already used.
			result := s.db.Model(&models.User{}).
				Where("id = ? AND two_factor_backup_codes = ?", userID, user.TwoFactorBackupCodes).
				Update("two_factor_backup_codes", strings.Join(remaining, ","))
			if result.Error != nil {
				return false, fmt.Errorf("failed to consume backup code: %w", result.Error)
			}
			if result.RowsAffected == 0 {
				return false, nil
			}
			return true, nil
		}
	}
	return false, nil
}

// DisableTwoFactor turns off 2FA after re-verifying the account password.
func (s *UserService) DisableTwoFactor(userID uint, password string) error {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return err
	}
	if !user.TwoFactorEnabled {
		return utils.ErrTwoFactorNotEnabled
	}
	if user.PasswordHash == "" || !utils.VerifyPassword(user.PasswordHash, password) {
		return utils.ErrInvalidPassword
	}
	if err := s.db.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"two_factor_enabled":      false,
		"two_factor_secret":       "",
		"two_factor_backup_codes": "",
	}).Error; err != nil {
		return fmt.Errorf("failed to disable two-factor authentication: %w", err)
	}
	return nil
}

// isSixDigitCode reports whether code has the shape of a TOTP code (exactly
// six digits) so obviously-malformed input can be rejected outright instead
// of running it through totp.Validate.
func isSixDigitCode(code string) bool {
	if len(code) != 6 {
		return false
	}
	for _, r := range code {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// generateBackupCodes returns backupCodeCount single-use recovery codes
// alongside their bcrypt hashes (plaintext codes are never stored).
func generateBackupCodes() ([]string, []string, error) {
	codes := make([]string, backupCodeCount)
	hashed := make([]string, backupCodeCount)
	for i := 0; i < backupCodeCount; i++ {
		raw, err := utils.GetRandomHexString(5)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to generate backup code: %w", err)
		}
		codes[i] = raw
		hash, err := utils.HashPassword(raw)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to hash backup code: %w", err)
		}
		hashed[i] = hash
	}
	return codes, hashed, nil
}

// MarkNotificationsSeen persists the current time as the user's notifications
// "last seen" marker so that unread state survives new devices and sessions.
func (s *UserService) MarkNotificationsSeen(userID uint) (*time.Time, error) {
	now := time.Now().UTC()
	if err := s.db.
		Model(&models.User{}).
		Where("id = ?", userID).
		Update("notifications_seen_at", now).
	Error; err != nil {
		return nil, fmt.Errorf("failed to update notifications_seen_at: %w", err)
	}
	return &now, nil
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