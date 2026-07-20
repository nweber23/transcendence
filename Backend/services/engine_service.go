package services

import (
	"context"

	"encoding/json"
	"transcendence/engine_proto"
	"transcendence/utils"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	gameIDCounter uint64 = 0
)

// MARK: EngineService

type EngineService struct {
	connection *grpc.ClientConn
	client     engine_proto.GameEngineClient
}

func NewEngineService(engineURL string, enginePort string) (*EngineService, error) {
	options := []grpc.DialOption{
		// TODO: Proper TLS credentials
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	}
	connection, err := grpc.NewClient(engineURL+":"+enginePort, options...)
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

// MARK: Blackjack

// Taken from engine.hpp file for Blackjack
type BlackjackEngineGameState struct {
	Bet         int64    `json:"bet"`
	Phase       string   `json:"phase"`
	Outcome     string   `json:"outcome"`
	PlayerValue int8     `json:"player_value"`
	DealerValue int8     `json:"dealer_value"`
	PlayerCards []string `json:"player_cards"`
	DealerCards []string `json:"dealer_cards"`
}

type BlackjackEngineGame struct {
	service *EngineService
	ID      uint64
	state   BlackjackEngineGameState
}

func (engineService *EngineService) CreateBlackjackGame(bet int64) (*BlackjackEngineGame, error) {
	request := engine_proto.BlackjackRequest{
		GameId: gameIDCounter,
		Action: "create",
		Bet:    bet,
	}
	response, err := engineService.client.BlackjackAction(context.Background(), &request)
	if err != nil {
		return nil, err
	}
	var game BlackjackEngineGame
	game.service = engineService
	game.ID = gameIDCounter
	err = json.Unmarshal([]byte(response.GameStateJson), &game.state)
	if err != nil {
		return nil, err
	}
	gameIDCounter++
	return &game, nil
}

func (game *BlackjackEngineGame) State() BlackjackEngineGameState {
	return game.state
}

func (game *BlackjackEngineGame) Play(playAction string) error {
	state, err := game.service.PlayBlackjack(game.ID, playAction)
	if err != nil {
		return err
	}
	game.state = *state
	return nil
}

// PlayBlackjack drives a blackjack game by its engine-assigned ID, without
// requiring the caller to hold on to the BlackjackEngineGame that created
// it. This is what makes it possible to resume a hand across separate HTTP
// requests — the live BlackjackEngineGame only exists for the lifetime of
// the request that created it.
func (engineService *EngineService) PlayBlackjack(gameID uint64, playAction string) (*BlackjackEngineGameState, error) {
	request := engine_proto.BlackjackRequest{
		GameId: gameID,
		Action: playAction,
	}
	response, err := engineService.client.BlackjackAction(context.Background(), &request)
	if err != nil {
		return nil, err
	}
	var state BlackjackEngineGameState
	if err := json.Unmarshal([]byte(response.GameStateJson), &state); err != nil {
		return nil, err
	}
	return &state, nil
}

// MARK: Texas hold'em

// Taken from engine.hpp file for Texas Hold'em
type TexasEnginePlayerState struct {
	Stack      int64    `json:"stack"`
	CurrentBet int64    `json:"current_bet"`
	Folded     bool     `json:"folded"`
	AllIn      bool     `json:"all_in"`
	HoleCards  []string `json:"hole_cards"`
}

// Taken from engine.hpp file for Texas Hold'em
type TexasEngineGameState struct {
	Phase            string                   `json:"phase"`
	Dealer           uint64                   `json:"dealer"`
	CurrentPlayer    uint64                   `json:"current_player"`
	CommunityCards   []string                 `json:"community_cards"`
	Pot              []int64                  `json:"pot"`
	Players          []TexasEnginePlayerState `json:"players"`
	MinRaise         int64                    `json:"min_raise"`
	LastActionType   string                   `json:"last_action_type"`
	LastActionAmount int64                    `json:"last_action_amount"`
}

type TexasEngineGame struct {
	service *EngineService
	ID      uint64
	state   TexasEngineGameState
}

// CreateTexasGame starts a texas game with an explicit starting stack per
// seat (in seat order), so a table can be recreated hand-to-hand with each
// surviving player's actual current stack instead of a uniform buy-in.
func (engineService *EngineService) CreateTexasGame(stacks []int64) (*TexasEngineGame, error) {
	request := engine_proto.TexasRequest{
		GameId: gameIDCounter,
		Action: "create",
		Stacks: stacks,
	}
	response, err := engineService.client.TexasAction(context.Background(), &request)
	if err != nil {
		return nil, err
	}
	var game TexasEngineGame
	game.service = engineService
	game.ID = gameIDCounter
	err = json.Unmarshal([]byte(response.GameStateJson), &game.state)
	if err != nil {
		return nil, err
	}
	gameIDCounter++
	return &game, nil
}

// Close discards this texas game on the engine. Unlike blackjack, a texas
// game deliberately survives past a hand's Showdown so PostBlinds can start
// another hand on the same game — it must be closed explicitly once it's
// really done with (e.g. the table's seat composition changed).
func (game *TexasEngineGame) Close() error {
	request := engine_proto.TexasRequest{
		GameId: game.ID,
		Action: "close",
	}
	_, err := game.service.client.TexasAction(context.Background(), &request)
	return err
}

func (game *TexasEngineGame) PostBlinds(smallBlind int64, bigBlind int64) error {
	state, err := game.service.PostBlindsTexas(game.ID, smallBlind, bigBlind)
	if err != nil {
		return err
	}
	game.state = *state
	return nil
}

func (game *TexasEngineGame) State() TexasEngineGameState {
	return game.state
}

func (game *TexasEngineGame) Play(playerID uint64, playAction string, amount int64) error {
	state, err := game.service.PlayTexas(game.ID, playerID, playAction, amount)
	if err != nil {
		return err
	}
	game.state = *state
	return nil
}

// PostBlindsTexas and PlayTexas drive a texas hold'em game by its
// engine-assigned ID, without requiring the caller to hold on to the
// TexasEngineGame that created it — see PlayBlackjack for why that matters.
func (engineService *EngineService) PostBlindsTexas(gameID uint64, smallBlind int64, bigBlind int64) (*TexasEngineGameState, error) {
	request := engine_proto.TexasRequest{
		GameId:     gameID,
		Action:     "post_blinds",
		SmallBlind: smallBlind,
		BigBlind:   bigBlind,
	}
	response, err := engineService.client.TexasAction(context.Background(), &request)
	if err != nil {
		return nil, err
	}
	var state TexasEngineGameState
	if err := json.Unmarshal([]byte(response.GameStateJson), &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func (engineService *EngineService) PlayTexas(gameID uint64, playerID uint64, playAction string, amount int64) (*TexasEngineGameState, error) {
	if playAction != "fold" &&
		playAction != "check" &&
		playAction != "call" &&
		playAction != "raise" &&
		playAction != "all_in" {
		return nil, utils.ErrInvalidPlayAction
	}
	request := engine_proto.TexasRequest{
		GameId:   gameID,
		PlayerId: playerID,
		Action:   playAction,
		Amount:   amount,
	}
	response, err := engineService.client.TexasAction(context.Background(), &request)
	if err != nil {
		return nil, err
	}
	var state TexasEngineGameState
	if err := json.Unmarshal([]byte(response.GameStateJson), &state); err != nil {
		return nil, err
	}
	return &state, nil
}

// MARK: Slots

// A slot spin is a single stateless RPC — the engine doesn't track a
// persistent game between spins, so there is no Create/Play split here.

// Taken from machines.hpp file for the slot machine
type SlotsEngineSpinStep struct {
	Step               uint32     `json:"step"`
	IsFreeSpin         bool       `json:"is_free_spin"`
	FreeSpinsRemaining uint8      `json:"free_spins_remaining"`
	Multiplier         uint8      `json:"multiplier"`
	Stops              []uint8    `json:"stops"`
	StepWin            uint32     `json:"step_win"`
	AccumulatedFreeWin uint32     `json:"accumulated_free_win"`
	Grid               [][]string `json:"grid"` // [row][col] resolved symbol ids, e.g. "SYM_7"
}

// Taken from machines.hpp file for the slot machine
type SlotsEngineResult struct {
	GameName        string                `json:"game_name"`
	TotalInitialBet uint32                `json:"total_initial_bet"`
	TotalOverallWin uint32                `json:"total_overall_win"`
	BonusTriggered  bool                  `json:"bonus_triggered"`
	Timeline        []SlotsEngineSpinStep `json:"timeline"`
}

func (engineService *EngineService) SpinSlots(configName string, lineCount uint8, betPerLine uint32) (*SlotsEngineResult, error) {
	request := engine_proto.SlotsRequest{
		GameId:     gameIDCounter,
		ConfigName: configName,
		LineCount:  uint32(lineCount),
		BetPerLine: betPerLine,
	}
	response, err := engineService.client.SlotsAction(context.Background(), &request)
	if err != nil {
		return nil, err
	}
	var result SlotsEngineResult
	if err := json.Unmarshal([]byte(response.GameStateJson), &result); err != nil {
		return nil, err
	}
	gameIDCounter++
	return &result, nil
}
