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

struct EvaluatedHand {
    HandRank rank;
    std::array<card::Card, 5> cards;
};

// --------------------------------------------------
// Phase
// --------------------------------------------------

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

enum class ActionType : std::uint8_t {
    Fold,
    Check,
    Call,
    Raise,
    AllIn
};

struct Action {
    ActionType type;
    std::int64_t amount = 0;
};

// --------------------------------------------------
// Game
// --------------------------------------------------

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

    void deal_hole_cards();
    void deal_community(std::size_t count);
    void advance_phase();
    EvaluatedHand evaluate(const Player& p) const;
    void settle_pots();
    void advance_to_next_actor();
    void start_betting_round();
    // Clears community cards/pot and every player's hand-only state (hole
    // cards, current bet, folded/all-in flags) while leaving stacks
    // untouched, so the same Game can play many hands in a row. Called
    // automatically from post_blinds() when the previous hand reached
    // Showdown — every player still in this Game is assumed to have a
    // positive stack; a caller who wants to remove a busted player must
    // construct a new Game with the remaining stacks instead.
    void start_new_hand();
    [[nodiscard]] std::size_t active_player_count() const noexcept;
    [[nodiscard]] std::size_t eligible_player_count() const noexcept;

public:
    explicit Game(std::size_t numPlayers, std::int64_t startingStack, std::size_t numDecks = 1);
    explicit Game(const std::vector<std::int64_t>& stacks, std::size_t numDecks = 1);

    void post_blinds(std::int64_t small, std::int64_t big);
    void act(std::size_t playerIdx, Action a);

    [[nodiscard]] Phase phase() const noexcept;
    [[nodiscard]] const std::vector<card::Card>& community_cards() const noexcept;
    [[nodiscard]] const std::vector<Player>& players() const noexcept;
    [[nodiscard]] std::size_t dealer() const noexcept;
    [[nodiscard]] std::size_t current_player() const noexcept;
    [[nodiscard]] const std::vector<std::int64_t>& pot() const noexcept;
    [[nodiscard]] std::int64_t min_raise() const noexcept;
    [[nodiscard]] Action last_action() const noexcept;
};

} // namespace texas
