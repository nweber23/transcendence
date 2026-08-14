#pragma once

#include <cstddef>
#include <stdexcept>
#include <vector>
#include "card.hpp"

namespace deck {

// --------------------------------------------------
// Deck
// --------------------------------------------------

/**
 * A shuffled deck of playing cards, optionally built from multiple decks.
 *
 * Cards are dealt from the top of the deck via pick(); the deck can be
 * reshuffled at any time.
 */
class Deck {
private:
    std::vector<card::Card> _cards;
    std::size_t _nextCard = 0;

public:
    /**
     * Constructs and shuffles a deck of numDecks standard 52-card decks.
     *
     * @param numDecks Number of standard decks to combine (default 1).
     */
    explicit Deck(std::size_t numDecks = 1);

    /**
     * Deals the next card from the top of the deck.
     *
     * @return The dealt card.
     * @throws std::out_of_range if the deck has been fully dealt.
     */
    card::Card pick();

    /**
     * Shuffles the deck and resets it so cards are dealt from the top again.
     */
    void reshuffle();
};

}