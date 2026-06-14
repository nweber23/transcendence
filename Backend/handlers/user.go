package handlers

import (
	"errors"
	"os"
	"net/http"
	"strconv"
	"strings"
	"path/filepath"

	"transcendence/models"
	"transcendence/services"
	"transcendence/utils"
	"transcendence/ws"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type UserHandler struct {
	userService    *services.UserService
	accountService *services.AccountService
	friendService  *services.FriendService
}

func NewUserHandler(userService *services.UserService, accountService *services.AccountService, friendService *services.FriendService) *UserHandler {
	return &UserHandler{
		userService:    userService,
		accountService: accountService,
		friendService:  friendService,
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

type UpdateFriendResponse struct {
	FriendID uint   `json:"friend_id"`
	Status   string `json:"status"`
}

type FriendResponse struct {
	FriendID  uint   `json:"friend_id"`
	Status    string `json:"status"`
	IsOnline  bool   `json:"is_online"`
	CreatedAt string `json:"created_at"`
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
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		AvatarURL: user.AvatarURL,
		JoinedAt:  user.CreatedAt.Format("2006-01-02T15:04:05Z"),
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
		} else if err.Error() == "matching entry already exists" {
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

func createRelatedURL(uploadFilePath string) (string, error) {
	fileName := filepath.Base(uploadFilePath)
	if fileName == "." || fileName == "/" {
		return "", errors.New("invalid file name")
	}
	fileDots := strings.Split(fileName, ".")
	fileExtension := ""
	if len(fileDots) > 1 {
		fileExtension = "." + fileDots[len(fileDots) - 1]
	}
	for {
		fileURL, err := utils.GetRandomHexString(16)
		if err != nil {
			return "", errors.New("failed to generate random string")
		}
		fileURL += fileExtension
		if _, err := os.Stat(filepath.Join("./uploads/", fileURL)); err != nil {
			return fileURL, nil
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
	err = os.Mkdir("./uploads/", os.ModeDir)
	if err != nil && !os.IsExist(err) {
		utils.RespondError(c, http.StatusInternalServerError, "create_uploads_directory_failed", err.Error())
		return
	}
	user, err := uh.userService.GetUserByID(userID.(uint))
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "user_not_found", err.Error())
		return
	}
	if user.AvatarURL != models.DefaultAvatarURL {
		err = os.Remove(filepath.Join("./uploads/", user.AvatarURL))
		if err != nil && !os.IsNotExist(err) {
			utils.RespondError(c, http.StatusInternalServerError, "delete_old_avatar_failed", err.Error())
			return
		}
	}
	user.AvatarURL, err = createRelatedURL(file.Filename)
	if err != nil {
		var status int
		if err.Error() == "invalid file name" {
			status = http.StatusBadRequest
		}
		if err.Error() == "failed to generate random string" {
			status = http.StatusInternalServerError
		}
		utils.RespondError(c, status, "create_url_failed", err.Error())
		return
	}
	c.SaveUploadedFile(file, filepath.Join("./uploads/", user.AvatarURL))
	user, err = uh.userService.UpdateUser(
		userID.(uint),
		user.Username,
		user.Email,
		user.PasswordHash,
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

func (uh *UserHandler) AddFriend(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	friendID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "get_friend_id_failed", err)
		return
	}
	isPending, err := uh.friendService.AddFriend(userID.(uint), uint(friendID))
	if err != nil {
		if (err.Error() == "self love only works irl" ||
			errors.Is(err, gorm.ErrRecordNotFound) ||
			err.Error() == "friend already added") {
			utils.RespondError(c, http.StatusBadRequest, "add_friend_failed", err)
		} else {
			utils.RespondError(c, http.StatusInternalServerError, "add_friend_failed", err)
		}
	} else {
		status := models.FriendshipStatusActive
		if isPending {
			status = models.FriendshipStatusPendingSelf
		}
		response := UpdateFriendResponse{
			FriendID: uint(friendID),
			Status:   status,
		}
		utils.RespondSuccess(c, http.StatusOK, "Friend added successfully", &response)
	}
}

func (uh *UserHandler) RemoveFriend(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	friendID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "get_friend_id_failed", err)
		return
	}
	if err := uh.friendService.RemoveFriend(userID.(uint), uint(friendID)); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "remove_friend_failed", err)
	} else {
		response := UpdateFriendResponse{
			FriendID: uint(friendID),
			Status:   models.FriendshipStatusDormant,
		}
		utils.RespondSuccess(c, http.StatusOK, "Friend removed successfully", &response)
	}
}

func absoluteToRelativePending(userID uint, requiredSelfID uint) (string) {
	if userID == requiredSelfID {
		return models.FriendshipStatusPendingSelf
	} else {
		return models.FriendshipStatusPendingOther
	}
}

func determineStatus(userID uint, friendID uint, friendship *models.Friendship) (string, bool) {
	switch friendship.Status {
		case models.FriendshipStatusDormant:
			fallthrough
		case models.FriendshipStatusActive:
			return friendship.Status, true
		case models.FriendshipStatusPendingIDLow:
			return absoluteToRelativePending(userID, friendship.LowID), true
		case models.FriendshipStatusPendingIDHigh:
			return absoluteToRelativePending(userID, friendship.HighID), true
		default:
			return "", false
	}
}

func (uh *UserHandler) EnumerateFriends(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	limit, err := strconv.Atoi(c.Query("limit"))
	if err != nil || limit < 0 {
		utils.RespondError(c, http.StatusBadRequest, "invalid_limit", err)
		return
	}
	statuses := strings.Split(c.Query("statuses"), ",")
	friendships, err := uh.friendService.EnumerateFriends(userID.(uint), statuses, limit)
	if err != nil {
		var status int
		if err.Error() == "invalid status" {
			status = http.StatusBadRequest
		} else {
			status = http.StatusInternalServerError
		}
		utils.RespondError(c, status, "enumerate_friends_failed", err)
		return
	}
	friendResponses := make([]FriendResponse, len(friendships))
	for responseIndex, friendship := range friendships {
		friendID := friendship.LowID
		if friendID == userID {
			friendID = friendship.HighID
		}
		status, isValid := determineStatus(userID.(uint), friendID, &friendship)
		if !isValid {
			utils.RespondError(c, http.StatusInternalServerError, "determine_status_failed", "Invalid friendship status")
			return
		}
		friendResponses[responseIndex] = FriendResponse{
			FriendID:  friendID,
			Status:    status,
			IsOnline:  status != models.FriendshipStatusDormant && ws.IsOnline(friendID),
			// TODO: Reconsider in the future if we want online status to only be advertised to friends
			CreatedAt: friendship.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}
	utils.RespondSuccess(c, http.StatusOK, "Friend list retrieved successfully", friendResponses)
}