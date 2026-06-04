#include <catch2/catch_test_macros.hpp>
#include "../games/cardGames/blackJack/includes/hand.hpp"
#include "../games/cardGames/blackJack/includes/game.hpp"

using namespace blackjack;
using namespace card;

TEST_CASE("Hand calculates values correctly", "[blackjack][hand]") {
    Hand h;

    h.add_card({Rank::Ace, Suit::Spades});
    h.add_card({Rank::King, Suit::Hearts});
    REQUIRE(h.value() == 21);
    REQUIRE(h.is_blackjack());
    REQUIRE(h.is_soft());

    h.add_card({Rank::Five, Suit::Diamonds});
    REQUIRE(h.value() == 16);
    REQUIRE_FALSE(h.is_blackjack());
}

TEST_CASE("Hand handles multiple aces", "[blackjack][hand]") {
    Hand h;
    h.add_card({Rank::Ace, Suit::Spades});
    h.add_card({Rank::Ace, Suit::Hearts});
    REQUIRE(h.value() == 12);

    h.add_card({Rank::Ace, Suit::Diamonds});
    REQUIRE(h.value() == 13);
}

TEST_CASE("Hand detects bust", "[blackjack][hand]") {
    Hand h;
    h.add_card({Rank::Ten, Suit::Spades});
    h.add_card({Rank::Nine, Suit::Hearts});
    h.add_card({Rank::Five, Suit::Diamonds});
    REQUIRE(h.value() == 24);
    REQUIRE(h.is_bust());
}

TEST_CASE("Game deals cards correctly", "[blackjack][game]") {
    Game g{1};

    g.deal(100);
    REQUIRE(g.phase() == Phase::PlayerTurn);
    REQUIRE(g.player_hand().size() == 2);
    REQUIRE(g.dealer_hand().size() == 1);
    REQUIRE(g.bet() == 100);
}

TEST_CASE("Game resolves blackjack", "[blackjack][game]") {
    Game g{100};

    g.deal(50);
    if (g.phase() == Phase::Settled) {
        REQUIRE(g.outcome().has_value());
        REQUIRE(g.outcome() == Outcome::PlayerBlackjack);
    }
}
