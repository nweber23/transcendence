package handlers

import (
	"os"
	"net/http"
	"strconv"
	"strings"
	"path/filepath"

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
	ID        uint   `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatarURL"`
	JoinedAt  string `json:"joined_at"`
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
	user, err = uh.userService.UpdateUser(userID.(uint), username, email, passwordHash, user.AvatarURL)
	if err != nil {
		var status int
		// TODO: Perhaps create a full enum of errors for our API
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
		ID:        userID.(uint),
		Username:  username,
		Email:     email,
		AvatarURL: user.AvatarURL,
		JoinedAt:  user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	utils.RespondSuccess(c, http.StatusOK, "Profile updated successfully", response)
}

func createRelatedURL(uploadFilePath string) (string, bool) {
	fileName := filepath.Base(uploadFilePath)
	if fileName == "." || fileName == "/" {
		return "", false
	}
	fileDots := strings.Split(fileName, ".")
	fileExtension := ""
	if len(fileDots) > 1 {
		fileExtension = "." + fileDots[len(fileDots) - 1]
	}
	for {
		fileURL := utils.getRandomHexString(16) + fileExtension
		if _, err := os.Stat(filepath.Join("./uploads/", fileURL)); os.IsNotExist(err) {
			return fileURL, true
		}
	}
}

// UploadAvatar
func (uh* UserHandler) UploadAvatar(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H {"error": err.Error()})
		return
	}
	err = os.Mkdir("./uploads/")
	if err != nil && !os.IsExist(err) {
		utils.RespondError(c, http.StatusInternalServerError, "create_uploads_directory_failed", err.Error())
		return
	}
	user, err := uh.UserService.GetUserByID(userID.(uint))
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "user_not_found", err.Error())
		return
	}
	err = os.Remove(filepath.Join("./uploads/", user.AvatarURL))
	if err != nil && !os.IsNotExist(err) {
		utils.RespondError(c, http.StatusInternalServerError, "delete_old_avatar_failed", err.Error())
		return
	}
	user.AvatarURL, isValid = createRelatedURL(file.Filename)
	if !isValid {
		utils.RespondError(c, http.StatusBadRequest, "failed_to_create_url", "Invalid file name")
		return
	}
	c.SaveUploadedFile(file, filepath.Join("./uploads/", user.AvatarURL))
	user, err = uh.userService.UpdateUser(
		userID.(uint),
		user.username,
		user.email,
		user.passwordHash,
		user.AvatarURL,
	)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "update_user_failed", err.Error())
		return
	}
	response := UserProfileResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		AvatarURL: user.AvatarURL,
		JoinedAt:  user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	utils.RespondSuccess(c, http.StatusCreated, "Avatar uploaded and updated successfully", response)
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
