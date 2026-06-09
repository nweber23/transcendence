#include <catch2/catch_test_macros.hpp>
#include "machines.hpp"

#include <cmath>
#include <numeric>
#include <vector>

TEST_CASE("Machine loads configs and evaluates spins", "[slotmachine]") {
    Machine m;

    SECTION("get_monetary_result eventually returns non-zero for valid game") {
        bool seen_win = false;
        for (int i = 0; i < 1000; ++i) {
            if (m.get_monetary_result("lucky-sevens", 10, 1).win_amount > 0) {
                seen_win = true;
                break;
            }
        }
        REQUIRE(seen_win);
    }

    SECTION("get_monetary_result returns zero for unknown game") {
        auto r = m.get_monetary_result("nonexistent", 10, 100);
        REQUIRE(r.win_amount == 0);
    }

    SECTION("get_monetary_result returns zero when 0 lines played") {
        auto r = m.get_monetary_result("lucky-sevens", 0, 100);
        REQUIRE(r.win_amount == 0);
    }

    SECTION("scatter can trigger bonus") {
        bool seen_bonus = false;
        for (int i = 0; i < 5000; ++i) {
            if (m.get_monetary_result("lucky-sevens", 10, 1).bonus_triggered) {
                seen_bonus = true;
                break;
            }
        }
        REQUIRE(seen_bonus);
    }

    SECTION("SpinResult contains stops with correct size") {
        auto r = m.get_monetary_result("lucky-sevens", 10, 1);
        REQUIRE(r.stops.size() == 3);
    }

    SECTION("free spins are awarded on bonus trigger") {
        for (int i = 0; i < 10000; ++i) {
            auto r = m.get_monetary_result("lucky-sevens", 10, 1);
            if (r.bonus_triggered && r.free_spins_remaining == 10) {
                REQUIRE(m.free_spins_remaining() == 10);
                return;
            }
        }
        FAIL("Should have seen a bonus trigger with 10 free spins");
    }

    SECTION("free spins decrement counter and accumulate total") {
        for (int i = 0; i < 10000; ++i) {
            auto r = m.get_monetary_result("lucky-sevens", 10, 1);
            if (!r.bonus_triggered) continue;

            REQUIRE(r.free_spins_remaining == 10);
            REQUIRE(m.free_spins_remaining() == 10);

            auto fs = m.get_monetary_result("lucky-sevens", 10, 1, true);
            REQUIRE(fs.is_free_spin);
            REQUIRE(fs.free_spins_remaining == 9);

            while (m.free_spins_remaining() > 0) {
                fs = m.get_monetary_result("lucky-sevens", 10, 1, true);
            }
            REQUIRE(fs.total_free_win > 0);
            return;
        }
        FAIL("Should have hit a bonus trigger");
    }

    SECTION("free spins start with configured multiplier") {
        for (int i = 0; i < 20000; ++i) {
            auto base = m.get_monetary_result("lucky-sevens", 10, 1);
            if (!base.bonus_triggered) continue;

            REQUIRE(base.current_multiplier == 3);
            REQUIRE(base.current_multiplier >= 3);

            for (int j = 0; j < 10; ++j) {
                auto fs = m.get_monetary_result("lucky-sevens", 10, 1, true);
                REQUIRE(fs.current_multiplier >= 3);
                if (fs.win_amount > 0) {
                    REQUIRE(fs.win_amount % fs.current_multiplier == 0);
                }
            }
            m.reset_free_spins();
            return;
        }
        FAIL("Should have hit a bonus trigger");
    }
}


TEST_CASE("Empirical RTP from independent reel spins is non-zero",
          "[slotmachine][rtp]") {
    Machine m;

    constexpr int SPINS = 10000;
    std::uint64_t total_payout = 0;
    for (int i = 0; i < SPINS; ++i) {
        total_payout += m.get_monetary_result("lucky-sevens", 10, 1).win_amount;
    }

    double avg_return = static_cast<double>(total_payout) / SPINS;
    REQUIRE(avg_return > 0);
}


TEST_CASE("Results vary between spins (random selection works)", "[slotmachine]") {
    Machine m;

    std::vector<std::uint32_t> results;
    for (int i = 0; i < 200; ++i) {
        results.push_back(m.get_monetary_result("lucky-sevens", 10, 1).win_amount);
    }

    auto [min_it, max_it] = std::minmax_element(results.begin(), results.end());
    REQUIRE(*min_it != *max_it);
}
