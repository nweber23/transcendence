package utils

import (
	"errors"
	"regexp"

	"github.com/shopspring/decimal"
)

var amountPattern = regexp.MustCompile(`^\d{1,15}(\.\d{1,8})?$`)

var ErrInvalidAmount = errors.New("amount must be a valid, non-scientific decimal number")

func ParseAmount(s string) (decimal.Decimal, error) {
	if !amountPattern.MatchString(s) {
		return decimal.Decimal{}, ErrInvalidAmount
	}
	return decimal.NewFromString(s)
}
