package handlers

import (
	//"fmt"
	"crypto/subtle"
	"log"
	"net/http"

	"transcendence/middleware"
	"transcendence/services"
	"transcendence/utils"

	"github.com/gin-gonic/gin"
)

const oauthStateCookie = "oauth_state"

// isSecureRequest reports whether the original client connection was HTTPS.
// The backend sits behind Caddy, which terminates TLS and proxies to it over
// plain HTTP (see caddy/conf/Caddyfile), so c.Request.TLS is never set here —
// Caddy's X-Forwarded-Proto is the source of truth instead.
func isSecureRequest(c *gin.Context) bool {
	return c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https"
}

type AuthHandler struct {
	userService  *services.UserService
	oauthService *services.OauthService
	jwtSecret    string
	jwtExpiry    int64
	frontendURL  string
}

func NewAuthHandler(
	userService *services.UserService,
	oauthService *services.OauthService,
	jwtSecret string, jwtExpiry int64,
	frontendURL string,
) *AuthHandler {
	return &AuthHandler{
		userService:  userService,
		oauthService: oauthService,
		jwtSecret:    jwtSecret,
		jwtExpiry:    jwtExpiry,
		frontendURL:  frontendURL,
	}
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token  string `json:"token"`
	UserID uint   `json:"user_id"`
}

// TwoFactorChallengeResponse is returned from /auth/login in place of
// AuthResponse when the account has 2FA enabled. TempToken is scoped only to
// completing the challenge at /auth/2fa/verify (see AuthMiddleware).
type TwoFactorChallengeResponse struct {
	TwoFactorRequired bool   `json:"two_factor_required"`
	TempToken         string `json:"temp_token"`
	UserID            uint   `json:"user_id"`
}

type TwoFactorLoginRequest struct {
	TempToken string `json:"temp_token" binding:"required"`
	Code      string `json:"code" binding:"required"`
}

// Register handles POST /auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	user, err := h.userService.RegisterUser(req.Username, req.Email, req.Password)
	if err != nil {
		utils.RespondError(c, http.StatusConflict, "registration_fail", err.Error())
		return
	}
	middleware.AccountsCreatedTotal.Inc()
	token := utils.GenerateToken(user.ID, h.jwtSecret, h.jwtExpiry)
	utils.RespondSuccess(c, http.StatusCreated, "user registered successfully", AuthResponse{
		Token:  token,
		UserID: user.ID,
	})
}

// Login handles POST /auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	user, err := h.userService.LoginUser(req.Username, req.Password)
	if err != nil {
		middleware.LoginsTotal.WithLabelValues("failure").Inc()
		var message string
		if utils.IsErrInvalid(err) {
			message = "invalid user or password"
		} else {
			message = err.Error()
		}
		utils.RespondError(c, http.StatusConflict, "login_fail", message)
		return
	}
	if user.TwoFactorEnabled {
		tempToken := utils.GenerateTwoFactorToken(user.ID, h.jwtSecret)
		utils.RespondSuccess(c, http.StatusOK, "two-factor authentication required", TwoFactorChallengeResponse{
			TwoFactorRequired: true,
			TempToken:         tempToken,
			UserID:            user.ID,
		})
		return
	}
	middleware.LoginsTotal.WithLabelValues("success").Inc()
	token := utils.GenerateToken(user.ID, h.jwtSecret, h.jwtExpiry)
	utils.RespondSuccess(c, http.StatusOK, "user logged in successfully", AuthResponse{
		Token:  token,
		UserID: user.ID,
	})
}

