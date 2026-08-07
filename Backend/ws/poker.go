package ws

import (
	"fmt"
	"sync"
	"time"

	"transcendence/models"
	"transcendence/services"
	"transcendence/utils"

	"github.com/shopspring/decimal"
)

// MARK: PokerTable
//
// One table's live runtime. Many tables run concurrently, tracked by
// WebSocketState.pokerRegistry — a table's own settings (buy-in, blinds,
// max seats, public/private) come from its models.PokerTable row at
// creation time and are cached here for the hot path; access control
// always re-checks the DB (see pokerTableService.CanAccess), never this
// cache. Once at least two seats are filled, hands deal themselves
// automatically and keep going — the same engine game plays hand after
// hand, carrying stacks forward — until fewer than two players remain. A
// seat is only vacated when its player leaves between hands or busts out
// (stack hits 0); everyone else just keeps playing.

const (
	pokerNextHandGap       = 4 * time.Second  // pause between hands so players can see who won
	pokerTurnTimeout       = 30 * time.Second // time a player has to act before being auto-folded and kicked
	pokerAbandonedTableGap = 5 * time.Minute  // grace period before a fully-empty table auto-closes
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
	id uint // immutable after construction — safe to read without the mutex

	mutex sync.Mutex

	// name/isPrivate are cached for display only; CanAccess always
	// re-checks the DB, so this is never itself the source of truth for
	// access control.
	name       string
	isPrivate  bool
	buyIn      int64
	smallBlind int64
	bigBlind   int64

	seats      []*pokerSeat // len == maxSeats
	maxSeats   int
	spectators map[uint]bool // userIDs watching without a seat — seated XOR spectating, never both

	engineGame *services.TexasEngineGame // persists across hands; nil below 2 seated
	handActive bool
	// playerOfSeat translates this table's sparse seat numbers into the
	// engine's dense 0..n-1 player indices for the current engineGame.
	playerOfSeat map[int]int
	// handStartStacks snapshots each seat's stack right before the current
	// hand's blinds are posted, so the win/loss for that hand alone can be
	// computed once it ends.
	handStartStacks map[int]int64
	// turnDeadline is when the acting player will be auto-folded and kicked
	// if they haven't acted by then; zero while no turn is awaiting action
	// (between hands, or at showdown). Broadcast to clients so they can
	// render a countdown.
	turnDeadline time.Time
	// turnGen is bumped every time turnDeadline is (re)armed, so a stale
	// enforceTurnTimeout goroutine from an already-completed turn can tell
	// it's no longer current and do nothing.
	turnGen int

	// closed is set once the table is explicitly closed by its host or by
	// the abandoned-table garbage collector. Every deferred goroutine
	// (enforceTurnTimeout, scheduleNextHand, scheduleAbandonedClose)
	// rechecks this after re-acquiring the mutex and no-ops if true, so a
	// goroutine outliving the table's registry entry can never resurrect or
	// mutate a table that's already gone.
	closed bool
	// abandonedGen is bumped every time the table's emptiness could have
	// changed, exactly like turnGen — the same sleep+relock+compare-
	// generation pattern used by enforceTurnTimeout/scheduleNextHand,
	// reused here for the abandoned-table GC timer.
	abandonedGen int
}

