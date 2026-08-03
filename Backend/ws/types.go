package ws

import (
	"sync"
	"time"

	"encoding/json"
	"transcendence/services"
	"transcendence/utils"

	"github.com/gorilla/websocket"
)

// MARK: Topic

type Topic int

const (
	TopicInvalid Topic = iota
	TopicGeneric
	TopicGame
	TopicChat
	TopicNotification
	TopicMax
)

var topicMap = map[string]Topic{
	"generic":      TopicGeneric, // emitted packet types: online
	"game":         TopicGame,
	"chat":         TopicChat,
	"notification": TopicNotification, // emitted packet types: notification
}

func TopicFromString(topicString string) (Topic, error) {
	topic := topicMap[topicString]
	if topic == Topic(0) && topicString != "generic" {
		return Topic(0), utils.ErrInvalidTopicString
	} else {
		return topic, nil
	}
}

// MARK: Packets

type PacketOnline struct {
	UserID   uint `json:"user_id"`
	IsOnline bool `json:"is_online"`
}

type PacketNotification struct {
	Type      string    `json:"notification_type"`
	Head      string    `json:"head"`
	Body      string    `json:"body"`
	ImageURL  string    `json:"image_url"`
	ActionURL string    `json:"action_url"`
	Timestamp time.Time `json:"timestamp"`
}

// PacketJoinLeave and PacketPlay are inbound-only — the userID a packet is
// attributed to always comes from the authenticated connection (see
// pumpFromConnection), never from client-supplied payload fields, so there
// is no user/game id to carry here beyond the seat being acted on.
type PacketJoinLeave struct {
	Seat int `json:"seat"`
}

type PacketPlay struct {
	Action string `json:"action"`
	Amount int64  `json:"amount"`
}

// PacketPokerSeat describes one seat of the poker table. HoleCards is only
// populated for the recipient's own seat, or for any seat still in the hand
// once it reaches showdown.
type PacketPokerSeat struct {
	Seat       int      `json:"seat"`
	UserID     uint     `json:"user_id"`
	Username   string   `json:"username"`
	AvatarURL  string   `json:"avatar_url"`
	Stack      int64    `json:"stack"`
	CurrentBet int64    `json:"current_bet"`
	Folded     bool     `json:"folded"`
	AllIn      bool     `json:"all_in"`
	IsDealer   bool     `json:"is_dealer"`
	IsTurn     bool     `json:"is_turn"`
	HoleCards  []string `json:"hole_cards,omitempty"`
}

// PacketPokerHandWinner is one seat's share of the pot from a hand that just ended.
type PacketPokerHandWinner struct {
	Seat     int    `json:"seat"`
	Username string `json:"username"`
	Amount   int64  `json:"amount"`
}

// PacketPokerHandResult is attached to the state broadcast right after a
// hand reaches showdown, so clients can show who won without it being
// wiped by the very next update (seats keep playing — the table doesn't
// reset after every hand).
type PacketPokerHandResult struct {
	Winners []PacketPokerHandWinner `json:"winners"`
	Pot     int64                   `json:"pot"`
}

// PacketPokerState is a full snapshot of the table, sent individually to
// every seated player so hole cards can be redacted per recipient.
type PacketPokerState struct {
	Seats            []PacketPokerSeat `json:"seats"`
	YourSeat         int               `json:"your_seat"` // -1 if not seated
	HandActive       bool              `json:"hand_active"`
	Phase            string            `json:"phase"`
	CommunityCards   []string          `json:"community_cards"`
	Pot              int64             `json:"pot"`
	MinRaise         int64             `json:"min_raise"`
	SmallBlind       int64             `json:"small_blind"`
	BigBlind         int64             `json:"big_blind"`
	BuyIn            int64             `json:"buy_in"`
	LastActionType   string            `json:"last_action_type"`
	LastActionAmount int64             `json:"last_action_amount"`
	// TurnDeadline is the unix millisecond timestamp at which the acting
	// player (see PacketPokerSeat.IsTurn) will be auto-folded and kicked for
	// inaction, or 0 if no turn is currently awaiting action.
	TurnDeadline int64                  `json:"turn_deadline"`
	HandResult   *PacketPokerHandResult `json:"hand_result,omitempty"`
}

type PacketError struct {
	Message string `json:"message"`
}

