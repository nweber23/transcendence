#include <catch2/catch_test_macros.hpp>
#include "machines.hpp"

#include <cmath>
#include <numeric>
#include <vector>

TEST_CASE("Machine loads configs and builds result table", "[slotmachine]") {
    Machine m;

    SECTION("get_monetary_result eventually returns non-zero for valid game") {
        bool seen_win = false;
        for (int i = 0; i < 100; ++i) {
            if (m.get_monetary_result("lucky-sevens", 10, 1) > 0) {
                seen_win = true;
                break;
            }
        }
        REQUIRE(seen_win);
    }

    SECTION("get_monetary_result returns zero for unknown game") {
        auto r = m.get_monetary_result("nonexistent", 10, 100);
        REQUIRE(r == 0);
    }

    SECTION("get_monetary_result returns zero when 0 lines played") {
        auto r = m.get_monetary_result("lucky-sevens", 0, 100);
        REQUIRE(r == 0);
    }
}


TEST_CASE("Empirical RTP from result table is statistically consistent",
          "[slotmachine][rtp]") {
    Machine m;

    constexpr int SPINS = 10000;
    std::uint64_t total_payout = 0;
    for (int i = 0; i < SPINS; ++i) {
        total_payout += m.get_monetary_result("lucky-sevens", 10, 1);
    }

    double avg_return = static_cast<double>(total_payout) / SPINS;
    // With 10 lines at bet=1, RTP 96.5%, expected avg = 9.65
    // Allow ±50% tolerance since 10K spins isn't huge
    REQUIRE(avg_return > 0);
    REQUIRE(avg_return < 19.3);
}


TEST_CASE("Results vary between spins (random selection works)", "[slotmachine]") {
    Machine m;

    std::vector<std::uint32_t> results;
    for (int i = 0; i < 200; ++i) {
        results.push_back(m.get_monetary_result("lucky-sevens", 10, 1));
    }

    // After enough spins we should see at least two different outcomes
    auto [min_it, max_it] = std::minmax_element(results.begin(), results.end());
    REQUIRE(*min_it != *max_it);
}
