#include "interface.hpp"
#include <iostream>

void Engine::start() {
    std::cout << "Engine started\n";

    while (true) {}
}

bool Engine::slot_exists(std::string name) {
    return slots.game_exists(name);
}

std::string Engine::run_slot(std::string_view game_name,
                             std::uint8_t line_count,
                             std::uint32_t bet_per_line) {
    return slots.run_slot(game_name, line_count, bet_per_line);
}
