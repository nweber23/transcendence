package ws

import (
	"encoding/json"
	"fmt"
)

func (wsState *WebSocketState) Start() {
	for {
		packet, ok := <-wsState.readChannel.channel
		if !ok {
			return
		}
		wsState.handlePacket(packet)
	}
}

func (wsState *WebSocketState) handlePacket(packet packet) {
	if packet.internal && packet.PacketType == packetTypeDisconnected {
		wsState.pokerHandleDisconnect(packet.userID)
		return
	}
	switch packet.PacketType {
	case PacketTypeJoin:
		var payload PacketJoinLeave
		if err := json.Unmarshal(packet.Payload, &payload); err != nil {
			return
		}
		wsState.pokerJoin(packet.userID, payload.TableID, payload.Seat)
	case PacketTypeLeave:
		var payload PacketJoinLeave
		if err := json.Unmarshal(packet.Payload, &payload); err != nil {
			return
		}
		wsState.pokerLeave(packet.userID, payload.TableID)
	case PacketTypeSpectate:
		var payload PacketSpectate
		if err := json.Unmarshal(packet.Payload, &payload); err != nil {
			return
		}
		wsState.pokerSpectate(packet.userID, payload.TableID)
	case PacketTypeSync:
		var payload PacketSync
		if err := json.Unmarshal(packet.Payload, &payload); err != nil {
			return
		}
		wsState.pokerSync(packet.userID, payload.TableID)
	case PacketTypePlay:
		var payload PacketPlay
		if err := json.Unmarshal(packet.Payload, &payload); err != nil {
			return
		}
		wsState.pokerPlay(packet.userID, payload.TableID, payload.Action, payload.Amount)
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
