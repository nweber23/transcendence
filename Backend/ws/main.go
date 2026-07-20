package ws

import (
	"encoding/json"
	"fmt"
)

func (wsState *WebSocketState) Main() {
	for {
		packet, ok := <-wsState.readChannel.channel
		if !ok {
			return
		}
		wsState.handlePacket(packet)
	}
}

func (wsState *WebSocketState) handlePacket(packet packet) {
	switch packet.PacketType {
	case PacketTypeJoin:
		var payload PacketJoinLeave
		if err := json.Unmarshal(packet.Payload, &payload); err != nil {
			return
		}
		wsState.pokerJoin(packet.userID, payload.Seat)
	case PacketTypeLeave:
		wsState.pokerLeave(packet.userID)
	case PacketTypeSync:
		wsState.pokerSync(packet.userID)
	case PacketTypePlay:
		var payload PacketPlay
		if err := json.Unmarshal(packet.Payload, &payload); err != nil {
			return
		}
		wsState.pokerPlay(packet.userID, payload.Action, payload.Amount)
	default:
		fmt.Printf("Received unknown packet type %q from %d\n", packet.PacketType, packet.userID)
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
