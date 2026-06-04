package handlers

import (
	"log"
	"net/http"

	"transcendence/utils"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func UpgradeConnection(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin:     func(req *http.Request) bool {
			return true
		},
	}
	connection, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Websocket upgrade error: %v", err)
		return
	}
	//ws.AddConnection(connection, userID, topics)
	_ = connection
	_ = userID
}