#pragma once

#include <cstdint>
#include <vector>
#include "../../shared/includes/card.hpp"

namespace blackjack {

class Hand {
private:
    std::vector<card::Card> _cards;

public:
    void add_card(card::Card c);

    [[nodiscard]] std::int8_t value() const noexcept;

    [[nodiscard]] bool is_soft() const noexcept;

    [[nodiscard]] bool is_bust() const noexcept;

    [[nodiscard]] bool is_blackjack() const noexcept;

    [[nodiscard]] std::size_t size() const noexcept;

    [[nodiscard]] const std::vector<card::Card>& cards() const noexcept;

    void clear() noexcept;
};

} // namespace blackjack
