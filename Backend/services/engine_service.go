package services

import (
	"context"

	"encoding/json"
	"transcendence/engine_proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	gameIDCounter uint64 = 0
)

type EngineService struct {
	connection *grpc.ClientConn
	client     engine_proto.GameEngineClient
}

func NewEngineService(engineURL string, enginePort string) (*EngineService, error) {
	options := []grpc.DialOption{
		// TODO: Proper TLS credentials
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	}
	connection, err := grpc.NewClient(engineURL + ":" + enginePort, options...)
	if err != nil {
		return nil, err
	}
	client := engine_proto.NewGameEngineClient(connection)
	return &EngineService{
		connection: connection,
		client:     client,
	}, nil
}

func (engineService *EngineService) Remove() {
	engineService.connection.Close()
}

// MARK: Texas hold'em

type TexasPlayAction string

const (
	TexasPlayActionFold  = TexasPlayAction("fold")
	TexasPlayActionCheck = TexasPlayAction("check")
	TexasPlayActionCall  = TexasPlayAction("call")
	TexasPlayActionRaise = TexasPlayAction("raise")
	TexasPlayActionAllIn = TexasPlayAction("all_in")
)

// Taken from engine.hpp file for Texas Hold'em
type TexasEnginePlayerState struct {
	Stack      int64
	CurrentBet int64
	Folded     bool
	AllIn      bool
	HoleCards  []string
}

// Taken from engine.hpp file for Texas Hold'em
type TexasEngineGameState struct {
	Phase            string
	Dealer           uint64
	CurrentPlayer    uint64
	CommunityCards   []string
	Pot              []int64
	Players          []TexasEnginePlayerState
	MinRaise         int64
	LastActionType   string
	LastActionAmount int64
}

type TexasEngineGame struct {
	service *EngineService
	ID      uint64
	state   TexasEngineGameState
}


func (engineService *EngineService) CreateTexasGame(numPlayers uint32, amount int64) (*TexasEngineGame, error) {
	request := engine_proto.TexasRequest{
		GameId:     gameIDCounter,
		Action:     "create",
		Amount:     amount,
		NumPlayers: numPlayers,
	}
	response, err := engineService.client.TexasAction(context.Background(), &request)
	if err != nil {
		return nil, err
	}
	var game TexasEngineGame
	game.service = engineService
	game.ID      = gameIDCounter
	err = json.Unmarshal([]byte(response.GameStateJson), &game.state)
	if err != nil {
		return nil, err
	}
	gameIDCounter++
	return &game, nil
}

func (game *TexasEngineGame) PostBlinds(smallBlind int64, bigBlind int64) (error) {
	request := engine_proto.TexasRequest{
		GameId:     game.ID,
		Action:     "post_blinds",
		SmallBlind: smallBlind,
		BigBlind:   bigBlind,
	}
	response, err := game.service.client.TexasAction(context.Background(), &request)
	if err != nil {
		return err
	}
	var state TexasEngineGameState
	err = json.Unmarshal([]byte(response.GameStateJson), &state)
	if err != nil {
		return err
	}
	game.state = state
	return nil
}

func (game *TexasEngineGame) Play(playerID uint64, playAction string, amount int64) (error) {
	// TODO: Do we need client side validation?
	/*if	playAction != "fold"  &&
		playAction != "check" &&
		playAction != "call"  &&
		playAction != "raise" &&
		platAction != "all_in"
	{
		return utils.ErrInvalidPlayAction
	}*/
	request := engine_proto.TexasRequest{
		GameId:   game.ID,
		PlayerId: playerID,
		Action:   playAction,
		Amount:   amount,
	}
	response, err := game.service.client.TexasAction(context.Background(), &request)
	if err != nil {
		return err
	}
	var state TexasEngineGameState
	err = json.Unmarshal([]byte(response.GameStateJson), &state)
	if err != nil {
		return err
	}
	game.state = state
	return nil
}