#include "../includes/card.hpp"

namespace cards {

constexpr std::string_view to_string(Rank r) {
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

constexpr std::string_view to_string(Suit s) {
    switch (s) {
        case Suit::Clubs:    return "♣";
        case Suit::Diamonds: return "♦";
        case Suit::Hearts:   return "♥";
        case Suit::Spades:   return "♠";
    }
    return "?";
}

std::string Card::to_string() const {
    return std::format("{}{}", to_string(_rank), to_string(_suit));
}

} // namespace cards