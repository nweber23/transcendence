package models

import (
	"time"
)

type Friendship struct {
	LowID       uint       `gorm:"primaryKey"`
	HighID      uint       `gorm:"primaryKey"`
	Status      string     `gorm:"default:'dormant';index"`
	CreatedAt   time.Time
	DeletedAt   *time.Time `gorm:"index"`
}

func (Friendship) TableName() string {
	return "friendships"
}

const (
	FriendshipStatusDormant     = "dormant"
	FriendshipStatusPendingLow  = "pending_low"
	FriendshipStatusPendingHigh = "pending_high"
	FriendshipStatusActive      = "active"
)