#include <catch2/catch_test_macros.hpp>
#include "../games/cardGames/texasHoldem/includes/game.hpp"
#include "../games/cardGames/texasHoldem/includes/player.hpp"
#include "../games/cardGames/texasHoldem/includes/engine.hpp"
#include <glaze/glaze.hpp>

using namespace texas;
using namespace card;

TEST_CASE("Player initializes with correct defaults", "[texas][player]") {
    Player p{1000};
    REQUIRE(p.stack() == 1000);
    REQUIRE(p.current_bet() == 0);
    REQUIRE_FALSE(p.is_folded());
    REQUIRE_FALSE(p.is_all_in());
    REQUIRE_FALSE(p.hole_cards()[0].has_value());
    REQUIRE_FALSE(p.hole_cards()[1].has_value());
}

TEST_CASE("Player receives hole cards at both positions", "[texas][player]") {
    Player p{1000};
    p.receive_card({Rank::Ace, Suit::Spades}, 0);
    p.receive_card({Rank::King, Suit::Hearts}, 1);
    REQUIRE(p.hole_cards()[0]->rank() == Rank::Ace);
    REQUIRE(p.hole_cards()[0]->suit() == Suit::Spades);
    REQUIRE(p.hole_cards()[1]->rank() == Rank::King);
    REQUIRE(p.hole_cards()[1]->suit() == Suit::Hearts);
}

TEST_CASE("Player receive_card throws for invalid index", "[texas][player]") {
    Player p{1000};
    REQUIRE_THROWS_AS(p.receive_card({Rank::Ace, Suit::Spades}, 2), std::out_of_range);
}

TEST_CASE("Player place_bet reduces stack and increases current bet", "[texas][player]") {
    Player p{1000};
    p.place_bet(100);
    REQUIRE(p.stack() == 900);
    REQUIRE(p.current_bet() == 100);
    REQUIRE_FALSE(p.is_all_in());
}

TEST_CASE("Player place_bet triggers all-in when amount equals stack", "[texas][player]") {
    Player p{500};
    p.place_bet(500);
    REQUIRE(p.stack() == 0);
    REQUIRE(p.current_bet() == 500);
    REQUIRE(p.is_all_in());
}

TEST_CASE("Player place_bet triggers all-in when amount exceeds stack", "[texas][player]") {
    Player p{300};
    p.place_bet(500);
    REQUIRE(p.stack() == 0);
    REQUIRE(p.current_bet() == 300);
    REQUIRE(p.is_all_in());
}

TEST_CASE("Player place_bet rejects zero and negative amounts", "[texas][player]") {
    Player p{1000};
    REQUIRE_THROWS_AS(p.place_bet(0), std::invalid_argument);
    REQUIRE_THROWS_AS(p.place_bet(-1), std::invalid_argument);
}

TEST_CASE("Player cannot bet when already all-in", "[texas][player]") {
    Player p{100};
    p.place_bet(100);
    REQUIRE(p.is_all_in());
    REQUIRE_THROWS_AS(p.place_bet(10), std::logic_error);
}

TEST_CASE("Player add_winnings increases stack", "[texas][player]") {
    Player p{1000};
    p.add_winnings(500);
    REQUIRE(p.stack() == 1500);
}

TEST_CASE("Player add_winnings rejects negative amounts", "[texas][player]") {
    Player p{1000};
    REQUIRE_THROWS_AS(p.add_winnings(-1), std::invalid_argument);
}

TEST_CASE("Player fold sets folded flag", "[texas][player]") {
    Player p{1000};
    REQUIRE_FALSE(p.is_folded());
    p.fold();
    REQUIRE(p.is_folded());
}

TEST_CASE("Player reset_hand clears hole cards and betting state", "[texas][player]") {
    Player p{1000};
    p.receive_card({Rank::Ace, Suit::Spades}, 0);
    p.receive_card({Rank::King, Suit::Hearts}, 1);
    p.place_bet(200);
    p.fold();
    p.reset_hand();
    REQUIRE_FALSE(p.hole_cards()[0].has_value());
    REQUIRE_FALSE(p.hole_cards()[1].has_value());
    REQUIRE(p.current_bet() == 0);
    REQUIRE_FALSE(p.is_folded());
    REQUIRE_FALSE(p.is_all_in());
    REQUIRE(p.stack() == 800);
}

