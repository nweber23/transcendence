#include "../includes/hand.hpp"

#include <algorithm>

namespace blackjack {

void Hand::add_card(card::Card c) {
    _cards.push_back(std::move(c));
}

/**
 * Maps a card to its blackjack face value.
 *
 * @param c The card.
 * @return 2-10 for pip cards, 10 for face cards, 11 for aces.
 */
constexpr std::uint8_t get_card_value(card::Card c) {
    auto v = static_cast<std::uint8_t>(c.rank());
    return v > 10 ? 10 : v;
}

std::int8_t Hand::value() const noexcept {
    std::int8_t total = 0;
    std::uint8_t aces = 0;

    for (const auto& c : _cards) {
        if (c.rank() == card::Rank::Ace) {
            ++aces;
            total += 11;
        } else {
            total += get_card_value(c);
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
            total += get_card_value(c);
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
