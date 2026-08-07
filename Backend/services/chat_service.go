package services

import (
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

func (s *ChatService) CreateChat(participantIDs []uint) (uint, error) {
	userService := NewUserService(s.db)
	leftIndex := 0
	for leftIndex < len(participantIDs) {
		if !userService.DoesUserExist(participantIDs[leftIndex]) {
			return 0, utils.ErrInvalidUserID
		}
		rightIndex := leftIndex + 1
		for rightIndex < len(participantIDs) {
			if participantIDs[leftIndex] == participantIDs[rightIndex] {
				return 0, utils.ErrDuplicateParticipantIDs
			}
			rightIndex++
		}
		leftIndex++
	}
	participants := make([]models.ChatParticipant, len(participantIDs))
	for participantIndex, participantID := range participantIDs {
		participants[participantIndex] = models.ChatParticipant{
			UserID: participantID,
		}
	}
	chat := &models.Chat{
		Participants: participants,
	}
	if err := s.db.Create(chat).Error; err != nil {
		return 0, err
	}
	return chat.ID, nil
}

func (s *ChatService) DoesChatExist(chatID uint) (bool) {
	var chat models.Chat
	err := s.db.Where("id = ?", chatID).First(&chat).Error
	return err == nil
}

func (s *ChatService) AddParticipant(participant models.ChatParticipant) (*models.ChatParticipant, error) {
	if !s.DoesChatExist(participant.ChatID) {
		return nil, utils.ErrInvalidChatID
	}
	userService := NewUserService(s.db)
	if !userService.DoesUserExist(participant.UserID) {
		return nil, utils.ErrInvalidUserID
	}
	if err := s.db.Create(&participant).Error; err != nil {
		return nil, err
	}
	return &participant, nil
}

func (s *ChatService) RemoveParticipant(participant models.ChatParticipant) (error) {
	err := s.db.Delete(&participant).Error
	if err != nil {
		return err
	}
	err = s.db.Where("chat_id = ?", participant.ChatID).First(&participant).Error
	if err == gorm.ErrRecordNotFound {
		chat := models.Chat{
			ID: participant.ChatID,
		}
		err = s.db.Delete(&chat).Error
	}
	return err
}

type ChatMessageInfo struct {
	ChatID       uint
	SenderUserID uint
	Message      string
	ImageURL     string
}

func (s *ChatService) AddChatMessage(info ChatMessageInfo) (*models.ChatMessage, error) {
	var participant models.ChatParticipant
	err := s.db.Where("chat_id = ? AND user_id = ?", info.ChatID, info.SenderUserID).First(&participant).Error
	if err != nil {
		return nil, err
	}
	chatMessage := &models.ChatMessage{
		ChatID:       info.ChatID,
		SenderUserID: info.SenderUserID,
		Message:      info.Message,
		ImageURL:     info.ImageURL,
	}
	if err := s.db.Create(chatMessage).Error; err != nil {
		return nil, err
	}
	return chatMessage, nil
}

func (s *ChatService) EnumerateMessagesOf(chatID uint, offset int, limit int) ([]models.ChatMessage, error) {
	var chatMessages []models.ChatMessage
	if err := s.db.
		Where("chat_id = ?", chatID).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&chatMessages).
	Error; err != nil {
		return nil, err
	}
	return chatMessages, nil
}