// Catch2 test for cards::Card
#include <catch2/catch_test_macros.hpp>
#include "../games/cardGames/shared/includes/card.hpp"

using namespace card;

TEST_CASE("Card to_string outputs correct symbols", "[card]") {
    Card c{Rank::Ace, Suit::Spades};
    REQUIRE(c.to_string() == "A♠");

    Card c2{Rank::Ten, Suit::Hearts};
    REQUIRE(c2.to_string() == "10♥");
}
