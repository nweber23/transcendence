#include "../machines.hpp"

Machine::Machine() {
    std::random_device rd;
    std::mt19937 gen(rd());
    idx = static_cast<uint64_t>(gen());
    if (counter_thread.joinable()) return;
    counter_thread = std::jthread([](std::stop_token st, std::atomic<std::uint64_t>& i) {
        while (!st.stop_requested()) {
            ++i;
        }
    }, std::ref(idx));
}

Machine::~Machine() {
    counter_thread.request_stop();
    counter_thread.join();
}
