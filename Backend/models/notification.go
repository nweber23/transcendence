package models

import (
	"time"

	"encoding/json"
)

type Notification struct {
	ID        uint            `gorm:"primaryKey;uniqueIndex"`
	UserID    uint
	Type      string
	Contents  json.RawMessage `gorm:"type:jsonb;default:'{}'"`
	CreatedAt time.Time
}

func (Notification) TableName() string {
	return "notifications"
}

const (
	NotificationTypeFriends = "friends"
	NotificationTypeGames   = "games"
)