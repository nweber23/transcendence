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

bool Engine::blackjack_exists(std::string_view game_id) const {
    return blackjack_games.contains(std::string(game_id));
}

std::string Engine::create_blackjack(std::string_view game_id, std::int64_t bet) {
    auto key = std::string(game_id);
    if (blackjack_games.contains(key)) {
        return {};
    }
    auto [it, inserted] = blackjack_games.emplace(key, blackjack::Game{});
    try {
        it->second.deal(bet);
    } catch (...) {
        blackjack_games.erase(it);
        return {};
    }
    return blackjack::serialize_game_state(it->second);
}

std::string Engine::blackjack_hit(std::string_view game_id) {
    auto it = blackjack_games.find(std::string(game_id));
    if (it == blackjack_games.end()) {
        return {};
    }
    try {
        it->second.hit();
    } catch (...) {
        return {};
    }
    return blackjack::serialize_game_state(it->second);
}

std::string Engine::blackjack_stand(std::string_view game_id) {
    auto it = blackjack_games.find(std::string(game_id));
    if (it == blackjack_games.end()) {
        return {};
    }
    try {
        it->second.stand();
    } catch (...) {
        return {};
    }
    return blackjack::serialize_game_state(it->second);
}