TEST_CASE("Game initializes in PreFlop phase with correct state", "[texas][game]") {
    Game g{2, 1000};
    REQUIRE(g.phase() == Phase::PreFlop);
    REQUIRE(g.players().size() == 2);
    REQUIRE(g.community_cards().empty());
    REQUIRE(g.pot().empty());
    REQUIRE(g.dealer() == 0);
    REQUIRE(g.current_player() == 0);
}

TEST_CASE("Game initializes all players with correct stack size", "[texas][game]") {
    Game g{9, 500};
    REQUIRE(g.players().size() == 9);
    for (const auto& p : g.players()) {
        REQUIRE(p.stack() == 500);
    }
}

TEST_CASE("Post blinds in heads-up sets correct positions and bets", "[texas][game]") {
    Game g{2, 1000};
    g.post_blinds(10, 20);
    REQUIRE(g.dealer() == 1);
    REQUIRE(g.current_player() == 0);
    REQUIRE(g.players()[0].current_bet() == 10);
    REQUIRE(g.players()[1].current_bet() == 20);
    REQUIRE(g.players()[0].stack() == 990);
    REQUIRE(g.players()[1].stack() == 980);
}

TEST_CASE("Post blinds in 3-handed sets correct positions", "[texas][game]") {
    Game g{3, 1000};
    g.post_blinds(5, 10);
    REQUIRE(g.dealer() == 1);
    REQUIRE(g.players()[2].current_bet() == 5);
    REQUIRE(g.players()[0].current_bet() == 10);
    REQUIRE(g.current_player() == 1);
}

TEST_CASE("Fold action marks player as folded and advances turn", "[texas][game]") {
    Game g{2, 1000};
    g.post_blinds(10, 20);
    g.act(0, {ActionType::Fold});
    REQUIRE(g.players()[0].is_folded());
    REQUIRE(g.current_player() == 1);
}

TEST_CASE("Call action matches the current bet", "[texas][game]") {
    Game g{2, 1000};
    g.post_blinds(5, 10);
    g.act(0, {ActionType::Call});
    REQUIRE(g.players()[0].current_bet() == 10);
    REQUIRE(g.players()[0].stack() == 990);
}

TEST_CASE("Check action without outstanding bet does not change stack", "[texas][game]") {
    Game g{3, 1000};
    g.post_blinds(10, 20);
    g.act(1, {ActionType::Fold});
    g.act(2, {ActionType::Call});
    g.act(0, {ActionType::Check});
    REQUIRE(g.players()[0].current_bet() == 20);
}

TEST_CASE("Raise action increases bet and sets new minimum raise", "[texas][game]") {
    Game g{2, 1000};
    g.post_blinds(10, 20);
    g.act(0, {ActionType::Raise, 60});
    REQUIRE(g.players()[0].current_bet() == 60);
    REQUIRE(g.players()[0].stack() == 940);
    REQUIRE(g.current_player() == 1);
}

TEST_CASE("All-in action commits entire stack", "[texas][game]") {
    Game g{2, 1000};
    g.post_blinds(10, 20);
    g.act(0, {ActionType::AllIn});
    REQUIRE(g.players()[0].is_all_in());
    REQUIRE(g.players()[0].stack() == 0);
    REQUIRE(g.players()[0].current_bet() == 1000);
}

TEST_CASE("Current player skips over folded players", "[texas][game]") {
    Game g{3, 1000};
    g.post_blinds(10, 20);
    g.act(1, {ActionType::Fold});
    REQUIRE(g.current_player() == 2);
}

TEST_CASE("Current player skips over all-in players", "[texas][game]") {
    Game g{3, 200};
    g.post_blinds(10, 20);
    g.act(1, {ActionType::AllIn});
    REQUIRE(g.current_player() == 2);
}

TEST_CASE("Action wraps around the table correctly", "[texas][game]") {
    Game g{2, 1000};
    g.post_blinds(10, 20);
    REQUIRE(g.current_player() == 0);
    g.act(0, {ActionType::Call});
    REQUIRE(g.current_player() == 1);
    g.act(1, {ActionType::Check});
    REQUIRE(g.current_player() == 0);
}

