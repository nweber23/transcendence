package services

import (
	"transcendence/models"
	"transcendence/utils"

	"gorm.io/gorm"
)

type ChatService struct {
	db *gorm.DB
}

type ChatState struct {
	ChatID       uint
	YoureAdmin   bool
	Participants []models.ChatParticipant
}

func NewChatService(db *gorm.DB) *ChatService {
	return &ChatService{db: db}
}

func (s *ChatService) CreateChat(chat models.Chat, participants []models.ChatParticipant) (uint, error) {
	userService := NewUserService(s.db)
	for _, participant := range participants {
		if !userService.DoesUserExist(participant.UserID) {
			return 0, utils.ErrInvalidUserID
		}
	}
	if err := s.db.Create(&chat).Error; err != nil {
		return 0, err
	}
	for participantIndex, _ := range participants {
		participants[participantIndex].ChatID = chat.ID
	}
	return chat.ID, s.db.CreateInBatches(&participants, len(participants)).Error
}

func (s *ChatService) EnumerateChatsIncludingParticipants(userID uint, offset int, limit int) ([]ChatState, error) {
	var participantsSelf []models.ChatParticipant
	if err := s.db.Select("chat_id").Where("user_id = ?", userID).Find(&participantsSelf).Error; err != nil {
		return nil, err
	}
	chatStates := make([]ChatState, len(participantsSelf))
	for stateIndex, participantSelf := range participantsSelf {
		var participants []models.ChatParticipant
		if err := s.db.
			Where("chat_id = ?", participantSelf.ChatID).
			Find(&participants).
			Offset(offset).
			Limit(limit).
		Error; err != nil {
			return nil, err
		}
		chatState := &chatStates[stateIndex]
		chatState.ChatID       = participantSelf.ChatID
		chatState.YoureAdmin   = participantSelf.IsAdmin
		chatState.Participants = participants
	}
	return chatStates, nil
}

func (s *ChatService) DoesChatExist(chatID uint) (bool) {
	var chat models.Chat
	err := s.db.Where("id = ?", chatID).First(&chat).Error
	return err == nil
}

func (s *ChatService) GetParticipant(participant models.ChatParticipant) (*models.ChatParticipant, error) {
	err := s.db.Where("chat_id = ? AND user_id = ?", participant.ChatID, participant.UserID).First(&participant).Error
	return &participant, err
}

func (s *ChatService) SetParticipant(participant models.ChatParticipant) (*models.ChatParticipant, error) {
	if !s.DoesChatExist(participant.ChatID) {
		return nil, utils.ErrInvalidChatID
	}
	userService := NewUserService(s.db)
	if !userService.DoesUserExist(participant.UserID) {
		return nil, utils.ErrInvalidUserID
	}
	if err := s.db.Save(&participant).Error; err != nil {
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
	_, err := s.GetParticipant(models.ChatParticipant{
		ChatID: info.ChatID,
		UserID: info.SenderUserID,
	})
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

func (s *ChatService) EnumerateAllParticipantsOf(chatID uint) ([]models.ChatParticipant, error) {
	var participants []models.ChatParticipant
	if err := s.db.Where("chat_id = ?", chatID).Find(&participants).Error; err != nil {
		return nil, err
	}
	return participants, nil
}