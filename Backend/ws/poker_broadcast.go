package ws

import "transcendence/services"

// buildBaseSeats renders every occupied seat's publicly-visible state.
// Hole cards are included ONLY for a seat that is still in the hand
// (!Folded) once the hand reaches a CONTESTED showdown — one with more than
// one non-folded player. The engine also reports "showdown" when every
// other player has folded and the pot is awarded uncontested; the sole
// remaining player would muck in real poker, so their cards must stay
// private there too, or every opponent (and every spectator) learns
// whether bluffs are being run. A folded seat's cards are never included
// here for anyone, at any phase. This is the only place hole cards become
// part of a broadcast payload; personalizeSeatsFor only ever adds the
// recipient's own cards on top of what's already public here.
func buildBaseSeats(seats []*pokerSeat, playerOfSeat map[int]int, state services.TexasEngineGameState, handActive bool) []PacketPokerSeat {
	showdown := state.Phase == "showdown"
	nonFoldedCount := 0
	for _, player := range state.Players {
		if !player.Folded {
			nonFoldedCount++
		}
	}
	contestedShowdown := showdown && nonFoldedCount > 1

	baseSeats := make([]PacketPokerSeat, 0, len(seats))
	for seatIdx, seat := range seats {
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
		if playerIdx, ok := playerOfSeat[seatIdx]; ok && playerIdx < len(state.Players) {
			player := state.Players[playerIdx]
			packetSeat.Stack = player.Stack
			packetSeat.CurrentBet = player.CurrentBet
			packetSeat.Folded = player.Folded
			packetSeat.AllIn = player.AllIn
			packetSeat.IsDealer = int(state.Dealer) == playerIdx
			packetSeat.IsTurn = handActive && !showdown && int(state.CurrentPlayer) == playerIdx
			if !packetSeat.Folded && contestedShowdown {
				packetSeat.HoleCards = player.HoleCards
			}
		}
		baseSeats = append(baseSeats, packetSeat)
	}
	return baseSeats
}

// personalizeSeatsFor copies baseSeats and additionally reveals hole cards
// for recipientID's OWN seat (if any), regardless of phase. It never adds
// any other seat's cards beyond what buildBaseSeats already made public —
// a spectator, or a seat that doesn't match recipientID, gets exactly
// baseSeats back unmodified. This is what keeps a spectator (or any other
// player) from ever seeing another player's hole cards before showdown, or
// a folded player's cards at all — no separate stripping step is needed as
// long as recipients are correctly scoped to the table (see recipients()).
// Returns the copied seats and the recipient's own seat index, or -1 if
// they're unseated (not joined, or spectating).
func personalizeSeatsFor(baseSeats []PacketPokerSeat, recipientID uint, playerOfSeat map[int]int, state services.TexasEngineGameState) ([]PacketPokerSeat, int) {
	seats := make([]PacketPokerSeat, len(baseSeats))
	copy(seats, baseSeats)
	yourSeat := -1
	for i := range seats {
		if seats[i].UserID != recipientID {
			continue
		}
		yourSeat = seats[i].Seat
		if playerIdx, ok := playerOfSeat[seats[i].Seat]; ok && playerIdx < len(state.Players) {
			seats[i].HoleCards = state.Players[playerIdx].HoleCards
		}
	}
	return seats, yourSeat
}
