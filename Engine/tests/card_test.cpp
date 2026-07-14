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

TEST_CASE("All four suits produce distinct strings", "[card]") {
    Card clubs{Rank::Ace, Suit::Clubs};
    Card diamonds{Rank::Ace, Suit::Diamonds};
    Card hearts{Rank::Ace, Suit::Hearts};
    Card spades{Rank::Ace, Suit::Spades};
    REQUIRE(clubs.to_string() == "A♣");
    REQUIRE(diamonds.to_string() == "A♦");
    REQUIRE(hearts.to_string() == "A♥");
    REQUIRE(spades.to_string() == "A♠");
}

TEST_CASE("All ranks produce correct string representations", "[card]") {
    auto rank_str = [](Rank r) -> std::string {
        return Card{r, Suit::Spades}.to_string();
    };
    REQUIRE(rank_str(Rank::Two)   == "2♠");
    REQUIRE(rank_str(Rank::Three) == "3♠");
    REQUIRE(rank_str(Rank::Four)  == "4♠");
    REQUIRE(rank_str(Rank::Five)  == "5♠");
    REQUIRE(rank_str(Rank::Six)   == "6♠");
    REQUIRE(rank_str(Rank::Seven) == "7♠");
    REQUIRE(rank_str(Rank::Eight) == "8♠");
    REQUIRE(rank_str(Rank::Nine)  == "9♠");
    REQUIRE(rank_str(Rank::Jack)  == "J♠");
    REQUIRE(rank_str(Rank::Queen) == "Q♠");
    REQUIRE(rank_str(Rank::King)  == "K♠");
    REQUIRE(rank_str(Rank::Ace)   == "A♠");
}

TEST_CASE("Card default construction creates Two of Clubs", "[card]") {
    Card c;
    REQUIRE(c.rank() == Rank::Two);
    REQUIRE(c.suit() == Suit::Clubs);
    REQUIRE(c.to_string() == "2♣");
}
