package models

import (
	"time"
)

type ChatParticipant struct {
	UserID   uint      `json:"user_id"   gorm:"primaryKey"`
	ChatID   uint      `json:"-"         gorm:"primaryKey"`
	IsAdmin  bool      `json:"is_admin"`
	LastRead time.Time
}

func (ChatParticipant) TableName() string {
	return "chat_participant"
}

type ChatMessage struct {
	ID           uint       `json:"-"              gorm:"primaryKey"`
	ChatID       uint       `json:"-"`
	SenderUserID uint       `json:"sender_user_id"`
	Message      string     `json:"message"`
	ImageURL     string     `json:"image_url"`
	CreatedAt    time.Time  `json:"created_at"`
	DeletedAt    *time.Time `json:"-"`
}

func (ChatMessage) TableName() string {
	return "chat_messages"
}

type Chat struct {
	ID uint `gorm:"primaryKey"`
}

func (Chat) TableName() string {
	return "chats"
}