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

enum class volatility_t : uint8_t {
    low,
    medium,
    high
};

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

    std::string scatter_symbol;
    PaytableEntry scatter_paytable;
    std::uint8_t bonus_trigger_count;
};

struct SpinResult {
    std::vector<std::uint8_t> stops;
    std::uint32_t win_amount;
    bool bonus_triggered;
    std::uint8_t scatter_count;
};

struct SpinEvalResult {
    std::uint32_t payline_win;
    std::uint32_t scatter_win;
    std::uint8_t scatter_count;
    bool bonus_triggered;
};

template <>
struct glz::meta<volatility_t> {
    using type = volatility_t;
    static constexpr auto value = enumerate(
        "low",   volatility_t::low,
        "medium", volatility_t::medium,
        "high",  volatility_t::high
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
        "name",               &SlotConfig::name,
        "display_name",       &SlotConfig::display_name,
        "description",        &SlotConfig::description,
        "rows",               &SlotConfig::rows,
        "cols",               &SlotConfig::cols,
        "symbols",            &SlotConfig::symbols,
        "line_options",       &SlotConfig::line_options,
        "paylines",           &SlotConfig::paylines,
        "reels",              &SlotConfig::reels,
        "paytable",           &SlotConfig::paytable,
        "max_lines",          &SlotConfig::max_lines,
        "scatter_symbol",     &SlotConfig::scatter_symbol,
        "scatter_paytable",   &SlotConfig::scatter_paytable,
        "bonus_trigger_count",&SlotConfig::bonus_trigger_count
    );
};

class Machine {
    private:
        std::vector<std::string> game_names;
        std::unordered_map<std::string, SlotConfig> configs;

        static fs::path config_directory();

        static SpinEvalResult evaluate_spin(const SlotConfig& config,
                                            const std::vector<std::uint8_t>& stops,
                                            std::uint8_t line_count);

    public:
        Machine();
        ~Machine() = default;

        [[nodiscard]]
        SpinResult get_monetary_result(std::string_view game_name,
                                       std::uint8_t line_count,
                                       std::uint32_t bet_per_line);
};
