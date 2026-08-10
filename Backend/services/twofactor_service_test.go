package services

import (
	"errors"
	"testing"
	"time"

	"transcendence/utils"

	"github.com/pquerna/otp/totp"
)

func setupTwoFactorUser(testInterface *testing.T, userService *UserService) uint {
	user, err := userService.RegisterUser("totpuser", "totpuser@example.com", "password123")
	if err != nil {
		testInterface.Fatalf("failed to register user: %v", err)
	}
	return user.ID
}

func TestSetupTwoFactorStagesUnconfirmedSecret(testInterface *testing.T) {
	_, userService, _, _ := createMockServices(testInterface)
	userID := setupTwoFactorUser(testInterface, userService)

	key, err := userService.SetupTwoFactor(userID)
	if err != nil {
		testInterface.Fatalf("SetupTwoFactor failed: %v", err)
	}
	if key.Secret() == "" {
		testInterface.Fatalf("expected a non-empty TOTP secret")
	}

	user, err := userService.GetUserByID(userID)
	if err != nil {
		testInterface.Fatalf("GetUserByID failed: %v", err)
	}
	if user.TwoFactorEnabled {
		testInterface.Fatalf("expected 2FA to remain disabled until confirmed")
	}
	if user.TwoFactorSecret != key.Secret() {
		testInterface.Fatalf("expected stored secret to match generated key")
	}
}

func TestConfirmTwoFactorEnablesAndReturnsBackupCodes(testInterface *testing.T) {
	_, userService, _, _ := createMockServices(testInterface)
	userID := setupTwoFactorUser(testInterface, userService)

	key, err := userService.SetupTwoFactor(userID)
	if err != nil {
		testInterface.Fatalf("SetupTwoFactor failed: %v", err)
	}
	code, err := totp.GenerateCode(key.Secret(), time.Now())
	if err != nil {
		testInterface.Fatalf("failed to generate TOTP code: %v", err)
	}

	backupCodes, err := userService.ConfirmTwoFactor(userID, code)
	if err != nil {
		testInterface.Fatalf("ConfirmTwoFactor failed: %v", err)
	}
	if len(backupCodes) != backupCodeCount {
		testInterface.Fatalf("expected %d backup codes, got %d", backupCodeCount, len(backupCodes))
	}

	user, err := userService.GetUserByID(userID)
	if err != nil {
		testInterface.Fatalf("GetUserByID failed: %v", err)
	}
	if !user.TwoFactorEnabled {
		testInterface.Fatalf("expected 2FA to be enabled after confirmation")
	}
}

func TestConfirmTwoFactorRejectsInvalidCode(testInterface *testing.T) {
	_, userService, _, _ := createMockServices(testInterface)
	userID := setupTwoFactorUser(testInterface, userService)

	if _, err := userService.SetupTwoFactor(userID); err != nil {
		testInterface.Fatalf("SetupTwoFactor failed: %v", err)
	}
	if _, err := userService.ConfirmTwoFactor(userID, "000000"); !errors.Is(err, utils.ErrInvalidTwoFactorCode) {
		testInterface.Fatalf("expected ErrInvalidTwoFactorCode, got %v", err)
	}
}

func TestConfirmTwoFactorRejectsWrongLengthCodesWithoutValidating(testInterface *testing.T) {
	_, userService, _, _ := createMockServices(testInterface)
	userID := setupTwoFactorUser(testInterface, userService)

	key, err := userService.SetupTwoFactor(userID)
	if err != nil {
		testInterface.Fatalf("SetupTwoFactor failed: %v", err)
	}
	// A valid code padded/truncated is still the wrong shape and must be
	// rejected outright rather than passed to totp.Validate.
	validCode, err := totp.GenerateCode(key.Secret(), time.Now())
	if err != nil {
		testInterface.Fatalf("failed to generate TOTP code: %v", err)
	}
	for _, malformed := range []string{validCode[:5], validCode + "0", "abcdef", ""} {
		if _, err := userService.ConfirmTwoFactor(userID, malformed); !errors.Is(err, utils.ErrInvalidTwoFactorCode) {
			testInterface.Fatalf("expected ErrInvalidTwoFactorCode for code %q, got %v", malformed, err)
		}
	}
}

func TestVerifyTwoFactorCodeAcceptsTOTP(testInterface *testing.T) {
	_, userService, _, _ := createMockServices(testInterface)
	userID := setupTwoFactorUser(testInterface, userService)

	key, err := userService.SetupTwoFactor(userID)
	if err != nil {
		testInterface.Fatalf("SetupTwoFactor failed: %v", err)
	}
	setupCode, err := totp.GenerateCode(key.Secret(), time.Now())
	if err != nil {
		testInterface.Fatalf("failed to generate TOTP code: %v", err)
	}
	if _, err := userService.ConfirmTwoFactor(userID, setupCode); err != nil {
		testInterface.Fatalf("ConfirmTwoFactor failed: %v", err)
	}

	loginCode, err := totp.GenerateCode(key.Secret(), time.Now())
	if err != nil {
		testInterface.Fatalf("failed to generate TOTP code: %v", err)
	}
	ok, err := userService.VerifyTwoFactorCode(userID, loginCode)
	if err != nil {
		testInterface.Fatalf("VerifyTwoFactorCode failed: %v", err)
	}
	if !ok {
		testInterface.Fatalf("expected a valid TOTP code to verify")
	}

	ok, err = userService.VerifyTwoFactorCode(userID, "000000")
	if err != nil {
		testInterface.Fatalf("VerifyTwoFactorCode failed: %v", err)
	}
	if ok {
		testInterface.Fatalf("expected an invalid code to fail verification")
	}
}

