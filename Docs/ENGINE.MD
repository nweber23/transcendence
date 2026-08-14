# Transcendence Game Engine - Implementation Skeleton

**Status:** Working C++ gRPC service with blackjack, Texas Hold'em and slot machine logic
**Language:** C++23 (gcc-14 in Docker)
**Serialization:** JSON via glaze, gRPC via grpc++/protobuf
**Default Port:** 9090 (`ENGINE_PORT` env var)

---

## Project Overview

The engine is a stateless-of-a-kind gRPC microservice that owns all game rules. The Go
backend calls it over gRPC; each game lives in the engine only for as long as it needs to.
Every reply carries the full game state as JSON so the backend and frontend never re-derive
rules.

**Three-tier architecture:**
- **Go/Gin REST API** (:8080) - HTTP endpoints, JWT auth, WebSocket upgrades
- **PostgreSQL 18** (:5432) - Persistent storage with ACID guarantees
- **C++ Game Engine** (:9090) - External gRPC service for game logic

---

## Project Structure

```
Engine/
├── main.cpp                      # gRPC server: GameEngineServiceImpl, binds ENGINE_PORT
├── interface.hpp / interface.cpp # Engine facade: manages in-memory game instances
├── engine.proto                  # gRPC contract (copied in by Makefile)
├── CMakeLists.txt                # Builds engine binary + generated protobuf sources
├── Dockerfile                    # Multi-stage: gcc-14 build, slim runtime
├── tests/                        # Catch2 v3 unit tests (one per component)
└── games/
    ├── cardGames/
    │   ├── shared/               # card.hpp/cpp, deck.hpp/cpp (shared card model)
    │   ├── blackJack/            # Blackjack game logic + serialization
    │   └── texasHoldem/          # Texas Hold'em game logic + serialization
    └── slotMachine/              # Slot machine engine, config-driven
        ├── configs/              # JSON slot configs (e.g. lucky-sevens)
        ├── includes/machines.hpp
        └── src/machines.cpp
```

---

## Building & Running

### Prerequisites
- CMake >= 3.14, a C++23 compiler, gRPC + protobuf dev packages, `protoc` and
  `grpc_cpp_plugin` on `PATH`.
- The build fetches `glaze` (JSON) and Catch2 (tests) via `FetchContent`.

### Build

```bash
mkdir -p build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
cmake --build . -- -j$(nproc)
```

### Run

```bash
ENGINE_PORT=9090 ./build/engine
```

### Docker

```bash
docker compose up --build engine   # or the full stack: docker compose up --build
```

The Dockerfile copies the slot configs into `/app/games/slotMachine/configs` because
`Machine::config_directory()` resolves them relative to the working directory at runtime.

---

## gRPC Interface

Defined in [`engine.proto`](../engine.proto), package `engine`, service `GameEngine`:

| RPC | Request | Purpose |
|-----|---------|---------|
| `BlackjackAction` | `BlackjackRequest` | Create / hit / stand |
| `TexasAction` | `TexasRequest` | Create / close / post blinds / act |
| `SlotsAction` | `SlotsRequest` | Spin once |

**Common response (`GameResponse`):**
- `success` - `false` if the action was invalid, the game didn't exist, or the rules rejected it
- `game_state_json` - full serialized state after the action (empty on failure)

`BlackjackRequest`: `game_id` (uint64), `player_id`, `action` (`"create"` / `"hit"` / `"stand"`), `bet` (int64).

`TexasRequest`: `game_id`, `player_id`, `action`, `amount`, `num_players`, `small_blind`,
`big_blind`, `stacks` (repeated int64). When `stacks` is non-empty, `"create"` uses the
per-player stacks instead of `num_players`/`amount`, so a table can be recreated with each
surviving player's actual stack across hands.

`SlotsRequest`: `game_id`, `player_id`, `config_name` (e.g. `"lucky-sevens"`), `line_count`,
`bet_per_line`.

---

## Engine Facade

`Engine` (interface.hpp/interface.cpp) is a thin, exception-guarded wrapper around in-memory
game maps:

- `blackjack_games` - `unordered_map<string, blackjack::Game>`, keyed by game_id
- `texas_games` - `unordered_map<string, texas::Game>`, keyed by game_id
- `Machine slots` - slot machine (stateless per spin)

All `try/catch` blocks convert rule exceptions into an empty JSON string + `success=false`.

### Blackjack lifecycle
- `create_blackjack(id, bet)` - deals a hand; a natural blackjack settles immediately and the
  game is dropped right away (no leak).
