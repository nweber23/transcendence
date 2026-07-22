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
    auto json = blackjack::serialize_game_state(it->second);
    // A natural blackjack settles immediately on the deal — nothing left to
    // do with this game, so drop it instead of leaking it forever.
    if (it->second.phase() == blackjack::Phase::Settled) {
        blackjack_games.erase(it);
    }
    return json;
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
    auto json = blackjack::serialize_game_state(it->second);
    if (it->second.phase() == blackjack::Phase::Settled) {
        blackjack_games.erase(it);
    }
    return json;
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
    auto json = blackjack::serialize_game_state(it->second);
    blackjack_games.erase(it);
    return json;
}

bool Engine::texas_exists(std::string_view game_id) const {
    return texas_games.contains(std::string(game_id));
}

std::string Engine::create_texas(std::string_view game_id,
                                 std::size_t num_players,
                                 std::int64_t starting_stack) {
    auto key = std::string(game_id);
    if (texas_games.contains(key)) {
        return {};
    }
    auto [it, inserted] = texas_games.emplace(key, texas::Game{num_players, starting_stack});
    return texas::serialize_game_state(it->second);
}

std::string Engine::create_texas(std::string_view game_id,
                                 const std::vector<std::int64_t>& stacks) {
    auto key = std::string(game_id);
    if (texas_games.contains(key)) {
        return {};
    }
    auto [it, inserted] = texas_games.emplace(key, texas::Game{stacks});
    return texas::serialize_game_state(it->second);
}

// A texas game deliberately survives past Showdown (see texas_act) so the
// same table can play many hands in a row — the caller must explicitly
// close it once it's done with that game_id (e.g. the seat composition
// changed, or the table emptied out) or it leaks.
bool Engine::texas_close(std::string_view game_id) {
    return texas_games.erase(std::string(game_id)) > 0;
}

std::string Engine::texas_post_blinds(std::string_view game_id,
                                      std::int64_t small,
                                      std::int64_t big) {
    auto it = texas_games.find(std::string(game_id));
    if (it == texas_games.end()) {
        return {};
    }
    try {
        it->second.post_blinds(small, big);
    } catch (...) {
        return {};
    }
    return texas::serialize_game_state(it->second);
}

std::string Engine::texas_act(std::string_view game_id,
                              std::size_t player_idx,
                              std::string_view action_type,
                              std::int64_t amount) {
    auto it = texas_games.find(std::string(game_id));
    if (it == texas_games.end()) {
        return {};
    }

    texas::ActionType type;
    if (action_type == "fold")
        type = texas::ActionType::Fold;
    else if (action_type == "check")
        type = texas::ActionType::Check;
    else if (action_type == "call")
        type = texas::ActionType::Call;
    else if (action_type == "raise")
        type = texas::ActionType::Raise;
    else if (action_type == "all_in")
        type = texas::ActionType::AllIn;
    else
        return {};

    try {
        it->second.act(player_idx, {type, amount});
    } catch (...) {
        return {};
    }
    // Unlike blackjack, a texas game is expected to keep playing hand after
    // hand past Showdown — post_blinds() resets it for the next one. The
    // caller must call texas_close() explicitly when it's really done with
    // this game_id.
    return texas::serialize_game_state(it->second);
}
