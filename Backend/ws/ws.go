package ws

type Topic int

const (
	TopicGeneric Topic = iota
	TopicGame
	TopicChat
	TopicMax
)

var topicMap = map[string]Topic{
	"generic": TopicGeneric,
	"game":    TopicGame,
	"chat":    TopicChat,
}

type TopicSendList struct {
	connections []*websocket.Conn
}

type Client struct {
	UserID uint
	Topics [TopicMax]TopicSendList
}

var (
	clients map[uint]*Client
)

func AddConnection(userID uint, connection *websocket.Conn, topics []string) {
	client := clients[userID]
	if client == nil {
		client = &Client{
			UserID: userID,
			Topics: make([Topic]TopicSendList)
		}
	}
}