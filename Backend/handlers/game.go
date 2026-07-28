package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"transcendence/models"
	"transcendence/services"
	"transcendence/utils"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

type GameHandler struct {
	gameService    *services.GameService
	accountService *services.AccountService
}

func NewGameHandler(gameService *services.GameService, accountService *services.AccountService) *GameHandler {
	return &GameHandler{
		gameService:    gameService,
		accountService: accountService,
	}
}

type CreateGameRequest struct {
	GameType  string `json:"game_type" binding:"required,oneof=blackjack slots"`
	BetAmount string `json:"bet_amount" binding:"required"` // blackjack: hand bet. slots: bet per line.
	Lines     int    `json:"lines"`                         // slots only
}

type GameActionRequest struct {
	Action string `json:"action" binding:"required"`
}

type BlackjackDetailResponse struct {
	PlayerCards []string `json:"player_cards"`
	DealerCards []string `json:"dealer_cards"`
	PlayerValue int      `json:"player_value"`
	DealerValue int      `json:"dealer_value"`
	Outcome     string   `json:"outcome"`
}

// SlotsDetailResponse carries the full spin timeline — the base spin plus
// one entry per free spin awarded — so the frontend can play out the whole
// bonus round instead of only showing the base grid and the lump-sum payout.
type SlotsDetailResponse struct {
	// Grid is the engine's actual resolved [row][col] symbols (e.g. "SYM_7")
	// for the base spin — the frontend maps these ids onto its own icon set.
	Grid           [][]string                     `json:"grid"`
	BonusTriggered bool                           `json:"bonus_triggered"`
	FreeSpinCount  int                            `json:"free_spin_count"`
	Timeline       []services.SlotsEngineSpinStep `json:"timeline"`
}

type GameResponse struct {
	ID         uint                     `json:"id"`
	GameType   string                   `json:"game_type"`
	Status     string                   `json:"status"`
	InitialBet string                   `json:"initial_bet"`
	Winnings   string                   `json:"winnings"`
	CreatedAt  string                   `json:"created_at"`
	Blackjack  *BlackjackDetailResponse `json:"blackjack,omitempty"`
	Slots      *SlotsDetailResponse     `json:"slots,omitempty"`
}

type GameListResponse struct {
	Games  []GameResponse `json:"games"`
	Total  int64          `json:"total"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

func gameSummary(game *models.Game) GameResponse {
	return GameResponse{
		ID:         game.ID,
		GameType:   game.GameType,
		Status:     game.Status,
		InitialBet: game.InitialBet.String(),
		Winnings:   game.Winnings.String(),
		CreatedAt:  game.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

// buildGameResponse enriches a game summary with its game-type-specific
// detail — poker is played over the WebSocket game topic rather than
// through this REST resource, so it has none here.
func (gh *GameHandler) buildGameResponse(game *models.Game) (GameResponse, error) {
	response := gameSummary(game)
	switch game.GameType {
	case models.GameTypeBlackjack:
		return gh.withBlackjackDetail(response, game.ID)
	case models.GameTypeSlots:
		return gh.withSlotsDetail(response, game.ID)
	default:
		return response, nil
	}
}

func (gh *GameHandler) withBlackjackDetail(response GameResponse, gameID uint) (GameResponse, error) {
	detail, err := gh.gameService.GetBlackjackDetail(gameID)
	if err != nil {
		return response, err
	}
	var playerCards []string
	if err := json.Unmarshal(detail.PlayerHand, &playerCards); err != nil {
		return response, err
	}
	var dealerCards []string
	if err := json.Unmarshal(detail.DealerHand, &dealerCards); err != nil {
		return response, err
	}
	playerValue := 0
	if detail.PlayerScore != nil {
		playerValue = *detail.PlayerScore
	}
	dealerValue := 0
	if detail.DealerScore != nil {
		dealerValue = *detail.DealerScore
	}
	response.Blackjack = &BlackjackDetailResponse{
		PlayerCards: playerCards,
		DealerCards: dealerCards,
		PlayerValue: playerValue,
		DealerValue: dealerValue,
		Outcome:     detail.Result,
	}
	return response, nil
}

func (gh *GameHandler) withSlotsDetail(response GameResponse, gameID uint) (GameResponse, error) {
	detail, err := gh.gameService.GetSlotsDetail(gameID)
	if err != nil {
		return response, err
	}
	var timeline []services.SlotsEngineSpinStep
	if err := json.Unmarshal(detail.Reels, &timeline); err != nil {
		return response, err
	}
	slots := &SlotsDetailResponse{
		BonusTriggered: detail.IsBonusTriggered,
		Timeline:       timeline,
	}
	if len(timeline) > 0 {
		slots.Grid = timeline[0].Grid
	}
	// timeline[0] is always the base spin — everything after it is one
	// awarded free spin.
	if detail.IsBonusTriggered && len(timeline) > 1 {
		slots.FreeSpinCount = len(timeline) - 1
	}
	response.Slots = slots
	return response, nil
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

	var game *models.Game
	switch req.GameType {
	case models.GameTypeBlackjack:
		game, err = gh.gameService.CreateBlackjackGame(userID.(uint), betAmount)
	case models.GameTypeSlots:
		game, err = gh.gameService.CreateSlotsGame(userID.(uint), betAmount, req.Lines)
	}
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "game_creation_failed", err.Error())
		return
	}

	response, err := gh.buildGameResponse(game)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "fetch_failed", err.Error())
		return
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
	response, err := gh.buildGameResponse(game)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "fetch_failed", err.Error())
		return
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
	for i := range games {
		gameResponses[i] = gameSummary(&games[i])
	}
	response := GameListResponse{
		Games:  gameResponses,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}
	utils.RespondSuccess(c, http.StatusOK, "Games retrieved successfully", response)
}

// ExecuteAction executes a blackjack action (hit or stand)
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
	game, err := gh.gameService.ExecuteBlackjackAction(userID.(uint), uint(gameID), req.Action)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "action_failed", err.Error())
		return
	}
	response, err := gh.buildGameResponse(game)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "fetch_failed", err.Error())
		return
	}
	utils.RespondSuccess(c, http.StatusOK, "Action executed successfully", response)
}
