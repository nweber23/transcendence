package models

import (
	"time"
)

type Friendship struct {
	ID        uint `gorm:"primaryKey"`
	UserID    uint
	FriendID  uint
	CreatedAt time.Time
}

func (Friendship) TableName() string {
	return "friendships"
}