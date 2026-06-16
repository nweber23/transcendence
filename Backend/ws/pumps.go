package ws

import (
	"fmt"

	"github.com/gorilla/websocket"
)

func (wsState *WebSocketState) cleanupConnection(userID uint, connection *websocket.Conn) {
	wsState.clientsMutex.Lock()
	Client := wsState.clients[userID]
	context := Client.contextList.swapPopByConnection(connection)
	if Client.contextList.length() == 0 {
		delete(wsState.clients, userID)
	}
	wsState.clientsMutex.Unlock()
	if context == nil {
		return
	}
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
			return
		}
	}
}