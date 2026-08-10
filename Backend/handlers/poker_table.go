package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"transcendence/models"
	"transcendence/services"
	"transcendence/utils"
	"transcendence/ws"

	"github.com/gin-gonic/gin"
)

type PokerTableHandler struct {
	pokerTableService *services.PokerTableService
	userService       *services.UserService
	wsState           *ws.WebSocketState
}

func NewPokerTableHandler(pokerTableService *services.PokerTableService, userService *services.UserService, wsState *ws.WebSocketState) *PokerTableHandler {
	return &PokerTableHandler{
		pokerTableService: pokerTableService,
		userService:       userService,
		wsState:           wsState,
	}
}

type CreatePokerTableRequest struct {
	Name       string `json:"name" binding:"required,max=64"`
	IsPrivate  bool   `json:"is_private"`
	MaxSeats   int    `json:"max_seats" binding:"required,min=2,max=9"`
	BuyIn      string `json:"buy_in" binding:"required"`
	SmallBlind string `json:"small_blind" binding:"required"`
	BigBlind   string `json:"big_blind" binding:"required"`
}

type UpdatePokerTableSettingsRequest struct {
	Name       string `json:"name" binding:"required,max=64"`
	IsPrivate  bool   `json:"is_private"`
	MaxSeats   int    `json:"max_seats" binding:"required,min=2,max=9"`
	BuyIn      string `json:"buy_in" binding:"required"`
	SmallBlind string `json:"small_blind" binding:"required"`
	BigBlind   string `json:"big_blind" binding:"required"`
}

// PokerTableUserRequest is shared by the invite and kick endpoints — both
// just need to identify the target user.
type PokerTableUserRequest struct {
	UserID uint `json:"user_id" binding:"required"`
}

type PokerTableResponse struct {
	ID             uint   `json:"id"`
	HostUserID     uint   `json:"host_user_id"`
	Name           string `json:"name"`
	Status         string `json:"status"`
	IsPrivate      bool   `json:"is_private"`
	MaxSeats       int    `json:"max_seats"`
	BuyIn          string `json:"buy_in"`
	SmallBlind     string `json:"small_blind"`
	BigBlind       string `json:"big_blind"`
	CreatedAt      string `json:"created_at"`
	SeatedCount    int    `json:"seated_count"`
	SpectatorCount int    `json:"spectator_count"`
}

type PokerTableListResponse struct {
	Tables []PokerTableResponse `json:"tables"`
	Total  int64                `json:"total"`
	Limit  int                  `json:"limit"`
	Offset int                  `json:"offset"`
}

func (h *PokerTableHandler) tableResponse(table *models.PokerTable) PokerTableResponse {
	seated, spectating, _ := h.wsState.PokerTableLiveCounts(table.ID)
	return PokerTableResponse{
		ID:             table.ID,
		HostUserID:     table.HostUserID,
		Name:           table.Name,
		Status:         table.Status,
		IsPrivate:      table.IsPrivate,
		MaxSeats:       table.MaxSeats,
		BuyIn:          table.BuyIn.String(),
		SmallBlind:     table.SmallBlind.String(),
		BigBlind:       table.BigBlind.String(),
		CreatedAt:      table.CreatedAt.Format("2006-01-02T15:04:05Z"),
		SeatedCount:    seated,
		SpectatorCount: spectating,
	}
}

// respondPokerTableError maps the known PokerTableService/ws-layer errors to
// their HTTP status, mirroring the errors.Is-based dispatch already used in
// handlers/user.go — anything unrecognized falls back to 500.
func respondPokerTableError(c *gin.Context, code string, err error) {
	switch {
	// ErrPokerTableAccessDenied maps to 404, not 403: distinguishing "exists
	// but you can't see it" from "doesn't exist" would let a user probe IDs
	// to discover private tables they weren't invited to.
	case errors.Is(err, utils.ErrPokerTableNotFound), errors.Is(err, utils.ErrPokerTableAccessDenied):
		utils.RespondError(c, http.StatusNotFound, code, err.Error())
	case errors.Is(err, utils.ErrPokerNotTableHost):
		utils.RespondError(c, http.StatusForbidden, code, err.Error())
	case errors.Is(err, utils.ErrPokerHandInProgress):
		utils.RespondError(c, http.StatusConflict, code, err.Error())
	case errors.Is(err, utils.ErrPokerTableClosed),
		errors.Is(err, utils.ErrPokerInvalidSeatCount),
		errors.Is(err, utils.ErrPokerInvalidBlinds),
		errors.Is(err, utils.ErrPokerFractionalAmount),
		errors.Is(err, utils.ErrPokerTableHasSeatedPlayers),
		errors.Is(err, utils.ErrAmountNotPositive),
		errors.Is(err, utils.ErrInvalidAmount):
		utils.RespondError(c, http.StatusBadRequest, code, err.Error())
	default:
		utils.RespondError(c, http.StatusInternalServerError, code, err.Error())
	}
}

