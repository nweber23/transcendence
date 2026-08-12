package ws

import (
	"testing"

	"transcendence/services"
)

func TestBuildBaseSeats_FoldedNeverRevealed(testInterface *testing.T) {
	// Three players, one folded — a genuinely contested showdown between
	// the other two, so their cards being public is expected while the
	// folded player's must never appear.
	seats := []*pokerSeat{
		{userID: 1, username: "alice"},
		{userID: 2, username: "bob"},
		{userID: 3, username: "carol"},
	}
	playerOfSeat := map[int]int{0: 0, 1: 1, 2: 2}
	state := services.TexasEngineGameState{
		Phase: "showdown",
		Players: []services.TexasEnginePlayerState{
			{Stack: 500, Folded: true, HoleCards: []string{"A♠", "K♠"}},
			{Stack: 1500, Folded: false, HoleCards: []string{"2♦", "3♦"}},
			{Stack: 1000, Folded: false, HoleCards: []string{"9♣", "9♥"}},
		},
	}

	baseSeats := buildBaseSeats(seats, playerOfSeat, state, true)

	if len(baseSeats) != 3 {
		testInterface.Fatalf("expected 3 base seats, got %d", len(baseSeats))
	}
	if len(baseSeats[0].HoleCards) != 0 {
		testInterface.Errorf("expected folded seat's hole cards to never be revealed, got %v", baseSeats[0].HoleCards)
	}
	if len(baseSeats[1].HoleCards) != 2 || len(baseSeats[2].HoleCards) != 2 {
		testInterface.Errorf("expected both non-folded seats' hole cards to be public at a contested showdown, got %v / %v", baseSeats[1].HoleCards, baseSeats[2].HoleCards)
	}
}

func TestBuildBaseSeats_UncontestedShowdownNeverReveals(testInterface *testing.T) {
	// Two players, one folded — the engine still reports "showdown" for an
	// everyone-else-folded win, but the sole remaining player would muck in
	// real poker: their cards must stay hidden from opponents and
	// spectators alike, not just the folded player's.
	seats := []*pokerSeat{
		{userID: 1, username: "alice"},
		{userID: 2, username: "bob"},
	}
	playerOfSeat := map[int]int{0: 0, 1: 1}
	state := services.TexasEngineGameState{
		Phase: "showdown",
		Players: []services.TexasEnginePlayerState{
			{Stack: 500, Folded: true, HoleCards: []string{"A♠", "K♠"}},
			{Stack: 1500, Folded: false, HoleCards: []string{"2♦", "3♦"}},
		},
	}

	baseSeats := buildBaseSeats(seats, playerOfSeat, state, false)

	for _, seat := range baseSeats {
		if len(seat.HoleCards) != 0 {
			testInterface.Errorf("expected no seat's cards to be revealed on an uncontested (all-fold) win, got %v for seat %d", seat.HoleCards, seat.Seat)
		}
	}
}

func TestPersonalizeSeatsFor_PreShowdownHidesOthers(testInterface *testing.T) {
	seats := []*pokerSeat{
		{userID: 1, username: "alice"},
		{userID: 2, username: "bob"},
	}
	playerOfSeat := map[int]int{0: 0, 1: 1}
	state := services.TexasEngineGameState{
		Phase: "preflop",
		Players: []services.TexasEnginePlayerState{
			{Stack: 1000, HoleCards: []string{"A♠", "K♠"}},
			{Stack: 1000, HoleCards: []string{"2♦", "3♦"}},
		},
	}
	baseSeats := buildBaseSeats(seats, playerOfSeat, state, true)

	personalized, _ := personalizeSeatsFor(baseSeats, 1, playerOfSeat, state)

	for _, seat := range personalized {
		if seat.UserID == 2 && len(seat.HoleCards) != 0 {
			testInterface.Errorf("expected recipient to never see another seat's cards pre-showdown, got %v", seat.HoleCards)
		}
	}
}

func TestPersonalizeSeatsFor_AlwaysRevealsOwnCards(testInterface *testing.T) {
	seats := []*pokerSeat{
		{userID: 1, username: "alice"},
		{userID: 2, username: "bob"},
	}
	playerOfSeat := map[int]int{0: 0, 1: 1}
	state := services.TexasEngineGameState{
		Phase: "preflop",
		Players: []services.TexasEnginePlayerState{
			{Stack: 1000, HoleCards: []string{"A♠", "K♠"}},
			{Stack: 1000, HoleCards: []string{"2♦", "3♦"}},
		},
	}
	baseSeats := buildBaseSeats(seats, playerOfSeat, state, true)

	personalized, yourSeat := personalizeSeatsFor(baseSeats, 1, playerOfSeat, state)

	if yourSeat != 0 {
		testInterface.Fatalf("expected recipient's own seat index to be 0, got %d", yourSeat)
	}
	var own PacketPokerSeat
	found := false
	for _, seat := range personalized {
		if seat.UserID == 1 {
			own = seat
			found = true
		}
	}
	if !found {
		testInterface.Fatalf("expected to find recipient's own seat in the personalized output")
	}
	if len(own.HoleCards) != 2 || own.HoleCards[0] != "A♠" {
		testInterface.Errorf("expected recipient to always see their own hole cards pre-showdown, got %v", own.HoleCards)
	}
}

func TestPersonalizeSeatsFor_ShowdownStillHidesFolded(testInterface *testing.T) {
	// Three players, one folded — contested showdown between the other two.
	seats := []*pokerSeat{
		{userID: 1, username: "alice"},
		{userID: 2, username: "bob"},
		{userID: 3, username: "carol"},
	}
	playerOfSeat := map[int]int{0: 0, 1: 1, 2: 2}
	state := services.TexasEngineGameState{
		Phase: "showdown",
		Players: []services.TexasEnginePlayerState{
			{Stack: 500, Folded: true, HoleCards: []string{"A♠", "K♠"}},
			{Stack: 1500, Folded: false, HoleCards: []string{"2♦", "3♦"}},
			{Stack: 1000, Folded: false, HoleCards: []string{"9♣", "9♥"}},
		},
	}
	baseSeats := buildBaseSeats(seats, playerOfSeat, state, false)

	// recipientID 999 matches no seat — an unseated spectator.
	personalized, yourSeat := personalizeSeatsFor(baseSeats, 999, playerOfSeat, state)

	if yourSeat != -1 {
		testInterface.Errorf("expected an unseated spectator to have yourSeat == -1, got %d", yourSeat)
	}
	for _, seat := range personalized {
		switch seat.UserID {
		case 1:
			if len(seat.HoleCards) != 0 {
				testInterface.Errorf("expected folded seat's cards to stay hidden from a spectator, got %v", seat.HoleCards)
			}
		case 2, 3:
			if len(seat.HoleCards) != 2 {
				testInterface.Errorf("expected non-folded seats' cards to be publicly visible to a spectator at a contested showdown, got %v", seat.HoleCards)
			}
		}
	}
}
