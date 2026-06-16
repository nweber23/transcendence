#include "../includes/game.hpp"

#include <algorithm>
#include <utility>

namespace texas {
namespace {

[[nodiscard]] std::uint64_t score_5(const std::array<card::Card, 5>& cards) {
    std::array<card::Card, 5> s = cards;
    std::sort(s.begin(), s.end(), [](const card::Card& a, const card::Card& b) {
        return static_cast<int>(a.rank()) > static_cast<int>(b.rank());
    });

    int r[5];
    bool same_suit = true;
    for (int i = 0; i < 5; ++i) {
        r[i] = static_cast<int>(s[i].rank());
        if (i > 0 && s[i].suit() != s[0].suit())
            same_suit = false;
    }

    bool is_straight = false;
    int straight_high = r[0];
    if (r[0] - r[1] == 1 && r[1] - r[2] == 1 && r[2] - r[3] == 1 && r[3] - r[4] == 1) {
        is_straight = true;
    } else if (r[0] == 14 && r[1] == 5 && r[2] == 4 && r[3] == 3 && r[4] == 2) {
        is_straight = true;
        straight_high = 5;
    }

    int counts[15] = {};
    for (int i = 0; i < 5; ++i)
        counts[r[i]]++;

    std::pair<int, int> groups[5];
    int ng = 0;
    for (int i = 14; i >= 2; --i)
        if (counts[i] > 0)
            groups[ng++] = {counts[i], i};
    std::sort(groups, groups + ng, [](const auto& a, const auto& b) {
        if (a.first != b.first) return a.first > b.first;
        return a.second > b.second;
    });

    constexpr auto shift = [](HandRank hr) -> std::uint64_t {
        return static_cast<std::uint64_t>(hr) << 60;
    };

    if (is_straight && same_suit)
        return shift(HandRank::StraightFlush) | (static_cast<std::uint64_t>(straight_high) << 56);

    if (groups[0].first == 4)
        return shift(HandRank::FourOfAKind)
             | (static_cast<std::uint64_t>(groups[0].second) << 56)
             | (static_cast<std::uint64_t>(groups[1].second) << 52);

    if (groups[0].first == 3 && groups[1].first == 2)
        return shift(HandRank::FullHouse)
             | (static_cast<std::uint64_t>(groups[0].second) << 56)
             | (static_cast<std::uint64_t>(groups[1].second) << 52);

    if (same_suit)
        return shift(HandRank::Flush)
             | (static_cast<std::uint64_t>(r[0]) << 56)
             | (static_cast<std::uint64_t>(r[1]) << 52)
             | (static_cast<std::uint64_t>(r[2]) << 48)
             | (static_cast<std::uint64_t>(r[3]) << 44)
             | (static_cast<std::uint64_t>(r[4]) << 40);

    if (is_straight)
        return shift(HandRank::Straight) | (static_cast<std::uint64_t>(straight_high) << 56);

    if (groups[0].first == 3)
        return shift(HandRank::ThreeOfAKind)
             | (static_cast<std::uint64_t>(groups[0].second) << 56)
             | (static_cast<std::uint64_t>(groups[1].second) << 52)
             | (static_cast<std::uint64_t>(groups[2].second) << 48);

    if (groups[0].first == 2 && groups[1].first == 2)
        return shift(HandRank::TwoPair)
             | (static_cast<std::uint64_t>(groups[0].second) << 56)
             | (static_cast<std::uint64_t>(groups[1].second) << 52)
             | (static_cast<std::uint64_t>(groups[2].second) << 48);

    if (groups[0].first == 2)
        return shift(HandRank::Pair)
             | (static_cast<std::uint64_t>(groups[0].second) << 56)
             | (static_cast<std::uint64_t>(groups[1].second) << 52)
             | (static_cast<std::uint64_t>(groups[2].second) << 48)
             | (static_cast<std::uint64_t>(groups[3].second) << 44);

    return shift(HandRank::HighCard)
         | (static_cast<std::uint64_t>(r[0]) << 56)
         | (static_cast<std::uint64_t>(r[1]) << 52)
         | (static_cast<std::uint64_t>(r[2]) << 48)
         | (static_cast<std::uint64_t>(r[3]) << 44)
         | (static_cast<std::uint64_t>(r[4]) << 40);
}

} // anonymous namespace

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

std::int64_t Game::min_raise() const noexcept {
    return _minRaise;
}

Action Game::last_action() const noexcept {
    return _lastAction;
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

EvaluatedHand Game::evaluate(const Player& p) const {
    std::array<card::Card, 7> all;
    const auto& hole = p.hole_cards();
    all[0] = *hole[0];
    all[1] = *hole[1];
    for (std::size_t i = 0; i < 5; ++i)
        all[2 + i] = _communityCards[i];

    std::uint64_t bestScore = 0;
    EvaluatedHand best{};

    for (int a = 0; a < 3; ++a)
        for (int b = a + 1; b < 4; ++b)
            for (int c = b + 1; c < 5; ++c)
                for (int d = c + 1; d < 6; ++d)
                    for (int e = d + 1; e < 7; ++e) {
                        std::array<card::Card, 5> hand{
                            all[a], all[b], all[c], all[d], all[e]
                        };
                        std::uint64_t sc = score_5(hand);
                        if (sc > bestScore) {
                            bestScore = sc;
                            best.rank = static_cast<HandRank>(sc >> 60);
                            best.cards = hand;
                        }
                    }

    return best;
}

void Game::settle_pots() {
    struct Contestant {
        std::size_t idx;
        std::uint64_t score;
    };

    std::vector<Contestant> active;
    for (std::size_t i = 0; i < _players.size(); ++i) {
        if (!_players[i].is_folded()) {
            auto hand = evaluate(_players[i]);
            active.push_back({i, score_5(hand.cards)});
        }
    }

    if (active.empty()) return;

    std::uint64_t bestScore = 0;
    for (auto& c : active)
        if (c.score > bestScore) bestScore = c.score;

    std::int64_t total = 0;
    for (auto& p : _pot) total += p;

    int winnerCount = 0;
    for (auto& c : active)
        if (c.score == bestScore) ++winnerCount;

    std::int64_t share = total / winnerCount;
    for (auto& c : active) {
        if (c.score == bestScore) {
            _players[c.idx].add_winnings(share);
        }
    }

    _pot.clear();
}

} // namespace texas
