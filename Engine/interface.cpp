#include "interface.hpp"
#include <iostream>

void Engine::start() {
    std::cout << "Engine started\n";

    while (true) {}
}

bool Engine::slot_exists(std::string name) {
    return slots.game_exists(name);
}
