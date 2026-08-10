package middleware

import (
	"errors"
	"strconv"

	"net/http"
	"transcendence/models"
	"transcendence/services"
	"transcendence/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func ValidateChatMembership(chatService *services.ChatService) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
			c.Abort()
			return
		}
		chatID, err := strconv.Atoi(c.Param("chat_id"))
		if err != nil {
			utils.RespondError(c, http.StatusBadRequest, "get_chat_id_failed", err.Error())
			c.Abort()
			return
		}
		participant, err := chatService.GetParticipant(models.ChatParticipant{UserID: userID.(uint), ChatID: uint(chatID)})
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				utils.RespondError(c, http.StatusForbidden, "not_in_chat", "You are not in this chat")
			} else {
				utils.RespondError(c, http.StatusInternalServerError, "get_participant_failed", err.Error())
			}
			c.Abort()
			return
		}
		c.Set("chat_id", uint(chatID))
		c.Set("is_admin", participant.IsAdmin)
		c.Next()
	}
}