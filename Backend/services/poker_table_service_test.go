package services

import (
	"errors"
	"testing"

	"transcendence/utils"

	"github.com/shopspring/decimal"
)

func createMockPokerTableService(testInterface *testing.T) (*PokerTableService, *UserService) {
	db := InitMockDB(testInterface)
	return NewPokerTableService(db), NewUserService(db)
}

func mustRegisterUser(testInterface *testing.T, userService *UserService, name string) uint {
	user, err := userService.RegisterUser(name, name+"@gatherate.net", "password123")
	if err != nil {
		testInterface.Fatalf("failed to register user %s: %v", name, err)
	}
	return user.ID
}

func d(amount int64) decimal.Decimal {
	return decimal.NewFromInt(amount)
}

func TestCreatePokerTableValidation(testInterface *testing.T) {
	pokerTableService, userService := createMockPokerTableService(testInterface)
	host := mustRegisterUser(testInterface, userService, "host0")

	cases := []struct {
		name                        string
		maxSeats                    int
		buyIn, smallBlind, bigBlind decimal.Decimal
		wantErr                     error
	}{
		{"non-positive buy-in", 6, d(0), d(25), d(50), utils.ErrAmountNotPositive},
		{"negative small blind", 6, d(1000), d(-25), d(50), utils.ErrAmountNotPositive},
		{"small blind not less than big blind", 6, d(1000), d(50), d(50), utils.ErrPokerInvalidBlinds},
		{"fractional buy-in", 6, decimal.NewFromFloat(1000.50), d(25), d(50), utils.ErrPokerFractionalAmount},
		{"too few seats", 1, d(1000), d(25), d(50), utils.ErrPokerInvalidSeatCount},
		{"too many seats", 10, d(1000), d(25), d(50), utils.ErrPokerInvalidSeatCount},
	}
	for _, testCase := range cases {
		if _, err := pokerTableService.CreateTable(host, "Test Table", false, testCase.maxSeats, testCase.buyIn, testCase.smallBlind, testCase.bigBlind); !errors.Is(err, testCase.wantErr) {
			testInterface.Errorf("%s: expected error %v, got %v", testCase.name, testCase.wantErr, err)
		}
	}

	table, err := pokerTableService.CreateTable(host, "Valid Table", true, 6, d(1000), d(25), d(50))
	if err != nil {
		testInterface.Fatalf("expected valid table creation to succeed, got %v", err)
	}
	fetched, err := pokerTableService.GetTable(table.ID)
	if err != nil {
		testInterface.Fatalf("expected to fetch created table, got %v", err)
	}
	if fetched.Name != "Valid Table" || !fetched.IsPrivate || fetched.MaxSeats != 6 || fetched.Status != "open" {
		testInterface.Errorf("fetched table doesn't match what was created: %+v", fetched)
	}
}

func TestCanAccessPublicTable(testInterface *testing.T) {
	pokerTableService, userService := createMockPokerTableService(testInterface)
	host := mustRegisterUser(testInterface, userService, "host1")
	stranger := mustRegisterUser(testInterface, userService, "stranger1")

	table, err := pokerTableService.CreateTable(host, "Public Table", false, 6, d(1000), d(25), d(50))
	if err != nil {
		testInterface.Fatalf("failed to create table: %v", err)
	}
	if _, err := pokerTableService.CanAccess(table.ID, stranger); err != nil {
		testInterface.Errorf("expected any authenticated user to access a public table, got %v", err)
	}
}

func TestCanAccessPrivateTable(testInterface *testing.T) {
	pokerTableService, userService := createMockPokerTableService(testInterface)
	host := mustRegisterUser(testInterface, userService, "host2")
	invited := mustRegisterUser(testInterface, userService, "invited2")
	uninvited := mustRegisterUser(testInterface, userService, "uninvited2")

	table, err := pokerTableService.CreateTable(host, "Private Table", true, 6, d(1000), d(25), d(50))
	if err != nil {
		testInterface.Fatalf("failed to create table: %v", err)
	}

	if _, err := pokerTableService.CanAccess(table.ID, host); err != nil {
		testInterface.Errorf("expected host to access their own private table, got %v", err)
	}
	if _, err := pokerTableService.CanAccess(table.ID, uninvited); !errors.Is(err, utils.ErrPokerTableAccessDenied) {
		testInterface.Errorf("expected uninvited user to be denied, got %v", err)
	}

	if _, err := pokerTableService.Invite(host, table.ID, invited); err != nil {
		testInterface.Fatalf("failed to invite user: %v", err)
	}
	if _, err := pokerTableService.CanAccess(table.ID, invited); err != nil {
		testInterface.Errorf("expected invited user to be granted access, got %v", err)
	}
	if _, err := pokerTableService.CanAccess(table.ID, uninvited); !errors.Is(err, utils.ErrPokerTableAccessDenied) {
		testInterface.Errorf("expected an unrelated user to still be denied after inviting someone else, got %v", err)
	}

	// Inviting the same user twice is idempotent, not an error.
	if _, err := pokerTableService.Invite(host, table.ID, invited); err != nil {
		testInterface.Errorf("expected duplicate invite to be a no-op, got %v", err)
	}
}