- `hit` / `stand` - after the hand reaches `Settled`, the game is erased automatically.
- `blackjack_exists(id)` - used by callers before creating (avoids overwriting a live game).

### Texas Hold'em lifecycle
- `create_texas(id, num_players, stack)` or `create_texas(id, stacks)` - seats players.
- `post_blinds(small, big)` - posts blinds and deals; when the previous hand reached Showdown
  this also starts a new hand (`start_new_hand`) while keeping stacks.
- `act(id, player_idx, action, amount)` - fold / check / call / raise / all_in.
- **Unlike blackjack, a Texas game deliberately survives Showdown** so the same table plays
  hand after hand. The caller must call `texas_close(id)` explicitly when done (seat
  composition changed or table emptied) or the game leaks. `texas_close` returns `false` if
  the id wasn't found.

---

## Games

### Blackjack
- 6-deck shoe, dealer stands on 17, blackjack pays 3:2, split/double not implemented.
- Phases: `betting`, `player_turn`, `dealer_turn`, `settled`.
- Outcomes: `player_blackjack`, `player_win`, `dealer_win`, `push`.

**Serialized state:**
```json
{
  "bet": 100,
  "phase": "player_turn",
  "outcome": "",
  "player_value": 12,
  "dealer_value": 7,
  "player_cards": ["A♠", "2♦"],
  "dealer_cards": ["9♥", ""]
}
```
`dealer_cards` hides the hole card as `""` until the dealer turn.

### Texas Hold'em
- No-limit, side pots, best-5-of-7 hand evaluation.
- Hand ranks: HighCard → RoyalFlush.
- Phases: `preflop`, `flop`, `turn`, `river`, `showdown`.
- Actions: `fold`, `check`, `call`, `raise`, `all_in`.

**Serialized state:**
```json
{
  "phase": "preflop",
  "dealer": 0,
  "current_player": 2,
  "community_cards": [],
  "pot": [15, 20],
  "players": [
    { "stack": 990, "current_bet": 5, "folded": false, "all_in": false, "hole_cards": ["A♠", "K♦"] }
  ],
  "min_raise": 10,
  "last_action_type": "call",
  "last_action_amount": 5
}
```
- `pot` is a list of side pots (one entry per showdown layer).
- `hole_cards` may contain empty strings for unknown/folded cards.
- Reaching Showdown **does not** auto-clean the game (see lifecycle above).

### Slot Machine
- Config-driven: `SlotConfig` JSON files define reels, symbols, paylines, paytable, wilds,
  scatter and free spins. Ships with `lucky-sevens` (3x3, 10 paylines).
- `run_slot(config_name, line_count, bet_per_line)` returns one complete game cycle: the base
  spin plus any free-spin timeline, per `CompleteGameCycle`:
```json
{
  "game_name": "lucky-sevens",
  "total_initial_bet": 10,
  "total_overall_win": 25,
  "bonus_triggered": true,
  "timeline": [
    { "step": 0, "is_free_spin": false, "free_spins_remaining": 15,
      "multiplier": 1, "stops": [0, 7, 3], "step_win": 5,
      "accumulated_free_win": 0, "grid": [["7", "CLUB", "7"]] }
  ]
}
```

---

## Card & Deck Model

- Cards serialize as `<rank><suit>`: `2-10`, `J`, `Q`, `K`, `A` + `♣`, `♦`, `♥`, `♠`
  (e.g. `"A♠"`, `"10♥"`).
- `deck::Deck` provides shuffling/dealing; both card games use it.

---

## Tests

Catch2 v3 tests, built by `tests/CMakeLists.txt`, registered with CTest:

| Binary | Covers |
|--------|--------|
| `card_test` | Card rank/suit serialization |
| `deck_test` | Deck construction, shuffle, deal |
| `blackjack_test` | Deal, hit/stand rules, outcomes, serialization |
| `texasHoldem_test` | Betting rounds, blinds, actions, hand eval, serialization |
| `slotmachine_test` | Spin eval, paylines, free spins, config loading |
| `engine_test` | Engine facade: game tracking, lifecycle, slot ops |

Run with:

```bash
cd build && ctest --output-on-failure
```

---

## Configuration

- **Port:** `ENGINE_PORT` env var, defaults to `777` in `main.cpp` (Docker exposes 9090 and
  compose sets `ENGINE_PORT`).
- Backend connects via `ENGINE_HOST` / `ENGINE_PORT` (see [BACKEND.md](./BACKEND.md)).
