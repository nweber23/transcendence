#pragma once
#include "games/slotMachine/includes/machines.hpp"
#include <string>

class Engine {
private:
    Machine slots;
public:
    Engine() = default;

    void start();
    bool slot_exists(std::string name);
};
