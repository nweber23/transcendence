package handlers

import (
	//"fmt"
	"net/http"

	"transcendence/services"
	"transcendence/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	userService  *services.UserService
	oauthService *services.OauthService
	jwtSecret    string
	jwtExpiry    int64
}

func NewAuthHandler(
	userService *services.UserService,
	oauthService *services.OauthService,
	jwtSecret string, jwtExpiry int64,
) *AuthHandler {
	return &AuthHandler{
		userService:  userService,
		oauthService: oauthService,
		jwtSecret:    jwtSecret,
		jwtExpiry:    jwtExpiry,
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
		var message string
		if utils.IsErrInvalid(err) {
			message = "invalid user or password"
		} else {
			message = err.Error()
		}
		utils.RespondError(c, http.StatusConflict, "login_fail", message)
		return
	}
	token := utils.GenerateToken(user.ID, h.jwtSecret, h.jwtExpiry)
	utils.RespondSuccess(c, http.StatusOK, "user logged in successfully", AuthResponse{
		Token:  token,
		UserID: user.ID,
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
	c.Redirect(http.StatusFound, provider.GetLoginUrl())
}

func (h *AuthHandler) OauthCallback(c *gin.Context) {
	providerName := c.Param("provider")
	provider := h.oauthService.GetProvider(providerName)
	if provider == nil {
		utils.RespondError(c, http.StatusNotFound, "404 Not Found", nil)
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

	user, err := h.userService.FindOrCreateOauthUser(providerName, oauthUser.ID, oauthUser.Username, oauthUser.Email, oauthUser.AvatarURL)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "user_creation_failed", err.Error())
		return
	}

	jwtToken := utils.GenerateToken(user.ID, h.jwtSecret, h.jwtExpiry)
	utils.RespondSuccess(c, http.StatusOK, "oauth login successful", AuthResponse{
		Token:  jwtToken,
		UserID: user.ID,
	})
}