#include <catch2/catch_test_macros.hpp>
#include "../games/cardGames/blackJack/includes/hand.hpp"
#include "../games/cardGames/blackJack/includes/game.hpp"
#include "../games/cardGames/blackJack/includes/engine.hpp"
#include <glaze/glaze.hpp>

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

TEST_CASE("serialize_game_state returns valid JSON after deal", "[blackjack][engine]") {
    Game g;
    g.deal(100);
    std::string json = serialize_game_state(g);
    REQUIRE(!json.empty());

    GameState state;
    auto err = glz::read_json(state, json);
    REQUIRE(!err);
    REQUIRE(state.bet == 100);
    REQUIRE(state.phase == "player_turn");
    REQUIRE(state.player_cards.size() == 2);
    REQUIRE(state.dealer_cards.size() == 1);
}

TEST_CASE("serialize_game_state includes outcome after settle", "[blackjack][engine]") {
    Game g;
    g.deal(50);
    if (g.phase() == Phase::Settled) {
        std::string json = serialize_game_state(g);
        GameState state;
        auto err = glz::read_json(state, json);
        REQUIRE(!err);
        REQUIRE(state.phase == "settled");
        REQUIRE(state.outcome == "player_blackjack");
    }
}

TEST_CASE("serialize_game_state round-trips player_value and dealer_value", "[blackjack][engine]") {
    Game g;
    g.deal(50);
    std::string json = serialize_game_state(g);
    GameState state;
    auto err = glz::read_json(state, json);
    REQUIRE(!err);
    REQUIRE(state.player_value >= 0);
    REQUIRE(state.dealer_value >= 0);
}

TEST_CASE("Stand transitions to dealer play then settled", "[blackjack][game]") {
    Game g(1);
    g.deal(100);
    REQUIRE(g.phase() == Phase::PlayerTurn);
    g.stand();
    REQUIRE(g.phase() == Phase::Settled);
    REQUIRE(g.outcome().has_value());
}

TEST_CASE("Dealer plays after stand and outcome is determined", "[blackjack][game]") {
    Game g(1);
    g.deal(100);
    g.stand();
    auto valid = g.outcome() == Outcome::PlayerWin ||
                 g.outcome() == Outcome::DealerWin ||
                 g.outcome() == Outcome::Push;
    REQUIRE(valid);
}

TEST_CASE("Hit during player turn adds a card", "[blackjack][game]") {
    Game g(1);
    g.deal(100);
    auto before = g.player_hand().size();
    g.hit();
    REQUIRE(g.player_hand().size() == before + 1);
}

TEST_CASE("Deal requires bet > 0", "[blackjack][game]") {
    Game g;
    REQUIRE_THROWS_AS(g.deal(0), std::invalid_argument);
    REQUIRE_THROWS_AS(g.deal(-100), std::invalid_argument);
}

TEST_CASE("Cannot hit before deal", "[blackjack][game]") {
    Game g;
    REQUIRE_THROWS_AS(g.hit(), std::logic_error);
}

TEST_CASE("Cannot stand before deal", "[blackjack][game]") {
    Game g;
    REQUIRE_THROWS_AS(g.stand(), std::logic_error);
}

TEST_CASE("Cannot deal twice without reset", "[blackjack][game]") {
    Game g;
    g.deal(100);
    REQUIRE_THROWS_AS(g.deal(200), std::logic_error);
}

TEST_CASE("Reset allows new deal", "[blackjack][game]") {
    Game g;
    g.deal(100);
    g.reset();
    REQUIRE(g.phase() == Phase::Betting);
    REQUIRE_NOTHROW(g.deal(200));
    REQUIRE(g.bet() == 200);
}

TEST_CASE("Dealer hand size at deal is always 1", "[blackjack][game]") {
    Game g(1);
    g.deal(50);
    REQUIRE(g.dealer_hand().size() == 1);
}

TEST_CASE("Multiple rounds via reset produce valid games", "[blackjack][game]") {
    Game g(1);
    for (int i = 0; i < 5; ++i) {
        g.deal(100);
        if (g.phase() == Phase::PlayerTurn) {
            g.stand();
        }
        REQUIRE(g.outcome().has_value());
        g.reset();
        REQUIRE(g.phase() == Phase::Betting);
    }
}

TEST_CASE("Player hand contains 2 cards after deal", "[blackjack][game]") {
    Game g(1);
    g.deal(100);
    REQUIRE(g.player_hand().size() == 2);
}
