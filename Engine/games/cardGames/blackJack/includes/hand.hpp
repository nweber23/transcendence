#pragma once

#include <cstdint>
#include <vector>
#include "../../shared/includes/card.hpp"

namespace blackjack {

/**
 * A blackjack hand — a collection of cards with a total value.
 *
 * Aces count as 11 unless that would bust the hand, in which case they count
 * as 1.
 */
class Hand {
private:
    std::vector<card::Card> _cards;

public:
    /**
     * Adds a card to the hand.
     *
     * @param c The card to add.
     */
    void add_card(card::Card c);

    /**
     * Computes the hand's total value.
     *
     * @return The best non-busting value (or the lowest value when busted).
     */
    [[nodiscard]] std::int8_t value() const noexcept;

    /**
     * Returns whether the hand contains an ace counted as 11.
     *
     * @return true if soft, false otherwise.
     */
    [[nodiscard]] bool is_soft() const noexcept;

    /**
     * Returns whether the hand's value exceeds 21.
     *
     * @return true if busted, false otherwise.
     */
    [[nodiscard]] bool is_bust() const noexcept;

    /**
     * Returns whether the hand is a natural blackjack.
     *
     * @return true if exactly two cards totalling 21.
     */
    [[nodiscard]] bool is_blackjack() const noexcept;

    /**
     * Returns the number of cards in the hand.
     *
     * @return The card count.
     */
    [[nodiscard]] std::size_t size() const noexcept;

    /**
     * Returns the hand's cards.
     *
     * @return The cards.
     */
    [[nodiscard]] const std::vector<card::Card>& cards() const noexcept;

    /**
     * Empties the hand.
     */
    void clear() noexcept;
};

} // namespace blackjack
