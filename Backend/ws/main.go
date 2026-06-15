package ws

import (
	"log"
)

func (wsState *WebSocketState) handleIncomingPackets() {
	for {
		packet, ok := <- wsState.readChannel
		if !ok {
			return
		}
		log.Printf("Received packet with type %s from %d", packet.Type, packet.UserID)
		//switch packet.Type {
		//}
	}
}

func (wsState *WebSocketState) terminate() {
	wsState.clientsMutex.Lock()
	for _, Client := range wsState.clients {
		for _, sendList := range Client.SendLists {
			select {
				case _, ok := <- sendList.SendChannel:
					if ok {
						close(sendList.SendChannel)
					}
				default:
					close(sendList.SendChannel)
			}
		}
	}
	wsState.clientsMutex.Unlock()
}

func (wsState *WebSocketState) Main() {
	wsState.handleIncomingPackets()
	wsState.terminate()
}

func (wsState *WebSocketState) Stop() {
	wsState.readMutex.Lock()
	close(wsState.readChannel)
	wsState.readOk = false
	wsState.readMutex.Unlock()
}