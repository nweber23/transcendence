package utils

import (
	"errors"
	"fmt"
)

const (
	MaxTransactionAmount = 1000000
)

var (
	ErrInvalidFilename         = errors.New("invalid filename")
	ErrInvalidUsername         = errors.New("invalid username")
	ErrInvalidPassword         = errors.New("invalid password")
	ErrInvalidEmail            = errors.New("invalid email")
	ErrInvalidToken            = errors.New("invalid token")
	ErrInvalidFriendshipStatus = errors.New("invalid friendship status")
	ErrInvalidNotificationType = errors.New("invalid notification type")
	ErrInvalidTopicString      = errors.New("invalid topic string")
	ErrInvalidPlayAction       = errors.New("invalid play action")
	ErrInvalidLineCount        = errors.New("invalid line count")

	ErrRandomStringGenFailed  = errors.New("failed to generate random string")
	ErrAmountNotPositive      = errors.New("amount must be greater than zero")
	ErrAmountTooLarge         = fmt.Errorf("amount must be less than %d", MaxTransactionAmount+1)
	ErrInsufficientBalance    = errors.New("insufficient balance")
	ErrSelfLove               = errors.New("self love only works irl")
	ErrAlreadyBefriended      = errors.New("friend already added")
	ErrAlreadyDefriended      = errors.New("no friend to remove")
	ErrAccountNotFound        = errors.New("account not found")
	ErrGameNotFound           = errors.New("game not found")
	ErrUsernameWrongLength    = errors.New("username must be between 3 and 32 characters")
	ErrEntryExists            = errors.New("matching entry already exists")
	ErrNotificationIsNotYours = errors.New("notification is not yours")

	ErrAvatarDownloadFailed  = errors.New("failed to download avatar")
	ErrAvatarTooLarge        = errors.New("avatar image too large")
	ErrUnsupportedAvatarType = errors.New("unsupported avatar file type")
)

func IsErrInvalid(err error) bool {
	return errors.Is(err, ErrInvalidFilename) ||
		errors.Is(err, ErrInvalidUsername) ||
		errors.Is(err, ErrInvalidPassword) ||
		errors.Is(err, ErrInvalidEmail) ||
		errors.Is(err, ErrInvalidToken) ||
		errors.Is(err, ErrInvalidFriendshipStatus) ||
		errors.Is(err, ErrInvalidNotificationType) ||
		errors.Is(err, ErrInvalidTopicString) ||
		errors.Is(err, ErrInvalidPlayAction) ||
		errors.Is(err, ErrInvalidLineCount)
}
