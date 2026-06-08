package ws

import (
	"fmt"
	"log"
	"sync"

	"encoding/json"

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
	UserID  uint
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type protectedConnectionList struct {
	Mutex       sync.RWMutex
	Connections []*websocket.Conn
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

type SocketState struct {
	Clients      map[uint]*client
	ClientsMutex sync.Mutex
	ReadChannel  chan packet
	ReadMutex    sync.RWMutex
	ReadOk       bool
}

var State SocketState

// Internal connection Managers (Only manages protected connection lists directly)

func appendConnection(connectionList *protectedConnectionList, connection *websocket.Conn) {
	connectionList.Mutex.Lock()
	connectionList.Connections = append(connectionList.Connections, connection)
	connectionList.Mutex.Unlock()
}

func popSwapConnection(connectionList *protectedConnectionList, connection *websocket.Conn) {
	connectionList.Mutex.Lock()
	defer connectionList.Mutex.Unlock()
	connections := &connectionList.Connections
	for connectionIndex, toDelete := range *connections {
		if toDelete == connection {
			newLength := len(*connections) - 1
			(*connections)[connectionIndex] = (*connections)[newLength]
			(*connections)[newLength] = nil
			(*connections) = (*connections)[:newLength]
			return
		}
	}
}

// External connection Managers (Create and remove clients as needed)

func AddConnection(userID uint, connection *websocket.Conn, topics []Topic) {
	State.ClientsMutex.Lock()
	defer State.ClientsMutex.Unlock()
	Client := State.Clients[userID]
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
		State.Clients[userID] = Client
	}
	appendConnection(&Client.ConnectionList, connection)
	for _, topic := range topics {
		appendConnection(&Client.SendLists[topic].ConnectionList, connection)
	}
	go pumpFromConnection(userID, &Client.ConnectionList.Mutex, connection)
	fmt.Printf("Connection added\n")
}

func RemoveConnection(userID uint, connection *websocket.Conn) {
	State.ClientsMutex.Lock()
	defer State.ClientsMutex.Unlock()
	Client := State.Clients[userID]
	if Client == nil {
		return
	}
	popSwapConnection(&Client.ConnectionList, connection)
	for sendListIndex, _ := range Client.SendLists {
		popSwapConnection(&Client.SendLists[sendListIndex].ConnectionList, connection)
	}
	if len(Client.ConnectionList.Connections) == 0 {
		for _, sendList := range Client.SendLists {
			close(sendList.SendChannel)
		}
		delete(State.Clients, userID)
	}
	fmt.Printf("Connection removed\n")
}

func CloseConnection(userID uint, connection *websocket.Conn) {
	RemoveConnection(userID, connection)
	connection.Close()
}

func IsOnline(userID uint) (bool) {
	State.ClientsMutex.Lock()
	isOnline := (State.Clients[userID] != nil)
	State.ClientsMutex.Unlock()
	return isOnline
}

// Pumps

func pumpToTopic(sendList *topicSendList) {
	for {
		message, ok := <- sendList.SendChannel
		if !ok {
			return
		}
		sendList.ConnectionList.Mutex.RLock()
		for _, connection := range sendList.ConnectionList.Connections {
			if err := connection.WriteJSON(message); err != nil {
				log.Printf("Failed to send message: %v", err)
			}
		}
		sendList.ConnectionList.Mutex.RUnlock()
	}
}

func pumpFromConnection(userID uint, mutex *sync.RWMutex, connection *websocket.Conn) {
	for {
		var packet packet
		// TODO: Does connection need sync
		if err := connection.ReadJSON(&packet); err != nil {
			CloseConnection(userID, connection)
			return
		}
		packet.UserID = userID
		// I frickin' hate that you can't use comma ok when writing to channels
		State.ReadMutex.RLock()
		if !State.ReadOk {
			State.ReadMutex.RUnlock()
			return
		}
		State.ReadChannel <- packet
		State.ReadMutex.RUnlock()
	}
}

// ws.Main thread

func initialize() {
	State.Clients     = make(map[uint]*client)
	State.ReadChannel = make(chan packet, 256)
	State.ReadOk      = true
}

func handleIncomingPackets() {
	for {
		packet, ok := <- State.ReadChannel
		if !ok {
			return
		}
		log.Printf("Received packet with type %s from %d", packet.Type, packet.UserID)
		//switch packet.Type {
		//}
	}
}

func terminate() {
	for _, Client := range State.Clients {
		for _, sendList := range Client.SendLists {
			_, ok := <- sendList.SendChannel
			if ok {
				close(sendList.SendChannel)
			}
		}
	}
}

func Main() {
	initialize()
	handleIncomingPackets()
	terminate()
}

// ws.Stop

func Stop() {
	State.ReadMutex.Lock()
	close(State.ReadChannel)
	State.ReadOk = false
	State.ReadMutex.Unlock()
}