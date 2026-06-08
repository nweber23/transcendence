#pragma once

#include <atomic>
#include <array>
#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

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

class Machine {
    private:
        std::uint64_t nonce;
        std::jthread counter_thread;
        std::unordered_map<std::string, SlotConfig> configs;

    public:
        Machine();
        ~Machine();

        void load_configs();

        [[nodiscard]]
        std::uint32_t get_monetary_result(std::string_view game_name, std::uint8_t line_count) const;
};
