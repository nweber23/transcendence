package services

import (
	"fmt"

	"encoding/json"
	"transcendence/models"
	"transcendence/utils"

	"gorm.io/gorm"
)

type notificationTypeInformation struct {
	ShouldAdd  bool
	ShouldSend bool
}

type NotificationService struct {
	db *gorm.DB
}

var (
	NotificationTypeInformations = map[string]*notificationTypeInformation{
		models.NotificationTypeFriends: &notificationTypeInformation{true,  false},
		models.NotificationTypeGames:   &notificationTypeInformation{false, true },
	}
)

func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{db: db}
}

func (s *NotificationService) AddNotification(userID uint, Type string, contents any) (error) {
	if _, err := NewUserService(s.db).GetUserByID(userID); err != nil {
		return err
	}
	contentsJson, err := json.Marshal(contents)
	if err != nil {
		return err
	}
	notification := &models.Notification{
		UserID:   userID,
		Type:     Type,
		Contents: contentsJson,
	}
	if err := s.db.Create(notification).Error; err != nil {
		return fmt.Errorf("failed to create notification: %w", err)
	}
	return nil
}

// userID is additionally passed here to verify that the notification in question
// does in fact belong to the specified user
func (s *NotificationService) RemoveNotification(notificationID uint, userID uint) (error) {
	var notification models.Notification
	if err := s.db.Where("id = ?", notificationID).First(&notification).Error; err != nil {
		return err
	}
	if notification.UserID != userID {
		return utils.ErrNotificationIsNotYours
	}
	if err := s.db.Delete(notification).Error; err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}
	return nil
}

func (s *NotificationService) EnumerateNotifications(
	userID uint,
	Types  []string,
	limit  int,
) ([]models.Notification, error) {
	typeTx := s.db.Where("FALSE")
	for _, Type := range Types {
		if NotificationTypeInformations[Type] == nil {
			return nil, utils.ErrInvalidNotificationType
		}
		typeTx = typeTx.Or("type = ?", Type)
	}
	var notifications []models.Notification
	if err := s.db.
		Where("user_id = ?", userID).
		Where(typeTx).
		Order("created_at DESC").
		Limit(limit).
		Find(&notifications).
	Error; err != nil {
		return nil, err
	}
	return notifications, nil
}