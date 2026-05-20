package handlers

import (
	"net/http"
	"strconv"

	"transcendence/services"
	"transcendence/utils"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

type UserHandler struct {
	userService    *services.UserService
	accountService *services.AccountService
}

func NewUserHandler(userService *services.UserService, accountService *services.AccountService) *UserHandler {
	return &UserHandler{
		userService:    userService,
		accountService: accountService,
	}
}

type UserProfileResponse struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	JoinedAt string `json:"joined_at"`
}

type AccountResponse struct {
	Balance      string `json:"balance"`
	TotalWagered string `json:"total_wagered"`
	TotalWon     string `json:"total_won"`
	TotalLost    string `json:"total_lost"`
}

type TransactionResponse struct {
	ID           uint   `json:"id"`
	Type         string `json:"type"`
	Amount       string `json:"amount"`
	BalanceAfter string `json:"balance_after"`
	Status       string `json:"status"`
	CreatedAt    string `json:"created_at"`
}

type TransactionHistoryResponse struct {
	Transactions []TransactionResponse `json:"transactions"`
}

type UserProfileRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password" binding:"omitempty,min=8"`
}

type DepositRequest struct {
	Amount string `json:"amount" binding:"required"`
}

type WithdrawRequest struct {
	Amount string `json:"amount" binding:"required"`
}

// GetProfile retrieves user profile information
func (uh *UserHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	user, err := uh.userService.GetUserByID(userID.(uint))
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "user_not_found", err.Error())
		return
	}
	response := UserProfileResponse{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
		JoinedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	utils.RespondSuccess(c, http.StatusOK, "Profile retrieved successfully", response)
}

// UpdateProfile updates the user profile
func (uh *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	var req UserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	user, err := uh.userService.GetUserByID(userID.(uint))
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "user_not_found", err.Error())
		return
	}
	var username     string = req.Username
	var email        string = req.Email
	var password     string = req.Password
	var passwordHash string
	if len(username) == 0 {
		username = user.Username
	}
	if len(email) == 0 {
		email = user.Email
	}
	if len(password) == 0 {
		passwordHash = user.PasswordHash
	} else {
		passwordHash, err = utils.HashPassword(password)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, "hash_password_failed", err.Error())
			return
		}
	}
	user, err = uh.userService.UpdateUser(userID.(uint), username, email, passwordHash)
	if err != nil {
		var status int
		if err.Error() == "invalid username" || err.Error() == "invalid email" {
			status = http.StatusBadRequest
		} else if err.Error() == "username or email already exists" {
			status = http.StatusConflict
		} else {
			status = http.StatusInternalServerError
		}
		utils.RespondError(c, status, "update_user_failed", err.Error())
		return
	}
	response := UserProfileResponse{
		ID:       userID.(uint),
		Username: username,
		Email:    email,
		JoinedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	utils.RespondSuccess(c, http.StatusOK, "Profile updated successfully", response)
}

// GetAccount retrieves account balance and summary
func (uh *UserHandler) GetAccount(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	account, err := uh.accountService.GetAccount(userID.(uint))
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "account_not_found", err.Error())
		return
	}
	response := AccountResponse{
		Balance:      account.Balance.String(),
		TotalWagered: account.TotalWagered.String(),
		TotalWon:     account.TotalWon.String(),
		TotalLost:    account.TotalLost.String(),
	}
	utils.RespondSuccess(c, http.StatusOK, "Account retrieved successfully", response)
}

// GetTransactionHistory retrieves paginated transaction history
func (uh *UserHandler) GetTransactionHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	limit := 20
	offset := 0
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	if o := c.Query("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}
	transactions, err := uh.accountService.GetTransactionHistory(userID.(uint), limit, offset)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "fetch_failed", err.Error())
		return
	}
	txResponses := make([]TransactionResponse, len(transactions))
	for i, tx := range transactions {
		txResponses[i] = TransactionResponse{
			ID:           tx.ID,
			Type:         tx.Type,
			Amount:       tx.Amount.String(),
			BalanceAfter: tx.BalanceAfter.String(),
			Status:       tx.Status,
			CreatedAt:    tx.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}
	response := TransactionHistoryResponse{
		Transactions: txResponses,
	}
	utils.RespondSuccess(c, http.StatusOK, "Transaction history retrieved successfully", response)
}

// Deposit adds funds to user's account
func (uh *UserHandler) Deposit(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	var req DepositRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	amount, err := decimal.NewFromString(req.Amount)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_amount", "Amount must be a valid number")
		return
	}
	if amount.LessThanOrEqual(decimal.Zero) {
		utils.RespondError(c, http.StatusBadRequest, "invalid_amount", "Deposit amount must be greater than zero")
		return
	}
	if err := uh.accountService.Deposit(userID.(uint), amount); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "deposit_failed", err.Error())
		return
	}
	account, err := uh.accountService.GetAccount(userID.(uint))
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "fetch_failed", "Failed to retrieve updated account")
		return
	}
	response := AccountResponse{
		Balance:      account.Balance.String(),
		TotalWagered: account.TotalWagered.String(),
		TotalWon:     account.TotalWon.String(),
		TotalLost:    account.TotalLost.String(),
	}
	utils.RespondSuccess(c, http.StatusOK, "Deposit successful", response)
}

// Withdraw removes funds from user's account
func (uh *UserHandler) Withdraw(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	var req WithdrawRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	amount, err := decimal.NewFromString(req.Amount)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_amount", "Amount must be a valid number")
		return
	}
	if amount.LessThanOrEqual(decimal.Zero) {
		utils.RespondError(c, http.StatusBadRequest, "invalid_amount", "Withdrawal amount must be greater than zero")
		return
	}
	if err := uh.accountService.Withdraw(userID.(uint), amount); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "withdrawal_failed", err.Error())
		return
	}
	account, err := uh.accountService.GetAccount(userID.(uint))
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "fetch_failed", "Failed to retrieve updated account")
		return
	}
	response := AccountResponse{
		Balance:      account.Balance.String(),
		TotalWagered: account.TotalWagered.String(),
		TotalWon:     account.TotalWon.String(),
		TotalLost:    account.TotalLost.String(),
	}
	utils.RespondSuccess(c, http.StatusOK, "Withdrawal successful", response)
}
