package utils

import (
	"testing"
)

type ExpectEmail struct {
	email    string
	expected bool
}

func TestValidateEmail(testInterface *testing.T) {
	expectTable := []ExpectEmail {
		ExpectEmail {
			"gabrielhodges2006@yahoo.com",
			true,
		},
		/*ExpectEmail {
			"ghodges@student.42heilbronn.de",
			true,
		},*/
		ExpectEmail {
			"aahahhahahahhahahaha",
			false,
		},
	}
	size := len(expectTable)
	index := 0
	for index < size {
		expectEntry := &expectTable[index]
		if result := ValidateEmail(expectEntry.email); result != expectEntry.expected {
			testInterface.Errorf(`Expected %t for %s, got %t instead`, expectEntry.expected, expectEntry.email, result)
		}
		index++
	}
}

func ValidateTokenAndReport(testInterface *testing.T, tokenString string, secret string, expectValid bool) (*Claims, error) {
	claims, err := ValidateToken(tokenString, secret)
	if expectValid && err != nil {
		testInterface.Errorf(`Expected token %s with secret %s to be valid but it isn't`, tokenString, secret)
	} else if !expectValid && err == nil {
		testInterface.Errorf(`Expected token %s with secret %s to be invalid but it isn't`, tokenString, secret)
	}
	return claims, err
}

func TestTokens(testInterface *testing.T) {
	var token string
	token = GenerateToken(0, "728", 10)
	ValidateTokenAndReport(testInterface, token, "728", true)
	token = GenerateToken(0, "pipopipo", 0)
	ValidateTokenAndReport(testInterface, token, "pipopipo", false)
}

func TestPasswords(testInterface *testing.T) {
	passwords := []string {
		"password",
		"12345",
		"",
	}
	const size int = len(passwords)
	var index int
	for index = 0; index < size {
		password := &string[index]
		if !VerifyPassword(HashPassword(*password), password) {
			testInterface.Errorf(`Password %s does not verify against itself as it ought to be`, password)
		}
		index++
	}
	for index = 0; index < size {
		password := &string[index]
		if VerifyPassword(HashPassword(*password), HashPassword(*password)) {
			testInterface.Errorf(`Password %s shouldn't verify against hashed self`, password)
		}
		index++
	}
	for index = 0; index < size {
		password := &string[index]
		if VerifyPassword(HashPassword(*password), "") {
			testInterface.Errorf(`Password %s shouldn't verify against empty string`, password)
		}
		index++
	}
}