package ws

import (
	"fmt"
	"sync"
	"time"

	"transcendence/services"

	"github.com/shopspring/decimal"
)

// MARK: PokerTable
//
// A single fixed 6-max table. Once at least two seats are filled, hands
// deal themselves automatically and keep going — the same engine game
// plays hand after hand, carrying stacks forward — until fewer than two
// players remain. A seat is only vacated when its player leaves between
// hands or busts out (stack hits 0); everyone else just keeps playing.

const (
	PokerSeatCount   = 6
	PokerBuyIn       = 1000
	PokerSmallBlind  = 25
	PokerBigBlind    = 50
	pokerNextHandGap = 4 * time.Second // pause between hands so players can see who won
)

type pokerSeat struct {
	userID    uint
	username  string
	avatarURL string
	gameID    uint // games.id backing this seat's session, until settled
	// stack is this seat's last-known chip count. While the seat is part of
	// engineGame, currentStack() prefers the live value from the engine —
	// this only becomes authoritative once the table drops below 2 players
	// and engineGame is torn down, so a lone remaining player's stack isn't
	// lost (and doesn't fall back to the buy-in) before they leave too.
	stack int64
	// pendingLeave is set when a player disconnects mid-hand — they're
	// auto-folded so the hand can proceed, then actually removed once it
	// ends rather than being dealt into another hand nobody can act for.
	pendingLeave bool
}

type PokerTable struct {
	mutex      sync.Mutex
	seats      [PokerSeatCount]*pokerSeat
	engineGame *services.TexasEngineGame // persists across hands; nil below 2 seated
	handActive bool
	// playerOfSeat translates this table's sparse seat numbers into the
	// engine's dense 0..n-1 player indices for the current engineGame.
	playerOfSeat map[int]int
	// handStartStacks snapshots each seat's stack right before the current
	// hand's blinds are posted, so the win/loss for that hand alone can be
	// computed once it ends.
	handStartStacks map[int]int64
}

func newPokerTable() *PokerTable {
	return &PokerTable{}
}

func (table *PokerTable) seatOf(userID uint) int {
	for seatIdx, seat := range table.seats {
		if seat != nil && seat.userID == userID {
			return seatIdx
		}
	}
	return -1
}

func (table *PokerTable) seatedCount() int {
	count := 0
	for _, seat := range table.seats {
		if seat != nil {
			count++
		}
	}
	return count
}

// currentStack reports what a seat should be treated as holding right now:
// its live stack if it's part of the current engine game, or its last
// synced stack (see pokerSeat.stack) for a seat that isn't — either because
// it hasn't played yet (still the buy-in) or because engineGame was torn
// down after the table dropped below 2 players.
func (table *PokerTable) currentStack(seatIdx int) int64 {
	seat := table.seats[seatIdx]
	if seat == nil {
		return PokerBuyIn
	}
	if table.engineGame != nil {
		if playerIdx, ok := table.playerOfSeat[seatIdx]; ok {
			state := table.engineGame.State()
			if playerIdx < len(state.Players) {
				return state.Players[playerIdx].Stack
			}
		}
	}
	return seat.stack
}

// MARK: inbound actions — all called from ws.Main() with no lock held

func (wsState *WebSocketState) pokerJoin(userID uint, seat int) {
	table := wsState.pokerTable
	table.mutex.Lock()
	defer table.mutex.Unlock()

	if seat < 0 || seat >= PokerSeatCount {
		wsState.sendPokerError(userID, "invalid seat")
		return
	}
	if table.handActive {
		wsState.sendPokerError(userID, "a hand is already in progress, try again shortly")
		return
	}
	if table.seats[seat] != nil {
		wsState.sendPokerError(userID, "seat is taken")
		return
	}
	if table.seatOf(userID) >= 0 {
		wsState.sendPokerError(userID, "already seated")
		return
	}

	user, err := wsState.userService.GetUserByID(userID)
	if err != nil {
		wsState.sendPokerError(userID, "failed to load user")
		return
	}

	game, err := wsState.gameService.CreatePokerGame(userID, decimal.NewFromInt(PokerBuyIn), seat)
	if err != nil {
		wsState.sendPokerError(userID, err.Error())
		return
	}

	table.seats[seat] = &pokerSeat{
		userID:    userID,
		username:  user.Username,
		avatarURL: user.AvatarURL,
		gameID:    game.ID,
		stack:     PokerBuyIn,
	}

	table.reconcile(wsState)
	table.tryStartHand(wsState)
	table.broadcastState(wsState, wsState.connectedUserIDs(), nil)
}

