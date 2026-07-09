package handlers

import (
	"errors"
	"fmt"
	"log"
	"os"
	"net/http"
	"strconv"
	"strings"
	"syscall"
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
	userService         *services.UserService
	accountService      *services.AccountService
	friendService       *services.FriendService
	notificationService *services.NotificationService
	wsState             *ws.WebSocketState
}

func NewUserHandler(
	userService         *services.UserService,
	accountService      *services.AccountService,
	friendService       *services.FriendService,
	notificationService *services.NotificationService,
	wsState             *ws.WebSocketState,
) *UserHandler {
	return &UserHandler{
		userService:         userService,
		accountService:      accountService,
		friendService:       friendService,
		notificationService: notificationService,
		wsState:             wsState,
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
	Username  string `json:"username"`
	AvatarURL string `json:"avatarURL"`
	Status    string `json:"status"`
	IsOnline  bool   `json:"is_online"`
	CreatedAt string `json:"created_at"`
}

type RemoveNotificationResponse struct {
	NotificationID uint `json:"notification_id"`
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
		AvatarURL: resolveAvatarURL(user.AvatarURL),
		JoinedAt:  user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	utils.RespondSuccess(c, http.StatusOK, "Profile retrieved successfully", response)
}

// UpdateProfile updates the user profile
// postSystemNotification sends a toast-only system notification to the acting
// user; failures must never fail the triggering request.
func (uh *UserHandler) postSystemNotification(userID uint, head string, body string, actionURL string) {
	notification := models.Notification{
		UserID:    userID,
		Type:      models.NotificationTypeSystem,
		Head:      head,
		Body:      body,
		ActionURL: actionURL,
	}
	if err := uh.wsState.PostNotification(notification); err != nil {
		log.Printf("failed to post system notification: %v", err)
	}
}

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
	user, err = uh.userService.UpdateUser(
		userID.(uint),
		username,
		email,
		passwordHash,
		user.AvatarURL,
		user.NotificationTypes,
	)
	if err != nil {
		var status int
		// TODO: Perhaps create a full enum of errors for our API
		if utils.IsErrInvalid(err) {
			status = http.StatusBadRequest
		} else if errors.Is(err, utils.ErrEntryExists) {
			status = http.StatusConflict
		} else {
			status = http.StatusInternalServerError
		}
		fmt.Println(err.Error())
		utils.RespondError(c, status, "update_user_failed", err.Error())
		return
	}
	response := UserProfileResponse{
		ID:        userID.(uint),
		Username:  username,
		Email:     email,
		AvatarURL: resolveAvatarURL(user.AvatarURL),
		JoinedAt:  user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	uh.postSystemNotification(userID.(uint), "Profile updated", "Your profile details were saved", "/account/profile")
	utils.RespondSuccess(c, http.StatusOK, "Profile updated successfully", response)
}

// resolveAvatarURL falls back to the default avatar when the referenced file
// no longer exists on disk (e.g. lost before the uploads volume was added).
func resolveAvatarURL(avatarURL string) string {
	if avatarURL == models.DefaultAvatarURL {
		return avatarURL
	}
	if _, err := os.Stat(filepath.Join("./uploads/", avatarURL)); err != nil {
		return models.DefaultAvatarURL
	}
	return avatarURL
}

func createRelatedURL(uploadFilePath string) (string, error) {
	fileName := filepath.Base(uploadFilePath)
	if fileName == "." || fileName == "/" {
		return "", utils.ErrInvalidFilename
	}
	fileDots := strings.Split(fileName, ".")
	fileExtension := ""
	if len(fileDots) > 1 {
		fileExtension = "." + fileDots[len(fileDots) - 1]
	}
	for {
		fileURL, err := utils.GetRandomHexString(16)
		if err != nil {
			return "", utils.ErrRandomStringGenFailed
		}
		fileURL += fileExtension
		if _, err := os.Stat(filepath.Join("./uploads/", fileURL)); err != nil {
			if os.IsNotExist(err) {
				return fileURL, nil
			} else {
				return "", err
			}
		}
	}
}

func (uh *UserHandler) UploadAvatar(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_form_file", err.Error())
		return
	}
	err = os.Mkdir("./uploads/", os.ModeDir | os.ModePerm)
	if err != nil && !os.IsExist(err) {
		utils.RespondError(c, http.StatusInternalServerError, "create_uploads_directory_failed", err.Error())
		return
	}
	user, err := uh.userService.GetUserByID(userID.(uint))
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "user_not_found", err.Error())
		return
	}
	oldURL := user.AvatarURL
	user.AvatarURL, err = createRelatedURL(file.Filename)
	if err != nil {
		var status int
		if errors.Is(err, utils.ErrInvalidFilename) {
			status = http.StatusBadRequest
		} else {
			status = http.StatusInternalServerError
		}
		utils.RespondError(c, status, "create_url_failed", err.Error())
		return
	}
	if err := c.SaveUploadedFile(file, filepath.Join("./uploads/", user.AvatarURL)); err != nil {
		var status int
		if errors.Is(err, syscall.ENOSPC) {
			status = http.StatusInsufficientStorage
		} else {
			status = http.StatusInternalServerError
		}
		utils.RespondError(c, status, "save_uploaded_file_failed", err.Error())
		return
	}
	user, err = uh.userService.UpdateUser(
		userID.(uint),
		user.Username,
		user.Email,
		user.PasswordHash,
		user.AvatarURL,
		user.NotificationTypes,
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
	uh.postSystemNotification(userID.(uint), "Avatar updated", "Your profile picture was updated", "/account/profile")
	utils.RespondSuccess(c, http.StatusCreated, "Avatar uploaded and updated successfully", response)
	if oldURL != models.DefaultAvatarURL {
		err = os.Remove(filepath.Join("./uploads/", oldURL))
		if err != nil {
			fmt.Printf("Failed to remove avatar %s: %v\n", oldURL, err)
		}
	}
}