// VerifyTwoFactorLogin handles POST /auth/2fa/verify, completing a login
// that Login() paused on because the account has 2FA enabled.
func (h *AuthHandler) VerifyTwoFactorLogin(c *gin.Context) {
	var req TwoFactorLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	claims, err := utils.ValidateToken(req.TempToken, h.jwtSecret)
	if err != nil || claims.Purpose != utils.TwoFactorPurpose {
		utils.RespondError(c, http.StatusUnauthorized, "invalid_token", "invalid or expired two-factor challenge")
		return
	}
	ok, err := h.userService.VerifyTwoFactorCode(claims.UserID, req.Code)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "two_factor_verify_failed", err.Error())
		return
	}
	if !ok {
		log.Printf("invalid TOTP login attempt for user %d", claims.UserID)
		middleware.LoginsTotal.WithLabelValues("failure").Inc()
		utils.RespondError(c, http.StatusUnauthorized, "invalid_code", "invalid two-factor authentication code")
		return
	}
	middleware.LoginsTotal.WithLabelValues("success").Inc()
	token := utils.GenerateToken(claims.UserID, h.jwtSecret, h.jwtExpiry)
	utils.RespondSuccess(c, http.StatusOK, "user logged in successfully", AuthResponse{
		Token:  token,
		UserID: claims.UserID,
	})
}

// Logout handles POST /auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Token invalidation would require a blacklist (Redis) in production
	// For now, just return success - client deletes token
	utils.RespondError(c, http.StatusOK, "logout successful", nil)
}

func (h *AuthHandler) OauthLogin(c *gin.Context) {
	provider := h.oauthService.GetProvider(c.Param("provider"))
	if provider == nil {
		utils.RespondError(c, http.StatusNotFound, "404 Not Found", nil)
		return
	}

	state, err := utils.GetRandomHexString(32)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "state_gen_failed", err.Error())
		return
	}
	// Bind the state to this browser via a short-lived cookie; verified
	// against the provider's callback query param to prevent CSRF against
	// the OAuth flow (an attacker tricking a victim into completing a login
	// initiated by the attacker).
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(oauthStateCookie, state, 600, "/auth", "", isSecureRequest(c), true)

	c.Redirect(http.StatusFound, provider.GetLoginUrl(state))
}

func (h *AuthHandler) OauthCallback(c *gin.Context) {
	providerName := c.Param("provider")
	provider := h.oauthService.GetProvider(providerName)
	if provider == nil {
		utils.RespondError(c, http.StatusNotFound, "404 Not Found", nil)
		return
	}

	cookieState, cookieErr := c.Cookie(oauthStateCookie)
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(oauthStateCookie, "", -1, "/auth", "", isSecureRequest(c), true)
	queryState := c.Query("state")
	if cookieErr != nil || queryState == "" ||
		subtle.ConstantTimeCompare([]byte(cookieState), []byte(queryState)) != 1 {
		utils.RespondError(c, http.StatusBadRequest, "invalid_state", "OAuth state mismatch.")
		return
	}

	code := c.Query("code")
	if code == "" {
		utils.RespondError(c, http.StatusBadRequest, "no_code", "No code provided.")
		return
	}

	token, err := provider.ExchangeCode(code)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "oauth_exchange_failed", err.Error())
		return
	}

	oauthUser, err := provider.GetUser(token)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "oauth_user_fetch_failed", err.Error())
		return
	}

	// Mirror the provider's avatar locally under ./uploads so it's served the
	// same way as a manually uploaded avatar (see UploadAvatar). If the
	// download fails, fall back to no avatar rather than failing the login.
	localAvatar := ""
	if oauthUser.AvatarURL != "" {
		if filename, err := utils.DownloadAvatarToUploads(oauthUser.AvatarURL, "./uploads/"); err == nil {
			localAvatar = filename
		}
	}

	user, err := h.userService.FindOrCreateOauthUser(providerName, oauthUser.ID, oauthUser.Username, oauthUser.Email, localAvatar)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "user_creation_failed", err.Error())
		return
	}

	jwtToken := utils.GenerateToken(user.ID, h.jwtSecret, h.jwtExpiry)

	// The token rides in the URL fragment rather than the query string: the
	// fragment is never sent to any server (including ours, on this very
	// redirect) and browsers don't forward it in the Referer header, so it
	// won't end up in server access logs.
	redirectURL := h.frontendURL + "/auth/callback#token=" + jwtToken
	c.Redirect(http.StatusFound, redirectURL)
}