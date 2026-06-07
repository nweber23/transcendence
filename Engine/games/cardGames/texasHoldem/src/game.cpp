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

void Game::deal_hole_cards() {
    for (std::size_t pass = 0; pass < 2; ++pass) {
        for (auto& p : _players) {
            p.receive_card(_deck.pick(), pass);
        }
    }
}

void Game::deal_community(std::size_t count) {
    _deck.pick();
    for (std::size_t i = 0; i < count; ++i) {
        _communityCards.push_back(_deck.pick());
    }
}

void Game::advance_phase() {
    switch (_phase) {
        case Phase::PreFlop:  
            _phase = Phase::Flop;
            break;
        case Phase::Flop:     
            _phase = Phase::Turn;
            break;
        case Phase::Turn:     
            _phase = Phase::River;
            break;

        case Phase::River:    
            _phase = Phase::Showdown;
            break;
        case Phase::Showdown:
            break;
    }
}

void Game::post_blinds(std::int64_t small, std::int64_t big) {
    std::size_t n = _players.size();
    _dealerIdx = (_dealerIdx + 1) % n;
    std::size_t sbIdx = (_dealerIdx + 1) % n;
    std::size_t bbIdx = (_dealerIdx + 2) % n;

    _players[sbIdx].place_bet(small);
    _players[bbIdx].place_bet(big);

    _currentPlayerIdx = (_dealerIdx + 3) % n;
    _minRaise = big;
    _lastAction = {ActionType::Raise, big};
}

void Game::act(std::size_t playerIdx, Action a) {
    auto& p = _players[playerIdx];
    switch (a.type) {
        case ActionType::Fold:
            p.fold();
            break;
        case ActionType::Check:
            break;
        case ActionType::Call: {
            std::int64_t toCall = _lastAction.amount - p.current_bet();
            if (toCall > 0)
                p.place_bet(toCall);
            break;
        }
        case ActionType::Raise: {
            std::int64_t total = a.amount;
            std::int64_t already = p.current_bet();
            std::int64_t inc = total - already;
            if (inc < _minRaise)
                inc = _minRaise;
            p.place_bet(inc);
            _lastAction.amount = already + inc;
            _lastAction.type = ActionType::Raise;
            _minRaise = inc;
            break;
        }
        case ActionType::AllIn:
            p.place_bet(p.stack());
            break;
    }

    std::size_t n = _players.size();
    for (std::size_t i = 0; i < n; ++i) {
        _currentPlayerIdx = (_currentPlayerIdx + 1) % n;
        if (!_players[_currentPlayerIdx].is_folded() && !_players[_currentPlayerIdx].is_all_in())
            return;
    }
}

} // namespace texas
