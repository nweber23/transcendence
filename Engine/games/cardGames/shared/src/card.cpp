#include "../includes/card.hpp"

namespace card {

/**
 * Maps a Rank to its display string.
 *
 * @param r The rank.
 * @return "2"-"10" for pips, "J"/"Q"/"K"/"A" for face cards, "?" if unknown.
 */
constexpr std::string_view rank_to_string(Rank r) {
    switch (r) {
        case Rank::Two:   return "2";
        case Rank::Three: return "3";
        case Rank::Four:  return "4";
        case Rank::Five:  return "5";
        case Rank::Six:   return "6";
        case Rank::Seven: return "7";
        case Rank::Eight: return "8";
        case Rank::Nine:  return "9";
        case Rank::Ten:   return "10";
        case Rank::Jack:  return "J";
        case Rank::Queen: return "Q";
        case Rank::King:  return "K";
        case Rank::Ace:   return "A";
    }
    return "?";
}

/**
 * Maps a Suit to its display symbol.
 *
 * @param s The suit.
 * @return The Unicode suit glyph, "?" if unknown.
 */
constexpr std::string_view suit_to_string(Suit s) {
    switch (s) {
        case Suit::Clubs:    return "♣";
        case Suit::Diamonds: return "♦";
        case Suit::Hearts:   return "♥";
        case Suit::Spades:   return "♠";
    }
    return "?";
}

std::string Card::to_string() const {
    return std::format("{}{}", rank_to_string(_rank), suit_to_string(_suit));
}

} // namespace card
