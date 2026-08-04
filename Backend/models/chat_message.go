package models

import (
	"time"
)

type Recipient struct {
	ID            uint      `gorm:"primaryKey"`
	ChatMessageID uint
	UserID        uint
	ReadAt        time.Time
}

type ChatMessage struct {
	ID           uint        `gorm:"primaryKey"`
	SenderID     uint
	Message      string
	ImageURL     string
	CreatedAt    time.Time
	DeletedAt    *time.Time
	Recipients   []Recipient `gorm:"foreignKey:ChatMessageID;references:ID"`
}

func (Recipient) TableName() string {
	return "recipients"
}

func (ChatMessage) TableName() string {
	return "chat_messages"
}
