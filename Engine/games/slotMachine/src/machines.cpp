#include "../includes/machines.hpp"

Machine::Machine() {
    std::random_device rd;
    std::mt19937 gen(rd());
    idx = static_cast<uint64_t>(gen());
}

Machine::~Machine() {
    counter_thread.request_stop();
    counter_thread.join();
}

std::uint32_t Machine::get_monetary_result(std::string_view game_name, std::uint8_t line_count) const {

    return 0;
}