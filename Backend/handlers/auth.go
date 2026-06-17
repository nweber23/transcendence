package handlers

import (
	"net/http"

	"transcendence/services"
	"transcendence/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	userService *services.UserService
	jwtSecret   string
	jwtExpiry   int64
}

func NewAuthHandler(userService *services.UserService, jwtSecret string, jwtExpiry int64) *AuthHandler {
	return &AuthHandler{
		userService: userService,
		jwtSecret:   jwtSecret,
		jwtExpiry:   jwtExpiry,
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
