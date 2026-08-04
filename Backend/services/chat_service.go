package services

import (
	"fmt"

	"transcendence/models"
	"transcendence/utils"

	"gorm.io/gorm"
)

type ChatService struct {
	db *gorm.DB
}

func NewChatService(db *gorm.DB) *ChatService {
	return &ChatService{db: db}
}

type ChatMessageInfo struct {
	SenderID     uint
	Message      string
	ImageURL     string
	RecipientIDs []uint
}

func (s *ChatService) AddChatMessage(chatMessageInfo ChatMessageInfo) (*models.ChatMessage, error) {
	recipientIDs := chatMessageInfo.RecipientIDs
	recipientCount := len(chatMessageInfo.RecipientIDs)
	leftIndex := 0
	for leftIndex < recipientCount {
		rightIndex := leftIndex + 1
		for rightIndex < recipientCount {
			if recipientIDs[leftIndex] == recipientIDs[rightIndex] {
				return nil, utils.ErrDuplicateRecipientIDs
			}
			rightIndex++
		}
		leftIndex++
	}
	recipients := make([]models.Recipient, recipientCount)
	for recipientIndex, _ := range recipients {
		recipients[recipientIndex].UserID = recipientIDs[recipientIndex]
	}
	chatMessage := &models.ChatMessage{
		SenderID:   chatMessageInfo.SenderID,
		Message:    chatMessageInfo.Message,
		ImageURL:   chatMessageInfo.ImageURL,
		Recipients: recipients,
	}
	if err := s.db.Create(chatMessage).Error; err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}
	return chatMessage, nil
}