func TestVerifyTwoFactorCodeRejectsWrongLengthCodes(testInterface *testing.T) {
	_, userService, _, _ := createMockServices(testInterface)
	userID := setupTwoFactorUser(testInterface, userService)

	key, err := userService.SetupTwoFactor(userID)
	if err != nil {
		testInterface.Fatalf("SetupTwoFactor failed: %v", err)
	}
	setupCode, err := totp.GenerateCode(key.Secret(), time.Now())
	if err != nil {
		testInterface.Fatalf("failed to generate TOTP code: %v", err)
	}
	if _, err := userService.ConfirmTwoFactor(userID, setupCode); err != nil {
		testInterface.Fatalf("ConfirmTwoFactor failed: %v", err)
	}

	for _, malformed := range []string{"12345", "1234567", ""} {
		ok, err := userService.VerifyTwoFactorCode(userID, malformed)
		if err != nil {
			testInterface.Fatalf("VerifyTwoFactorCode failed for code %q: %v", malformed, err)
		}
		if ok {
			testInterface.Fatalf("expected code %q to be rejected", malformed)
		}
	}
}

func TestVerifyTwoFactorCodeConsumesBackupCodeOnce(testInterface *testing.T) {
	_, userService, _, _ := createMockServices(testInterface)
	userID := setupTwoFactorUser(testInterface, userService)

	key, err := userService.SetupTwoFactor(userID)
	if err != nil {
		testInterface.Fatalf("SetupTwoFactor failed: %v", err)
	}
	setupCode, err := totp.GenerateCode(key.Secret(), time.Now())
	if err != nil {
		testInterface.Fatalf("failed to generate TOTP code: %v", err)
	}
	backupCodes, err := userService.ConfirmTwoFactor(userID, setupCode)
	if err != nil {
		testInterface.Fatalf("ConfirmTwoFactor failed: %v", err)
	}

	code := backupCodes[0]
	ok, err := userService.VerifyTwoFactorCode(userID, code)
	if err != nil {
		testInterface.Fatalf("VerifyTwoFactorCode failed: %v", err)
	}
	if !ok {
		testInterface.Fatalf("expected backup code to verify")
	}

	ok, err = userService.VerifyTwoFactorCode(userID, code)
	if err != nil {
		testInterface.Fatalf("VerifyTwoFactorCode failed: %v", err)
	}
	if ok {
		testInterface.Fatalf("expected a used backup code to be rejected on replay")
	}
}

func TestDisableTwoFactorRequiresCorrectPassword(testInterface *testing.T) {
	_, userService, _, _ := createMockServices(testInterface)
	userID := setupTwoFactorUser(testInterface, userService)

	key, err := userService.SetupTwoFactor(userID)
	if err != nil {
		testInterface.Fatalf("SetupTwoFactor failed: %v", err)
	}
	setupCode, err := totp.GenerateCode(key.Secret(), time.Now())
	if err != nil {
		testInterface.Fatalf("failed to generate TOTP code: %v", err)
	}
	if _, err := userService.ConfirmTwoFactor(userID, setupCode); err != nil {
		testInterface.Fatalf("ConfirmTwoFactor failed: %v", err)
	}

	if err := userService.DisableTwoFactor(userID, "wrong-password"); !errors.Is(err, utils.ErrInvalidPassword) {
		testInterface.Fatalf("expected ErrInvalidPassword, got %v", err)
	}

	if err := userService.DisableTwoFactor(userID, "password123"); err != nil {
		testInterface.Fatalf("DisableTwoFactor failed: %v", err)
	}

	user, err := userService.GetUserByID(userID)
	if err != nil {
		testInterface.Fatalf("GetUserByID failed: %v", err)
	}
	if user.TwoFactorEnabled || user.TwoFactorSecret != "" || user.TwoFactorBackupCodes != "" {
		testInterface.Fatalf("expected 2FA state to be fully cleared after disabling")
	}
}

func TestSetupTwoFactorRejectsWhenAlreadyEnabled(testInterface *testing.T) {
	_, userService, _, _ := createMockServices(testInterface)
	userID := setupTwoFactorUser(testInterface, userService)

	key, err := userService.SetupTwoFactor(userID)
	if err != nil {
		testInterface.Fatalf("SetupTwoFactor failed: %v", err)
	}
	setupCode, err := totp.GenerateCode(key.Secret(), time.Now())
	if err != nil {
		testInterface.Fatalf("failed to generate TOTP code: %v", err)
	}
	if _, err := userService.ConfirmTwoFactor(userID, setupCode); err != nil {
		testInterface.Fatalf("ConfirmTwoFactor failed: %v", err)
	}

	if _, err := userService.SetupTwoFactor(userID); !errors.Is(err, utils.ErrTwoFactorAlreadyEnabled) {
		testInterface.Fatalf("expected ErrTwoFactorAlreadyEnabled, got %v", err)
	}
}
