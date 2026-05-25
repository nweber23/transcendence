package services

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
	"transcendence/models"
	"transcendence/utils"
)

type FriendService struct {
	db *gorm.DB
}

func NewFriendService(db *gorm.DB) *FriendService {
	return &FriendService{db: db}
}

func (s *FriendService) AddFriend(userID uint, friendID uint) (error) {
	if userID == friendID {
		return errors.New("self love only works irl")
	}
	userService := NewUserService(s.db)
	if _, err := userService.GetUserByID(userID); err != nil {
		return err
	}
	if _, err := userService.GetUserByID(friendID); err != nil {
		return err
	}
	var friendship models.Friendship
	if err := utils.ReinterpretNotFound(
		s.db.Where("user_id = ? AND friend_id = ?", userID, friendID).
		First(&friendship).
		Error); err != nil {
		return err
	}
	friendship = models.Friendship{
		UserID:   userID,
		FriendID: friendID,
	}
	if err := s.db.Create(&friendship).Error; err != nil {
		return fmt.Errorf("failed to create friendship: %w", err)
	}
	return nil
}

func (s *FriendService) RemoveFriend(userID uint, friendID uint) (error) {
	var friendship models.Friendship
	if err := s.db.Where("user_id = ? AND friend_id = ?", userID, friendID).Delete(&friendship).Error; err != nil {
		return fmt.Errorf("failed to remove friendship: %w", err)
	}
	return nil
}

func (s *FriendService) GetFriends(userID uint) ([]models.Friendship, error) {
	var friends []models.Friendship
	if err := s.db.Where("user_id = ?", userID).Find(&friends).Error; err != nil {
		return nil, fmt.Errorf("failed to get friends: %w", err)
	}
	return friends, nil
}