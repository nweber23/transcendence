#include "../includes/game.hpp"

#include <stdexcept>

namespace blackjack {

Game::Game(std::size_t numDecks)
    : _deck(numDecks)
    , _phase(Phase::Betting)
    , _bet(0)
{
}

void Game::reset() noexcept {
    _phase = Phase::Betting;
    _bet = 0;
    _playerHand.clear();
    _dealerHand.clear();
    _outcome.reset();
}

void Game::deal(std::int64_t bet) {
    if (_phase != Phase::Betting) {
        throw std::logic_error("Cannot deal outside betting phase");
    }

    if (bet <= 0) {
        throw std::invalid_argument("Bet must be positive");
    }

    _bet = bet;
    _playerHand.clear();
    _dealerHand.clear();
    _outcome.reset();

    if (_deck.pick(); true) {} // burn card

    deal_to_player();
    deal_to_dealer();
    deal_to_player();

    if (_playerHand.is_blackjack()) {
        _phase = Phase::Settled;
        resolve_outcome();
    } else {
        _phase = Phase::PlayerTurn;
    }
}

void Game::hit() {
    if (_phase != Phase::PlayerTurn) {
        throw std::logic_error("Cannot hit outside player turn");
    }

    deal_to_player();

    if (_playerHand.is_bust()) {
        _phase = Phase::Settled;
        resolve_outcome();
    }
}

void Game::stand() {
    if (_phase != Phase::PlayerTurn) {
        throw std::logic_error("Cannot stand outside player turn");
    }

    _phase = Phase::DealerTurn;
    dealer_play();
    _phase = Phase::Settled;
    resolve_outcome();
}

void Game::deal_to_player() {
    _playerHand.add_card(_deck.pick());
}

void Game::deal_to_dealer() {
    _dealerHand.add_card(_deck.pick());
}

void Game::dealer_play() {
    while (_dealerHand.value() < 17) {
        deal_to_dealer();
    }
}

void Game::resolve_outcome() {
    if (_playerHand.is_blackjack()) {
        _outcome = Outcome::PlayerBlackjack;
    } else if (_playerHand.is_bust()) {
        _outcome = Outcome::DealerWin;
    } else if (_dealerHand.is_bust()) {
        _outcome = Outcome::PlayerWin;
    } else if (_playerHand.value() > _dealerHand.value()) {
        _outcome = Outcome::PlayerWin;
    } else if (_playerHand.value() < _dealerHand.value()) {
        _outcome = Outcome::DealerWin;
    } else {
        _outcome = Outcome::Push;
    }
}

Phase Game::phase() const noexcept {
    return _phase;
}

const Hand& Game::player_hand() const noexcept {
    return _playerHand;
}

const Hand& Game::dealer_hand() const noexcept {
    return _dealerHand;
}

std::optional<Outcome> Game::outcome() const noexcept {
    return _outcome;
}

std::int64_t Game::bet() const noexcept {
    return _bet;
}

} // namespace blackjack