TEST_CASE("Multiple raise rounds work correctly", "[texas][game]") {
    Game g{2, 1000};
    g.post_blinds(5, 10);
    g.act(0, {ActionType::Raise, 30});
    g.act(1, {ActionType::Raise, 80});
    g.act(0, {ActionType::Call});
    REQUIRE(g.players()[0].current_bet() == 80);
    REQUIRE(g.players()[1].current_bet() == 80);
    REQUIRE(g.players()[0].stack() == 920);
    REQUIRE(g.players()[1].stack() == 920);
}

TEST_CASE("Small blind raise sets correct min raise increment", "[texas][game]") {
    Game g{3, 1000};
    g.post_blinds(10, 20);
    g.act(1, {ActionType::Fold});
    g.act(2, {ActionType::Raise, 60});
    REQUIRE(g.players()[2].current_bet() == 60);
    REQUIRE(g.current_player() == 0);
}

TEST_CASE("Dealer position rotates on each new hand", "[texas][game]") {
    Game g{2, 1000};
    g.post_blinds(10, 20);
    REQUIRE(g.dealer() == 1);
    Game g2{2, 1000};
    g2.post_blinds(10, 20);
    REQUIRE(g2.dealer() == 1);
}

TEST_CASE("Game with 6 players initializes and posts blinds correctly", "[texas][game]") {
    Game g{6, 1000};
    g.post_blinds(25, 50);
    REQUIRE(g.players().size() == 6);
    REQUIRE(g.dealer() == 1);
    REQUIRE(g.players()[2].current_bet() == 25);
    REQUIRE(g.players()[3].current_bet() == 50);
    REQUIRE(g.current_player() == 4);
}

TEST_CASE("Game with 9 players all start with correct stack", "[texas][game]") {
    Game g{9, 1500};
    REQUIRE(g.players().size() == 9);
    for (const auto& p : g.players()) {
        REQUIRE(p.stack() == 1500);
    }
}

TEST_CASE("Player bets accumulate correctly across multiple actions", "[texas][player]") {
    Player p{1000};
    p.place_bet(50);
    REQUIRE(p.current_bet() == 50);
    REQUIRE(p.stack() == 950);
    p.place_bet(100);
    REQUIRE(p.current_bet() == 150);
    REQUIRE(p.stack() == 850);
}

TEST_CASE("All-in player is correctly identified", "[texas][player]") {
    Player p{100};
    REQUIRE_FALSE(p.is_all_in());
    p.place_bet(100);
    REQUIRE(p.is_all_in());
}

TEST_CASE("Zero stack player at creation is not all-in until bet", "[texas][player]") {
    Player p{0};
    REQUIRE_FALSE(p.is_all_in());
    REQUIRE(p.stack() == 0);
}

TEST_CASE("serialize_game_state returns valid JSON for initial game", "[texas][engine]") {
    Game g{2, 1000};
    std::string json = serialize_game_state(g);
    REQUIRE(!json.empty());

    GameState state;
    auto err = glz::read_json(state, json);
    REQUIRE(!err);
    REQUIRE(state.phase == "preflop");
    REQUIRE(state.players.size() == 2);
    REQUIRE(state.community_cards.empty());
    REQUIRE(state.pot.empty());
}

TEST_CASE("serialize_game_state after blinds includes player bets", "[texas][engine]") {
    Game g{2, 1000};
    g.post_blinds(10, 20);
    std::string json = serialize_game_state(g);
    GameState state;
    auto err = glz::read_json(state, json);
    REQUIRE(!err);
    REQUIRE(state.players[0].current_bet == 10);
    REQUIRE(state.players[1].current_bet == 20);
    REQUIRE(state.players[0].stack == 990);
    REQUIRE(state.players[1].stack == 980);
}

TEST_CASE("serialize_game_state round-trips player state after fold", "[texas][engine]") {
    Game g{2, 1000};
    g.post_blinds(10, 20);
    g.act(0, {ActionType::Fold});
    std::string json = serialize_game_state(g);
    GameState state;
    auto err = glz::read_json(state, json);
    REQUIRE(!err);
    REQUIRE(state.players[0].folded);
    REQUIRE_FALSE(state.players[1].folded);
}

TEST_CASE("serialize_game_state includes last action", "[texas][engine]") {
    Game g{2, 1000};
    g.post_blinds(10, 20);
    std::string json = serialize_game_state(g);
    GameState state;
    auto err = glz::read_json(state, json);
    REQUIRE(!err);
    REQUIRE(state.last_action_type == "raise");
    REQUIRE(state.last_action_amount == 20);
}