func (uh *UserHandler) GetNotificationTypes(c *gin.Context) {
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
	utils.RespondSuccess(c, http.StatusOK, "NotificationTypes retrieved successfully", utils.OrdinalSplit(user.NotificationTypes, ","))
}

func (uh *UserHandler) SetNotificationTypes(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	var notificationTypes []string
	if err := c.ShouldBindJSON(&notificationTypes); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	user, err := uh.userService.GetUserByID(userID.(uint))
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "user_not_found", err.Error())
		return
	}
	user, err = uh.userService.UpdateUser(
		user.ID,
		user.Username,
		user.Email,
		user.PasswordHash,
		user.AvatarURL,
		strings.Join(notificationTypes, ","),
	);
	if err != nil {
		if utils.IsErrInvalid(err) {
			utils.RespondError(c, http.StatusBadRequest, "invalid_input", err.Error())
		} else {
			utils.RespondError(c, http.StatusInternalServerError, "update_user_failed", err.Error())
		}
		return
	}
	utils.RespondSuccess(c, http.StatusOK, "NotificationTypes updated successfully", notificationTypes)
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
	uh.postSystemNotification(
		userID.(uint),
		"Deposit successful",
		"$"+amount.String()+" added to your balance. New balance: $"+account.Balance.String(),
		"/account",
	)
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
	uh.postSystemNotification(
		userID.(uint),
		"Withdrawal successful",
		"$"+amount.String()+" withdrawn from your balance. New balance: $"+account.Balance.String(),
		"/account",
	)
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
		utils.RespondError(c, http.StatusBadRequest, "get_friend_id_failed", err.Error())
		return
	}
	isPending, err := uh.friendService.AddFriend(userID.(uint), uint(friendID))
	if err != nil {
		if (errors.Is(err, utils.ErrSelfLove) ||
			errors.Is(err, gorm.ErrRecordNotFound) ||
			errors.Is(err, utils.ErrAlreadyBefriended)) {
			utils.RespondError(c, http.StatusBadRequest, "add_friend_failed", err.Error())
		} else {
			utils.RespondError(c, http.StatusInternalServerError, "add_friend_failed", err.Error())
		}
	} else {
		status := models.FriendshipStatusActive
		if isPending {
			status = models.FriendshipStatusPendingSelf
		}
		if actor, err := uh.userService.GetUserByID(userID.(uint)); err == nil {
			notification := models.Notification{
				UserID:      uint(friendID),
				Type:        models.NotificationTypeFriends,
				ImageURL:    resolveAvatarURL(actor.AvatarURL),
				ActorUserID: &actor.ID,
				ActionURL:   "/friends",
			}
			if isPending {
				notification.Head = "New friend request"
				notification.Body = actor.Username + " has sent you a friend request"
			} else {
				notification.Head = "Friend request accepted"
				notification.Body = actor.Username + " accepted your friend request"
			}
			if err := uh.wsState.PostNotification(notification); err != nil {
				log.Printf("failed to post friend notification: %v", err)
			}
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
		utils.RespondError(c, http.StatusBadRequest, "get_friend_id_failed", err.Error())
		return
	}
	if err := uh.friendService.RemoveFriend(userID.(uint), uint(friendID)); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "remove_friend_failed", err.Error())
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
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_limit", err.Error())
		return
	}
	if limit < 0 {
		utils.RespondError(c, http.StatusBadRequest, "invalid_limit", "Limit must not be negative")
		return
	}
	/*statusesString := c.Query("statuses")
	if statusesString == "" {
		utils.RespondError(c, http.StatusBadRequest, "no_status_provided", "No status provided")
		return
	}*/
	statuses := utils.OrdinalSplit(c.Query("statuses"), ",")
	friendships, err := uh.friendService.EnumerateFriends(userID.(uint), statuses, limit)
	if err != nil {
		var status int
		if errors.Is(err, utils.ErrInvalidFriendshipStatus) {
			status = http.StatusBadRequest
		} else {
			status = http.StatusInternalServerError
		}
		utils.RespondError(c, status, "enumerate_friends_failed", err.Error())
		return
	}
	friendIDs := make([]uint, len(friendships))
	for i, friendship := range friendships {
		friendID := friendship.LowID
		if friendID == userID.(uint) {
			friendID = friendship.HighID
		}
		friendIDs[i] = friendID
	}
	usersByID, err := uh.userService.GetUsersByIDs(friendIDs)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "get_friend_user_failed", err.Error())
		return
	}
	friendResponses := make([]FriendResponse, len(friendships))
	for responseIndex, friendship := range friendships {
		friendID := friendIDs[responseIndex]
		status, isValid := determineStatus(userID.(uint), friendID, &friendship)
		if !isValid {
			utils.RespondError(c, http.StatusInternalServerError, "determine_status_failed", "Invalid friendship status")
			return
		}
		friendUser, ok := usersByID[friendID]
		if !ok {
			utils.RespondError(c, http.StatusInternalServerError, "get_friend_user_failed", "friend user not found")
			return
		}
		friendResponses[responseIndex] = FriendResponse{
			FriendID:  friendID,
			Username:  friendUser.Username,
			AvatarURL: resolveAvatarURL(friendUser.AvatarURL),
			Status:    status,
			IsOnline:  status == models.FriendshipStatusActive && uh.wsState.IsOnline(friendID),
			// TODO: Reconsider in the future if we want online status to only be advertised to friends
			CreatedAt: friendship.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}
	utils.RespondSuccess(c, http.StatusOK, "Friend list retrieved successfully", friendResponses)
}

