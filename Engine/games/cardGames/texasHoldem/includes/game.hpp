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

    void deal_hole_cards();
    void deal_community(std::size_t count);
    void advance_phase();
    EvaluatedHand evaluate(const Player& p) const;
    void settle_pots();

public:
    explicit Game(std::size_t numPlayers, std::int64_t startingStack, std::size_t numDecks = 1);

    void post_blinds(std::int64_t small, std::int64_t big);
    void act(std::size_t playerIdx, Action a);

    [[nodiscard]] Phase phase() const noexcept;
    [[nodiscard]] const std::vector<card::Card>& community_cards() const noexcept;
    [[nodiscard]] const std::vector<Player>& players() const noexcept;
    [[nodiscard]] std::size_t dealer() const noexcept;
    [[nodiscard]] std::size_t current_player() const noexcept;
    [[nodiscard]] const std::vector<std::int64_t>& pot() const noexcept;
};

} // namespace texas
