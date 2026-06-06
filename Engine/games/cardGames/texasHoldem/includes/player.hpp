#pragma once

#include <array>
#include <cstdint>
#include <optional>
#include "../../shared/includes/card.hpp"

namespace texas {

// --------------------------------------------------
// Player
// --------------------------------------------------

class Player {
private:
    std::array<std::optional<card::Card>, 2> _holeCards;
    std::int64_t _stack;
    std::int64_t _currentBet = 0;
    bool _folded = false;
    bool _allIn = false;

public:
    explicit Player(std::int64_t stack);

    void receive_card(card::Card c, std::size_t idx);
    void place_bet(std::int64_t amount);
    void fold();
    void reset_hand();

    [[nodiscard]] const std::array<std::optional<card::Card>, 2>& hole_cards() const noexcept;
    [[nodiscard]] std::int64_t stack() const noexcept;
    [[nodiscard]] std::int64_t current_bet() const noexcept;
    [[nodiscard]] bool is_folded() const noexcept;
    [[nodiscard]] bool is_all_in() const noexcept;
};

} // namespace texas
