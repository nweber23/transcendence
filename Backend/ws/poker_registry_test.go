package ws

import (
	"testing"

	"transcendence/config"
	"transcendence/models"
	"transcendence/services"

	"github.com/shopspring/decimal"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// createMockWsState builds a real WebSocketState against an in-memory
// sqlite DB, same convention as services.InitMockDB. engineService is left
// nil — safe as long as no test table here ever reaches 2 seated players,
// since reconcile() only dereferences it past a `len(seatIndices) < 2`
// guard (confirmed in poker.go), and CreatePokerGame never touches it at
// all.
func createMockWsState(testInterface *testing.T) (*WebSocketState, *services.UserService, *services.AccountService, *services.PokerTableService) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		testInterface.Fatalf("failed to create in-memory database: %v", err)
	}
	if err := config.PrepareDB(db); err != nil {
		testInterface.Fatalf("failed to run migrations: %v", err)
	}

	userService := services.NewUserService(db)
	accountService := services.NewAccountService(db)
	friendService := services.NewFriendService(db)
	notificationService := services.NewNotificationService(db)
	gameService := services.NewGameService(db, nil)
	pokerTableService := services.NewPokerTableService(db)

	wsState := CreateWebSocketState(userService, friendService, notificationService, gameService, nil, pokerTableService)
	return wsState, userService, accountService, pokerTableService
}

// mustRegisterTestUser registers a user and funds their account so they can
// afford a table's buy-in — RegisterUser creates the account row but with a
// zero balance (see UserService.RegisterUser), which would otherwise make
// every pokerJoin fail with ErrInsufficientBalance regardless of the
// behavior under test.
func mustRegisterTestUser(testInterface *testing.T, userService *services.UserService, accountService *services.AccountService, name string) uint {
	user, err := userService.RegisterUser(name, name+"@gatherate.net", "password123")
	if err != nil {
		testInterface.Fatalf("failed to register user %s: %v", name, err)
	}
	if err := accountService.Deposit(user.ID, decimal.NewFromInt(10000)); err != nil {
		testInterface.Fatalf("failed to fund test user %s: %v", name, err)
	}
	return user.ID
}

func mustCreateLiveTable(testInterface *testing.T, wsState *WebSocketState, pokerTableService *services.PokerTableService, hostID uint, isPrivate bool) *models.PokerTable {
	table, err := pokerTableService.CreateTable(hostID, "Test Table", isPrivate, 6, decimal.NewFromInt(1000), decimal.NewFromInt(25), decimal.NewFromInt(50))
	if err != nil {
		testInterface.Fatalf("failed to create poker table: %v", err)
	}
	wsState.PokerCreateTable(table)
	return table
}

func TestRegistryTableIsolation(testInterface *testing.T) {
	wsState, userService, accountService, pokerTableService := createMockWsState(testInterface)
	host := mustRegisterTestUser(testInterface, userService, accountService, "isohost")
	userA := mustRegisterTestUser(testInterface, userService, accountService, "isoa")
	userB := mustRegisterTestUser(testInterface, userService, accountService, "isob")

	tableA := mustCreateLiveTable(testInterface, wsState, pokerTableService, host, false)
	tableB := mustCreateLiveTable(testInterface, wsState, pokerTableService, host, false)

	wsState.pokerJoin(userA, tableA.ID, 0)
	wsState.pokerJoin(userB, tableB.ID, 0)

	runtimeA := wsState.pokerRegistry.get(tableA.ID)
	runtimeB := wsState.pokerRegistry.get(tableB.ID)
	if runtimeA == nil || runtimeB == nil {
		testInterface.Fatalf("expected both tables to be registered, got A=%v B=%v", runtimeA, runtimeB)
	}
	if runtimeA == runtimeB {
		testInterface.Fatalf("expected distinct table instances, got the same pointer")
	}

	runtimeA.mutex.Lock()
	recipientsA := runtimeA.recipients()
	runtimeA.mutex.Unlock()
	runtimeB.mutex.Lock()
	recipientsB := runtimeB.recipients()
	runtimeB.mutex.Unlock()

	for _, id := range recipientsA {
		if id == userB {
			testInterface.Errorf("expected table A's recipients to never include table B's user, got %v", recipientsA)
		}
	}
	for _, id := range recipientsB {
		if id == userA {
			testInterface.Errorf("expected table B's recipients to never include table A's user, got %v", recipientsB)
		}
	}
	if len(recipientsA) != 1 || recipientsA[0] != userA {
		testInterface.Errorf("expected table A's only recipient to be userA, got %v", recipientsA)
	}
	if len(recipientsB) != 1 || recipientsB[0] != userB {
		testInterface.Errorf("expected table B's only recipient to be userB, got %v", recipientsB)
	}
}

func TestPokerCloseTableRemovesFromRegistryOnly(testInterface *testing.T) {
	wsState, userService, accountService, pokerTableService := createMockWsState(testInterface)
	host := mustRegisterTestUser(testInterface, userService, accountService, "closehost")

	tableA := mustCreateLiveTable(testInterface, wsState, pokerTableService, host, false)
	tableB := mustCreateLiveTable(testInterface, wsState, pokerTableService, host, false)

	wsState.PokerCloseTable(tableA.ID)

	if wsState.pokerRegistry.get(tableA.ID) != nil {
		testInterface.Errorf("expected closed table A to be removed from the registry")
	}
	if wsState.pokerRegistry.get(tableB.ID) == nil {
		testInterface.Errorf("expected table B to remain registered after closing table A")
	}
}

func TestPokerJoinDeniedForPrivateTable(testInterface *testing.T) {
	wsState, userService, accountService, pokerTableService := createMockWsState(testInterface)
	host := mustRegisterTestUser(testInterface, userService, accountService, "privhost")
	outsider := mustRegisterTestUser(testInterface, userService, accountService, "privoutsider")

	table := mustCreateLiveTable(testInterface, wsState, pokerTableService, host, true)

	wsState.pokerJoin(outsider, table.ID, 0)

	runtime := wsState.pokerRegistry.get(table.ID)
	runtime.mutex.Lock()
	seatFilled := runtime.seats[0] != nil
	runtime.mutex.Unlock()
	if seatFilled {
		testInterface.Fatalf("expected an uninvited user's join on a private table to be rejected")
	}

	if _, err := pokerTableService.Invite(host, table.ID, outsider); err != nil {
		testInterface.Fatalf("failed to invite outsider: %v", err)
	}
	wsState.pokerJoin(outsider, table.ID, 0)

	runtime.mutex.Lock()
	seatFilled = runtime.seats[0] != nil
	runtime.mutex.Unlock()
	if !seatFilled {
		testInterface.Errorf("expected an invited user's join on a private table to succeed")
	}
}
