package utils

import (
	"errors"
	"strings"

	"crypto/rand"
	"encoding/hex"

	"gorm.io/gorm"
)

func GetRandomHexString(length int) (string, error) {
	data := make([]byte, length)
	if _, err := rand.Read(data); err != nil {
		return "", err
	} else {
		return hex.EncodeToString(data), nil
	}
}

func ReinterpretNotFound(err error) (error) {
	if err == nil {
		return ErrEntryExists
	} else if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	} else {
		return err
	}
}

func OrdinalSplit(s string, sep string) ([]string) {
	if s == "" {
		return []string{}
	} else {
		return strings.Split(s, sep)
	}
}