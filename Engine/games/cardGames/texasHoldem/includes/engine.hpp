#pragma once

#include <cstdint>
#include <string>
#include <vector>
#include "game.hpp"

namespace texas {

/**
 * Serializable view of one player's state.
 */
struct PlayerState {
    std::int64_t stack;
    std::int64_t current_bet;
    bool folded;
    bool all_in;
    std::vector<std::string> hole_cards;
};

/**
 * Serializable view of the full game state.
 */
struct GameState {
    std::string phase;
    std::size_t dealer;
    std::size_t current_player;
    std::vector<std::string> community_cards;
    std::vector<std::int64_t> pot;
    std::vector<PlayerState> players;
    std::int64_t min_raise;
    std::string last_action_type;
    std::int64_t last_action_amount;
};

/**
 * Serializes a Texas Hold'em game to JSON.
 *
 * @param game The game to serialize.
 * @return The full game state as a JSON string.
 */
[[nodiscard]] std::string serialize_game_state(const Game& game);

} // namespace texas
