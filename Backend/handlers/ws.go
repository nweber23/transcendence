package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"transcendence/services"
	"transcendence/utils"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type WebSocketMessage struct {
	Type    string          `json:"type"`
	GameID  uint            `json:"game_id"`
	UserID  uint            `json:"user_id"`
	Action  string          `json:"action"`
	Payload json.RawMessage `json:"payload"`
}

type Client struct {
	ID     uint
	GameID uint
	Conn   *websocket.Conn
	Send   chan interface{}
	Done   chan struct{}
}

type GameRoom struct {
	ID      uint
	Clients map[uint]*Client
	Mutex   sync.RWMutex
	Send    chan interface{}
}

type WSHub struct {
	Rooms      map[uint]*GameRoom
	RoomsMu    sync.RWMutex
	Register   chan *Client
	Unregister chan *Client
}

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	hub = &WSHub{
		Rooms:      make(map[uint]*GameRoom),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
)

func init() {
	go hub.run()
}

// HandleWebSocket upgrades HTTP connection to WebSocket and joins game room
func HandleWebSocket(gameService *services.GameService, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.Query("token")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}
		claims, err := utils.ValidateToken(tokenString, jwtSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		gameIDStr := c.Query("game_id")
		if gameIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing game_id"})
			return
		}
		var gameID uint
		if _, err := fmt.Sscanf(gameIDStr, "%d", &gameID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid game_id"})
			return
		}
		// Verify user owns the game
		game, err := gameService.GetGameByID(claims.UserID, gameID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "game not found"})
			return
		}
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("WebSocket upgrade error: %v", err)
			return
		}
		client := &Client{
			ID:     claims.UserID,
			GameID: game.ID,
			Conn:   conn,
			Send:   make(chan interface{}, 256),
			Done:   make(chan struct{}),
		}
		hub.Register <- client
		go client.readPump()
		go client.writePump()
	}
}

// readPump reads messages from WebSocket connection
func (c *Client) readPump() {
	defer func() {
		hub.Unregister <- c
		if err := c.Conn.Close(); err != nil {
			log.Printf("Close error: %v", err)
		}
	}()
	for {
		var msg WebSocketMessage
		if err := c.Conn.ReadJSON(&msg); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			return
		}
		msg.UserID = c.ID
		msg.GameID = c.GameID
		hub.RoomsMu.RLock()
		room, exists := hub.Rooms[c.GameID]
		hub.RoomsMu.RUnlock()
		if exists {
			select {
			case room.Send <- msg:
			case <-c.Done:
				return
			}
		}
	}
}

// writePump writes messages from Send channel to WebSocket connection
func (c *Client) writePump() {
	defer func() {
		if err := c.Conn.Close(); err != nil {
			log.Printf("Close error: %v", err)
		}
	}()
	for {
		select {
		case msg, ok := <-c.Send:
			if !ok {
				if err := c.Conn.WriteMessage(websocket.CloseMessage, []byte{}); err != nil {
					log.Printf("WriteMessage error: %v", err)
				}
				return
			}
			if err := c.Conn.WriteJSON(msg); err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}
		case <-c.Done:
			return
		}
	}
}

// run manages the hub: registering/unregistering clients and broadcasting
func (h *WSHub) run() {
	for {
		select {
		case client := <-h.Register:
			h.RoomsMu.Lock()
			room, exists := h.Rooms[client.GameID]
			if !exists {
				room = &GameRoom{
					ID:      client.GameID,
					Clients: make(map[uint]*Client),
					Send:    make(chan interface{}, 256),
				}
				h.Rooms[client.GameID] = room
				go room.broadcastLoop()
			}
			room.Clients[client.ID] = client
			h.RoomsMu.Unlock()
			log.Printf("Client %d joined game %d", client.ID, client.GameID)
			notification := map[string]interface{}{
				"type":    "player_joined",
				"user_id": client.ID,
				"game_id": client.GameID,
			}
			room.Send <- notification
		case client := <-h.Unregister:
			h.RoomsMu.RLock()
			room, exists := h.Rooms[client.GameID]
			h.RoomsMu.RUnlock()
			if exists {
				room.Mutex.Lock()
				if _, ok := room.Clients[client.ID]; ok {
					delete(room.Clients, client.ID)
					close(client.Send)
					log.Printf("Client %d left game %d", client.ID, client.GameID)
					if len(room.Clients) > 0 {
						notification := map[string]interface{}{
							"type":    "player_left",
							"user_id": client.ID,
							"game_id": client.GameID,
						}
						room.Send <- notification
					}
				}
				room.Mutex.Unlock()
			}
			h.RoomsMu.Lock()
			if len(room.Clients) == 0 {
				delete(h.Rooms, client.GameID)
			}
			h.RoomsMu.Unlock()
		}
	}
}

// broadcastLoop handles broadcasting to all clients in a game room
func (r *GameRoom) broadcastLoop() {
	for msg := range r.Send {
		r.Mutex.RLock()
		for _, client := range r.Clients {
			select {
			case client.Send <- msg:
			default:
				log.Printf("Client %d send buffer full, message dropped", client.ID)
			}
		}
		r.Mutex.RUnlock()
	}
}

// BroadcastGameUpdate sends a game update to all connected clients in a room
func BroadcastGameUpdate(gameID uint, messageType string, payload interface{}) {
	hub.RoomsMu.RLock()
	room, exists := hub.Rooms[gameID]
	hub.RoomsMu.RUnlock()
	if exists {
		msg := map[string]interface{}{
			"type":    messageType,
			"game_id": gameID,
			"payload": payload,
		}
		select {
		case room.Send <- msg:
		default:
			log.Printf("Room %d broadcast buffer full", gameID)
		}
	}
}
