#pragma once

#include <cstddef>
#include <stdexcept>
#include <vector>
#include "card.hpp"

namespace deck {

// --------------------------------------------------
// Deck
// --------------------------------------------------

class Deck {
private:
    std::vector<card::Card> _cards;
    std::size_t _nextCard = 0;

public:
    explicit Deck(std::size_t numDecks = 1);

    card::Card pick();
    void reshuffle();
};

}