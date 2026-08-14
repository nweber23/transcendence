#pragma once

#include <array>
#include <cstdint>
#include <filesystem>
#include <random>
#include <string>
#include <unordered_map>
#include <vector>

#include <glaze/glaze.hpp>

namespace fs = std::filesystem;

struct SymbolInfo {
    std::string id;
    std::string label;
    std::string file;
};

using PaytableEntry = std::unordered_map<uint8_t, double>;

using PaylinePos = std::array<std::uint8_t, 2>;
using Payline = std::vector<PaylinePos>;
using ReelStrip = std::vector<std::string>;

struct SlotConfig {
    std::string name;
    std::string display_name;
    std::string description;

    std::uint8_t rows;
    std::uint8_t cols;

    std::vector<SymbolInfo> symbols;
    std::vector<std::uint8_t> line_options;
    std::vector<Payline> paylines;
    std::vector<ReelStrip> reels;
    std::unordered_map<std::string, PaytableEntry> paytable;

    std::uint8_t max_lines;

    std::string wild_symbol;
    std::string scatter_symbol;
    PaytableEntry scatter_paytable;
    std::uint8_t bonus_trigger_count;

    std::uint8_t free_spin_count;
    std::uint8_t free_spin_multiplier;
    std::uint8_t free_spin_multiplier_increment;
    std::uint8_t free_spin_max_multiplier;

    std::uint32_t max_win_multiplier;
};

struct SpinResult {
    std::vector<std::uint8_t> stops;
    std::uint32_t win_amount;
    bool bonus_triggered;
    std::uint8_t scatter_count;
    bool is_free_spin;
    std::uint8_t free_spins_remaining;
    std::uint8_t current_multiplier;
    std::uint32_t total_free_win;
    std::vector<std::vector<std::string>> grid;
};

struct FreeSpinState {
    std::uint8_t free_spins_remaining = 0;
    std::uint8_t current_multiplier = 1;
    std::uint32_t total_free_win = 0;

    void reset() {
        free_spins_remaining = 0;
        current_multiplier = 1;
        total_free_win = 0;
    }
};

struct SpinEvalResult {
    double payline_win;
    double scatter_win;
    std::uint8_t scatter_count;
    bool bonus_triggered;
};

struct SpinStep {
    std::uint32_t step;
    bool is_free_spin;
    std::uint8_t free_spins_remaining;
    std::uint8_t multiplier;
    std::vector<std::uint8_t> stops;
    std::uint32_t step_win;
    std::uint32_t accumulated_free_win;
    std::vector<std::vector<std::string>> grid;
};

struct CompleteGameCycle {
    std::string game_name;
    std::uint32_t total_initial_bet;
    std::uint32_t total_overall_win;
    bool bonus_triggered;
    std::vector<SpinStep> timeline;
};

template <>
struct glz::meta<SpinStep> {
    using type = SpinStep;
    static constexpr auto value = object(
        "step",                 &SpinStep::step,
        "is_free_spin",         &SpinStep::is_free_spin,
        "free_spins_remaining", &SpinStep::free_spins_remaining,
        "multiplier",           &SpinStep::multiplier,
        "stops",                &SpinStep::stops,
        "step_win",             &SpinStep::step_win,
        "accumulated_free_win", &SpinStep::accumulated_free_win,
        "grid",                 &SpinStep::grid
    );
};

template <>
struct glz::meta<CompleteGameCycle> {
    using type = CompleteGameCycle;
    static constexpr auto value = object(
        "game_name",         &CompleteGameCycle::game_name,
        "total_initial_bet", &CompleteGameCycle::total_initial_bet,
        "total_overall_win", &CompleteGameCycle::total_overall_win,
        "bonus_triggered",   &CompleteGameCycle::bonus_triggered,
        "timeline",          &CompleteGameCycle::timeline
    );
};

template <>
struct glz::meta<SymbolInfo> {
    using type = SymbolInfo;
    static constexpr auto value = object(
        "id",    &SymbolInfo::id,
        "label", &SymbolInfo::label,
        "file",  &SymbolInfo::file
    );
};

