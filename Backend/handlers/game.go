package handlers

import (
	"net/http"
	"strconv"

	"transcendence/services"
	"transcendence/utils"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

type GameHandler struct {
	gameService    *services.GameService
	accountService *services.AccountService
	engineService  *services.EngineService
}

func NewGameHandler(gameService *services.GameService, accountService *services.AccountService, engineService *services.EngineService) *GameHandler {
	return &GameHandler{
		gameService:    gameService,
		accountService: accountService,
		engineService:  engineService,
	}
}

type CreateGameRequest struct {
	GameType  string `json:"game_type" binding:"required,oneof=blackjack poker slots"`
	BetAmount string `json:"bet_amount" binding:"required"`
}

type GameActionRequest struct {
	Action string `json:"action" binding:"required"`
}

type GameResponse struct {
	ID         uint   `json:"id"`
	GameType   string `json:"game_type"`
	Status     string `json:"status"`
	InitialBet string `json:"initial_bet"`
	Winnings   string `json:"winnings"`
	CreatedAt  string `json:"created_at"`
}

type GameListResponse struct {
	Games  []GameResponse `json:"games"`
	Total  int64          `json:"total"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

// CreateGame starts a new game session
func (gh *GameHandler) CreateGame(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	var req CreateGameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	betAmount, err := decimal.NewFromString(req.BetAmount)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_bet", "Bet amount must be a valid number")
		return
	}
	game, err := gh.gameService.CreateGame(userID.(uint), req.GameType, betAmount)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "game_creation_failed", err.Error())
		return
	}
	response := GameResponse{
		ID:         game.ID,
		GameType:   game.GameType,
		Status:     game.Status,
		InitialBet: game.InitialBet.String(),
		Winnings:   game.Winnings.String(),
		CreatedAt:  game.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	utils.RespondSuccess(c, http.StatusCreated, "Game created successfully", response)
}

// GetGame retrieves a specific game by ID
func (gh *GameHandler) GetGame(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	gameID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_game_id", "Game ID must be a valid number")
		return
	}
	game, err := gh.gameService.GetGameByID(userID.(uint), uint(gameID))
	if err != nil {
		utils.RespondError(c, http.StatusNotFound, "game_not_found", err.Error())
		return
	}
	response := GameResponse{
		ID:         game.ID,
		GameType:   game.GameType,
		Status:     game.Status,
		InitialBet: game.InitialBet.String(),
		Winnings:   game.Winnings.String(),
		CreatedAt:  game.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	utils.RespondSuccess(c, http.StatusOK, "Game retrieved successfully", response)
}

// GetGames retrieves user's game history with pagination
func (gh *GameHandler) GetGames(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	limit := 10
	offset := 0
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	if o := c.Query("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}
	games, total, err := gh.gameService.GetUserGames(userID.(uint), limit, offset)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "fetch_failed", err.Error())
		return
	}
	gameResponses := make([]GameResponse, len(games))
	for i, game := range games {
		gameResponses[i] = GameResponse{
			ID:         game.ID,
			GameType:   game.GameType,
			Status:     game.Status,
			InitialBet: game.InitialBet.String(),
			Winnings:   game.Winnings.String(),
			CreatedAt:  game.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}
	response := GameListResponse{
		Games:  gameResponses,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}
	utils.RespondSuccess(c, http.StatusOK, "Games retrieved successfully", response)
}

// ExecuteAction executes a game action
func (gh *GameHandler) ExecuteAction(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	gameID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_game_id", "Game ID must be a valid number")
		return
	}
	var req GameActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	game, err := gh.gameService.ExecuteAction(userID.(uint), uint(gameID), req.Action)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "action_failed", err.Error())
		return
	}
	response := GameResponse{
		ID:         game.ID,
		GameType:   game.GameType,
		Status:     game.Status,
		InitialBet: game.InitialBet.String(),
		Winnings:   game.Winnings.String(),
		CreatedAt:  game.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
	utils.RespondSuccess(c, http.StatusOK, "Action executed successfully", response)
}
