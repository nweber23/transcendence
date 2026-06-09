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

using PaytableEntry = std::unordered_map<uint8_t, uint32_t>;

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
    std::uint8_t free_spin_retrigger_count;
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
    std::uint32_t payline_win;
    std::uint32_t scatter_win;
    std::uint8_t scatter_count;
    bool bonus_triggered;
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
        "wild_symbol"          &SlotConfig::wild_symbol,
        "scatter_symbol",      &SlotConfig::scatter_symbol,
        "scatter_paytable",    &SlotConfig::scatter_paytable,
        "bonus_trigger_count", &SlotConfig::bonus_trigger_count,
        "free_spin_count",               &SlotConfig::free_spin_count,
        "free_spin_multiplier",          &SlotConfig::free_spin_multiplier,
        "free_spin_retrigger_count",     &SlotConfig::free_spin_retrigger_count,
        "free_spin_multiplier_increment",&SlotConfig::free_spin_multiplier_increment,
        "free_spin_max_multiplier",      &SlotConfig::free_spin_max_multiplier,
        "max_win_multiplier",            &SlotConfig::max_win_multiplier
    );
};

class Machine {
    private:
        std::mt19937_64 rng_;
        std::vector<std::string> game_names;
        std::unordered_map<std::string, SlotConfig> configs;

        static fs::path config_directory();

        static SpinEvalResult evaluate_spin(const SlotConfig& config,
                                            const std::vector<std::uint8_t>& stops,
                                            std::uint8_t line_count);

    public:
        Machine();
        explicit Machine(std::uint64_t seed);

        [[nodiscard]]
        SpinResult get_monetary_result(std::string_view game_name,
                                       std::uint8_t line_count,
                                       std::uint32_t bet_per_line,
                                       FreeSpinState& fs_state,
                                       bool is_free_spin = false);
};
