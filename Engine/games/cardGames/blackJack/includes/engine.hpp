#pragma once

#include <cstdint>
#include <string>
#include <vector>
#include "game.hpp"

namespace blackjack {

struct GameState {
    std::int64_t bet;
    std::string phase;
    std::string outcome;
    std::int8_t player_value;
    std::int8_t dealer_value;
    std::vector<std::string> player_cards;
    std::vector<std::string> dealer_cards;
};

[[nodiscard]] std::string serialize_game_state(const Game& game);

} // namespace blackjack
