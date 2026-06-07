#include "../machines.hpp"

Machine::Machine() {
    std::random_device rd;
    std::mt19937 gen(rd());
    idx = static_cast<uint64_t>(gen());
}