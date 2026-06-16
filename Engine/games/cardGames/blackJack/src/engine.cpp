#include "../includes/engine.hpp"

#include <glaze/glaze.hpp>

namespace blackjack {

template <>
struct glz::meta<GameState> {
    using type = GameState;
    static constexpr auto value = object(
        "bet",           &GameState::bet,
        "phase",         &GameState::phase,
        "outcome",       &GameState::outcome,
        "player_value",  &GameState::player_value,
        "dealer_value",  &GameState::dealer_value,
        "player_cards",  &GameState::player_cards,
        "dealer_cards",  &GameState::dealer_cards
    );
};

std::string serialize_game_state(const Game& game) {
    GameState state;
    state.bet = game.bet();
    state.player_value = game.player_hand().value();
    state.dealer_value = game.dealer_hand().value();

    switch (game.phase()) {
        case Phase::Betting:
            state.phase = "betting";
            break;
        case Phase::PlayerTurn:
            state.phase = "player_turn";
            break;
        case Phase::DealerTurn:
            state.phase = "dealer_turn";
            break;
        case Phase::Settled:
            state.phase = "settled";
            break;
    }

    if (game.outcome()) {
        switch (*game.outcome()) {
            case Outcome::PlayerBlackjack:
                state.outcome = "player_blackjack";
                break;
            case Outcome::PlayerWin:
                state.outcome = "player_win";
                break;
            case Outcome::DealerWin:
                state.outcome = "dealer_win";
                break;
            case Outcome::Push:
                state.outcome = "push";
                break;
        }
    }

    for (const auto& c : game.player_hand().cards()) {
        state.player_cards.push_back(c.to_string());
    }
    for (const auto& c : game.dealer_hand().cards()) {
        state.dealer_cards.push_back(c.to_string());
    }

    std::string json_out;
    (void)glz::write_json(state, json_out);
    return json_out;
}

} // namespace blackjack
