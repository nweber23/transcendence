package services

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"transcendence/models"
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
		status == models.FriendshipStatusPendingIDLow  && userID == lowID ||
		status == models.FriendshipStatusPendingIDHigh && userID == highID;
}

func getNextStatus(userID uint, friendID uint, status string) (string) {
	lowID := min(userID, friendID)
	if status == models.FriendshipStatusDormant {
		if userID == lowID {
			return models.FriendshipStatusPendingIDLow
		} else {
			return models.FriendshipStatusPendingIDHigh
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
	err := s.db.Where("low_id = ? AND high_id = ? AND status != 'dormant'", lowID, highID).First(&friendship).Error
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

func (s *FriendService) EnumerateFriends(userID uint, statuses []string, limit int) ([]models.Friendship, error) {
	tx := s.db.Where("TRUE")
	for _, status := range statuses {
		switch status {
			case models.FriendshipStatusDormant:
				fallthrough
			case models.FriendshipStatusActive:
				fallthrough
			case models.FriendshipStatusPendingIDLow:
				fallthrough
			case models.FriendshipStatusPendingIDHigh:
				tx = tx.Or("status = ?", status)
			case models.FriendshipStatusPendingSelf:
				tx = tx.
					Or("status = 'pending_id_low'  AND low_id  = ?", userID).
					Or("status = 'pending_id_high' AND high_id = ?", userID)
			case models.FriendshipStatusPendingOther:
				tx = tx.
					Or("status = 'pending_id_low'  AND low_id  != ?", userID).
					Or("status = 'pending_id_high' AND high_id != ?", userID)
			default:
				return nil, errors.New("invalid status")
		}
	}
	var friends []models.Friendship
	if err := s.db.
		Where("low_id = ? OR high_id = ?", userID, userID).
		Where(tx).
		Order("status ASC").
		Order("created_at DESC").
		Limit(limit).
		Find(&friends).
	Error; err != nil {
		return nil, err
	}
	return friends, nil
}

func (s *FriendService) AreFriends(firstID uint, secondID uint) (bool, error) {
	if firstID == secondID {
		return false, nil
	} 
	lowID, highID := swapIDs(firstID, secondID)
	var friendship models.Friendship
	err := s.db.Where("low_id = ? AND high_id = ? AND status = 'active'", lowID, highID).First(&friendship).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	} else if err != nil {
		return false, err
	} else {
		return true, nil
	}
}