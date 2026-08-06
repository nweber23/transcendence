package models

import (
	"time"
)

type ChatParticipant struct {
	ID       uint `gorm:"primaryKey"`
	ChatID   uint
	UserID   uint
	LastRead time.Time
}

func (ChatParticipant) TableName() string {
	return "chat_participant"
}

type ChatMessage struct {
	ID           uint `gorm:"primaryKey"`
	ChatID       uint
	SenderUserID uint
	Message      string
	ImageURL     string
	CreatedAt    time.Time
	DeletedAt    *time.Time
}

func (ChatMessage) TableName() string {
	return "chat_messages"
}

type Chat struct {
	ID           uint              `gorm:"primaryKey"`
	Participants []ChatParticipant `gorm:"foreignKey:ChatID;references:ID"`
	Messages     []ChatMessage     `gorm:"foreignKey:ChatID;references:ID"`
}

func (Chat) TableName() string {
	return "chats"
}