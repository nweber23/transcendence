#include <algorithm>
#include <random>
#include "../includes/deck.hpp"

namespace deck {

Deck::Deck(std::size_t numDecks) {
    _cards.reserve(numDecks * 52);

    for (std::size_t deck = 0; deck < numDecks; ++deck) {
        for (std::uint8_t suit = 0; suit < 4; ++suit) {
            for (std::uint8_t rank = 0; rank < 13; ++rank) {
                _cards.push_back({static_cast<card::Rank>(rank + 2), static_cast<card::Suit>(suit)});
            }
        }
    }

    reshuffle();
}

void Deck::reshuffle() {
    std::mt19937 rng(std::random_device{}());
    std::shuffle(_cards.begin(), _cards.end(), rng);
    _nextCard = 0;
}

card::Card Deck::pick() {
    if (_nextCard >= _cards.size()) {
        throw std::out_of_range("No cards left");
    }

    return _cards[_nextCard++];
}

} // namespace deck