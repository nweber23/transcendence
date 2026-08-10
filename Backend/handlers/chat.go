package handlers

import (
	"strconv"

	"net/http"
	"transcendence/models"
	"transcendence/services"
	"transcendence/utils"

	"github.com/gin-gonic/gin"
)

type ChatHandler struct {
	chatService   *services.ChatService
	friendService *services.FriendService
}

func NewChatHandler(
	chatService   *services.ChatService,
	friendService *services.FriendService,
) *ChatHandler {
	return &ChatHandler{
		chatService:   chatService,
		friendService: friendService,
	}
}

func (ch *ChatHandler) CreateChat(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	var participantIDs []uint
	if err := c.ShouldBindJSON(&participantIDs); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	participants := make([]models.ChatParticipant, len(participantIDs))
	notFriendsWith := make([]uint, 0)
	foundSelf := false
	for participantIndex, participantID := range participantIDs {
		if userID.(uint) == participantID {
			areFriends, err := ch.friendService.AreFriends(userID.(uint), participantID)
			if err != nil {
				utils.RespondError(c, http.StatusInternalServerError, "are_friends_failed", err.Error())
			}
			if !areFriends {
				notFriendsWith = append(notFriendsWith, participantID)
			}
		} else {
			foundSelf = true
		}
		participants[participantIndex] = models.ChatParticipant{
			UserID:  participantID,
			IsAdmin: participantID == userID.(uint), // The creator is automatically set to be an admin
		}
	}
	if !foundSelf {
		utils.RespondError(c, http.StatusForbidden, "excluding_self", "You can't create a chat without yourself")
		return
	}
	if len(notFriendsWith) != 0 {
		utils.RespondError(c, http.StatusForbidden, "not_friends_with", notFriendsWith)
		return
	}
	chatID, err := ch.chatService.CreateChat(models.Chat{}, participants)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "create_chat_failed", "Failed to create chat")
		return
	}
	utils.RespondSuccess(c, http.StatusCreated, "Chat created successfully", chatID)
}

func (ch *ChatHandler) EnumerateChats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	limit := 20
	offset := 0
	if limitString := c.Query("limit"); limitString != "" {
		if limitParsed, err := strconv.Atoi(limitString); err == nil && limitParsed > 0 && limitParsed <= 100 {
			limit = limitParsed
		}
	}
	if offsetString := c.Query("offset"); offsetString != "" {
		if offsetParsed, err := strconv.Atoi(offsetString); err == nil && offsetParsed >= 0 {
			offset = offsetParsed
		}
	}
	chatState, err := ch.chatService.EnumerateChatsIncludingParticipants(userID.(uint), offset, limit)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "enumerate_chats_inc_part_failed", err.Error())
		return
	}
	utils.RespondSuccess(c, http.StatusOK, "Successfully retrieved all chats", chatState)
}

func (ch *ChatHandler) EnumerateMessages(c *gin.Context) {
	chatID, _ := c.Get("chat_id")
	limit := 20
	offset := 0
	if limitString := c.Query("limit"); limitString != "" {
		if limitParsed, err := strconv.Atoi(limitString); err == nil && limitParsed > 0 && limitParsed <= 100 {
			limit = limitParsed
		}
	}
	if offsetString := c.Query("offset"); offsetString != "" {
		if offsetParsed, err := strconv.Atoi(offsetString); err == nil && offsetParsed >= 0 {
			offset = offsetParsed
		}
	}
	chatMessages, err := ch.chatService.EnumerateMessagesOf(chatID.(uint), offset, limit)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "enumerate_messages_failed", "Failed to enumerate messages")
		return
	}
	utils.RespondSuccess(c, http.StatusOK, "Messages enumerated successfully", chatMessages)
}

func (ch *ChatHandler) SetParticipant(c *gin.Context) {
	isAdmin, _ := c.Get("is_admin")
	if !isAdmin.(bool) {
		utils.RespondError(c, http.StatusForbidden, "not_admin", "Admin status is required for this endpoint")
		return
	}
	var participant models.ChatParticipant
	if err := c.ShouldBindJSON(&participant); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if _, err := ch.chatService.SetParticipant(participant); err != nil {
		var status int
		if utils.IsErrInvalid(err) {
			status = http.StatusBadRequest
		} else {
			status = http.StatusInternalServerError
		}
		utils.RespondError(c, status, "set_participant_failed", err.Error())
		return
	}
	utils.RespondSuccess(c, http.StatusOK, "Participant set successfully", participant)
}

func (ch *ChatHandler) RemoveParticipant(c *gin.Context) {
	isAdmin, _ := c.Get("is_admin")
	if !isAdmin.(bool) {
		utils.RespondError(c, http.StatusForbidden, "not_admin", "Admin status is required for this endpoint")
		return
	}
	var participant models.ChatParticipant
	if err := c.ShouldBindJSON(&participant); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if err := ch.chatService.RemoveParticipant(participant); err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "remove_participant_failed", err.Error())
		return
	}
	utils.RespondSuccess(c, http.StatusOK, "Participant removed successfully", participant)
}