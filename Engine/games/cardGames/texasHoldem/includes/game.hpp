#pragma once

#include <array>
#include <cstdint>
#include <vector>
#include "../../shared/includes/deck.hpp"
#include "player.hpp"

namespace texas {

// --------------------------------------------------
// Hand Rank
// --------------------------------------------------

/**
 * The nine Texas Hold'em hand rankings, weakest to strongest.
 */
enum class HandRank : std::uint8_t {
    HighCard,
    Pair,
    TwoPair,
    ThreeOfAKind,
    Straight,
    Flush,
    FullHouse,
    FourOfAKind,
    StraightFlush,
    RoyalFlush
};

// --------------------------------------------------
// Best 5‑card hand from 7 cards
// --------------------------------------------------

/**
 * A player's best 5-card hand.
 */
struct EvaluatedHand {
    HandRank rank;
    std::array<card::Card, 5> cards;
};

// --------------------------------------------------
// Phase
// --------------------------------------------------

/**
 * The betting phases of a Texas Hold'em hand.
 */
enum class Phase : std::uint8_t {
    PreFlop,
    Flop,
    Turn,
    River,
    Showdown
};

// --------------------------------------------------
// Action
// --------------------------------------------------

/**
 * The poker actions a player can take.
 */
enum class ActionType : std::uint8_t {
    Fold,
    Check,
    Call,
    Raise,
    AllIn
};

/**
 * A player action: the action type plus the amount (used by raise/all-in).
 */
struct Action {
    ActionType type;
    std::int64_t amount = 0;
};

// --------------------------------------------------
// Game
// --------------------------------------------------

/**
 * A single Texas Hold'em table.
 *
 * No-limit, with side pots and best-5-of-7 hand evaluation. A Game survives
 * past Showdown so the same table plays many hands in a row; post_blinds()
 * starts a new hand once the previous one reached Showdown, keeping stacks.
 */
class Game {
private:
    deck::Deck _deck;
    std::vector<Player> _players;
    std::vector<card::Card> _communityCards;
    std::vector<std::int64_t> _pot;
    Phase _phase;
    std::size_t _dealerIdx;
    std::size_t _currentPlayerIdx;
    std::int64_t _minRaise;
    Action _lastAction;
    std::size_t _playersToAct;

    /**
     * Deals each player two hole cards.
     */
    void deal_hole_cards();

    /**
     * Deals count community cards (burning one card first).
     *
     * @param count Number of community cards to deal (3 for the flop, 1
     *              otherwise).
     */
    void deal_community(std::size_t count);

    /**
     * Moves the hand to the next phase.
     */
    void advance_phase();

    /**
     * Finds the best 5-card hand a player can make from hole cards and
     * community cards.
     *
     * @param p The player to evaluate.
     * @return The player's best hand.
     */
    EvaluatedHand evaluate(const Player& p) const;

    /**
     * Distributes the pot(s) to the winner(s).
     */
    void settle_pots();

    /**
     * Advances to the next eligible player who must act.
     */
    void advance_to_next_actor();

    /**
     * Starts a betting round by resetting the act counter to the dealer.
     */
    void start_betting_round();

    /**
     * Clears hand-only state while leaving stacks, so the same Game can play
     * many hands in a row. Called automatically from post_blinds() when the
     * previous hand reached Showdown. Every player still in this Game is
     * assumed to have a positive stack; a caller who wants to remove a busted
     * player must construct a new Game with the remaining stacks instead.
     */
    void start_new_hand();

    /**
     * Counts players who have not folded.
     *
     * @return The number of active players.
     */
    [[nodiscard]] std::size_t active_player_count() const noexcept;

    /**
     * Counts players who can still act (not folded and not all-in).
     *
     * @return The number of eligible players.
     */
    [[nodiscard]] std::size_t eligible_player_count() const noexcept;

public:
    /**
     * Constructs a Game seating numPlayers players with an equal starting
     * stack.
     *
     * @param numPlayers Number of players to seat.
     * @param startingStack Stack given to every player.
     * @param numDecks Number of decks in the shoe (default 1).
     */
    explicit Game(std::size_t numPlayers, std::int64_t startingStack, std::size_t numDecks = 1);

    /**
     * Constructs a Game seating players with per-player stacks.
     *
     * @param stacks Stack for every player, in seat order.
     * @param numDecks Number of decks in the shoe (default 1).
     */
    explicit Game(const std::vector<std::int64_t>& stacks, std::size_t numDecks = 1);

    /**
     * Posts blinds and deals the hand.
     *
     * When the previous hand reached Showdown this also starts a new hand
     * while keeping stacks.
     *
     * @param small The small blind amount.
     * @param big The big blind amount.
     */
    void post_blinds(std::int64_t small, std::int64_t big);

    /**
     * Performs an action for a player and advances the hand.
     *
     * @param playerIdx Seat index of the acting player.
     * @param a The action to perform.
     */
    void act(std::size_t playerIdx, Action a);

    /**
     * Returns the current phase.
     *
     * @return The phase.
     */
    [[nodiscard]] Phase phase() const noexcept;

    /**
     * Returns the community cards.
     *
     * @return The community cards.
     */
    [[nodiscard]] const std::vector<card::Card>& community_cards() const noexcept;

    /**
     * Returns all players.
     *
     * @return The players.
     */
    [[nodiscard]] const std::vector<Player>& players() const noexcept;

    /**
     * Returns the dealer's seat index.
     *
     * @return The dealer index.
     */
    [[nodiscard]] std::size_t dealer() const noexcept;

    /**
     * Returns the seat index of the player whose turn it is.
     *
     * @return The current player index.
     */
    [[nodiscard]] std::size_t current_player() const noexcept;

    /**
     * Returns the side pot amounts.
     *
     * @return The pot.
     */
    [[nodiscard]] const std::vector<std::int64_t>& pot() const noexcept;

    /**
     * Returns the current minimum raise.
     *
     * @return The minimum raise.
     */
    [[nodiscard]] std::int64_t min_raise() const noexcept;

    /**
     * Returns the most recent action.
     *
     * @return The last action.
     */
    [[nodiscard]] Action last_action() const noexcept;
};

} // namespace texas
