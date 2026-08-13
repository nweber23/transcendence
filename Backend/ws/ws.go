package ws

import (
	"fmt"

	"encoding/json"
	"transcendence/models"
	"transcendence/services"
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
	case PacketTypeChatMessage:
		var payload PacketChatMessage
		if err := json.Unmarshal(packet.Payload, &payload); err != nil {
			return
		}
		chatMessageInfo := services.ChatMessageInfo{
			ChatID:       payload.ChatID,
			SenderUserID: payload.SenderUserID,
			Message:      payload.Message,
			ImageURL:     payload.ImageURL,
		}
		_, err := wsState.chatService.AddChatMessage(chatMessageInfo)
		if err != nil {
			return
		}
		participants, err := wsState.chatService.EnumerateAllParticipantsOf(payload.ChatID)
		if err != nil {
			return
		}
		for _, participant := range participants {
			_ = wsState.SendToTopic(participant.UserID, TopicChat, PacketTypeChatMessage, payload)
			notification := models.Notification{
				UserID:    participant.UserID,
				Type:      models.NotificationTypeChat,
				Head:      "New message",
				Body:      payload.Message,
				ActionURL: "/chat",
			}
			_ = wsState.PostNotification(notification)
		}
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
