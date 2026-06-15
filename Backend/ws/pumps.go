package ws

import (
	"log"

	"github.com/gorilla/websocket"
)

func pumpToTopic(sendList *topicSendList) {
	for {
		message, ok := <- sendList.SendChannel
		if !ok {
			return
		}
		for _, connection := range sendList.ConnectionList.getConnections() {
			if err := connection.WriteJSON(message); err != nil {
				log.Printf("Failed to send message: %v", err)
			}
		}
	}
}

func (wsState *WebSocketState) pumpFromConnection(userID uint, connection *websocket.Conn) {
	for {
		var packet packet
		// TODO: Does connection need sync
		if err := connection.ReadJSON(&packet); err != nil {
			wsState.CloseConnection(userID, connection)
			return
		}
		packet.UserID = userID
		// I frickin' hate that you can't use comma ok when writing to channels
		wsState.readMutex.RLock()
		if !wsState.readOk {
			wsState.readMutex.RUnlock()
			return
		}
		select {
			case wsState.readChannel <- packet:
			default:
		}
		wsState.readMutex.RUnlock()
	}
}