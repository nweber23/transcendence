// Catch2 tests for deck::Deck
#include <catch2/catch_test_macros.hpp>
#include <map>
#include "../games/cardGames/shared/includes/deck.hpp"

using namespace deck;
using namespace card;

TEST_CASE("Deck has correct number of cards for given decks", "[deck]") {
    SECTION("single deck contains 52 cards") {
        Deck d(1);
        std::size_t count = 0;
        try {
            while (true) {
                (void)d.pick();
                ++count;
            }
        } catch (const std::out_of_range&) {
        }
        REQUIRE(count == 52);
    }

    SECTION("two decks contain 104 cards") {
        Deck d(2);
        std::size_t count = 0;
        try {
            while (true) {
                (void)d.pick();
                ++count;
            }
        } catch (const std::out_of_range&) {
        }
        REQUIRE(count == 104);
    }
}

TEST_CASE("Deck reshuffle resets the deck", "[deck]") {
    Deck d(1);
    for (std::size_t i = 0; i < 26; ++i) {
        (void)d.pick();
    }
    d.reshuffle();
    std::size_t count = 0;
    try {
        while (true) {
            (void)d.pick();
            ++count;
        }
    } catch (const std::out_of_range&) {
    }
    REQUIRE(count == 52);
}

TEST_CASE("Deck with zero decks is empty", "[deck]") {
    Deck d(0);
    REQUIRE_THROWS_AS(d.pick(), std::out_of_range);
}

TEST_CASE("Deck draw distribution sanity checks", "[deck]") {
    // Ensure suits and ranks appear expected number of times for multiple decks
    Deck d(2); // 2 decks -> each unique rank/suit should appear exactly twice
    std::map<std::pair<int,int>, int> freq;
    try {
        while (true) {
            Card c = d.pick();
            freq[{static_cast<int>(c.rank()), static_cast<int>(c.suit())}]++;
        }
    } catch (const std::out_of_range&) {
    }

    // There should be 52 distinct rank+suit pairs each occurring twice
    int distinct = 0;
    for (auto &kv : freq) {
        if (kv.second > 0) ++distinct;
        REQUIRE(kv.second == 2);
    }
    REQUIRE(distinct == 52);
}
