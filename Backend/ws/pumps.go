package ws

import (
	"fmt"
	"time"

	"transcendence/middleware"

	"github.com/gorilla/websocket"
)

func (wsState *WebSocketState) timeoutClient(userID uint) {
	const timeout        int = 3000
	const iterationCount int = 1000

	for iteration := 0; iteration < iterationCount; {
		time.Sleep(time.Millisecond * time.Duration(timeout / iterationCount))
		if wsState.IsOnline(userID) {
			return
		}
		iteration++
	}
	payload := PacketOnline{
		UserID:   userID,
		IsOnline: false,
	}
	wsState.SendToAll(TopicGeneric, PacketTypeOnline, payload)
}

func (wsState *WebSocketState) cleanupConnection(userID uint, connection *websocket.Conn) {
	wsState.clientsMutex.Lock()
	Client := wsState.clients[userID]
	context := Client.contextList.swapPopByConnection(connection)
	if Client.contextList.length() == 0 {
		delete(wsState.clients, userID)
		go wsState.timeoutClient(userID)
	}
	wsState.clientsMutex.Unlock()
	if context == nil {
		return
	}
	middleware.ActiveConnections.Dec()
	for topic := TopicGeneric; topic < TopicMax; {
		_ = Client.topicLists[topic].swapPopByConnection(connection)
		topic++
	}
	close(context.channel)
	fmt.Printf("Connection removed for user %d\n", userID)
}

func (wsState *WebSocketState) pumpFromConnection(userID uint, connection *websocket.Conn) {
	defer wsState.cleanupConnection(userID, connection)
	for {
		var packet packet
		if err := connection.ReadJSON(&packet); err != nil {
			return
		}
		packet.userID = userID
		if !wsState.readChannel.safeWrite(packet) {
			return
		}
	}
}

func pumpToConnection(context *connectionContext) {
	for {
		packet, ok := <- context.channel
		if !ok {
			return
		}
		if err := context.connection.WriteJSON(&packet); err != nil {
			context.connection.Close()
			return
		}
	}
}