const (
	PacketTypeOnline       = "online"
	PacketTypeNotification = "notification"
	PacketTypeJoin         = "join"
	PacketTypeLeave        = "leave"
	PacketTypePlay         = "play"
	PacketTypeSync         = "sync"
	PacketTypePokerState   = "poker_state"
	PacketTypeError        = "error"

	// packetTypeDisconnected is a server-internal packet type — never sent
	// by a real client — used to route a user's disconnect through the same
	// ordered queue as their other packets (see ws/pumps.go), so it can
	// never race ahead of or behind something like a "leave" they sent
	// right before closing the connection.
	packetTypeDisconnected = "disconnected"
)

type packet struct {
	userID uint `json:"-"`
	// internal is never set by json.Unmarshal (it only touches exported
	// fields), so a client can never forge a packet that reaches the
	// internal-only switch cases in handlePacket.
	internal   bool            `json:"-"`
	PacketType string          `json:"packet_type"`
	Payload    json.RawMessage `json:"payload"`
}

// MARK: protectedPacketChannel

type protectedPacketChannel struct {
	mutex   sync.RWMutex
	ok      bool
	channel chan packet
}

func createProtectedPacketChannel() *protectedPacketChannel {
	return &protectedPacketChannel{
		ok:      true,
		channel: make(chan packet, 256),
	}
}

func (protectedChannel *protectedPacketChannel) safeWrite(packet packet) bool {
	protectedChannel.mutex.RLock()
	defer protectedChannel.mutex.RUnlock()
	if protectedChannel.ok {
		select {
		case protectedChannel.channel <- packet:
		default:
		}
		return true
	} else {
		return false
	}
}

func (protectedChannel *protectedPacketChannel) safeClose() {
	protectedChannel.mutex.Lock()
	defer protectedChannel.mutex.Unlock()
	if protectedChannel.ok {
		close(protectedChannel.channel)
		protectedChannel.ok = false
	}
}

// MARK: connectionContext

type connectionContext struct {
	connection *websocket.Conn
	channel    chan packet
}

func createConnectionContext(connection *websocket.Conn) *connectionContext {
	return &connectionContext{
		connection: connection,
		channel:    make(chan packet, 256),
	}
}

// MARK: protectedContextList

type protectedContextList struct {
	mutex    sync.RWMutex
	contexts []*connectionContext
}

func (contextList *protectedContextList) append(context *connectionContext) {
	contextList.mutex.Lock()
	contextList.contexts = append(contextList.contexts, context)
	contextList.mutex.Unlock()
}

func (contextList *protectedContextList) swapPopByConnection(connection *websocket.Conn) *connectionContext {
	contextList.mutex.Lock()
	defer contextList.mutex.Unlock()
	contexts := &contextList.contexts
	for contextIndex, context := range *contexts {
		if context.connection == connection {
			newLength := len(*contexts) - 1
			(*contexts)[contextIndex] = (*contexts)[newLength]
			(*contexts)[newLength] = nil
			(*contexts) = (*contexts)[:newLength]
			return context
		}
	}
	return nil
}

func (contextList *protectedContextList) send(packet packet) {
	contextList.mutex.RLock()
	for _, context := range contextList.contexts {
		select {
		case context.channel <- packet:
		default:
		}
	}
	contextList.mutex.RUnlock()
}

func (contextList *protectedContextList) length() int {
	contextList.mutex.RLock()
	length := len(contextList.contexts)
	contextList.mutex.RUnlock()
	return length
}

func (contextList *protectedContextList) closeAll() {
	contextList.mutex.RLock()
	for _, context := range contextList.contexts {
		context.connection.Close()
	}
	contextList.mutex.RUnlock()
}

// MARK: client

type client struct {
	userID      uint
	contextList protectedContextList
	topicLists  [TopicMax]protectedContextList
}

// MARK: WebSocketState
// This is the root datatype of the websocket system

type WebSocketState struct {
	clients             map[uint]*client
	clientsMutex        sync.RWMutex
	readChannel         *protectedPacketChannel
	userService         *services.UserService
	friendService       *services.FriendService
	notificationService *services.NotificationService
	gameService         *services.GameService
	engineService       *services.EngineService
	pokerTable          *PokerTable
}

func CreateWebSocketState(
	userService *services.UserService,
	friendService *services.FriendService,
	notificationService *services.NotificationService,
	gameService *services.GameService,
	engineService *services.EngineService,
) *WebSocketState {
	return &WebSocketState{
		clients:             make(map[uint]*client),
		readChannel:         createProtectedPacketChannel(),
		userService:         userService,
		friendService:       friendService,
		notificationService: notificationService,
		gameService:         gameService,
		engineService:       engineService,
		pokerTable:          newPokerTable(),
	}
}
