#pragma once

#include <format>
#include <iostream>
#include <string_view>

namespace card {

// --------------------------------------------------
// Suit / Rank
// --------------------------------------------------

enum class Suit : std::int8_t {
    Clubs,
    Diamonds,
    Hearts,
    Spades
};

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

class Card {
private:
    Suit _suit;
    Rank _rank;

public:
    constexpr Card() : _suit(Suit::Clubs), _rank(Rank::Two) {}
    constexpr Card(Rank r, Suit s) : _suit(s), _rank(r) {}

    [[nodiscard]]
    constexpr Suit suit() const noexcept { return _suit; }

    [[nodiscard]]
    constexpr Rank rank() const noexcept { return _rank; }

    std::string to_string() const;
};
} // namespace card