func parsePokerTableID(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return 0, fmt.Errorf("table ID must be a valid number")
	}
	return uint(id), nil
}

// ListTables returns open tables the requester may see: public tables,
// tables they host, and tables they're invited to.
func (h *PokerTableHandler) ListTables(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	limit := 20
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
	tables, total, err := h.pokerTableService.ListTables(userID.(uint), limit, offset)
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "fetch_failed", err.Error())
		return
	}
	responses := make([]PokerTableResponse, len(tables))
	for i := range tables {
		responses[i] = h.tableResponse(&tables[i])
	}
	utils.RespondSuccess(c, http.StatusOK, "Poker tables retrieved successfully", PokerTableListResponse{
		Tables: responses,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	})
}

// CreateTable persists a new table and registers its live runtime before
// responding, so a client can immediately join/spectate it.
func (h *PokerTableHandler) CreateTable(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	var req CreatePokerTableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	buyIn, err := utils.ParseAmount(req.BuyIn)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_buy_in", "Buy-in must be a valid number")
		return
	}
	smallBlind, err := utils.ParseAmount(req.SmallBlind)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_small_blind", "Small blind must be a valid number")
		return
	}
	bigBlind, err := utils.ParseAmount(req.BigBlind)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_big_blind", "Big blind must be a valid number")
		return
	}

	table, err := h.pokerTableService.CreateTable(userID.(uint), req.Name, req.IsPrivate, req.MaxSeats, buyIn, smallBlind, bigBlind)
	if err != nil {
		respondPokerTableError(c, "table_creation_failed", err)
		return
	}
	h.wsState.PokerCreateTable(table)
	utils.RespondSuccess(c, http.StatusCreated, "Poker table created successfully", h.tableResponse(table))
}

// GetTable is also the access-control checkpoint the frontend calls before
// opening any WS traffic for a table.
func (h *PokerTableHandler) GetTable(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	tableID, err := parsePokerTableID(c)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_table_id", err.Error())
		return
	}
	table, err := h.pokerTableService.CanAccess(tableID, userID.(uint))
	if err != nil {
		respondPokerTableError(c, "table_access_failed", err)
		return
	}
	utils.RespondSuccess(c, http.StatusOK, "Poker table retrieved successfully", h.tableResponse(table))
}

