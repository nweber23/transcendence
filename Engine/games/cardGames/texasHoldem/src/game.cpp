#include "../includes/game.hpp"

namespace texas {

Game::Game(std::size_t numPlayers, std::int64_t startingStack, std::size_t numDecks)
    : _deck(numDecks)
    , _phase(Phase::PreFlop)
    , _dealerIdx(0)
    , _currentPlayerIdx(0)
    , _minRaise(0)
    , _lastAction{ActionType::Check, 0}
{
    _players.reserve(numPlayers);
    for (std::size_t i = 0; i < numPlayers; ++i) {
        _players.emplace_back(startingStack);
    }
}

Phase Game::phase() const noexcept {
    return _phase;
}

const std::vector<card::Card>& Game::community_cards() const noexcept {
    return _communityCards;
}

const std::vector<Player>& Game::players() const noexcept {
    return _players;
}

std::size_t Game::dealer() const noexcept {
    return _dealerIdx;
}

std::size_t Game::current_player() const noexcept {
    return _currentPlayerIdx;
}

const std::vector<std::int64_t>& Game::pot() const noexcept {
    return _pot;
}

} // namespace texas
