#pragma once

#include <format>
#include <iostream>
#include <string_view>

namespace card {

// --------------------------------------------------
// Suit / Rank
// --------------------------------------------------

/**
 * The four card suits.
 */
enum class Suit : std::int8_t {
    Clubs,
    Diamonds,
    Hearts,
    Spades
};

/**
 * Card ranks, with Two starting at 2 so the numeric value matches the face
 * value for the pip cards.
 */
enum class Rank : std::uint8_t {
    Two = 2,
    Three,
    Four,
    Five,
    Six,
    Seven,
    Eight,
    Nine,
    Ten,
    Jack,
    Queen,
    King,
    Ace
};

// --------------------------------------------------
// Card
// --------------------------------------------------

/**
 * A single playing card, combining a Suit and a Rank.
 */
class Card {
private:
    Suit _suit;
    Rank _rank;

public:
    /**
     * Default-constructs a card as Two of Clubs.
     */
    constexpr Card() : _suit(Suit::Clubs), _rank(Rank::Two) {}

    /**
     * Constructs a card from the given rank and suit.
     *
     * @param r The card's rank.
     * @param s The card's suit.
     */
    constexpr Card(Rank r, Suit s) : _suit(s), _rank(r) {}

    /**
     * Returns the card's suit.
     *
     * @return The suit.
     */
    [[nodiscard]]
    constexpr Suit suit() const noexcept { return _suit; }

    /**
     * Returns the card's rank.
     *
     * @return The rank.
     */
    [[nodiscard]]
    constexpr Rank rank() const noexcept { return _rank; }

    /**
     * Serializes the card as "<rank><suit>" (e.g. "A♠", "10♥").
     *
     * @return The string representation.
     */
    std::string to_string() const;
};
} // namespace card