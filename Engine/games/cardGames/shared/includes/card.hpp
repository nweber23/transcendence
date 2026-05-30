#pragma once

#include <array>
#include <algorithm>
#include <format>
#include <iostream>
#include <random>
#include <ranges>
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
    constexpr Card(Rank r, Suit s) : _suit(s), _rank(r) {}

    [[nodiscard]]
    constexpr Suit suit() const noexcept { return _suit; }

    [[nodiscard]]
    constexpr Rank rank() const noexcept { return _rank; }

    std::string to_string() const;
};

// --------------------------------------------------
// Lookup tables
// --------------------------------------------------

inline constexpr std::array<std::string_view, 4> suit_symbols{
    "♣", "♦", "♥", "♠"
};

inline constexpr std::array<std::string_view, 13> rank_names{
    "2", "3", "4", "5", "6", "7",
    "8", "9", "10", "J", "Q", "K", "A"
};

} // namespace card