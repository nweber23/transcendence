#pragma once

#include <cstdint>
#include <stdexcept>
#include <string>

class rtp_too_high : public std::invalid_argument {
    public:
        explicit rtp_too_high(std::uint8_t rtp)
            : std::invalid_argument("RTP value " + std::to_string(rtp) + " exceeds maximum of 100") {}
};