template <>
struct glz::meta<SlotConfig> {
    using type = SlotConfig;
    static constexpr auto value = object(
        "name",                &SlotConfig::name,
        "display_name",        &SlotConfig::display_name,
        "description",         &SlotConfig::description,
        "rows",                &SlotConfig::rows,
        "cols",                &SlotConfig::cols,
        "symbols",             &SlotConfig::symbols,
        "line_options",        &SlotConfig::line_options,
        "paylines",            &SlotConfig::paylines,
        "reels",               &SlotConfig::reels,
        "paytable",            &SlotConfig::paytable,
        "max_lines",           &SlotConfig::max_lines,
        "wild_symbol",         &SlotConfig::wild_symbol,
        "scatter_symbol",      &SlotConfig::scatter_symbol,
        "scatter_paytable",    &SlotConfig::scatter_paytable,
        "bonus_trigger_count", &SlotConfig::bonus_trigger_count,
        "free_spin_count",               &SlotConfig::free_spin_count,
        "free_spin_multiplier",          &SlotConfig::free_spin_multiplier,
        "free_spin_multiplier_increment",&SlotConfig::free_spin_multiplier_increment,
        "free_spin_max_multiplier",      &SlotConfig::free_spin_max_multiplier,
        "max_win_multiplier",            &SlotConfig::max_win_multiplier
    );
};

/**
 * Slot machine engine, driven by JSON slot configurations.
 *
 * Owns the random number generator and a map of loaded configs. Each spin is
 * stateless; a full game cycle (base spin plus any triggered free spins) is
 * produced by get_monetary_result / play_full_iteration.
 */
class Machine {
    private:
        std::mt19937_64 rng_;
        std::vector<std::string> game_names;
        std::unordered_map<std::string, SlotConfig> configs;

        /**
         * Resolves the directory containing slot config JSON files.
         *
         * Honors the SLOT_CONFIG_DIR env var, falling back to
         * "games/slotMachine/configs".
         *
         * @return The filesystem path to the config directory.
         */
        static fs::path config_directory();

        /**
         * Evaluates one spin's payouts for the given reel stops.
         *
         * @param config The slot configuration to evaluate against.
         * @param stops The per-reel stop positions.
         * @param line_count Number of active paylines.
         * @return The payline win, scatter win, scatter count and whether the
         *         bonus was triggered.
         */
        static SpinEvalResult evaluate_spin(const SlotConfig& config,
                                            const std::vector<std::uint8_t>& stops,
                                            std::uint8_t line_count);

    public:
        /**
         * Constructs a Machine seeded from the system random device.
         */
        Machine();

        /**
         * Constructs a Machine with a fixed RNG seed.
         *
         * @param seed Seed for reproducible spin sequences.
         */
        explicit Machine(std::uint64_t seed);

        /**
         * Plays one complete game cycle, including any free-spin timeline.
         *
         * @param game_name The slot config name (e.g. "lucky-sevens").
         * @param line_count Number of active paylines.
         * @param bet_per_line Bet amount per payline.
         * @return Serialized CompleteGameCycle JSON.
         */
        [[nodiscard]]
        std::string play_full_iteration(std::string_view game_name,
                                        std::uint8_t line_count,
                                        std::uint32_t bet_per_line);

        /**
         * Plays a full slot iteration for a known game.
         *
         * @param game_name The slot config name.
         * @param line_count Number of active paylines.
         * @param bet_per_line Bet amount per payline.
         * @return Serialized CompleteGameCycle JSON, or an empty string if the
         *         game does not exist.
         */
        [[nodiscard]]
        std::string run_slot(std::string_view game_name,
                             std::uint8_t line_count,
                             std::uint32_t bet_per_line);

        /**
         * Spins the reels once and reports the monetary outcome.
         *
         * @param game_name The slot config name.
         * @param line_count Number of active paylines.
         * @param bet_per_line Bet amount per payline.
         * @param fs_state In/out free-spin state, advanced per spin.
         * @param is_free_spin Whether this spin is part of a free-spin round.
         * @return The stops, win, bonus/scatter info and resulting grid.
         */
        [[nodiscard]]
        SpinResult get_monetary_result(std::string_view game_name,
                                       std::uint8_t line_count,
                                       std::uint32_t bet_per_line,
                                       FreeSpinState& fs_state,
                                       bool is_free_spin = false);

        /**
         * Checks whether a slot configuration is loaded.
         *
         * @param game_name The slot config name.
         * @return true if the config exists, false otherwise.
         */
        [[nodiscard]]
        bool game_exists(std::string_view game_name);
};