func (uh *UserHandler) SearchUsers(c *gin.Context) {
	q := c.Query("q")
	if len(q) == 0 {
		utils.RespondError(c, http.StatusBadRequest, "invalid_query", "query parameter 'q' is required")
		return
	}
	limit := 10
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 50 {
			limit = parsed
		}
	}
	results, err := uh.userService.SearchUsers(q, limit)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "search_failed", err.Error())
		return
	}
	for i := range results {
		results[i].AvatarURL = resolveAvatarURL(results[i].AvatarURL)
	}
	utils.RespondSuccess(c, http.StatusOK, "Search results", results)
}

func (uh *UserHandler) RemoveNotification(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	notificationID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "get_notification_id_failed", err.Error())
		return
	}
	if err := uh.notificationService.RemoveNotification(uint(notificationID), userID.(uint)); err != nil {
		var status int
		if errors.Is(err, utils.ErrNotificationIsNotYours) {
			status = http.StatusForbidden
		} else if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusBadRequest
		} else {
			status = http.StatusInternalServerError
		}
		utils.RespondError(c, status, "remove_notification_failed", err.Error())
	} else {
		response := RemoveNotificationResponse{
			NotificationID: uint(notificationID),
		}
		utils.RespondSuccess(c, http.StatusOK, "Notification removed successfully", &response)
	}
}

func (uh *UserHandler) EnumerateNotifications(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	limit, err := strconv.Atoi(c.Query("limit"))
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_limit", err.Error())
		return
	}
	if limit < 0 {
		utils.RespondError(c, http.StatusBadRequest, "invalid_limit", "Limit must not be negative")
		return
	}
	TypesString := c.Query("types")
	if TypesString == "" {
		utils.RespondError(c, http.StatusBadRequest, "no_type_provided", "No status provided")
		return
	}
	Types := strings.Split(TypesString, ",")
	notifications, err := uh.notificationService.EnumerateNotifications(userID.(uint), Types, limit)
	if err != nil {
		var status int
		if errors.Is(err, utils.ErrInvalidNotificationType) {
			status = http.StatusBadRequest
		} else {
			status = http.StatusInternalServerError
		}
		utils.RespondError(c, status, "enumerate_notifications_failed", err.Error())
		return
	}
	actorIDs := make([]uint, 0, len(notifications))
	seenActorIDs := make(map[uint]bool, len(notifications))
	for _, notification := range notifications {
		if notification.ActorUserID != nil && !seenActorIDs[*notification.ActorUserID] {
			seenActorIDs[*notification.ActorUserID] = true
			actorIDs = append(actorIDs, *notification.ActorUserID)
		}
	}
	var actorsByID map[uint]*models.User
	if len(actorIDs) > 0 {
		actorsByID, err = uh.userService.GetUsersByIDs(actorIDs)
		if err != nil {
			utils.RespondError(c, http.StatusInternalServerError, "get_notification_actors_failed", err.Error())
			return
		}
	}
	for i := range notifications {
		if notifications[i].ActorUserID != nil {
			if actor, ok := actorsByID[*notifications[i].ActorUserID]; ok {
				notifications[i].ImageURL = resolveAvatarURL(actor.AvatarURL)
				continue
			}
		}
		if notifications[i].ImageURL != "" {
			notifications[i].ImageURL = resolveAvatarURL(notifications[i].ImageURL)
		}
	}
	utils.RespondSuccess(c, http.StatusOK, "Notifications retrieved successfully", notifications)
}
