package models

import (
	"time"
)

type Friendship struct {
	UserID    uint
	FriendID  uint
	CreatedAt time.Time
}

func (Friendship) TableName() string {
	return "friendships"
}