func (wsState *WebSocketState) pokerLeave(userID uint) {
	table := wsState.pokerTable
	table.mutex.Lock()
	defer table.mutex.Unlock()

	seatIdx := table.seatOf(userID)
	if seatIdx < 0 {
		wsState.sendPokerError(userID, "not seated")
		return
	}
	if table.handActive {
		wsState.sendPokerError(userID, "cannot leave mid-hand — fold instead")
		return
	}

	table.removeSeat(wsState, seatIdx, "left")
	table.reconcile(wsState)
	table.tryStartHand(wsState)
	table.broadcastState(wsState, wsState.connectedUserIDs(), nil)
}

func (wsState *WebSocketState) pokerPlay(userID uint, action string, amount int64) {
	table := wsState.pokerTable
	table.mutex.Lock()
	defer table.mutex.Unlock()

	if !table.handActive || table.engineGame == nil {
		wsState.sendPokerError(userID, "no hand in progress")
		return
	}
	seatIdx := table.seatOf(userID)
	if seatIdx < 0 {
		wsState.sendPokerError(userID, "not seated")
		return
	}
	playerIdx, ok := table.playerOfSeat[seatIdx]
	if !ok {
		wsState.sendPokerError(userID, "not part of this hand")
		return
	}
	if int(table.engineGame.State().CurrentPlayer) != playerIdx {
		wsState.sendPokerError(userID, "not your turn")
		return
	}

	if err := table.engineGame.Play(uint64(playerIdx), action, amount); err != nil {
		wsState.sendPokerError(userID, err.Error())
		return
	}

	table.advanceAfterAction(wsState)
}

// pokerSync sends the requesting user the current table snapshot — used
// when a client opens the poker page and has no state to show yet, since
// broadcasts otherwise only fire in response to a join/leave/play/showdown.
func (wsState *WebSocketState) pokerSync(userID uint) {
	table := wsState.pokerTable
	table.mutex.Lock()
	defer table.mutex.Unlock()

	table.broadcastState(wsState, []uint{userID}, nil)
}

// pokerHandleDisconnect is called once a user's last WebSocket connection
// closes. Between hands they're settled and removed immediately; mid-hand
// they're auto-folded so play can continue, then removed once that hand is
// over rather than being dealt into another one nobody can act for.
func (wsState *WebSocketState) pokerHandleDisconnect(userID uint) {
	table := wsState.pokerTable
	table.mutex.Lock()
	defer table.mutex.Unlock()

	seatIdx := table.seatOf(userID)
	if seatIdx < 0 {
		return
	}

	if !table.handActive {
		table.removeSeat(wsState, seatIdx, "left")
		table.reconcile(wsState)
		table.tryStartHand(wsState)
		table.broadcastState(wsState, wsState.connectedUserIDs(), nil)
		return
	}

	table.seats[seatIdx].pendingLeave = true
	playerIdx, ok := table.playerOfSeat[seatIdx]
	if !ok {
		return
	}
	state := table.engineGame.State()
	if playerIdx < len(state.Players) && !state.Players[playerIdx].Folded && !state.Players[playerIdx].AllIn {
		if err := table.engineGame.Play(uint64(playerIdx), "fold", 0); err != nil {
			fmt.Printf("Failed to auto-fold disconnected user %d: %v\n", userID, err)
			return
		}
		table.advanceAfterAction(wsState)
		return
	}
	table.broadcastState(wsState, wsState.connectedUserIDs(), nil)
}

// MARK: table lifecycle — all called with table.mutex held

// reconcile makes table.engineGame match exactly the currently seated
// players, recreating it (preserving each survivor's live stack) if the
// seat composition changed since it was last built. A no-op otherwise, so
// the common case — nobody joined, left, or busted — keeps the same game
// (and its dealer rotation) across hands.
func (table *PokerTable) reconcile(wsState *WebSocketState) {
	seatIndices := make([]int, 0, PokerSeatCount)
	for seatIdx, seat := range table.seats {
		if seat != nil {
			seatIndices = append(seatIndices, seatIdx)
		}
	}

	if table.sameComposition(seatIndices) {
		return
	}

	// Sync each survivor's last-known stack onto its seat before the live
	// engine game (their only other source of truth) is torn down below.
	stacksBySeat := make(map[int]int64, len(seatIndices))
	for _, seatIdx := range seatIndices {
		stack := table.currentStack(seatIdx)
		stacksBySeat[seatIdx] = stack
		table.seats[seatIdx].stack = stack
	}

	if table.engineGame != nil {
		if err := table.engineGame.Close(); err != nil {
			fmt.Println("Failed to close texas game:", err)
		}
	}
	table.engineGame = nil
	table.playerOfSeat = nil

	if len(seatIndices) < 2 {
		return
	}

	stacks := make([]int64, len(seatIndices))
	for i, seatIdx := range seatIndices {
		stacks[i] = stacksBySeat[seatIdx]
	}

	engineGame, err := wsState.engineService.CreateTexasGame(stacks)
	if err != nil {
		fmt.Println("Failed to create texas game:", err)
		return
	}

	table.engineGame = engineGame
	table.playerOfSeat = make(map[int]int, len(seatIndices))
	for playerIdx, seatIdx := range seatIndices {
		table.playerOfSeat[seatIdx] = playerIdx
	}
}

