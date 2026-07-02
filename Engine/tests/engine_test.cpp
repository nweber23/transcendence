#include <catch2/catch_test_macros.hpp>
#include "../interface.hpp"

TEST_CASE("Engine creates and tracks blackjack games", "[engine]") {
    Engine e;

    SECTION("game does not exist initially") {
        REQUIRE_FALSE(e.blackjack_exists("42"));
    }

    SECTION("create returns non-empty JSON") {
        auto json = e.create_blackjack("42", 100);
        REQUIRE_FALSE(json.empty());
        REQUIRE(e.blackjack_exists("42"));
    }

    SECTION("create rejects duplicate game_id") {
        REQUIRE_FALSE(e.create_blackjack("42", 100).empty());
        auto json = e.create_blackjack("42", 200);
        REQUIRE(json.empty());
    }

    SECTION("hit on existing game returns valid JSON") {
        REQUIRE_FALSE(e.create_blackjack("42", 100).empty());
        auto json = e.blackjack_hit("42");
        REQUIRE_FALSE(json.empty());
    }

    SECTION("stand on existing game returns valid JSON") {
        REQUIRE_FALSE(e.create_blackjack("42", 100).empty());
        auto json = e.blackjack_stand("42");
        REQUIRE_FALSE(json.empty());
    }

    SECTION("hit on nonexistent game returns empty") {
        auto json = e.blackjack_hit("99");
        REQUIRE(json.empty());
    }

    SECTION("stand on nonexistent game returns empty") {
        auto json = e.blackjack_stand("99");
        REQUIRE(json.empty());
    }
}

TEST_CASE("Engine manages multiple blackjack games independently", "[engine]") {
    Engine e;
    auto j1 = e.create_blackjack("1", 50);
    auto j2 = e.create_blackjack("2", 100);
    REQUIRE_FALSE(j1.empty());
    REQUIRE_FALSE(j2.empty());
    REQUIRE(e.blackjack_exists("1"));
    REQUIRE(e.blackjack_exists("2"));
}

TEST_CASE("Engine creates and tracks texas hold'em games", "[engine]") {
    Engine e;

    SECTION("game does not exist initially") {
        REQUIRE_FALSE(e.texas_exists("1"));
    }

    SECTION("create returns non-empty JSON") {
        auto json = e.create_texas("1", 2, 1000);
        REQUIRE_FALSE(json.empty());
        REQUIRE(e.texas_exists("1"));
    }

    SECTION("post_blinds on existing game returns valid JSON") {
        REQUIRE_FALSE(e.create_texas("1", 2, 1000).empty());
        auto json = e.texas_post_blinds("1", 10, 20);
        REQUIRE_FALSE(json.empty());
    }

    SECTION("act on existing game returns valid JSON") {
        REQUIRE_FALSE(e.create_texas("1", 2, 1000).empty());
        REQUIRE_FALSE(e.texas_post_blinds("1", 10, 20).empty());
        auto json = e.texas_act("1", 0, "call", 0);
        REQUIRE_FALSE(json.empty());
    }

    SECTION("act on nonexistent game returns empty") {
        auto json = e.texas_act("99", 0, "fold", 0);
        REQUIRE(json.empty());
    }
}

TEST_CASE("Engine manages multiple texas games independently", "[engine]") {
    Engine e;
    auto j1 = e.create_texas("1", 2, 1000);
    auto j2 = e.create_texas("2", 3, 500);
    REQUIRE_FALSE(j1.empty());
    REQUIRE_FALSE(j2.empty());
    REQUIRE(e.texas_exists("1"));
    REQUIRE(e.texas_exists("2"));
}

TEST_CASE("Engine slot operations", "[engine]") {
    Engine e;

    SECTION("slot_exists returns false for unknown game") {
        REQUIRE_FALSE(e.slot_exists("nonexistent"));
    }
}
