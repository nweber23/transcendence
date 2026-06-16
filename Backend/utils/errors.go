package utils

import (
	"errors"
)

var (
	ErrInvalidFilename           = errors.New("invalid filename")
	ErrInvalidUsername           = errors.New("invalid username")
	ErrInvalidPassword           = errors.New("invalid password")
	ErrInvalidEmail              = errors.New("invalid email")
	ErrInvalidToken              = errors.New("invalid token")

	ErrRandomStringGenFailed     = errors.New("failed to generate random string")
	ErrNegativeTransactionAmount = errors.New("amount must be greater than zero")
	ErrInsufficientBalance       = errors.New("insufficient balance")
	ErrSelfLove                  = errors.New("self love only works irl")
	ErrAlreadyBefriended         = errors.New("friend already added")
	ErrAlreadyDefriended         = errors.New("no friend to remove")
	ErrInvalidFriendshipStatus   = errors.New("invalid friendship status")
	ErrAccountNotFound           = errors.New("account not found")
	ErrGameNotFound              = errors.New("game not found")
	ErrUsernameWrongLength       = errors.New("username must be between 3 and 32 characters")
	ErrEntryExists               = errors.New("matching entry already exists")
)

func IsErrInvalid(err error) (bool) {
	return errors.Is(err, ErrInvalidFilename) ||
		   errors.Is(err, ErrInvalidUsername) ||
		   errors.Is(err, ErrInvalidPassword) ||
		   errors.Is(err, ErrInvalidEmail)    ||
		   errors.Is(err, ErrInvalidToken)
}
