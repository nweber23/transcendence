#include "../includes/machines.hpp"

#include <algorithm>
#include <fstream>
#include <random>
#include <sstream>

namespace fs = std::filesystem;

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

    double payline_total = 0;
    auto count = std::min<std::uint8_t>(line_count, config.max_lines);
    for (std::uint8_t li = 0; li < count; ++li) {
        const auto& payline = config.paylines[li];

        std::vector<std::string> syms;
        for (auto& pt : payline) {
            auto col = pt[0];
            auto row = pt[1];
            syms.push_back(grid[row][col]);
        }

        std::string base = config.wild_symbol;
        for (auto& s : syms) {
            if (s != config.scatter_symbol && s != config.wild_symbol) {
                base = s;
                break;
            }
        }

        std::uint8_t match = 0;
        for (auto& s : syms) {
            if (s == config.scatter_symbol) {
                break;
            }
            if (s == base || s == config.wild_symbol) {
                ++match;
            } else {
                break;
            }
        }

        auto pt_it = config.paytable.find(base);
        if (pt_it == config.paytable.end()) continue;

        double line_payout = 0;
        for (std::uint8_t c = match; c >= 1; --c) {
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

    double scatter_win = 0;
    if (scatter_count > 0) {
        auto sc_it = config.scatter_paytable.find(scatter_count);
        if (sc_it != config.scatter_paytable.end()) {
            scatter_win = sc_it->second;
        }
    }

    bool bonus_triggered = (scatter_count >= config.bonus_trigger_count && config.bonus_trigger_count > 0);

    return {payline_total, scatter_win, scatter_count, bonus_triggered};
}

std::string Machine::play_full_iteration(std::string_view game_name,
                                         std::uint8_t line_count,
                                         std::uint32_t bet_per_line)
{
    CompleteGameCycle cycle{};
    cycle.game_name = game_name;
    cycle.total_initial_bet = bet_per_line * line_count;

    FreeSpinState fs_state;
    std::uint32_t cur_step_idx = 1;

    SpinResult base = get_monetary_result(game_name, line_count, bet_per_line, fs_state, false);
    cycle.bonus_triggered = base.bonus_triggered;
    cycle.total_overall_win = base.win_amount;
    cycle.timeline.push_back({
        cur_step_idx++,
        base.is_free_spin,
        base.free_spins_remaining,
        base.current_multiplier,
        base.stops,
        base.win_amount,
        base.total_free_win
    });
    if (!base.bonus_triggered) {
        std::string json_out;
        (void)glz::write_json(cycle, json_out);
        return json_out;
    }
    std::uint32_t accumulated_win = base.win_amount;
    while (fs_state.free_spins_remaining > 0) {
        SpinResult fs_res = get_monetary_result(game_name, line_count, bet_per_line, fs_state, true);

        accumulated_win += fs_res.win_amount;

        cycle.timeline.push_back({
            cur_step_idx++,
            fs_res.is_free_spin,
            fs_res.free_spins_remaining,
            fs_res.current_multiplier,
            fs_res.stops,
            fs_res.win_amount,
            fs_res.total_free_win
        });
    }
    cycle.total_overall_win = accumulated_win;
    std::string json_out;
    (void)glz::write_json(cycle, json_out);
    return json_out;
}

std::string Machine::run_slot(std::string_view game_name,
                              std::uint8_t line_count,
                              std::uint32_t bet_per_line) {
    if (!game_exists(game_name)) {
        return {};
    }
    return play_full_iteration(game_name, line_count, bet_per_line);
}

Machine::Machine()
    : rng_(std::random_device{}())
{
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

Machine::Machine(std::uint64_t seed)
    : rng_(seed)
{
    fs::path config_dir = config_directory();
    if (!fs::is_directory(config_dir)) {
        return;
    }

    std::size_t count = 0;
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
                                        std::uint32_t bet_per_line,
                                        FreeSpinState& fs_state,
                                        bool is_free_spin)
{
    auto cfg_it = configs.find(std::string(game_name));
    if (cfg_it == configs.end()) {
        return {};
    }

    const auto& cfg = cfg_it->second;

    if (!is_free_spin) {
        fs_state.reset();
        if (line_count == 0 || bet_per_line == 0) {
            return {};
        }
    }

    std::vector<std::uint8_t> stops(cfg.cols);
    for (std::uint8_t c = 0; c < cfg.cols; ++c) {
        std::uniform_int_distribution<std::uint8_t> dist(0, static_cast<std::uint8_t>(cfg.reels[c].size() - 1));
        stops[c] = dist(rng_);
    }

    auto eval = evaluate_spin(cfg, stops, line_count);
    double total = eval.payline_win * bet_per_line + eval.scatter_win * line_count * bet_per_line;

    if (is_free_spin) {
        total *= fs_state.current_multiplier;
    }

    if (cfg.max_win_multiplier > 0) {
        double max_win = static_cast<double>(cfg.max_win_multiplier) * line_count * bet_per_line;
        if (total > max_win) {
            total = max_win;
        }
    }

    auto total_win = static_cast<std::uint32_t>(total);

    if (is_free_spin) {
        if (fs_state.free_spins_remaining > 0) {
            --fs_state.free_spins_remaining;
        }
        fs_state.total_free_win += total_win;
    } else {
        if (eval.bonus_triggered && cfg.free_spin_count > 0) {
            fs_state.free_spins_remaining = cfg.free_spin_count;
            fs_state.current_multiplier = cfg.free_spin_multiplier;
            fs_state.total_free_win = 0;
        }
    }

    return {std::move(stops), total_win, eval.bonus_triggered, eval.scatter_count,
            is_free_spin, fs_state.free_spins_remaining, fs_state.current_multiplier, fs_state.total_free_win};
}

bool Machine::game_exists(std::string_view game_name) {
    return configs.find(std::string(game_name)) != configs.end();
}

