#pragma once
#include "games/slotMachine/includes/machines.hpp"
#include <cstdint>
#include <string>

class Engine {
private:
    Machine slots;
public:
    Engine() = default;

    void start();
    bool slot_exists(std::string name);

    [[nodiscard]]
    std::string run_slot(std::string_view game_name,
                         std::uint8_t line_count,
                         std::uint32_t bet_per_line);
};
