#pragma once

#include <atomic>
#include <cstdint>
#include <thread>

class Machine {
    private:
        std::atomic<std::uint64_t> idx;
        std::jthread counter_thread;
    public:
        Machine();
        ~Machine();
};
