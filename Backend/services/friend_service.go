package services

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"transcendence/models"
)

const (
	StatusDormant     = "dormant"
	StatusPendingLow  = "pending_low"
	StatusPendingHigh = "pending_high"
)

type FriendService struct {
	db *gorm.DB
}

func NewFriendService(db *gorm.DB) *FriendService {
	return &FriendService{db: db}
}

func swapIDs(firstID uint, secondID uint) (uint, uint) {
	return min(firstID, secondID), max(firstID, secondID)
}

func isFriendAdded(userID uint, friendID uint, status string) (bool) {
	lowID, highID := swapIDs(userID, friendID)
	return status == models.FriendshipStatusActive ||
		status == models.FriendshipStatusPendingLow  && userID == lowID ||
		status == models.FriendshipStatusPendingHigh && userID == highID;
}

func getNextStatus(userID uint, friendID uint, status string) (string) {
	lowID := min(userID, friendID)
	if status == models.FriendshipStatusDormant {
		if userID == lowID {
			return models.FriendshipStatusPendingLow
		} else {
			return models.FriendshipStatusPendingHigh
		}
	} else {
		return models.FriendshipStatusActive
	}
}

func (s *FriendService) AddFriend(userID uint, friendID uint) (bool, error) {
	if userID == friendID {
		return false, errors.New("self love only works irl")
	}
	userService := NewUserService(s.db)
	if _, err := userService.GetUserByID(userID); err != nil {
		return false, err
	}
	if _, err := userService.GetUserByID(friendID); err != nil {
		return false, err
	}
	lowID, highID := swapIDs(userID, friendID)
	friendship := models.Friendship{
		LowID:  lowID,
		HighID: highID,
		Status: models.FriendshipStatusDormant,
	}
	shouldCreate := false
	err := s.db.Where("low_id = ? AND high_id = ?", lowID, highID).First(&friendship).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		shouldCreate = true
	} else if err != nil {
		return false, err
	} else {
		friendship.DeletedAt = &time.Time{}
	}
	_ = shouldCreate
	// Kept to preserve code structure that might require this bool in the future
	if isFriendAdded(userID, friendID, friendship.Status) {
		return false, errors.New("friend already added")
	}
	friendship.Status = getNextStatus(userID, friendID, friendship.Status)
	if err := s.db.Save(&friendship).Error; err != nil {
		return false, fmt.Errorf("failed to add friend: %w", err)
	}
	return friendship.Status != models.FriendshipStatusActive, nil
}

func (s *FriendService) RemoveFriend(firstID uint, secondID uint) (error) {
	lowID, highID := swapIDs(firstID, secondID)
	var friendship models.Friendship
	err := s.db.Where("low_id = ? AND high_id = ? AND deleted_at IS NULL", lowID, highID).First(&friendship).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New("no friend to remove")
	} else if err != nil {
		return err
	}
	friendship.Status = "dormant"
	currentTime := time.Now()
	friendship.DeletedAt = &currentTime
	if err := s.db.Save(&friendship).Error; err != nil {
		return fmt.Errorf("failed to remove friend: %w", err)
	}
	return nil
}

func (s *FriendService) GetFriends(userID uint) ([]models.Friendship, error) {
	var friends []models.Friendship
	if err := s.db.Where("(low_id = ? OR high_id = ?) AND status = 'dormant'", userID, userID).
	Find(&friends).
	Error; err != nil {
		return nil, fmt.Errorf("failed to get friends: %w", err)
	}
	return friends, nil
}

func (s *FriendService) AreFriends(firstID uint, secondID uint) (bool, error) {
	if firstID == secondID {
		return false, nil
	} 
	lowID, highID := swapIDs(firstID, secondID)
	var friendship models.Friendship
	err := s.db.Where("low_id = ? AND high_id = ? AND deleted_at IS NULL", lowID, highID).First(&friendship).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	} else if err != nil {
		return false, err
	} else {
		return true, nil
	}
}