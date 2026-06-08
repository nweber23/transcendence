#pragma once

#include <atomic>
#include <array>
#include <cstdint>
#include <filesystem>
#include <string>
#include <thread>
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

struct PaytableEntry {
    std::unordered_map<uint8_t, uint32_t> count_to_multiplier;
};

using Payline = std::vector<std::pair<std::uint8_t, std::uint8_t>>;
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

    volatility_t volatility;
    double rtp;
    std::uint8_t max_lines;
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
struct glz::meta<PaytableEntry> {
    using type = PaytableEntry;
    static constexpr auto value = object(
        "count_to_multiplier", &PaytableEntry::count_to_multiplier
    );
};

template <>
struct glz::meta<SlotConfig> {
    using type = SlotConfig;
    static constexpr auto value = object(
        "name",         &SlotConfig::name,
        "display_name", &SlotConfig::display_name,
        "description",  &SlotConfig::description,
        "rows",         &SlotConfig::rows,
        "cols",         &SlotConfig::cols,
        "symbols",      &SlotConfig::symbols,
        "line_options", &SlotConfig::line_options,
        "paylines",     &SlotConfig::paylines,
        "reels",        &SlotConfig::reels,
        "paytable",     &SlotConfig::paytable,
        "volatility",   &SlotConfig::volatility,
        "rtp",          &SlotConfig::rtp,
        "max_lines",    &SlotConfig::max_lines
    );
};

class Machine {
    private:
        std::uint64_t nonce;
        std::jthread counter_thread;
        std::vector<std::string> game_names;
        std::unordered_map<std::string, SlotConfig> configs;

        static fs::path config_directory();

    public:
        Machine();
        ~Machine();

        [[nodiscard]]
        std::uint32_t get_monetary_result(std::string_view game_name, std::uint8_t line_count) const;
};