func (table *PokerTable) sameComposition(seatIndices []int) bool {
	if table.engineGame == nil || len(table.playerOfSeat) != len(seatIndices) {
		return false
	}
	for _, seatIdx := range seatIndices {
		if _, ok := table.playerOfSeat[seatIdx]; !ok {
			return false
		}
	}
	return true
}

// removeSeat settles a seat's session at its current stack and vacates it.
func (table *PokerTable) removeSeat(wsState *WebSocketState, seatIdx int, reason string) {
	seat := table.seats[seatIdx]
	if seat == nil {
		return
	}
	finalStack := decimal.NewFromInt(table.currentStack(seatIdx))
	table.seats[seatIdx] = nil
	if err := wsState.gameService.SettlePokerGame(seat.gameID, seat.userID, finalStack, reason); err != nil {
		fmt.Printf("Failed to settle poker game for user %d: %v\n", seat.userID, err)
	}
}

// removeFinishedSeats clears out anyone who busted this hand or disconnected
// during it. Must be called after a hand ends, before reconcile.
func (table *PokerTable) removeFinishedSeats(wsState *WebSocketState) {
	if table.engineGame == nil {
		return
	}
	state := table.engineGame.State()
	for seatIdx, playerIdx := range table.playerOfSeat {
		seat := table.seats[seatIdx]
		if seat == nil || playerIdx >= len(state.Players) {
			continue
		}
		switch {
		case state.Players[playerIdx].Stack <= 0:
			table.removeSeat(wsState, seatIdx, "busted")
		case seat.pendingLeave:
			table.removeSeat(wsState, seatIdx, "left")
		}
	}
}

func (table *PokerTable) tryStartHand(wsState *WebSocketState) {
	if table.handActive || table.engineGame == nil || table.seatedCount() < 2 {
		return
	}

	state := table.engineGame.State()
	table.handStartStacks = make(map[int]int64, len(table.playerOfSeat))
	for seatIdx, playerIdx := range table.playerOfSeat {
		if playerIdx < len(state.Players) {
			table.handStartStacks[seatIdx] = state.Players[playerIdx].Stack
		}
	}

	if err := table.engineGame.PostBlinds(PokerSmallBlind, PokerBigBlind); err != nil {
		fmt.Println("Failed to post blinds:", err)
		return
	}
	table.handActive = true
}

// advanceAfterAction broadcasts the post-action state to everyone connected.
// If that action ended the hand, it reveals the showdown and the result
// first, then removes anyone who busted or left, and schedules the next
// hand after a short pause so the result stays visible for a moment.
func (table *PokerTable) advanceAfterAction(wsState *WebSocketState) {
	if table.engineGame == nil || table.engineGame.State().Phase != "showdown" {
		table.broadcastState(wsState, wsState.connectedUserIDs(), nil)
		return
	}

	recipients := wsState.connectedUserIDs()
	handResult := table.finishHand()
	table.handActive = false
	table.broadcastState(wsState, recipients, handResult)

	table.removeFinishedSeats(wsState)
	table.reconcile(wsState)
	table.broadcastState(wsState, recipients, nil)

	if table.seatedCount() >= 2 && table.engineGame != nil {
		currentGame := table.engineGame
		go table.scheduleNextHand(wsState, currentGame)
	}
}

