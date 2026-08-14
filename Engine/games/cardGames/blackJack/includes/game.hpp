#pragma once

#include <cstdint>
#include <optional>
#include "../../shared/includes/deck.hpp"
#include "hand.hpp"

namespace blackjack {

/**
 * The lifecycle phases of a blackjack hand.
 */
enum class Phase : std::uint8_t {
    Betting,
    PlayerTurn,
    DealerTurn,
    Settled
};

/**
 * The possible results of a resolved hand.
 */
enum class Outcome : std::uint8_t {
    PlayerBlackjack,
    PlayerWin,
    DealerWin,
    Push
};

/**
 * A single blackjack hand between a player and the dealer.
 *
 * Uses a 6-deck shoe by default; the dealer stands on 17. Once the hand is
 * settled the Game is expected to be discarded (natural blackjacks settle on
 * the deal).
 */
class Game {
private:
    deck::Deck _deck;
    Hand _playerHand;
    Hand _dealerHand;
    Phase _phase;
    std::int64_t _bet;
    std::optional<Outcome> _outcome;

    /**
     * Deals one card to the player.
     */
    void deal_to_player();

    /**
     * Deals one card to the dealer.
     */
    void deal_to_dealer();

    /**
     * Determines and stores the hand outcome.
     */
    void resolve_outcome();

    /**
     * Plays the dealer's hand: draws until reaching 17 or more.
     */
    void dealer_play();

public:
    /**
     * Constructs a Game with a shoe of numDecks decks.
     *
     * @param numDecks Number of decks in the shoe (default 6).
     */
    explicit Game(std::size_t numDecks = 6);

    /**
     * Returns the game to the betting phase and clears all hand state.
     */
    void reset() noexcept;

    /**
     * Places a bet and deals the opening hand.
     *
     * A natural blackjack settles immediately.
     *
     * @param bet The player's bet.
     * @throws std::logic_error if not in the betting phase.
     * @throws std::invalid_argument if bet is not positive.
     */
    void deal(std::int64_t bet);

    /**
     * Draws another card for the player.
     *
     * @throws std::logic_error if not in the player turn.
     */
    void hit();

    /**
     * Ends the player's turn and resolves the hand.
     *
     * @throws std::logic_error if not in the player turn.
     */
    void stand();

    /**
     * Returns the current phase.
     *
     * @return The phase.
     */
    [[nodiscard]] Phase phase() const noexcept;

    /**
     * Returns the player's hand.
     *
     * @return The player's hand.
     */
    [[nodiscard]] const Hand& player_hand() const noexcept;

    /**
     * Returns the dealer's hand.
     *
     * @return The dealer's hand.
     */
    [[nodiscard]] const Hand& dealer_hand() const noexcept;

    /**
     * Returns the outcome once the hand is settled.
     *
     * @return The outcome, or nullopt while the hand is in progress.
     */
    [[nodiscard]] std::optional<Outcome> outcome() const noexcept;

    /**
     * Returns the placed bet.
     *
     * @return The bet.
     */
    [[nodiscard]] std::int64_t bet() const noexcept;
};

} // namespace blackjack
