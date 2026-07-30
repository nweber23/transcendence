package models

import (
	"time"
)

const (
	DefaultAvatarURL = "default_avatar"
)

type User struct {
	ID                   uint       `gorm:"primaryKey"`
	Username             string     `gorm:"uniqueIndex,size:50"`
	Email                string     `gorm:"uniqueIndex,size:255"`
	PasswordHash         string     `gorm:"size:255"`
  Provider             string     `gorm:"size:20;default:'local';uniqueIndex:idx_provider_account,where:provider_id != ''"`
	ProviderID           string     `gorm:"size:64;uniqueIndex:idx_provider_account,where:provider_id != ''"`
	AvatarURL            string
	NotificationTypes    string
	NotificationsSeenAt  *time.Time
	CreatedAt            time.Time
	UpdatedAt            time.Time
	DeletedAt            *time.Time `gorm:"index"`
}

func (User) TableName() string {
	return "users"
}