func newPokerTable(row *models.PokerTable) *PokerTable {
	return &PokerTable{
		id:         row.ID,
		name:       row.Name,
		isPrivate:  row.IsPrivate,
		buyIn:      row.BuyIn.IntPart(),
		smallBlind: row.SmallBlind.IntPart(),
		bigBlind:   row.BigBlind.IntPart(),
		seats:      make([]*pokerSeat, row.MaxSeats),
		maxSeats:   row.MaxSeats,
		spectators: make(map[uint]bool),
	}
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
		return table.buyIn
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

// recipients is every userID that should receive this table's broadcasts —
// every seated player plus every spectator. This is the table-scoping fix:
// every call site that used to broadcast to wsState.connectedUserIDs() (the
// whole server) now uses this instead.
func (table *PokerTable) recipients() []uint {
	ids := make([]uint, 0, len(table.seats)+len(table.spectators))
	for _, seat := range table.seats {
		if seat != nil {
			ids = append(ids, seat.userID)
		}
	}
	for userID := range table.spectators {
		ids = append(ids, userID)
	}
	return ids
}

// MARK: inbound actions — all called from ws.Main() with no lock held

func (wsState *WebSocketState) pokerJoin(userID uint, tableID uint, seat int) {
	table := wsState.pokerRegistry.get(tableID)
	if table == nil {
		wsState.sendPokerError(userID, "table not found")
		return
	}
	if _, err := wsState.pokerTableService.CanAccess(tableID, userID); err != nil {
		wsState.sendPokerError(userID, err.Error())
		return
	}

	table.mutex.Lock()
	defer table.mutex.Unlock()

	if seat < 0 || seat >= table.maxSeats {
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

	game, err := wsState.gameService.CreatePokerGame(userID, decimal.NewFromInt(table.buyIn), seat, tableID)
	if err != nil {
		wsState.sendPokerError(userID, err.Error())
		return
	}

	table.seats[seat] = &pokerSeat{
		userID:    userID,
		username:  user.Username,
		avatarURL: user.AvatarURL,
		gameID:    game.ID,
		stack:     table.buyIn,
	}
	delete(table.spectators, userID) // a joined seat is never also a spectator

	table.reconcile(wsState)
	table.tryStartHand(wsState)
	table.armOrDisarmAbandonedTimer(wsState)
	table.broadcastState(wsState, table.recipients(), nil)
}

// pokerLeave vacates a seat, or drops a spectator. Between hands a seat is
// removed immediately; mid-hand it's auto-folded (same as a disconnect, see
// foldSeatForLeaving) so play can continue, and actually removed once that
// hand ends.
func (wsState *WebSocketState) pokerLeave(userID uint, tableID uint) {
	table := wsState.pokerRegistry.get(tableID)
	if table == nil {
		wsState.sendPokerError(userID, "table not found")
		return
	}
	table.mutex.Lock()
	defer table.mutex.Unlock()

	if seatIdx := table.seatOf(userID); seatIdx >= 0 {
		if !table.handActive {
			table.removeSeat(wsState, seatIdx, "left")
			table.reconcile(wsState)
			table.tryStartHand(wsState)
			table.armOrDisarmAbandonedTimer(wsState)
			table.broadcastState(wsState, table.recipients(), nil)
			return
		}
		table.foldSeatForLeaving(wsState, seatIdx)
		return
	}
	if table.spectators[userID] {
		delete(table.spectators, userID)
		table.armOrDisarmAbandonedTimer(wsState)
		table.broadcastState(wsState, table.recipients(), nil)
		return
	}
	wsState.sendPokerError(userID, "not part of this table")
}

// pokerSpectate registers userID as a view-only observer — subscribed to
// broadcasts but never dealt into a hand — and immediately sends them the
// current snapshot. A seated user cannot also spectate.
func (wsState *WebSocketState) pokerSpectate(userID uint, tableID uint) {
	table := wsState.pokerRegistry.get(tableID)
	if table == nil {
		wsState.sendPokerError(userID, "table not found")
		return
	}
	if _, err := wsState.pokerTableService.CanAccess(tableID, userID); err != nil {
		wsState.sendPokerError(userID, err.Error())
		return
	}

	table.mutex.Lock()
	defer table.mutex.Unlock()

	if table.seatOf(userID) >= 0 {
		wsState.sendPokerError(userID, "already seated")
		return
	}
	table.spectators[userID] = true
	table.armOrDisarmAbandonedTimer(wsState)
	table.broadcastState(wsState, []uint{userID}, nil)
}

func (wsState *WebSocketState) pokerPlay(userID uint, tableID uint, action string, amount int64) {
	table := wsState.pokerRegistry.get(tableID)
	if table == nil {
		wsState.sendPokerError(userID, "table not found")
		return
	}
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
func (wsState *WebSocketState) pokerSync(userID uint, tableID uint) {
	table := wsState.pokerRegistry.get(tableID)
	if table == nil {
		wsState.sendPokerError(userID, "table not found")
		return
	}
	if _, err := wsState.pokerTableService.CanAccess(tableID, userID); err != nil {
		wsState.sendPokerError(userID, err.Error())
		return
	}
	table.mutex.Lock()
	defer table.mutex.Unlock()

	table.broadcastState(wsState, []uint{userID}, nil)
}

// pokerHandleDisconnect is called once a user's last WebSocket connection
// closes. Since the disconnect isn't scoped to any one table, every live
// table is scanned; a user seated or spectating at more than one (e.g.
// multiple tabs on the same account) is removed from each. Between hands
// they're settled and removed immediately; mid-hand they're auto-folded so
// play can continue, then removed once that hand is over rather than being
// dealt into another one nobody can act for.
func (wsState *WebSocketState) pokerHandleDisconnect(userID uint) {
	for _, table := range wsState.pokerRegistry.snapshot() {
		table.mutex.Lock()
		if seatIdx := table.seatOf(userID); seatIdx >= 0 {
			if !table.handActive {
				table.removeSeat(wsState, seatIdx, "left")
				table.reconcile(wsState)
				table.tryStartHand(wsState)
				table.armOrDisarmAbandonedTimer(wsState)
				table.broadcastState(wsState, table.recipients(), nil)
			} else {
				table.foldSeatForLeaving(wsState, seatIdx)
			}
		} else if table.spectators[userID] {
			delete(table.spectators, userID)
			table.armOrDisarmAbandonedTimer(wsState)
			table.broadcastState(wsState, table.recipients(), nil)
		}
		table.mutex.Unlock()
	}
}

// foldSeatForLeaving auto-folds seatIdx's hand (if it's still live — not
// already folded or all-in) and marks it pendingLeave so it's actually
// vacated once the hand ends, then advances play. This is the shared exit
// path for any seat that needs to leave without playing out the hand:
// disconnects, a leave request sent mid-round, a kick, and a turn timing
// out. Called with table.mutex already held.
func (table *PokerTable) foldSeatForLeaving(wsState *WebSocketState, seatIdx int) {
	table.seats[seatIdx].pendingLeave = true
	playerIdx, ok := table.playerOfSeat[seatIdx]
	if !ok {
		return
	}
	state := table.engineGame.State()
	if playerIdx < len(state.Players) && !state.Players[playerIdx].Folded && !state.Players[playerIdx].AllIn {
		if err := table.engineGame.Play(uint64(playerIdx), "fold", 0); err != nil {
			fmt.Printf("Failed to auto-fold leaving seat %d at table %d: %v\n", seatIdx, table.id, err)
			return
		}
		table.advanceAfterAction(wsState)
		return
	}
	table.broadcastState(wsState, table.recipients(), nil)
}

// MARK: table lifecycle — all called with table.mutex held

// reconcile makes table.engineGame match exactly the currently seated
// players, recreating it (preserving each survivor's live stack) if the
// seat composition changed since it was last built. A no-op otherwise, so
// the common case — nobody joined, left, or busted — keeps the same game
// (and its dealer rotation) across hands.
func (table *PokerTable) reconcile(wsState *WebSocketState) {
	seatIndices := make([]int, 0, len(table.seats))
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

	if err := table.engineGame.PostBlinds(table.smallBlind, table.bigBlind); err != nil {
		fmt.Println("Failed to post blinds:", err)
		return
	}
	table.handActive = true
	table.startTurnTimer(wsState)
}

// startTurnTimer (re)arms the countdown for whoever must act next, bumping
// turnGen so any earlier countdown still sleeping in enforceTurnTimeout can
// tell it's stale and do nothing when it wakes up. Must be called any time
// the acting player changes: a new hand starting, and every action taken
// (see advanceAfterAction).
func (table *PokerTable) startTurnTimer(wsState *WebSocketState) {
	table.turnGen++
	gen := table.turnGen

	if !table.handActive || table.engineGame == nil || table.engineGame.State().Phase == "showdown" {
		table.turnDeadline = time.Time{}
		return
	}

	playerIdx := int(table.engineGame.State().CurrentPlayer)
	table.turnDeadline = time.Now().Add(pokerTurnTimeout)
	go table.enforceTurnTimeout(wsState, gen, playerIdx)
}

// enforceTurnTimeout auto-folds and kicks whoever hasn't acted by the
// deadline armed for them in startTurnTimer. gen and playerIdx are captured
// at arm time so a timer left over from a turn that already ended — acted
// on normally, or ended by that seat leaving/disconnecting some other way —
// can recognize that and do nothing.
func (table *PokerTable) enforceTurnTimeout(wsState *WebSocketState, gen int, playerIdx int) {
	time.Sleep(pokerTurnTimeout)

	table.mutex.Lock()
	defer table.mutex.Unlock()

	if table.closed || table.turnGen != gen || !table.handActive || table.engineGame == nil {
		return
	}
	state := table.engineGame.State()
	if state.Phase == "showdown" || int(state.CurrentPlayer) != playerIdx {
		return
	}

	seatIdx := -1
	for seat, player := range table.playerOfSeat {
		if player == playerIdx {
			seatIdx = seat
			break
		}
	}
	if seatIdx < 0 || table.seats[seatIdx] == nil {
		return
	}

	table.foldSeatForLeaving(wsState, seatIdx)
}

// advanceAfterAction broadcasts the post-action state to everyone connected.
// If that action ended the hand, it reveals the showdown and the result
// first, then removes anyone who busted or left, and schedules the next
// hand after a short pause so the result stays visible for a moment.
func (table *PokerTable) advanceAfterAction(wsState *WebSocketState) {
	if table.engineGame == nil || table.engineGame.State().Phase != "showdown" {
		table.startTurnTimer(wsState)
		table.broadcastState(wsState, table.recipients(), nil)
		return
	}
	table.startTurnTimer(wsState) // clears turnDeadline — no one to act at showdown

	recipients := table.recipients()
	handResult := table.finishHand()
	table.handActive = false
	table.broadcastState(wsState, recipients, handResult)

	table.removeFinishedSeats(wsState)
	table.reconcile(wsState)
	table.armOrDisarmAbandonedTimer(wsState)
	table.broadcastState(wsState, table.recipients(), nil)

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

	winners := []PacketPokerHandWinner{}
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
// engine game was otherwise recreated) or closed while it was waiting.
func (table *PokerTable) scheduleNextHand(wsState *WebSocketState, expectGame *services.TexasEngineGame) {
	time.Sleep(pokerNextHandGap)

	table.mutex.Lock()
	defer table.mutex.Unlock()

	if table.closed || table.engineGame != expectGame {
		return
	}
	table.tryStartHand(wsState)
	table.broadcastState(wsState, table.recipients(), nil)
}

// MARK: abandoned-table garbage collection

// armOrDisarmAbandonedTimer must be called after any join/leave/spectate/
// kick/disconnect/hand-end that could change whether the table is fully
// empty. It bumps abandonedGen every time (invalidating any in-flight
// timer, exactly like startTurnTimer does for turnGen) and, only if the
// table just became fully empty, arms a fresh one. Called with table.mutex
// held.
func (table *PokerTable) armOrDisarmAbandonedTimer(wsState *WebSocketState) {
	table.abandonedGen++
	if table.closed || table.seatedCount() > 0 || len(table.spectators) > 0 {
		return
	}
	gen := table.abandonedGen
	go table.scheduleAbandonedClose(wsState, gen)
}

func (table *PokerTable) scheduleAbandonedClose(wsState *WebSocketState, gen int) {
	time.Sleep(pokerAbandonedTableGap)

	table.mutex.Lock()
	if table.closed || table.abandonedGen != gen || table.seatedCount() > 0 || len(table.spectators) > 0 {
		table.mutex.Unlock()
		return
	}
	table.closed = true
	id := table.id
	table.mutex.Unlock() // release before touching the registry — never hold both locks at once

	wsState.pokerRegistry.remove(id)
	if err := wsState.pokerTableService.MarkClosed(id); err != nil {
		fmt.Printf("Failed to mark abandoned poker table %d closed: %v\n", id, err)
	}
}

// MARK: host-triggered actions — called only from REST handlers that have
// already verified the caller is the table's host (see
// PokerTableService.RequireHost); these never re-check host themselves.

// pokerCreateTable installs a freshly-persisted DB row's runtime table into
// the registry. Called synchronously by the REST create handler before it
// responds, so the registry entry exists before the client can send a
// "join" or "spectate" packet for it. A table starts fully empty, so this
// also arms its abandoned-table GC timer immediately — a table that's
// created and never joined must still eventually be reaped.
func (wsState *WebSocketState) pokerCreateTable(row *models.PokerTable) {
	table := newPokerTable(row)
	wsState.pokerRegistry.add(table)
	table.mutex.Lock()
	table.armOrDisarmAbandonedTimer(wsState)
	table.mutex.Unlock()
}

// pokerUpdateSettings applies a settings change to the runtime table.
// Name/privacy always apply; buy-in/blinds/max-seats only apply if the
// table has zero seated players — checked and applied inside the same
// critical section (not a separate peek beforehand), so there's no window
// for a seat to be taken between checking and applying. Returns whether the
// resize fields were applied, so the caller persists exactly what took
// effect, and ok=false if the table isn't registered.
func (wsState *WebSocketState) pokerUpdateSettings(tableID uint, row *models.PokerTable) (resized bool, ok bool) {
	table := wsState.pokerRegistry.get(tableID)
	if table == nil {
		return false, false
	}
	table.mutex.Lock()

	table.name = row.Name
	table.isPrivate = row.IsPrivate
	// A table just flipped (or already was) private must not keep watching
	// through a spectator slot that was only ever valid while it was
	// public — otherwise "make private" doesn't actually restrict who sees
	// the live hand. Seated players are left alone; only the audience that
	// never bought in is re-checked.
	var evicted []uint
	if table.isPrivate {
		for userID := range table.spectators {
			if userID == row.HostUserID {
				continue
			}
			invited, err := wsState.pokerTableService.IsInvited(tableID, userID)
			if err != nil {
				fmt.Printf("Failed to check invite for user %d while re-gating spectators: %v\n", userID, err)
				continue
			}
			if !invited {
				delete(table.spectators, userID)
				evicted = append(evicted, userID)
			}
		}
	}
	if table.seatedCount() == 0 {
		table.buyIn = row.BuyIn.IntPart()
		table.smallBlind = row.SmallBlind.IntPart()
		table.bigBlind = row.BigBlind.IntPart()
		if row.MaxSeats != table.maxSeats {
			table.seats = make([]*pokerSeat, row.MaxSeats)
			table.maxSeats = row.MaxSeats
		}
		resized = true
	}
	table.broadcastState(wsState, table.recipients(), nil)
	table.mutex.Unlock()

	for _, userID := range evicted {
		if err := wsState.SendToTopic(userID, TopicGame, PacketTypePokerKicked,
			PacketPokerKicked{TableID: tableID, Reason: "this table is now private"}); err != nil {
			fmt.Printf("Failed to send poker_kicked to user %d: %v\n", userID, err)
		}
	}
	return resized, true
}

// pokerKick forcibly removes targetUserID, whether seated or spectating.
// These are deliberately different code paths: a seated player must be
// folded-and-settled through the normal money path so their stack is
// correctly credited back; a spectator is just a map delete with no money
// or engine-state implications at all.
func (wsState *WebSocketState) pokerKick(tableID uint, targetUserID uint) {
	table := wsState.pokerRegistry.get(tableID)
	if table == nil {
		return
	}

	table.mutex.Lock()
	if seatIdx := table.seatOf(targetUserID); seatIdx >= 0 {
		if table.handActive {
			table.foldSeatForLeaving(wsState, seatIdx)
		} else {
			table.removeSeat(wsState, seatIdx, "kicked")
			table.reconcile(wsState)
			table.tryStartHand(wsState)
			table.armOrDisarmAbandonedTimer(wsState)
			table.broadcastState(wsState, table.recipients(), nil)
		}
	} else if table.spectators[targetUserID] {
		delete(table.spectators, targetUserID)
		table.armOrDisarmAbandonedTimer(wsState)
		table.broadcastState(wsState, table.recipients(), nil)
	}
	table.mutex.Unlock()

	if err := wsState.SendToTopic(targetUserID, TopicGame, PacketTypePokerKicked,
		PacketPokerKicked{TableID: tableID, Reason: "kicked by host"}); err != nil {
		fmt.Printf("Failed to send poker_kicked to user %d: %v\n", targetUserID, err)
	}
}

// pokerCloseTable settles every seated player at their current stack and
// removes the table from the registry. Refuses while a hand is active:
// chips wagered into the current hand live in the engine's pot, not in any
// seat's stack, so closing mid-hand would destroy them rather than return
// them to anyone — the host must wait for the hand in progress to finish.
func (wsState *WebSocketState) pokerCloseTable(tableID uint) error {
	table := wsState.pokerRegistry.get(tableID)
	if table == nil {
		return nil
	}

	table.mutex.Lock()
	if table.handActive {
		table.mutex.Unlock()
		return utils.ErrPokerHandInProgress
	}
	table.closed = true
	recipients := table.recipients() // captured before seats are cleared below, so every seated player (not just spectators) gets notified
	// Snapshot each seat's live stack before the engine game — its only
	// source of truth while seated — is torn down below: currentStack()
	// falls back to the stale seat.stack cache once engineGame is nil,
	// which would settle everyone at their buy-in instead of what they
	// actually have.
	for seatIdx, seat := range table.seats {
		if seat != nil {
			seat.stack = table.currentStack(seatIdx)
		}
	}
	if table.engineGame != nil {
		if err := table.engineGame.Close(); err != nil {
			fmt.Println("Failed to close texas game on table close:", err)
		}
		table.engineGame = nil
	}
	for seatIdx, seat := range table.seats {
		if seat != nil {
			table.removeSeat(wsState, seatIdx, "table_closed")
		}
	}
	table.mutex.Unlock() // release before touching the registry

	wsState.pokerRegistry.remove(tableID)
	for _, userID := range recipients {
		if err := wsState.SendToTopic(userID, TopicGame, PacketTypePokerClosed, PacketPokerClosed{TableID: tableID}); err != nil {
			fmt.Printf("Failed to send poker_closed to user %d: %v\n", userID, err)
		}
	}
	return nil
}

// PokerCreateTable, PokerUpdateSettings, PokerKick, PokerCloseTable and
// PokerTableLiveCounts are the exported entry points REST handlers use to
// reach into the live registry. Everything else in this file stays
// package-private, reachable only from ws.go's dispatcher.

func (wsState *WebSocketState) PokerCreateTable(row *models.PokerTable) {
	wsState.pokerCreateTable(row)
}

func (wsState *WebSocketState) PokerUpdateSettings(tableID uint, row *models.PokerTable) (resized bool, ok bool) {
	return wsState.pokerUpdateSettings(tableID, row)
}

func (wsState *WebSocketState) PokerKick(tableID uint, targetUserID uint) {
	wsState.pokerKick(tableID, targetUserID)
}

func (wsState *WebSocketState) PokerCloseTable(tableID uint) error {
	return wsState.pokerCloseTable(tableID)
}

// PokerTableLiveCounts peeks a live table's occupancy for REST responses —
// same shape as the existing IsOnline(userID) peek in helpers.go. ok is
// false if the table isn't currently registered (e.g. already closed).
func (wsState *WebSocketState) PokerTableLiveCounts(tableID uint) (seated int, spectating int, ok bool) {
	table := wsState.pokerRegistry.get(tableID)
	if table == nil {
		return 0, 0, false
	}
	table.mutex.Lock()
	defer table.mutex.Unlock()
	return table.seatedCount(), len(table.spectators), true
}

// MARK: broadcast

func (wsState *WebSocketState) sendPokerError(userID uint, message string) {
	if err := wsState.SendToTopic(userID, TopicGame, PacketTypeError, PacketError{Message: message}); err != nil {
		fmt.Printf("Failed to send poker error to user %d: %v\n", userID, err)
	}
}

// broadcastState sends every recipient a personalized snapshot of the table
// — hole cards are only included for the recipient's own seat, or for any
// seat still in the hand once it reaches showdown (see poker_broadcast.go).
// handResult, when given, is attached so clients can show who just won
// without it being wiped by the very next state update.
func (table *PokerTable) broadcastState(wsState *WebSocketState, recipients []uint, handResult *PacketPokerHandResult) {
	var state services.TexasEngineGameState
	if table.engineGame != nil {
		state = table.engineGame.State()
	}
	showdown := state.Phase == "showdown"

	var turnDeadlineMillis int64
	if table.handActive && !showdown && !table.turnDeadline.IsZero() {
		turnDeadlineMillis = table.turnDeadline.UnixMilli()
	}

	pot := int64(0)
	for _, contribution := range state.Pot {
		pot += contribution
	}

	baseSeats := buildBaseSeats(table.seats, table.playerOfSeat, state, table.handActive)

	for _, recipientID := range recipients {
		seats, yourSeat := personalizeSeatsFor(baseSeats, recipientID, table.playerOfSeat, state)
		payload := PacketPokerState{
			TableID:          table.id,
			TableName:        table.name,
			IsPrivate:        table.isPrivate,
			MaxSeats:         table.maxSeats,
			Seats:            seats,
			YourSeat:         yourSeat,
			IsSpectator:      yourSeat < 0 && table.spectators[recipientID],
			HandActive:       table.handActive,
			Phase:            state.Phase,
			CommunityCards:   state.CommunityCards,
			Pot:              pot,
			MinRaise:         state.MinRaise,
			SmallBlind:       table.smallBlind,
			BigBlind:         table.bigBlind,
			BuyIn:            table.buyIn,
			LastActionType:   state.LastActionType,
			LastActionAmount: state.LastActionAmount,
			TurnDeadline:     turnDeadlineMillis,
			HandResult:       handResult,
		}
		if err := wsState.SendToTopic(recipientID, TopicGame, PacketTypePokerState, payload); err != nil {
			fmt.Printf("Failed to send poker state to user %d: %v\n", recipientID, err)
		}
	}
}
