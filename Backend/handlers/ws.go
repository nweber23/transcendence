package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"transcendence/utils"
	"transcendence/ws"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type WebSocketHandler struct {
	state *ws.WebSocketState
}

func NewWebSocketHandler(state *ws.WebSocketState) (*WebSocketHandler) {
	return &WebSocketHandler{
		state: state,
	}
}

func (wsHandler *WebSocketHandler) UpgradeConnection(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	topicListString := c.Query("topics")
	if topicListString == "" {
		utils.RespondError(c, http.StatusBadRequest, "invalid_topics", "No topics specified")
		return
	}
	topicStrings := strings.Split(topicListString, ",")
	topics := make([]ws.Topic, len(topicStrings))
	for topicIndex, topicString := range topicStrings {
		topics[topicIndex] = ws.TopicMap[topicString]
		if topics[topicIndex] == ws.TopicGeneric && topicString != "generic" {
			utils.RespondError(c, http.StatusBadRequest, "invalid_topics", "Unknown topic: " + topicString)
			return
		}
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
		fmt.Printf("Websocket upgrade error: %v", err)
		return
	}
	wsHandler.state.AddConnection(userID.(uint), connection, topics)
}