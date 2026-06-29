package ws

import (
	"fmt"
	"time"

	"encoding/json"
	"transcendence/models"
	"transcendence/services"
	"transcendence/utils"

	"github.com/gorilla/websocket"
)

func (wsState *WebSocketState) SendToTopic(userID uint, topic Topic, packetType string, payload any) (error) {
	wsState.clientsMutex.RLock()
	Client := wsState.clients[userID]
	wsState.clientsMutex.RUnlock()
	if Client == nil {
		return nil
	}
	var packet packet
	var err    error
	packet.PacketType = packetType
	packet.Payload, err = json.Marshal(payload)
	if err != nil {
		return err
	}
	Client.topicLists[topic].send(packet)
	return nil
}

func (wsState *WebSocketState) SendToAll(topic Topic, packetType string, payload any) {
	wsState.clientsMutex.RLock()
	userIDs := make([]uint, len(wsState.clients))
	index := 0
	for userID, _ := range wsState.clients {
		userIDs[index] = userID
		index++
	}
	wsState.clientsMutex.RUnlock()
	for _, userID := range userIDs {
		wsState.SendToTopic(userID, topic, packetType, payload)
	}
}

func (wsState *WebSocketState) AddConnection(userID uint, connection *websocket.Conn, topics []Topic) {
	wsState.clientsMutex.Lock()
	Client := wsState.clients[userID]
	sendOnline := false
	if Client == nil {
		Client = &client{
			userID: userID,
		}
		wsState.clients[userID] = Client
		sendOnline = true
	}
	context := createConnectionContext(connection)
	Client.contextList.append(context)
	for _, topic := range topics {
		Client.topicLists[topic].append(context)
	}
	wsState.clientsMutex.Unlock()
	go wsState.pumpFromConnection(userID, context.connection)
	go pumpToConnection(context)
	fmt.Printf("Connection added for user %d\n", userID)
	if sendOnline {
		payload := PacketOnline{
			UserID:   userID,
			IsOnline: true,
		}
		wsState.SendToAll(TopicGeneric, "online", payload)
	}
}

func (wsState *WebSocketState) IsOnline(userID uint) (bool) {
	wsState.clientsMutex.RLock()
	isOnline := (wsState.clients[userID] != nil)
	wsState.clientsMutex.RUnlock()
	return isOnline
}

func (wsState *WebSocketState) PostNotification(notification models.Notification) (error) {
	information := services.NotificationTypeInformations[notification.Type]
	if information == nil {
		return utils.ErrInvalidNotificationType
	}
	if !(information.ShouldAdd || information.ShouldSend) {
		panic("Invalid notificationTypeInformation")
	}
	if information.ShouldAdd {
		if err := wsState.notificationService.AddNotification(notification); err != nil {
			return err
		}
	}
	if information.ShouldSend {
		notification.CreatedAt = time.Now()
		if err := wsState.SendToTopic(
			notification.UserID,
			TopicMap["notification_" + notification.Type],
			"notification",
			notification,
		); err != nil {
			return err
		}
	}
	return nil
}