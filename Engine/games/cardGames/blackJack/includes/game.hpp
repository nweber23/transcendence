#pragma once

#include <cstdint>
#include <optional>
#include "../../shared/includes/deck.hpp"
#include "hand.hpp"

namespace blackjack {

enum class Phase : std::uint8_t {
    Betting,
    PlayerTurn,
    DealerTurn,
    Settled
};

enum class Outcome : std::uint8_t {
    PlayerBlackjack,
    PlayerWin,
    DealerWin,
    Push
};

class Game {
private:
    deck::Deck _deck;
    Hand _playerHand;
    Hand _dealerHand;
    Phase _phase;
    std::int64_t _bet;
    std::optional<Outcome> _outcome;

    void deal_to_player();
    void deal_to_dealer();
    void resolve_outcome();
    void dealer_play();

public:
    explicit Game(std::size_t numDecks = 6);

    void deal(std::int64_t bet);
    void hit();
    void stand();

    [[nodiscard]] Phase phase() const noexcept;
    [[nodiscard]] const Hand& player_hand() const noexcept;
    [[nodiscard]] const Hand& dealer_hand() const noexcept;
    [[nodiscard]] std::optional<Outcome> outcome() const noexcept;
    [[nodiscard]] std::int64_t bet() const noexcept;
};

} // namespace blackjack
