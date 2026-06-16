package ws

import (
	"fmt"
)

func (wsState *WebSocketState) Main() {
	for {
		packet, ok := <- wsState.readChannel.channel
		if !ok {
			return
		}
		fmt.Printf("Received packet from %d\n", packet.userID)
	}
}

func (wsState *WebSocketState) Stop() {
	wsState.readChannel.safeClose()
	wsState.clientsMutex.RLock()
	for _, client := range wsState.clients {
		client.contextList.closeAll()
	}
	wsState.clientsMutex.RUnlock()
}