package ws

import (
	"sync"

	"github.com/gorilla/websocket"
)

type protectedConnectionList struct {
	mutex       sync.RWMutex
	connections []*websocket.Conn
}

func (connectionList *protectedConnectionList) append(connection *websocket.Conn) {
	connectionList.mutex.Lock()
	connectionList.connections = append(connectionList.connections, connection)
	connectionList.mutex.Unlock()
}

func (connectionList *protectedConnectionList) swapPop(connection *websocket.Conn) {
	connectionList.mutex.Lock()
	defer connectionList.mutex.Unlock()
	connections := &connectionList.connections
	for connectionIndex, toDelete := range *connections {
		if toDelete == connection {
			newLength := len(*connections) - 1
			(*connections)[connectionIndex] = (*connections)[newLength]
			(*connections)[newLength] = nil
			(*connections) = (*connections)[:newLength]
			return
		}
	}
}

func (connectionList *protectedConnectionList) getConnections() (connection []*websocket.Conn) {
	connectionList.mutex.RLock()
	connections := make([]*websocket.Conn, len(connectionList.connections))
	copy(connections, connectionList.connections)
	connectionList.mutex.RUnlock()
	return connections
}

func (connectionList *protectedConnectionList) length() (int) {
	connectionList.mutex.RLock()
	length := len(connectionList.connections)
	connectionList.mutex.RUnlock()
	return length
}