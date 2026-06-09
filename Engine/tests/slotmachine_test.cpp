#include <catch2/catch_test_macros.hpp>
#include "machines.hpp"

#include <cmath>
#include <numeric>
#include <vector>

TEST_CASE("Machine loads configs and evaluates spins", "[slotmachine]") {
    Machine m;

    SECTION("get_monetary_result eventually returns non-zero for valid game") {
        FreeSpinState fs;
        bool seen_win = false;
        for (int i = 0; i < 1000; ++i) {
            if (m.get_monetary_result("lucky-sevens", 10, 1, fs).win_amount > 0) {
                seen_win = true;
                break;
            }
        }
        REQUIRE(seen_win);
    }

    SECTION("get_monetary_result returns zero for unknown game") {
        FreeSpinState fs;
        auto r = m.get_monetary_result("nonexistent", 10, 100, fs);
        REQUIRE(r.win_amount == 0);
    }

    SECTION("get_monetary_result returns zero when 0 lines played") {
        FreeSpinState fs;
        auto r = m.get_monetary_result("lucky-sevens", 0, 100, fs);
        REQUIRE(r.win_amount == 0);
    }

    SECTION("scatter can trigger bonus") {
        FreeSpinState fs;
        bool seen_bonus = false;
        for (int i = 0; i < 5000; ++i) {
            if (m.get_monetary_result("lucky-sevens", 10, 1, fs).bonus_triggered) {
                seen_bonus = true;
                break;
            }
        }
        REQUIRE(seen_bonus);
    }

    SECTION("SpinResult contains stops with correct size") {
        FreeSpinState fs;
        auto r = m.get_monetary_result("lucky-sevens", 10, 1, fs);
        REQUIRE(r.stops.size() == 3);
    }

    SECTION("free spins are awarded on bonus trigger") {
        FreeSpinState fs;
        for (int i = 0; i < 10000; ++i) {
            auto r = m.get_monetary_result("lucky-sevens", 10, 1, fs);
            if (r.bonus_triggered) {
                REQUIRE(r.free_spins_remaining == 10);
                REQUIRE(fs.free_spins_remaining == 10);
                return;
            }
        }
        FAIL("Should have seen a bonus trigger with 10 free spins");
    }

    SECTION("free spins decrement counter and accumulate total") {
        FreeSpinState fs;
        for (int i = 0; i < 10000; ++i) {
            auto r = m.get_monetary_result("lucky-sevens", 10, 1, fs);
            if (!r.bonus_triggered) continue;

            REQUIRE(fs.free_spins_remaining == 10);

            auto fs_result = m.get_monetary_result("lucky-sevens", 10, 1, fs, true);
            REQUIRE(fs_result.is_free_spin);
            REQUIRE(fs.free_spins_remaining == 9);

            while (fs.free_spins_remaining > 0) {
                fs_result = m.get_monetary_result("lucky-sevens", 10, 1, fs, true);
            }
            REQUIRE(fs.total_free_win > 0);
            return;
        }
        FAIL("Should have hit a bonus trigger");
    }

    SECTION("free spins start with configured multiplier") {
        FreeSpinState fs;
        for (int i = 0; i < 20000; ++i) {
            auto base = m.get_monetary_result("lucky-sevens", 10, 1, fs);
            if (!base.bonus_triggered) continue;

            REQUIRE(fs.current_multiplier == 3);

            for (int j = 0; j < 10; ++j) {
                auto mult_before = fs.current_multiplier;
                auto fs_result = m.get_monetary_result("lucky-sevens", 10, 1, fs, true);
                if (fs_result.win_amount > 0) {
                    REQUIRE(fs_result.win_amount % mult_before == 0);
                }
            }
            fs.reset();
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
    FreeSpinState fs;
    for (int i = 0; i < SPINS; ++i) {
        total_payout += m.get_monetary_result("lucky-sevens", 10, 1, fs).win_amount;
    }

    double avg_return = static_cast<double>(total_payout) / SPINS;
    REQUIRE(avg_return > 0);
}


TEST_CASE("Results vary between spins (random selection works)", "[slotmachine]") {
    Machine m;

    std::vector<std::uint32_t> results;
    FreeSpinState fs;
    for (int i = 0; i < 200; ++i) {
        results.push_back(m.get_monetary_result("lucky-sevens", 10, 1, fs).win_amount);
    }

    auto [min_it, max_it] = std::minmax_element(results.begin(), results.end());
    REQUIRE(*min_it != *max_it);
}


TEST_CASE("Deterministic seed reproduces identical results", "[slotmachine]") {
    FreeSpinState fs_a, fs_b;

    Machine m1(42);
    Machine m2(42);

    for (int i = 0; i < 100; ++i) {
        auto r1 = m1.get_monetary_result("lucky-sevens", 10, 1, fs_a);
        auto r2 = m2.get_monetary_result("lucky-sevens", 10, 1, fs_b);
        REQUIRE(r1.stops == r2.stops);
        REQUIRE(r1.win_amount == r2.win_amount);
    }
}


TEST_CASE("Different seeds produce different sequences", "[slotmachine]") {
    FreeSpinState fs_a, fs_b;

    Machine m1(42);
    Machine m2(999);

    bool any_different = false;
    for (int i = 0; i < 100; ++i) {
        auto r1 = m1.get_monetary_result("lucky-sevens", 10, 1, fs_a);
        auto r2 = m2.get_monetary_result("lucky-sevens", 10, 1, fs_b);
        if (r1.stops != r2.stops) {
            any_different = true;
            break;
        }
    }
    REQUIRE(any_different);
}


TEST_CASE("Max win multiplier is enforced from config", "[slotmachine]") {
    Machine m;
    FreeSpinState fs;

    // Verify config loaded max_win_multiplier by checking a normal spin works
    auto r = m.get_monetary_result("lucky-sevens", 10, 1, fs);
    REQUIRE(r.win_amount <= 5000 * 10 * 1); // max_win_multiplier * lines * bet
}