// UpdateSettings: name/privacy are always editable by the host; buy-in,
// blinds, and max seats only while the live table has zero seated players.
// That check is performed and applied atomically inside
// wsState.PokerUpdateSettings (not peeked here beforehand) so there's no
// window for a seat to be taken in between — the DB is then persisted with
// exactly the fields that actually took effect, never more.
func (h *PokerTableHandler) UpdateSettings(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	tableID, err := parsePokerTableID(c)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_table_id", err.Error())
		return
	}
	var req UpdatePokerTableSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}

	current, err := h.pokerTableService.RequireHost(userID.(uint), tableID)
	if err != nil {
		respondPokerTableError(c, "table_settings_failed", err)
		return
	}
	buyIn, err := utils.ParseAmount(req.BuyIn)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_buy_in", "Buy-in must be a valid number")
		return
	}
	smallBlind, err := utils.ParseAmount(req.SmallBlind)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_small_blind", "Small blind must be a valid number")
		return
	}
	bigBlind, err := utils.ParseAmount(req.BigBlind)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_big_blind", "Big blind must be a valid number")
		return
	}
	if err := h.pokerTableService.ValidateSettings(req.MaxSeats, buyIn, smallBlind, bigBlind); err != nil {
		respondPokerTableError(c, "table_settings_failed", err)
		return
	}

	candidate := *current
	candidate.Name = req.Name
	candidate.IsPrivate = req.IsPrivate
	candidate.MaxSeats = req.MaxSeats
	candidate.BuyIn = buyIn
	candidate.SmallBlind = smallBlind
	candidate.BigBlind = bigBlind

	resized, ok := h.wsState.PokerUpdateSettings(tableID, &candidate)
	if !ok {
		respondPokerTableError(c, "table_settings_failed", utils.ErrPokerTableNotFound)
		return
	}
	requestedResize := req.MaxSeats != current.MaxSeats ||
		!buyIn.Equal(current.BuyIn) || !smallBlind.Equal(current.SmallBlind) || !bigBlind.Equal(current.BigBlind)
	finalMaxSeats, finalBuyIn, finalSmallBlind, finalBigBlind := req.MaxSeats, buyIn, smallBlind, bigBlind
	if !resized {
		// The runtime rejected the resize (seats were occupied at the exact
		// moment it checked) — persist the table's existing money/seat
		// values so the DB never claims a change that never took effect.
		finalMaxSeats, finalBuyIn, finalSmallBlind, finalBigBlind = current.MaxSeats, current.BuyIn, current.SmallBlind, current.BigBlind
	}

	table, err := h.pokerTableService.UpdateSettings(userID.(uint), tableID, req.Name, req.IsPrivate, finalMaxSeats, finalBuyIn, finalSmallBlind, finalBigBlind)
	if err != nil {
		respondPokerTableError(c, "table_settings_failed", err)
		return
	}
	if requestedResize && !resized {
		respondPokerTableError(c, "table_settings_failed", utils.ErrPokerTableHasSeatedPlayers)
		return
	}
	utils.RespondSuccess(c, http.StatusOK, "Poker table settings updated successfully", h.tableResponse(table))
}

// CloseTable checks the ws-layer's live-runtime close FIRST — it refuses
// while a hand is in progress — and only marks the DB row closed once that
// succeeds, so the DB never says "closed" while the table is still running.
func (h *PokerTableHandler) CloseTable(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	tableID, err := parsePokerTableID(c)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_table_id", err.Error())
		return
	}
	if _, err := h.pokerTableService.RequireHost(userID.(uint), tableID); err != nil {
		respondPokerTableError(c, "table_close_failed", err)
		return
	}
	if err := h.wsState.PokerCloseTable(tableID); err != nil {
		respondPokerTableError(c, "table_close_failed", err)
		return
	}
	table, err := h.pokerTableService.CloseTable(userID.(uint), tableID)
	if err != nil {
		respondPokerTableError(c, "table_close_failed", err)
		return
	}
	utils.RespondSuccess(c, http.StatusOK, "Poker table closed successfully", h.tableResponse(table))
}

func (h *PokerTableHandler) InviteUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	tableID, err := parsePokerTableID(c)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_table_id", err.Error())
		return
	}
	var req PokerTableUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	table, err := h.pokerTableService.Invite(userID.(uint), tableID, req.UserID)
	if err != nil {
		respondPokerTableError(c, "table_invite_failed", err)
		return
	}

	if host, err := h.userService.GetUserByID(userID.(uint)); err == nil {
		notification := models.Notification{
			UserID:    req.UserID,
			Type:      models.NotificationTypeGames,
			Head:      "Poker invite",
			Body:      fmt.Sprintf("%s invited you to their poker table", host.Username),
			ActionURL: fmt.Sprintf("/games/poker/%d", tableID),
		}
		if err := h.wsState.PostNotification(notification); err != nil {
			fmt.Printf("Failed to post poker invite notification: %v\n", err)
		}
	}
	utils.RespondSuccess(c, http.StatusCreated, "User invited successfully", gin.H{"table_id": table.PokerTableID, "user_id": table.UserID})
}

func (h *PokerTableHandler) KickUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		utils.RespondError(c, http.StatusUnauthorized, "unauthorized", "User not authenticated")
		return
	}
	tableID, err := parsePokerTableID(c)
	if err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_table_id", err.Error())
		return
	}
	var req PokerTableUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if _, err := h.pokerTableService.RequireHost(userID.(uint), tableID); err != nil {
		respondPokerTableError(c, "table_kick_failed", err)
		return
	}
	h.wsState.PokerKick(tableID, req.UserID)
	utils.RespondSuccess(c, http.StatusOK, "User kicked successfully", nil)
}
