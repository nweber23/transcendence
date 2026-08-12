package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
)

var ErrDecryptionFailed = errors.New("failed to decrypt value")

// EncryptString and DecryptString use AES-GCM with a key derived from secret
// (via SHA-256, so any-length secret works as key material) to protect
// values — like a TOTP secret — that, unlike a password, must be recovered
// in cleartext later and therefore can't just be hashed.
func EncryptString(plaintext, secret string) (string, error) {
	key := sha256.Sum256([]byte(secret))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func DecryptString(encoded, secret string) (string, error) {
	key := sha256.Sum256([]byte(secret))
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", ErrDecryptionFailed
	}
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", ErrDecryptionFailed
	}
	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", ErrDecryptionFailed
	}
	return string(plaintext), nil
}