// finishHand compares each seat's stack to its snapshot from the start of
// the hand to report who won and by how much — no DB calls here, since a
// continuing player's money stays in play at the table between hands.
func (table *PokerTable) finishHand() *PacketPokerHandResult {
	state := table.engineGame.State()

	var winners []PacketPokerHandWinner
	for seatIdx, playerIdx := range table.playerOfSeat {
		seat := table.seats[seatIdx]
		if seat == nil || playerIdx >= len(state.Players) {
			continue
		}
		delta := state.Players[playerIdx].Stack - table.handStartStacks[seatIdx]
		if delta > 0 {
			winners = append(winners, PacketPokerHandWinner{
				Seat:     seatIdx,
				Username: seat.username,
				Amount:   delta,
			})
		}
	}

	pot := int64(0)
	for _, winner := range winners {
		pot += winner.Amount
	}

	return &PacketPokerHandResult{Winners: winners, Pot: pot}
}

// scheduleNextHand waits a moment after a hand ends and then starts the
// next one, unless the table was reconfigured (someone joined, left, or the
// engine game was otherwise recreated) while it was waiting.
func (table *PokerTable) scheduleNextHand(wsState *WebSocketState, expectGame *services.TexasEngineGame) {
	time.Sleep(pokerNextHandGap)

	table.mutex.Lock()
	defer table.mutex.Unlock()

	if table.engineGame != expectGame {
		return
	}
	table.tryStartHand(wsState)
	table.broadcastState(wsState, wsState.connectedUserIDs(), nil)
}

// MARK: broadcast

func (wsState *WebSocketState) sendPokerError(userID uint, message string) {
	if err := wsState.SendToTopic(userID, TopicGame, PacketTypeError, PacketError{Message: message}); err != nil {
		fmt.Printf("Failed to send poker error to user %d: %v\n", userID, err)
	}
}

// broadcastState sends every recipient a personalized snapshot of the table
// — hole cards are only included for the recipient's own seat, or for any
// seat still in the hand once it reaches showdown. handResult, when given,
// is attached so clients can show who just won without it being wiped by
// the very next state update.
func (table *PokerTable) broadcastState(wsState *WebSocketState, recipients []uint, handResult *PacketPokerHandResult) {
	var state services.TexasEngineGameState
	if table.engineGame != nil {
		state = table.engineGame.State()
	}
	showdown := state.Phase == "showdown"

	pot := int64(0)
	for _, contribution := range state.Pot {
		pot += contribution
	}

	baseSeats := make([]PacketPokerSeat, 0, PokerSeatCount)
	for seatIdx, seat := range table.seats {
		if seat == nil {
			continue
		}
		packetSeat := PacketPokerSeat{
			Seat:      seatIdx,
			UserID:    seat.userID,
			Username:  seat.username,
			AvatarURL: seat.avatarURL,
			Stack:     seat.stack,
		}
		if playerIdx, ok := table.playerOfSeat[seatIdx]; ok && playerIdx < len(state.Players) {
			player := state.Players[playerIdx]
			packetSeat.Stack = player.Stack
			packetSeat.CurrentBet = player.CurrentBet
			packetSeat.Folded = player.Folded
			packetSeat.AllIn = player.AllIn
			packetSeat.IsDealer = int(state.Dealer) == playerIdx
			packetSeat.IsTurn = table.handActive && !showdown && int(state.CurrentPlayer) == playerIdx
			if !packetSeat.Folded && showdown {
				packetSeat.HoleCards = player.HoleCards
			}
		}
		baseSeats = append(baseSeats, packetSeat)
	}

	for _, recipientID := range recipients {
		seats := make([]PacketPokerSeat, len(baseSeats))
		copy(seats, baseSeats)
		yourSeat := -1
		for i := range seats {
			if seats[i].UserID != recipientID {
				continue
			}
			yourSeat = seats[i].Seat
			if playerIdx, ok := table.playerOfSeat[seats[i].Seat]; ok && playerIdx < len(state.Players) {
				seats[i].HoleCards = state.Players[playerIdx].HoleCards
			}
		}
		payload := PacketPokerState{
			Seats:            seats,
			YourSeat:         yourSeat,
			HandActive:       table.handActive,
			Phase:            state.Phase,
			CommunityCards:   state.CommunityCards,
			Pot:              pot,
			MinRaise:         state.MinRaise,
			SmallBlind:       PokerSmallBlind,
			BigBlind:         PokerBigBlind,
			BuyIn:            PokerBuyIn,
			LastActionType:   state.LastActionType,
			LastActionAmount: state.LastActionAmount,
			HandResult:       handResult,
		}
		if err := wsState.SendToTopic(recipientID, TopicGame, PacketTypePokerState, payload); err != nil {
			fmt.Printf("Failed to send poker state to user %d: %v\n", recipientID, err)
		}
	}
}
