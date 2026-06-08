#include "../includes/machines.hpp"

#include <fstream>
#include <random>
#include <sstream>

fs::path Machine::config_directory() {
    if (auto* env = std::getenv("SLOT_CONFIG_DIR")) {
        return env;
    }
    return "games/slotMachine/configs";
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
}

Machine::~Machine() {
    counter_thread.request_stop();
    counter_thread.join();
}

std::uint32_t Machine::get_monetary_result(std::string_view game_name, std::uint8_t line_count) const {
    return 0;
}