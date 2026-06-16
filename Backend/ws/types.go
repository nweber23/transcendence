package ws

import (
	"fmt"
	"sync"

	"encoding/json"
	"transcendence/services"

	"github.com/gorilla/websocket"
)

// MARK: Topic

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

// MARK: packet

type packet struct {
	userID     uint            `json:"-"`
	packetType string          `json:"packet_type"`
	payload    json.RawMessage `json:"payload"`
}

// MARK: protectedPacketChannel

type protectedPacketChannel struct {
	mutex   sync.RWMutex
	ok      bool
	channel chan packet
}

func createProtectedPacketChannel() (*protectedPacketChannel) {
	return &protectedPacketChannel{
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
	fmt.Printf("after append: %d\n", len(contextList.contexts))
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
			fmt.Printf("after pop: %d\n", len(contextList.contexts))
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
	clients       map[uint]*client
	clientsMutex  sync.RWMutex
	readChannel   *protectedPacketChannel
	friendService *services.FriendService
}

func CreateWebSocketState(friendService *services.FriendService) (*WebSocketState) {
	return &WebSocketState{
		clients:       make(map[uint]*client),
		readChannel:   createProtectedPacketChannel(),
		friendService: friendService,
	}
}