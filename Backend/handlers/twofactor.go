package handlers

import (
	"bytes"
	"encoding/base64"
	"errors"
	"image/png"
	"log"
	"net/http"

	"transcendence/utils"

	"github.com/gin-gonic/gin"
)

type TwoFactorSetupResponse struct {
	Secret     string `json:"secret"`
	QRCode     string `json:"qr_code"`
	OtpauthURL string `json:"otpauth_url"`
}

type TwoFactorVerifyRequest struct {
	Code string `json:"code" binding:"required"`
}

type TwoFactorConfirmResponse struct {
	BackupCodes []string `json:"backup_codes"`
}

type TwoFactorDisableRequest struct {
	Password string `json:"password" binding:"required"`
}

// SetupTwoFactor handles POST /user/2fa/setup. It stages a new TOTP secret
// (not yet enabled — see ConfirmTwoFactor) and returns a QR code for
// scanning plus the raw secret for manual entry.
func (uh *UserHandler) SetupTwoFactor(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	key, err := uh.userService.SetupTwoFactor(userID.(uint))
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, utils.ErrTwoFactorAlreadyEnabled) {
			status = http.StatusConflict
		}
		utils.RespondError(c, status, "two_factor_setup_failed", err.Error())
		return
	}
	img, err := key.Image(256, 256)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "qr_code_generation_failed", err.Error())
		return
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "qr_code_generation_failed", err.Error())
		return
	}
	response := TwoFactorSetupResponse{
		Secret:     key.Secret(),
		QRCode:     "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes()),
		OtpauthURL: key.URL(),
	}
	utils.RespondSuccess(c, http.StatusOK, "Scan the QR code with your authenticator app", response)
}

// ConfirmTwoFactor handles POST /user/2fa/verify. It confirms the secret
// staged by SetupTwoFactor with a TOTP code, enabling 2FA and returning
// one-time backup codes.
func (uh *UserHandler) ConfirmTwoFactor(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	var req TwoFactorVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	backupCodes, err := uh.userService.ConfirmTwoFactor(userID.(uint), req.Code)
	if err != nil {
		status := http.StatusInternalServerError
		switch {
		case errors.Is(err, utils.ErrInvalidTwoFactorCode):
			log.Printf("invalid TOTP setup code for user %d", userID.(uint))
			status = http.StatusBadRequest
		case errors.Is(err, utils.ErrTwoFactorAlreadyEnabled), errors.Is(err, utils.ErrTwoFactorNotSetUp):
			status = http.StatusBadRequest
		}
		utils.RespondError(c, status, "two_factor_verify_failed", err.Error())
		return
	}
	uh.postSystemNotification(
		userID.(uint),
		"Two-factor authentication enabled",
		"Your account is now protected with an authenticator app",
		"/account/profile",
	)
	utils.RespondSuccess(c, http.StatusOK, "Two-factor authentication enabled", TwoFactorConfirmResponse{BackupCodes: backupCodes})
}

// DisableTwoFactor handles DELETE /user/2fa. The account password must be
// re-verified before 2FA can be turned off.
func (uh *UserHandler) DisableTwoFactor(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	var req TwoFactorDisableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if err := uh.userService.DisableTwoFactor(userID.(uint), req.Password); err != nil {
		status := http.StatusInternalServerError
		switch {
		case errors.Is(err, utils.ErrInvalidPassword):
			status = http.StatusUnauthorized
		case errors.Is(err, utils.ErrTwoFactorNotEnabled):
			status = http.StatusBadRequest
		}
		utils.RespondError(c, status, "two_factor_disable_failed", err.Error())
		return
	}
	uh.postSystemNotification(
		userID.(uint),
		"Two-factor authentication disabled",
		"Your account no longer requires an authenticator code to sign in",
		"/account/profile",
	)
	// APIResponse.Data uses `json:"data,omitempty"`, so a literal nil here would
	// drop the "data" key entirely and trip the frontend's `'data' in result` check.
	utils.RespondSuccess(c, http.StatusOK, "Two-factor authentication disabled", struct{}{})
}
