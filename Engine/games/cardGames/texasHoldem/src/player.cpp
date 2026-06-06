#include "../includes/player.hpp"

#include <stdexcept>

namespace texas {

Player::Player(std::int64_t stack)
    : _stack(stack) {}

void Player::receive_card(card::Card c, std::size_t idx) {
    if (idx >= _holeCards.size()) {
        throw std::out_of_range("hole card index out of range");
    }
    _holeCards[idx] = std::move(c);
}

void Player::place_bet(std::int64_t amount) {
    if (amount <= 0) {
        throw std::invalid_argument("bet amount must be positive");
    }
    if (_allIn) {
        throw std::logic_error("player is already all-in");
    }
    if (amount >= _stack) {
        _currentBet += _stack;
        _stack = 0;
        _allIn = true;
    } else {
        _stack -= amount;
        _currentBet += amount;
    }
}

void Player::fold() {
    _folded = true;
}

void Player::reset_hand() {
    _holeCards = {};
    _currentBet = 0;
    _folded = false;
    _allIn = false;
}

const std::array<std::optional<card::Card>, 2>& Player::hole_cards() const noexcept {
    return _holeCards;
}

std::int64_t Player::stack() const noexcept {
    return _stack;
}

std::int64_t Player::current_bet() const noexcept {
    return _currentBet;
}

bool Player::is_folded() const noexcept {
    return _folded;
}

bool Player::is_all_in() const noexcept {
    return _allIn;
}

} // namespace texas
