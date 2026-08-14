#pragma once

#include <array>
#include <cstdint>
#include <optional>
#include "../../shared/includes/card.hpp"

namespace texas {

// --------------------------------------------------
// Player
// --------------------------------------------------

/**
 * A single Texas Hold'em player's seat state.
 *
 * Tracks the two hole cards, stack, current bet, and fold/all-in flags for
 * the active hand.
 */
class Player {
private:
    std::array<std::optional<card::Card>, 2> _holeCards;
    std::int64_t _stack;
    std::int64_t _currentBet = 0;
    bool _folded = false;
    bool _allIn = false;

public:
    /**
     * Constructs a player with the given starting stack.
     *
     * @param stack The player's chip stack.
     */
    explicit Player(std::int64_t stack);

    /**
     * Stores a hole card at the given index.
     *
     * @param c The card to store.
     * @param idx Hole card slot (0 or 1).
     * @throws std::out_of_range if idx is not a valid slot.
     */
    void receive_card(card::Card c, std::size_t idx);

    /**
     * Wagers amount from the stack, committing it to the current bet.
     *
     * If the amount covers the whole stack the player is marked all-in.
     *
     * @param amount The bet amount.
     * @throws std::invalid_argument if amount is not positive.
     * @throws std::logic_error if the player is already all-in.
     */
    void place_bet(std::int64_t amount);

    /**
     * Adds winnings to the player's stack.
     *
     * @param amount The amount won.
     * @throws std::invalid_argument if amount is negative.
     */
    void add_winnings(std::int64_t amount);

    /**
     * Marks the player as folded.
     */
    void fold();

    /**
     * Clears all hand-only state (hole cards, current bet, fold/all-in
     * flags) while leaving the stack untouched.
     */
    void reset_hand();

    /**
     * Returns the two hole cards.
     *
     * @return A two-element array; each slot is nullopt until filled.
     */
    [[nodiscard]] const std::array<std::optional<card::Card>, 2>& hole_cards() const noexcept;

    /**
     * Returns the player's current stack.
     *
     * @return The stack.
     */
    [[nodiscard]] std::int64_t stack() const noexcept;

    /**
     * Returns the player's committed bet in the current hand.
     *
     * @return The current bet.
     */
    [[nodiscard]] std::int64_t current_bet() const noexcept;

    /**
     * Returns whether the player has folded.
     *
     * @return true if folded, false otherwise.
     */
    [[nodiscard]] bool is_folded() const noexcept;

    /**
     * Returns whether the player is all-in.
     *
     * @return true if all-in, false otherwise.
     */
    [[nodiscard]] bool is_all_in() const noexcept;
};

} // namespace texas
