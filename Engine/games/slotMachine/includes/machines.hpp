#pragma once

#include <atomic>
#include <cstdint>
#include <thread>

enum class volatility_t : uint8_t {
    low,
    medium,
    high
};

class Machine {
    private:
        std::atomic<std::uint64_t> idx;
        std::jthread counter_thread;
    public:
        Machine();
        ~Machine();
        [[nodiscard]]
        std::uint32_t get_monetary_result(volatility_t vol, std::uint8_t rtp) const;
};
