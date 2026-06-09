#include "../includes/machines.hpp"

#include <algorithm>
#include <fstream>
#include <sstream>

namespace fs = std::filesystem;

namespace {

thread_local std::mt19937_64 rng(std::random_device{}());

}

fs::path Machine::config_directory() {
    if (auto* env = std::getenv("SLOT_CONFIG_DIR")) {
        return env;
    }
    return "games/slotMachine/configs";
}

SpinEvalResult Machine::evaluate_spin(const SlotConfig& config,
                                      const std::vector<std::uint8_t>& stops,
                                      std::uint8_t line_count)
{
    std::vector<std::vector<std::string>> grid(
        config.rows, std::vector<std::string>(config.cols));

    for (std::uint8_t c = 0; c < config.cols; ++c) {
        auto strip_len = config.reels[c].size();
        for (std::uint8_t r = 0; r < config.rows; ++r) {
            auto idx = (stops[c] + r) % strip_len;
            grid[r][c] = config.reels[c][idx];
        }
    }

    std::uint32_t payline_total = 0;
    auto count = std::min<std::uint8_t>(line_count, config.max_lines);
    for (std::uint8_t li = 0; li < count; ++li) {
        const auto& payline = config.paylines[li];

        std::vector<std::string> syms;
        for (auto& pt : payline) {
            auto col = pt[0];
            auto row = pt[1];
            syms.push_back(grid[row][col]);
        }

        std::string base = "SYM_WILD";
        for (auto& s : syms) {
            if (s != config.scatter_symbol && s != "SYM_WILD") {
                base = s;
                break;
            }
        }

        std::uint8_t match = 0;
        for (auto& s : syms) {
            if (s == config.scatter_symbol) {
                break;
            }
            if (s == base || s == "SYM_WILD") {
                ++match;
            } else {
                break;
            }
        }

        auto pt_it = config.paytable.find(base);
        if (pt_it == config.paytable.end()) continue;

        std::uint32_t line_payout = 0;
        for (std::uint8_t c = match; c >= 2; --c) {
            auto m_it = pt_it->second.find(c);
            if (m_it != pt_it->second.end()) {
                line_payout = m_it->second;
                break;
            }
        }
        payline_total += line_payout;
    }

    std::uint8_t scatter_count = 0;
    if (!config.scatter_symbol.empty()) {
        for (std::uint8_t r = 0; r < config.rows; ++r) {
            for (std::uint8_t c = 0; c < config.cols; ++c) {
                if (grid[r][c] == config.scatter_symbol) {
                    ++scatter_count;
                }
            }
        }
    }

    std::uint32_t scatter_win = 0;
    if (scatter_count > 0) {
        auto sc_it = config.scatter_paytable.find(scatter_count);
        if (sc_it != config.scatter_paytable.end()) {
            scatter_win = sc_it->second;
        }
    }

    bool bonus_triggered = (scatter_count >= config.bonus_trigger_count && config.bonus_trigger_count > 0);

    return {payline_total, scatter_win, scatter_count, bonus_triggered};
}

Machine::Machine() {
    fs::path config_dir = config_directory();
    if (!fs::is_directory(config_dir)) {
        return;
    }

    size_t count = 0;
    for (auto const& entry : fs::directory_iterator(config_dir)) {
        if (entry.path().extension() == ".json") {
            ++count;
        }
    }

    game_names.reserve(count);
    configs.reserve(count);

    for (auto const& entry : fs::directory_iterator(config_dir)) {
        if (entry.path().extension() != ".json") continue;

        std::ifstream file(entry.path());
        std::ostringstream buf;
        buf << file.rdbuf();
        std::string content = buf.str();

        SlotConfig cfg;
        auto err = glz::read_json(cfg, content);
        if (err) {
            continue;
        }

        game_names.push_back(cfg.name);
        configs.emplace(cfg.name, std::move(cfg));
    }
}

SpinResult Machine::get_monetary_result(std::string_view game_name,
                                        std::uint8_t line_count,
                                        std::uint32_t bet_per_line)
{
    auto cfg_it = configs.find(std::string(game_name));
    if (cfg_it == configs.end()) {
        return {};
    }

    if (line_count == 0 || bet_per_line == 0) {
        return {};
    }

    const auto& cfg = cfg_it->second;

    std::vector<std::uint8_t> stops(cfg.cols);
    for (std::uint8_t c = 0; c < cfg.cols; ++c) {
        stops[c] = static_cast<std::uint8_t>(rng() % cfg.reels[c].size());
    }

    auto eval = evaluate_spin(cfg, stops, line_count);
    std::uint32_t total_win = (eval.payline_win + eval.scatter_win) * bet_per_line;

    return {std::move(stops), total_win, eval.bonus_triggered, eval.scatter_count};
}
