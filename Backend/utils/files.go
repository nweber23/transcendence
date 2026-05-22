package utils

import (
	"crypto/rand"
	"encoding/hex"
)

func GetRandomHexString(length int) (string, error) {
	data := make([]byte, length)
	if _, err := rand.Read(data); err != nil {
		return "", err
	} else {
		return hex.EncodeToString(data), nil
	}
}