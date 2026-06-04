#include "../includes/hand.hpp"

#include <algorithm>

namespace blackjack {

void Hand::add_card(card::Card c) {
    _cards.push_back(std::move(c));
}

std::int8_t Hand::value() const noexcept {
    std::int8_t total = 0;
    std::uint8_t aces = 0;

    for (const auto& c : _cards) {
        if (c.rank() == card::Rank::Ace) {
            ++aces;
            total += 11;
        } else {
            total += std::min(static_cast<std::uint8_t>(c.rank()), std::uint8_t{10});
        }
    }

    while (total > 21 && aces > 0) {
        total -= 10;
        --aces;
    }

    return total;
}

bool Hand::is_soft() const noexcept {
    std::int8_t total = 0;
    bool has_ace_as_eleven = false;

    for (const auto& c : _cards) {
        if (c.rank() == card::Rank::Ace) {
            total += 11;
            has_ace_as_eleven = true;
        } else {
            total += std::min(static_cast<std::uint8_t>(c.rank()), std::uint8_t{10});
        }
    }

    return has_ace_as_eleven && total <= 21;
}

bool Hand::is_bust() const noexcept {
    return value() > 21;
}

bool Hand::is_blackjack() const noexcept {
    return _cards.size() == 2 && value() == 21;
}

std::size_t Hand::size() const noexcept {
    return _cards.size();
}

const std::vector<card::Card>& Hand::cards() const noexcept {
    return _cards;
}

void Hand::clear() noexcept {
    _cards.clear();
}

} // namespace blackjack
