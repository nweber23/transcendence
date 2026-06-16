#include "../includes/engine.hpp"

#include <glaze/glaze.hpp>

template <>
struct glz::meta<texas::PlayerState> {
    using type = texas::PlayerState;
    static constexpr auto value = object(
        "stack",        &texas::PlayerState::stack,
        "current_bet",  &texas::PlayerState::current_bet,
        "folded",       &texas::PlayerState::folded,
        "all_in",       &texas::PlayerState::all_in,
        "hole_cards",   &texas::PlayerState::hole_cards
    );
};

template <>
struct glz::meta<texas::GameState> {
    using type = texas::GameState;
    static constexpr auto value = object(
        "phase",            &texas::GameState::phase,
        "dealer",           &texas::GameState::dealer,
        "current_player",   &texas::GameState::current_player,
        "community_cards",  &texas::GameState::community_cards,
        "pot",              &texas::GameState::pot,
        "players",          &texas::GameState::players,
        "min_raise",        &texas::GameState::min_raise,
        "last_action_type", &texas::GameState::last_action_type,
        "last_action_amount", &texas::GameState::last_action_amount
    );
};

namespace texas {

std::string serialize_game_state(const Game& game) {
    GameState state;
    state.dealer = game.dealer();
    state.current_player = game.current_player();
    state.min_raise = game.min_raise();

    switch (game.phase()) {
        case Phase::PreFlop:  state.phase = "preflop"; break;
        case Phase::Flop:     state.phase = "flop"; break;
        case Phase::Turn:     state.phase = "turn"; break;
        case Phase::River:    state.phase = "river"; break;
        case Phase::Showdown: state.phase = "showdown"; break;
    }

    auto act = game.last_action();
    switch (act.type) {
        case ActionType::Fold:  state.last_action_type = "fold"; break;
        case ActionType::Check: state.last_action_type = "check"; break;
        case ActionType::Call:  state.last_action_type = "call"; break;
        case ActionType::Raise: state.last_action_type = "raise"; break;
        case ActionType::AllIn: state.last_action_type = "all_in"; break;
    }
    state.last_action_amount = act.amount;

    for (const auto& c : game.community_cards()) {
        state.community_cards.push_back(c.to_string());
    }

    state.pot = game.pot();

    for (const auto& p : game.players()) {
        PlayerState ps;
        ps.stack = p.stack();
        ps.current_bet = p.current_bet();
        ps.folded = p.is_folded();
        ps.all_in = p.is_all_in();
        for (const auto& opt : p.hole_cards()) {
            if (opt.has_value()) {
                ps.hole_cards.push_back(opt->to_string());
            } else {
                ps.hole_cards.push_back({});
            }
        }
        state.players.push_back(std::move(ps));
    }

    std::string json_out;
    (void)glz::write_json(state, json_out);
    return json_out;
}

} // namespace texas
