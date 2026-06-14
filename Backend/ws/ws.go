package ws

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"encoding/json"
	"transcendence/services"

	"github.com/gorilla/websocket"
)

type Topic int

const (
	TopicGeneric Topic = iota
	TopicGame
	TopicChat
	TopicMax
)

var TopicMap = map[string]Topic{
	"generic": TopicGeneric,
	"game":    TopicGame,
	"chat":    TopicChat,
}

type packet struct {
	UserID  uint            `json:"-"`
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type packetOnline struct {
	UserID   uint `json:"user_id"`
	IsOnline bool `json:"is_online"`
}

type topicSendList struct {
	SendChannel    chan packet
	ConnectionList protectedConnectionList
}

type client struct {
	UserID         uint
	ConnectionList protectedConnectionList
	SendLists      [TopicMax]topicSendList
}

type WebSocketState struct {
	clients       map[uint]*client
	clientsMutex  sync.RWMutex
	readChannel   chan packet
	readMutex     sync.RWMutex
	readOk        bool

	friendService *services.FriendService
}

func CreateWebSocketState(friendService *services.FriendService) (*WebSocketState) {
	return &WebSocketState{
		clients:       make(map[uint]*client),
		readChannel:   make(chan packet, 256),
		readOk:        true,

		friendService: friendService,
	}
}

// Internal connection Managers (Only manages protected connection lists directly)

func (wsState *WebSocketState) SendToTopic(userID uint, topic Topic, packetType string, payload any) (error) {
	var Packet packet
	var err error
	Packet.Type = packetType
	Packet.Payload, err = json.Marshal(payload)
	if err != nil {
		return err
	}
	wsState.clientsMutex.RLock()
	defer wsState.clientsMutex.RUnlock()
	if wsState.clients[userID] == nil {
		return errors.New("client offline")
	} else {
		wsState.clients[userID].SendLists[topic].SendChannel <- Packet
		return nil
	}
}

func (wsState *WebSocketState) BroadcastToFriends(userID uint, topic Topic, packetType string, payload any) (error) {
	friendships, err := wsState.friendService.EnumerateFriends(userID, []string{"active"}, 2147483647)
	if err != nil {
		return err
	}
	for _, friendship := range friendships {
		friendID := friendship.LowID
		if friendID == userID {
			friendID = friendship.HighID
		}
		err = wsState.SendToTopic(friendID, topic, packetType, payload)
		if err != nil {
			return fmt.Errorf("Error sending to topic: %w\n", err)
		}
	}
	return nil
}

func (wsState *WebSocketState) BroadcastToEveryone(topic Topic, packetType string, payload any) {
	wsState.clientsMutex.RLock()
	clients := wsState.clients
	wsState.clientsMutex.RUnlock()
	for userID, _ := range clients {
		wsState.SendToTopic(userID, topic, packetType, payload)
	}
}

func (wsState *WebSocketState) AddConnection(userID uint, connection *websocket.Conn, topics []Topic) {
	wsState.clientsMutex.Lock()
	Client := wsState.clients[userID]
	if Client == nil {
		Client = &client{
			UserID:     userID,
			SendLists:  [TopicMax]topicSendList{},
		}
		for listIndex := TopicGeneric; listIndex < TopicMax; {
			Client.SendLists[listIndex] = topicSendList{
				SendChannel: make(chan packet, 256),
			}
			go pumpToTopic(&Client.SendLists[listIndex])
			listIndex++
		}
		wsState.clients[userID] = Client
	}
	Client.ConnectionList.append(connection)
	for _, topic := range topics {
		Client.SendLists[topic].ConnectionList.append(connection)
	}
	go wsState.pumpFromConnection(userID, connection)
	wsState.clientsMutex.Unlock()
	fmt.Printf("Connection added for user %d\n", userID)
	payload := packetOnline{
		UserID:   userID,
		IsOnline: true,
	}
	// TODO: Implement friend system in frontend so we can only broadcast to friends
	// wsState.BroadcastToFriends(userID, TopicGeneric, "online", payload)
	wsState.BroadcastToEveryone(TopicGeneric, "online", payload)
}

func (wsState *WebSocketState) IsOnline(userID uint) (bool) {
	wsState.clientsMutex.RLock()
	isOnline := (wsState.clients[userID] != nil)
	wsState.clientsMutex.RUnlock()
	return isOnline
}

func (wsState *WebSocketState) timeoutClient(userID uint) {
	const timeout        int = 1000
	const iterationCount int = 1000

	for iteration := 0; iteration < iterationCount; {
		time.Sleep(time.Millisecond * time.Duration(timeout / iterationCount))
		if wsState.IsOnline(userID) {
			return
		}
		iteration++
	}
	payload := packetOnline{
		UserID:   userID,
		IsOnline: false,
	}
	// TODO: Implement friend system in frontend so we can only broadcast to friends
	// wsState.BroadcastToFriends(userID, TopicGeneric, "online", payload)
	wsState.BroadcastToEveryone(TopicGeneric, "online", payload)
}

func (wsState *WebSocketState) RemoveConnection(userID uint, connection *websocket.Conn) {
	wsState.clientsMutex.Lock()
	defer wsState.clientsMutex.Unlock()
	Client := wsState.clients[userID]
	if Client == nil {
		return
	}
	Client.ConnectionList.swapPop(connection)
	for sendListIndex, _ := range Client.SendLists {
		Client.SendLists[sendListIndex].ConnectionList.swapPop(connection)
	}
	if Client.ConnectionList.length() == 0 {
		for _, sendList := range Client.SendLists {
			close(sendList.SendChannel)
		}
		delete(wsState.clients, userID)
		go wsState.timeoutClient(userID)
	}
	fmt.Printf("Connection removed for user %d\n", userID)
}

func (wsState *WebSocketState) CloseConnection(userID uint, connection *websocket.Conn) {
	wsState.RemoveConnection(userID, connection)
	connection.Close()
}