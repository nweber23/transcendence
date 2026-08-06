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

type AddChatMessageInfo struct {
	SenderID     uint
	Message      string
	ImageURL     string
	RecipientIDs []uint
}

func (s *ChatService) AddChatMessage(info AddChatMessageInfo) (*models.ChatMessage, error) {
	recipientIDs := info.RecipientIDs
	recipientCount := len(info.RecipientIDs)
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
		SenderID:   info.SenderID,
		Message:    info.Message,
		ImageURL:   info.ImageURL,
		Recipients: recipients,
	}
	if err := s.db.Create(chatMessage).Error; err != nil {
		return nil, fmt.Errorf("failed to create chat message: %w", err)
	}
	return chatMessage, nil
}

func (s *ChatService) RemoveChatMessage(ID uint) (error) {
	chatMessage := ChatMessage{
		ID: ID
	}
	if err := s.db.Delete(&notification).Error; err != nil {
		return fmt.Errorf("failed to delete chat message: %w", err)
	}
	return nil
}

type UpdateChatMessageInfo struct {
	Message  string
	ImageURL string
}

func (s *ChatService) EditChatMessage(ID uint, message string) (*models.ChatMessage, error) {
	chatMessage := &models.ChatMessage{
		ID:      ID,
		Message: message,
	}
	if err := s.db.UpdateColumns(chatMessage).Error; err != nil {
		return nil, fmt.Errorf("failed to edit chat message: %w", err)
	}
	return chatMessage, nil
}

type UpdateRecipientOfInfo struct {
	ReadAt time.Time
}

func (s *ChatService) UpdateRecipientOf(
	ChatMessageID uint,
	UserID        uint,
	info          UpdateRecipientOfInfo,
) (*models.Recipient, error) {
	recipient := &models.Recipient{
		ReadAt: info.ReadAt
	}
	if err := s.db.Where("chat_message_id = ? AND user_id = ?", ChatMessageID, UserID).UpdateColumns(recipient).Error; err != nil {
		return nil, fmt.Errorf("failed to update recipient: %w", err)
	}
	return recipient, nil
}

func (s *ChatService) EnumerateMessagesOf(RecipientIDs uint[]) ([]models.ChatMessage, error) {
	if err := s.db.Where("")
}