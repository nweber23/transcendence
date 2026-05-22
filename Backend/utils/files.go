package utils

import (
	"crypto/rand"
	"encoding/hex"
)

func getRandomHexString(length int) (string, error) {
	data := make([]byte, length)
	if _, err := rand.Read(data); err != nil {
		return "", err
	} else {
		return hex.EncodeToString(data), nil
	}
}