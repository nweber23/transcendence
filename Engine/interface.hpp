#pragma once
#include "games/slotMachine/includes/machines.hpp"
#include "games/cardGames/blackJack/includes/engine.hpp"
#include "games/cardGames/texasHoldem/includes/engine.hpp"
#include <cstdint>
#include <string>
#include <unordered_map>
#include <vector>

/**
 * Facade managing all in-memory game instances.
 *
 * A thin, exception-guarded wrapper around in-memory game maps. Every game
 * lives in the engine only for as long as it needs to; rule exceptions are
 * converted into an empty string (or false) instead of escaping to callers.
 */
class Engine {
private:
    Machine slots;
    std::unordered_map<std::string, blackjack::Game> blackjack_games;
    std::unordered_map<std::string, texas::Game> texas_games;

public:
    Engine() = default;

    /**
     * Starts the engine's blocking main loop.
     */
    void start();

    /**
     * Checks whether a slot machine configuration is available.
     *
     * @param name The slot config name (e.g. "lucky-sevens").
     * @return true if the config exists, false otherwise.
     */
    bool slot_exists(std::string name);

    /**
     * Runs one complete slot game cycle (base spin plus any free spins).
     *
     * @param game_name The slot config name (e.g. "lucky-sevens").
     * @param line_count Number of active paylines.
     * @param bet_per_line Bet amount per payline.
     * @return Serialized CompleteGameCycle JSON, or an empty string if the
     *         config is unknown or the spin is rejected by the rules.
     */
    [[nodiscard]]
    std::string run_slot(std::string_view game_name,
                         std::uint8_t line_count,
                         std::uint32_t bet_per_line);

    /**
     * Checks whether a blackjack game is currently tracked.
     *
     * @param game_id The unique game identifier.
     * @return true if a game with this id exists, false otherwise.
     */
    [[nodiscard]]
    bool blackjack_exists(std::string_view game_id) const;

    /**
     * Creates a blackjack game and deals the opening hand.
     *
     * A natural blackjack settles immediately and the game is dropped right
     * away so it does not leak.
     *
     * @param game_id The unique game identifier.
     * @param bet The player's bet for the hand.
     * @return Serialized game state JSON, or an empty string if a game with
     *         this id already exists or the deal was rejected.
     */
    [[nodiscard]]
    std::string create_blackjack(std::string_view game_id, std::int64_t bet);

    /**
     * Draws another card for the player.
     *
     * @param game_id The unique game identifier.
     * @return Serialized game state JSON, or an empty string if the game does
     *         not exist or the hit was rejected by the rules.
     */
    [[nodiscard]]
    std::string blackjack_hit(std::string_view game_id);

    /**
     * Ends the player's turn and resolves the hand.
     *
     * @param game_id The unique game identifier.
     * @return Serialized game state JSON, or an empty string if the game does
     *         not exist or the stand was rejected by the rules.
     */
    [[nodiscard]]
    std::string blackjack_stand(std::string_view game_id);

    /**
     * Checks whether a Texas Hold'em game is currently tracked.
     *
     * @param game_id The unique game identifier.
     * @return true if a game with this id exists, false otherwise.
     */
    [[nodiscard]]
    bool texas_exists(std::string_view game_id) const;

    /**
     * Creates a Texas Hold'em game seating num_players players with an equal
     * starting stack.
     *
     * @param game_id The unique game identifier.
     * @param num_players Number of players to seat.
     * @param starting_stack Stack given to every player.
     * @return Serialized game state JSON, or an empty string if a game with
     *         this id already exists.
     */
    [[nodiscard]]
    std::string create_texas(std::string_view game_id,
                             std::size_t num_players,
                             std::int64_t starting_stack);

    /**
     * Creates a Texas Hold'em game seating players with per-player stacks.
     *
     * Useful to recreate a table across hands with each surviving player's
     * actual stack.
     *
     * @param game_id The unique game identifier.
     * @param stacks Stack for every player, in seat order.
     * @return Serialized game state JSON, or an empty string if a game with
     *         this id already exists.
     */
    [[nodiscard]]
    std::string create_texas(std::string_view game_id,
                             const std::vector<std::int64_t>& stacks);

    /**
     * Discards a Texas Hold'em game.
     *
     * Unlike blackjack, a texas game isn't cleaned up automatically once a
     * hand ends, since it's meant to keep playing more hands.
     *
     * @param game_id The unique game identifier.
     * @return false if the game_id wasn't found, true otherwise.
     */
    bool texas_close(std::string_view game_id);

    /**
     * Posts blinds and deals the hand.
     *
     * When the previous hand reached Showdown this also starts a new hand
     * while keeping stacks.
     *
     * @param game_id The unique game identifier.
     * @param small The small blind amount.
     * @param big The big blind amount.
     * @return Serialized game state JSON, or an empty string if the game does
     *         not exist or the blinds were rejected.
     */
    [[nodiscard]]
    std::string texas_post_blinds(std::string_view game_id,
                                  std::int64_t small,
                                  std::int64_t big);

    /**
     * Performs a poker action for a player.
     *
     * @param game_id The unique game identifier.
     * @param player_idx Seat index of the acting player.
     * @param action_type One of "fold", "check", "call", "raise", "all_in".
     * @param amount Action amount (used by raise; ignored otherwise).
     * @return Serialized game state JSON, or an empty string if the game does
     *         not exist or the action was invalid.
     */
    [[nodiscard]]
    std::string texas_act(std::string_view game_id,
                          std::size_t player_idx,
                          std::string_view action_type,
                          std::int64_t amount);
};