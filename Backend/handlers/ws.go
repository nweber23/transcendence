package handlers

type SocketHandler struct {
	accountService *services.AccountService
	userService    *services.UserService
	friendService  *services.FriendService
	gameService    *services.GameService
	engineClient   *services.EngineClient
}

func (sh *SocketHandler) UpgradeConnection(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	socket, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Websocket upgrade error: %v", err)
		return
	}
	
}