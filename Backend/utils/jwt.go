package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TwoFactorPurpose marks a token as a short-lived, limited-scope credential
// issued mid-login while a user's TOTP code is still pending verification.
// It must never be accepted by AuthMiddleware for normal API access.
const TwoFactorPurpose = "2fa_pending"

const twoFactorTokenExpiry = 5 * time.Minute

type Claims struct {
	UserID  uint   `json:"user_id"`
	Purpose string `json:"purpose,omitempty"`
	jwt.RegisteredClaims
}

// GenerateToken generates a JWT token with UserID and expiry
func GenerateToken(userID uint, secret string, expirySeconds int64) string {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expirySeconds) * time.Second)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString([]byte(secret))
	return tokenString
}

// GenerateTwoFactorToken issues a short-lived token scoped to completing a
// 2FA login challenge. AuthMiddleware rejects it for anything else.
func GenerateTwoFactorToken(userID uint, secret string) string {
	claims := Claims{
		UserID:  userID,
		Purpose: TwoFactorPurpose,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(twoFactorTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString([]byte(secret))
	return tokenString
}

// ValidateToken validates a JWT token and returns the claims
func ValidateToken(tokenString, secret string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
