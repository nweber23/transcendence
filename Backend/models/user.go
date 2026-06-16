package models

import (
	"time"

	"gorm.io/gorm"
)

const (
	DefaultAvatarURL = "default_avatar"
)

type User struct {
	ID           uint   `gorm:"primaryKey"`
	Username     string `gorm:"uniqueIndex,size:50"`
	Email        string `gorm:"uniqueIndex,size:255"`
	PasswordHash string `gorm:"size:255"`
	AvatarURL    string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    *time.Time `gorm:"index"`
}

func (User) TableName() string {
	return "users"
}
