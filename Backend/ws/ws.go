package ws

import (
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

type ProtectedSocketList struct {
	Mutex       sync.RWMutex
	SocketList []*websocket.Conn
}

type TopicSendList struct {
	SendChannel chan interface{}
	SocketList  ProtectedSocketList
}

type Client struct {
	UserID      uint
	SocketList  ProtectedSocketList
	SendLists   [TopicMax]TopicSendList
}

type SocketState struct {
	Clients     map[uint]*Client
	ReadChannel chan Packet
	ReadMutex   sync.RWMutex
	ReadOk      bool
}

type Packet struct {
	UserID  uint
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

var State SocketState

func appendSocket(socketList *ProtectedSocketList, connection *websocket.Conn) {
	socketList.Mutex.Lock()
	defer socketList.Mutex.Unlock()
	socketList.SocketList = append(socketList.SocketList, connection)
}

func popSwapSocket(socketList *ProtectedSocketList, connection *websocket.Conn) {
	socketList.Mutex.Lock()
	defer socketList.Mutex.Unlock()
	for connectionIndex, toDelete := range *connections {
		if toDelete == connection {
			newLength := len(connections) - 1
			(*connections)[connectionIndex] = (*connections)[newLength]
			(*connections)[newLength] = nil
			(*connections) = (*connections)[:newLength]
			return
		}
	}
}

func RemoveConnection(userID uint, connection *websocket.Conn) {
	client := clients[userID]
	if client == nil {
		return
	}
	popSwapConnection(&client.SocketList, connection)
	for sendListIndex, _ := range client.SendLists {
		popSwapConnection(&client.SendLists[sendListIndex].SocketList, connection)
	}
}

func pumpToTopic(sendList *TopicSendList) {
	for {
		message, ok <- sendList.MessageChannel
		if !ok {
			return
		}
		for _, connection := range sendList.Connections {
			if err := connection.WriteJSON(message); err != nil {
				log.Printf("Failed to send message: %v", err)
			}
		}
	}
}

func pumpFromConnection(userID uint, connection *websocket.Conn) {
	for {
		var packet Packet
		if err := connection.ReadJSON(&packet); err == nil {
			packet.UserID = userID
			// I frickin' hate that you can't use comma ok when writing to channels
			State.ReadMutex.RLock()
			if !State.ReadOk {
				State.ReadMutex.RUnlock()
				return
			}
			State.ReadChannel <- packet
			State.ReadMutex.RUnlock()
		} else {
			log.Printf("Failed to receive message: %v", err)
		}
	}
}

func initialize() {
	State.Clients = make(map[uint]*Client)
	State.ReadOk  = true
}

func handleIncomingPackets() {
	for {
		packet, ok <- State.ReadChannel
		if !ok {
			return
		}
		//switch packet.Type {
		//}
	}
}

func terminate() {
	for client := range State.Clients {
		for sendList := range client.SendLists {
			_, ok <- sendList.SendChannel
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

func AddConnection(userID uint, connection *websocket.Conn, topics []Topic) {
	client := clients[userID]
	if client == nil {
		client := &Client{
			UserID:     userID,
			SocketList: ProtectedSocketList{
				
			},
			SendLists:  [TopicMax]TopicSendList{},
		}
		for listIndex := TopicGeneric; listIndex < TopicMax; {
			client.SendLists[listIndex] = TopicSendList{
				SendChannel: make(chan interface{}, 256),
				SocketList: make([]*websocket.Conn, 0),
			}
			listIndex++
		}
		clients[userID] = client
	}
	client.SocketList = append(client.SocketList, connection)
	for _, topic := range topics {
		client.SendLists[topic].SocketList = append(client.SendLists[topic].SocketList, connection)
	}
}