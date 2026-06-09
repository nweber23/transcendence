#include "../includes/machines.hpp"

#include <algorithm>
#include <cmath>
#include <fstream>
#include <random>
#include <sstream>
#include <vector>

fs::path Machine::config_directory() {
    if (auto* env = std::getenv("SLOT_CONFIG_DIR")) {
        return env;
    }
    return "games/slotMachine/configs";
}

namespace {

double volatility_power(volatility_t vol) {
    switch (vol) {
        case volatility_t::low:    return 0.5;
        case volatility_t::medium: return 1.0;
        case volatility_t::high:   return 1.5;
    }
    return 1.0;
}

}

std::uint32_t Machine::evaluate_spin(const SlotConfig& config, const std::vector<std::uint8_t>& stops, std::uint8_t line_count)
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

    std::uint32_t total = 0;
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
            if (s != "SYM_WILD") {
                base = s;
                break;
            }
        }

        std::uint8_t match = 0;
        for (auto& s : syms) {
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
        total += line_payout;
    }
    return total;
}

void Machine::build_result_tables() {
    results.resize(game_names.size());

    for (std::size_t gi = 0; gi < game_names.size(); ++gi) {
        const auto& cfg = configs.at(game_names[gi]);

        std::vector<std::vector<std::uint8_t>> outcomes;
        std::vector<std::uint32_t> payouts;

        {
            std::vector<std::uint8_t> cur(cfg.cols, 0);
            auto enumerate = [&](auto&& self, std::size_t col) -> void {
                if (col == cfg.cols) {
                    auto p = Machine::evaluate_spin(cfg, cur, cfg.max_lines);
                    payouts.push_back(p);
                    outcomes.push_back(cur);
                    return;
                }
                for (std::uint8_t pos = 0; pos < cfg.reels[col].size(); ++pos) {
                    cur[col] = pos;
                    self(self, col + 1);
                }
            };
            enumerate(enumerate, 0);
        }
        double target_rtp = cfg.rtp / 100.0;
        double max_bet = static_cast<double>(cfg.max_lines);
        double vol_pow = volatility_power(cfg.volatility);

        std::size_t n_total = outcomes.size();
        std::size_t n_win = 0;
        double sum_weighted_pay = 0;
        double sum_win_weight = 0;

        for (std::size_t i = 0; i < n_total; ++i) {
            if (payouts[i] > 0) {
                ++n_win;
                double w = std::pow(static_cast<double>(payouts[i]), vol_pow);
                sum_win_weight += w;
                sum_weighted_pay += w * static_cast<double>(payouts[i]);
            }
        }
        std::size_t n_lose = n_total - n_win;

        double scale = 1.0;
        if (n_win > 0) {
            double numerator = target_rtp * max_bet * static_cast<double>(n_lose);
            double denominator = sum_weighted_pay - target_rtp * max_bet * sum_win_weight;
            if (denominator > 0) {
                scale = numerator / denominator;
            } else {
                scale = 10.0;
            }
        }

        std::vector<double> weights(n_total);
        double total_weight = 0;
        for (std::size_t i = 0; i < n_total; ++i) {
            if (payouts[i] > 0) {
                double w = std::pow(static_cast<double>(payouts[i]), vol_pow);
                weights[i] = scale * w;
            } else {
                weights[i] = 1.0;
            }
            if (weights[i] < 0) weights[i] = 0;
            total_weight += weights[i];
        }

        std::vector<double> cdf(n_total);
        double tem = 0;
        for (std::size_t i = 0; i < n_total; ++i) {
            tem += weights[i];
            cdf[i] = tem;
        }

        std::mt19937 rng(std::random_device{}());
        std::uniform_real_distribution<double> dist(0.0, total_weight);

        results[gi].reserve(RESULT_TABLE_SIZE);
        for (std::size_t k = 0; k < RESULT_TABLE_SIZE; ++k) {
            double r = dist(rng);
            auto it = std::upper_bound(cdf.begin(), cdf.end(), r);
            auto idx = static_cast<std::size_t>(it - cdf.begin());
            results[gi].push_back(outcomes[idx]);
        }
    }
}

Machine::Machine() {
    std::random_device rd;
    std::mt19937 gen(rd());
    nonce = static_cast<uint64_t>(gen());

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

    build_result_tables();
}

std::uint32_t Machine::get_monetary_result(std::string_view game_name, std::uint8_t line_count, std::uint32_t bet_per_line)
{
    auto cfg_it = configs.find(std::string(game_name));
    if (cfg_it == configs.end()) {
        return 0;
    }

    auto game_idx = static_cast<std::size_t>(
        std::find(game_names.begin(), game_names.end(), game_name) - game_names.begin());

    if (game_idx >= results.size() || results[game_idx].empty()) {
        return 0;
    }

    if (line_count == 0 || bet_per_line == 0) {
        return 0;
    }

    auto idx = nonce % results[game_idx].size();
    const auto& stops = results[game_idx][idx];
    ++nonce;

    auto raw = evaluate_spin(cfg_it->second, stops, line_count);
    return raw * bet_per_line;
}
