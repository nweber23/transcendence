package ws

import (
	"fmt"
	"time"

	"transcendence/middleware"

	"github.com/gorilla/websocket"
)

func (wsState *WebSocketState) timeoutClient(userID uint) {
	const timeout int = 3000
	const iterationCount int = 1000

	for iteration := 0; iteration < iterationCount; {
		time.Sleep(time.Millisecond * time.Duration(timeout/iterationCount))
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
	lastConnection := Client.contextList.length() == 0
	if lastConnection {
		delete(wsState.clients, userID)
		go wsState.timeoutClient(userID)
	}
	wsState.clientsMutex.Unlock()
	if lastConnection {
		// Routed through readChannel (same as this connection's own packets,
		// e.g. a "leave" sent right before closing) rather than run
		// directly, so it can never race ahead of or behind them — see
		// packetTypeDisconnected.
		wsState.readChannel.safeWrite(packet{userID: userID, PacketType: packetTypeDisconnected, internal: true})
	}
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

// maxInboundMessageSize caps a single client->server WS frame. Inbound
// packets are small control messages (join/leave/play/...), so this is far
// below the 1MB HTTP body limit.
const maxInboundMessageSize = 8 << 10 // 8KB

func (wsState *WebSocketState) pumpFromConnection(userID uint, connection *websocket.Conn) {
	defer wsState.cleanupConnection(userID, connection)
	connection.SetReadLimit(maxInboundMessageSize)
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
		packet, ok := <-context.channel
		if !ok {
			return
		}
		if err := context.connection.WriteJSON(&packet); err != nil {
			context.connection.Close()
			return
		}
	}
}
