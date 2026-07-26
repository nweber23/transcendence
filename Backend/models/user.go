package models

import (
	"time"
)

const (
	DefaultAvatarURL = "default_avatar"
)

type User struct {
	ID                uint       `gorm:"primaryKey"`
	Username          string     `gorm:"uniqueIndex,size:50"`
	Email             string     `gorm:"uniqueIndex,size:255"`
	PasswordHash      string     `gorm:"size:255"` // leer bei OAuth-Usern
	AvatarURL         string
	NotificationTypes string
	Provider          string     `gorm:"size:20;default:'local';uniqueIndex:idx_provider_account"`
	ProviderID        string     `gorm:"size:64;uniqueIndex:idx_provider_account"`
	CreatedAt         time.Time
	UpdatedAt         time.Time
	DeletedAt         *time.Time `gorm:"index"`
}

func (User) TableName() string {
	return "users"
}