package ws

import (
	"sync"
	"time"

	"encoding/json"
	"transcendence/services"
	"transcendence/utils"

	"github.com/gorilla/websocket"
)

// MARK: Topic

type Topic int

const (
	TopicInvalid Topic = iota
	TopicGeneric
	TopicGame
	TopicChat
	TopicNotification
	TopicMax
)

var topicMap = map[string]Topic{
	"generic":      TopicGeneric,      // emitted packet types: online
	"game":         TopicGame,
	"chat":         TopicChat,
	"notification": TopicNotification, // emitted packet types: notification
}

func TopicFromString(topicString string) (Topic, error) {
	topic := topicMap[topicString]
	if topic == Topic(0) && topicString != "generic" {
		return Topic(0), utils.ErrInvalidTopicString
	} else {
		return topic, nil
	}
}

// MARK: Packets

type PacketOnline struct {
	UserID   uint `json:"user_id"`
	IsOnline bool `json:"is_online"`
}

type PacketNotification struct {
	Type      string    `json:"notification_type"`
	Head      string    `json:"head"`
	Body      string    `json:"body"`
	ImageURL  string    `json:"image_url"`
	ActionURL string    `json:"action_url"`
	Timestamp time.Time `json:"timestamp"`
}

type PacketJoinLeave struct {
	GameID uint `json:"game_id"`
	UserID uint `json:"user_id"`
}

type PacketPlay struct {
	GameID uint   `json:"game_id"`
	UserID uint   `json:"user_id"`
	Action string `json:"action"`
	Amount int64  `json:"amount"`
}

const (
	PacketTypeOnline       = "online"
	PacketTypeNotification = "notification"
	PacketTypeJoin         = "join"
	PacketTypeLeave        = "leave"
	PacketTypePlay         = "play"
)

type packet struct {
	userID     uint            `json:"-"`
	PacketType string          `json:"packet_type"`
	Payload    json.RawMessage `json:"payload"`
}

// MARK: protectedPacketChannel

type protectedPacketChannel struct {
	mutex   sync.RWMutex
	ok      bool
	channel chan packet
}

func createProtectedPacketChannel() (*protectedPacketChannel) {
	return &protectedPacketChannel{
		ok:      true,
		channel: make(chan packet, 256),
	}
}

func (protectedChannel *protectedPacketChannel) safeWrite(packet packet) (bool) {
	protectedChannel.mutex.RLock()
	defer protectedChannel.mutex.RUnlock()
	if protectedChannel.ok {
		select {
			case protectedChannel.channel <- packet:
			default:
		}
		return true
	} else {
		return false
	}
}

func (protectedChannel *protectedPacketChannel) safeClose() {
	protectedChannel.mutex.Lock()
	defer protectedChannel.mutex.Unlock()
	if protectedChannel.ok {
		close(protectedChannel.channel)
		protectedChannel.ok = false
	}
}

// MARK: connectionContext

type connectionContext struct {
	connection *websocket.Conn
	channel    chan packet
}

func createConnectionContext(connection *websocket.Conn) (*connectionContext) {
	return &connectionContext{
		connection: connection,
		channel:    make(chan packet, 256),
	}
}

// MARK: protectedContextList

type protectedContextList struct {
	mutex    sync.RWMutex
	contexts []*connectionContext
}

func (contextList *protectedContextList) append(context *connectionContext) {
	contextList.mutex.Lock()
	contextList.contexts = append(contextList.contexts, context)
	contextList.mutex.Unlock()
}

func (contextList *protectedContextList) swapPopByConnection(connection *websocket.Conn) (*connectionContext) {
	contextList.mutex.Lock()
	defer contextList.mutex.Unlock()
	contexts := &contextList.contexts
	for contextIndex, context := range *contexts {
		if context.connection == connection {
			newLength := len(*contexts) - 1
			(*contexts)[contextIndex] = (*contexts)[newLength]
			(*contexts)[newLength] = nil
			(*contexts) = (*contexts)[:newLength]
			return context
		}
	}
	return nil
}

func (contextList *protectedContextList) send(packet packet) {
	contextList.mutex.RLock()
	for _, context := range contextList.contexts {
		select {
			case context.channel <- packet:
			default:
		}
	}
	contextList.mutex.RUnlock()
}

func (contextList *protectedContextList) length() (int) {
	contextList.mutex.RLock()
	length := len(contextList.contexts)
	contextList.mutex.RUnlock()
	return length
}

func (contextList *protectedContextList) closeAll() {
	contextList.mutex.RLock()
	for _, context := range contextList.contexts {
		context.connection.Close()
	}
	contextList.mutex.RUnlock()
}

// MARK: client

type client struct {
	userID      uint
	contextList protectedContextList
	topicLists  [TopicMax]protectedContextList
}

// MARK: WebSocketState
// This is the root datatype of the websocket system

type WebSocketState struct {
	clients             map[uint]*client
	clientsMutex        sync.RWMutex
	readChannel         *protectedPacketChannel
	userService         *services.UserService
	friendService       *services.FriendService
	notificationService *services.NotificationService
}

func CreateWebSocketState(
	userService         *services.UserService,
	friendService       *services.FriendService,
	notificationService *services.NotificationService,
) (*WebSocketState) {
	return &WebSocketState{
		clients:             make(map[uint]*client),
		readChannel:         createProtectedPacketChannel(),
		userService:         userService,
		friendService:       friendService,
		notificationService: notificationService,
	}
}