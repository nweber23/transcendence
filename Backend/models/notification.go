package models

import (
	"time"
)

type Notification struct {
	ID        uint      `json:"id"          gorm:"primaryKey;uniqueIndex"`
	UserID    uint      `json:"-"`
	Type      string    `json:"type"`
	Head      string    `json:"head"`
	Body      string    `json:"body"`
	ImageURL  string    `json:"image_url"`
	ActionURL string    `json:"action_url"`
	CreatedAt time.Time `json:"created_at"`
}

func (Notification) TableName() string {
	return "notifications"
}

const (
	NotificationTypeFriends = "friends"
	NotificationTypeGames   = "games"
	NotificationTypeSystem  = "system"
)