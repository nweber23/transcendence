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
	FriendshipStatusDormant       = "dormant"
	FriendshipStatusPendingIDLow  = "pending_id_low"
	FriendshipStatusPendingIDHigh = "pending_id_high"
	FriendshipStatusPendingSelf   = "pending_self"
	FriendshipStatusPendingOther  = "pending_other"
	FriendshipStatusActive        = "active"
)