func TestHostOnlyMutations(testInterface *testing.T) {
	pokerTableService, userService := createMockPokerTableService(testInterface)
	host := mustRegisterUser(testInterface, userService, "host3")
	other := mustRegisterUser(testInterface, userService, "other3")
	invitee := mustRegisterUser(testInterface, userService, "invitee3")

	table, err := pokerTableService.CreateTable(host, "Original Name", false, 6, d(1000), d(25), d(50))
	if err != nil {
		testInterface.Fatalf("failed to create table: %v", err)
	}

	if _, err := pokerTableService.UpdateSettings(other, table.ID, "Hijacked", true, 6, d(1000), d(25), d(50)); !errors.Is(err, utils.ErrPokerNotTableHost) {
		testInterface.Errorf("expected non-host UpdateSettings to fail with ErrPokerNotTableHost, got %v", err)
	}
	if _, err := pokerTableService.Invite(other, table.ID, invitee); !errors.Is(err, utils.ErrPokerNotTableHost) {
		testInterface.Errorf("expected non-host Invite to fail with ErrPokerNotTableHost, got %v", err)
	}
	if _, err := pokerTableService.CloseTable(other, table.ID); !errors.Is(err, utils.ErrPokerNotTableHost) {
		testInterface.Errorf("expected non-host CloseTable to fail with ErrPokerNotTableHost, got %v", err)
	}

	unchanged, err := pokerTableService.GetTable(table.ID)
	if err != nil || unchanged.Name != "Original Name" || unchanged.Status != "open" {
		testInterface.Errorf("expected table to be unchanged after rejected non-host mutations, got %+v (err %v)", unchanged, err)
	}

	if _, err := pokerTableService.UpdateSettings(host, table.ID, "Renamed", true, 6, d(1000), d(25), d(50)); err != nil {
		testInterface.Errorf("expected host UpdateSettings to succeed, got %v", err)
	}
	renamed, err := pokerTableService.GetTable(table.ID)
	if err != nil || renamed.Name != "Renamed" || !renamed.IsPrivate {
		testInterface.Errorf("expected settings update to take effect, got %+v (err %v)", renamed, err)
	}
}

func TestCloseTableIsOneShot(testInterface *testing.T) {
	pokerTableService, userService := createMockPokerTableService(testInterface)
	host := mustRegisterUser(testInterface, userService, "host4")

	table, err := pokerTableService.CreateTable(host, "Table", false, 6, d(1000), d(25), d(50))
	if err != nil {
		testInterface.Fatalf("failed to create table: %v", err)
	}
	if _, err := pokerTableService.CloseTable(host, table.ID); err != nil {
		testInterface.Fatalf("expected first close to succeed, got %v", err)
	}
	if _, err := pokerTableService.CloseTable(host, table.ID); !errors.Is(err, utils.ErrPokerTableClosed) {
		testInterface.Errorf("expected double-close to fail with ErrPokerTableClosed, got %v", err)
	}
	if _, err := pokerTableService.CanAccess(table.ID, host); !errors.Is(err, utils.ErrPokerTableClosed) {
		testInterface.Errorf("expected CanAccess on a closed table to fail with ErrPokerTableClosed, got %v", err)
	}
}

func TestListTablesVisibility(testInterface *testing.T) {
	pokerTableService, userService := createMockPokerTableService(testInterface)
	host := mustRegisterUser(testInterface, userService, "host5")
	viewer := mustRegisterUser(testInterface, userService, "viewer5")

	publicTable, err := pokerTableService.CreateTable(host, "Public", false, 6, d(1000), d(25), d(50))
	if err != nil {
		testInterface.Fatalf("failed to create public table: %v", err)
	}
	hostedTable, err := pokerTableService.CreateTable(viewer, "Hosted by viewer", true, 6, d(1000), d(25), d(50))
	if err != nil {
		testInterface.Fatalf("failed to create hosted table: %v", err)
	}
	invitedTable, err := pokerTableService.CreateTable(host, "Invited", true, 6, d(1000), d(25), d(50))
	if err != nil {
		testInterface.Fatalf("failed to create invited-to table: %v", err)
	}
	if _, err := pokerTableService.Invite(host, invitedTable.ID, viewer); err != nil {
		testInterface.Fatalf("failed to invite viewer: %v", err)
	}
	privateTable, err := pokerTableService.CreateTable(host, "Private, not invited", true, 6, d(1000), d(25), d(50))
	if err != nil {
		testInterface.Fatalf("failed to create private table: %v", err)
	}
	closedTable, err := pokerTableService.CreateTable(host, "Closed", false, 6, d(1000), d(25), d(50))
	if err != nil {
		testInterface.Fatalf("failed to create table to close: %v", err)
	}
	if _, err := pokerTableService.CloseTable(host, closedTable.ID); err != nil {
		testInterface.Fatalf("failed to close table: %v", err)
	}

	tables, total, err := pokerTableService.ListTables(viewer, 10, 0)
	if err != nil {
		testInterface.Fatalf("failed to list tables: %v", err)
	}
	seen := make(map[uint]bool, len(tables))
	for _, table := range tables {
		seen[table.ID] = true
	}
	if int64(len(tables)) != total {
		testInterface.Errorf("expected len(tables) == total for a single unpaginated page, got %d vs %d", len(tables), total)
	}
	if !seen[publicTable.ID] {
		testInterface.Errorf("expected public table to be visible")
	}
	if !seen[hostedTable.ID] {
		testInterface.Errorf("expected viewer's own hosted table to be visible")
	}
	if !seen[invitedTable.ID] {
		testInterface.Errorf("expected table viewer was invited to to be visible")
	}
	if seen[privateTable.ID] {
		testInterface.Errorf("expected private table viewer wasn't invited to to be hidden")
	}
	if seen[closedTable.ID] {
		testInterface.Errorf("expected closed table to be hidden")
	}

	limited, limitedTotal, err := pokerTableService.ListTables(viewer, 1, 0)
	if err != nil {
		testInterface.Fatalf("failed to list tables with pagination: %v", err)
	}
	if len(limited) != 1 {
		testInterface.Errorf("expected limit=1 to return exactly one row, got %d", len(limited))
	}
	if limitedTotal != total {
		testInterface.Errorf("expected total count to be unaffected by limit, got %d vs %d", limitedTotal, total)
	}
}
