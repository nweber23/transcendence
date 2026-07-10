#pragma once
#include "games/slotMachine/includes/machines.hpp"
#include "games/cardGames/blackJack/includes/engine.hpp"
#include "games/cardGames/texasHoldem/includes/engine.hpp"
#include <cstdint>
#include <string>
#include <unordered_map>

class Engine {
private:
    Machine slots;
    std::unordered_map<std::string, blackjack::Game> blackjack_games;
    std::unordered_map<std::string, texas::Game> texas_games;

public:
    Engine() = default;

    void start();
    bool slot_exists(std::string name);

    [[nodiscard]]
    std::string run_slot(std::string_view game_name,
                         std::uint8_t line_count,
                         std::uint32_t bet_per_line);

    [[nodiscard]]
    bool blackjack_exists(std::string_view game_id) const;

    [[nodiscard]]
    std::string create_blackjack(std::string_view game_id, std::int64_t bet);

    [[nodiscard]]
    std::string blackjack_hit(std::string_view game_id);

    [[nodiscard]]
    std::string blackjack_stand(std::string_view game_id);

    [[nodiscard]]
    bool texas_exists(std::string_view game_id) const;

    [[nodiscard]]
    std::string create_texas(std::string_view game_id,
                             std::size_t num_players,
                             std::int64_t starting_stack);

    [[nodiscard]]
    std::string texas_post_blinds(std::string_view game_id,
                                  std::int64_t small,
                                  std::int64_t big);

    [[nodiscard]]
    std::string texas_act(std::string_view game_id,
                          std::size_t player_idx,
                          std::string_view action_type,
                          std::int64_t amount);
};
