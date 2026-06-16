package ws

import (
	"fmt"

	"encoding/json"

	"github.com/gorilla/websocket"
)

func (wsState *WebSocketState) SendToTopic(userID uint, topic Topic, payload any) (error) {
	wsState.clientsMutex.RLock()
	Client := wsState.clients[userID]
	wsState.clientsMutex.RUnlock()
	var packet packet
	var err error
	packet.payload, err = json.Marshal(payload)
	if err != nil {
		return err
	}
	Client.topicLists[topic].send(packet)
	return nil
}

func (wsState *WebSocketState) AddConnection(userID uint, connection *websocket.Conn, topics []Topic) {
	wsState.clientsMutex.Lock()
	Client := wsState.clients[userID]
	if Client == nil {
		Client = &client{
			userID: userID,
		}
		wsState.clients[userID] = Client
	}
	context := createConnectionContext(connection)
	Client.contextList.append(context)
	wsState.clientsMutex.Unlock()
	go wsState.pumpFromConnection(userID, context.connection)
	go pumpToConnection(context)
	for _, topic := range topics {
		Client.topicLists[topic].append(context)
	}
	fmt.Printf("Connection added for user %d\n", userID)
}

func (wsState *WebSocketState) IsOnline(userID uint) (bool) {
	wsState.clientsMutex.RLock()
	isOnline := (wsState.clients[userID] != nil)
	wsState.clientsMutex.Unlock()
	return isOnline
}