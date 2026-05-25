package utils

import (
	"crypto/rand"
	"encoding/hex"
	"errors"

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
		return errors.New("matching entry already exists")
	} else if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	} else {
		return err
	}
}