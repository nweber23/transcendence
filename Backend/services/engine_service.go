package services

import (
	"transcendence/engine_proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type EngineService struct {
	connection *grpc.ClientConn
	client     engine_proto.GameEngineClient
}

type EngineGame struct {
	service *EngineService
	game_id uint
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

type TexasGame EngineGame

type TexasGameState struct {
	
}

func (engineService *EngineService) CreateTexasGame(numPlayers uint32, amount int64) (*TexasGame, error) {
	request := engine_proto.TexasRequest{
		Action:     "create",
		Amount:     amount,
		NumPlayers: numPlayers,
	}
	response, err := engineService.client.TexasAction(context.Background(), &request)
	if err != nil {
		return nil, err
	}
}