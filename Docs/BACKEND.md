# Transcendence Casino Backend - Implementation Skeleton

**Status:** Working skeleton with all core infrastructure in place  
**Date Created:** 2026-05-10  
**Language:** Go 1.26  
**Framework:** Gin Web Framework  
**Database:** PostgreSQL 18  
**Real-time:** WebSockets (Gorilla)  

---

## Project Overview

A REST API + WebSocket backend for the Transcendence Casino multiplayer gaming platform. Handles user authentication, game management, account operations, and real-time game updates.

**Three-tier architecture:**
- **Go/Gin REST API** (:8080) - HTTP endpoints, JWT auth, WebSocket upgrades
- **PostgreSQL 18** (:5432) - Persistent storage with ACID guarantees
- **C++ Game Engine** (:9090) - External service for game logic (placeholder integration)

---

## Project Structure

```
Backend/
├── main.go                      # Server setup, route registration
├── config/
│   ├── config.go               # Environment variables, Config struct
│   └── database.go             # PostgreSQL connection, auto-migrations
├── models/
│   ├── user.go                 # User struct with auth fields + AvatarURL
│   ├── account.go              # Account balance, transaction tracking
│   ├── transaction.go          # Immutable audit log
│   ├── game.go                 # Game, BlackjackGame, PokerGame, SlotsGame
│   └── friendship.go           # Multi-ID friendship with absolute status
├── handlers/
│   ├── auth.go                 # POST /auth/register, /login, /logout
│   ├── games.go                # GET/POST /games, POST /games/:id/action
│   ├── user.go                 # GET /user/profile, /account, deposits, withdrawals
│   └── ws.go                   # WebSocket upgrade
├── services/
│   ├── user_service.go         # User CRUD, authentication
│   ├── account_service.go      # Balance ops, transaction creation
│   ├── game_service.go         # Game creation, action execution
│   ├── engine_client.go        # gRPC stub (placeholder for C++ engine)
│   ├── friend_service.go       # Friend System
│   └── services_test.go        # Service Integration tests
├── middleware/
│   ├── auth.go                 # JWT validation middleware
│   └── cors.go                 # CORS headers
├── utils/
│   ├── jwt.go                  # Token generation/validation
│   ├── password.go             # Bcrypt hashing/verification
│   ├── email.go                # Email format + DNS validation
│   ├── response.go             # Standardized JSON responses
│   ├── other.go                # Everything else
│   └── utils_test.go           # Utils Unit tests
├── ws/
│   ├── helpers.go              # Websocket system interface
│   ├── main.go                 # Main and Stop, packet handling and cleanup
│   ├── pumps.go                # Read and write websocket pumps
│   └── types.go                # All relevant datatypes and their wrapper methods, most of which are mutex protected
├── Dockerfile                  # Multi-stage Go build
├── go.mod / go.sum             # Dependencies
└── .env.example                # Configuration template
```

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- `.env` file in root (copy from `.env.example`)

### Running the Backend

```bash
# Start all services (PostgreSQL, Backend, Frontend)
docker compose up --build

# Or use the makefile
make rebuild
```

The backend will:
1. Load environment variables from `.env`
2. Connect to PostgreSQL at `postgres:5432`
3. Auto-migrate all database tables
4. Start listening on port `8080`

---

## API Endpoints

### Authentication (Public)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/register` | Create account, return JWT |
| POST | `/auth/login` | Authenticate, return JWT |
| POST | `/auth/logout` | Invalidate session |

### User (Protected with JWT)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/user/profile` | User profile info |
| GET | `/user/account` | Account balance, stats |
| GET | `/user/account/transactions` | Paginated transaction history |
| POST | `/user/account/deposit` | Add funds |
| POST | `/user/account/withdraw` | Withdraw funds |
| POST | `/user/avatar` | Upload/replace avatar image (multipart form field `file`), serves from `/uploads/<random>.<ext>` |
| POST | `/user/:id/friends` | Add friend, both parties must run this endpoint |
| DELETE | `/user/:id/friends` | Remove friend
| GET | `/user/friends?limit=<NUMBER>&statuses=<RELATIVE_STATUS{,RELATIVE_STATUS}>` | Enumerate up to "limit" friends with "statuses" as a filter |
| GET | `/user/search?q=<QUERY>&limit=<NUMBER>` | Search users by username prefix (case-insensitive), default limit 10, max 50 |

### Games (Protected with JWT)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/games` | List user's game history (paginated) |
| POST | `/games` | Start new game session |
| GET | `/games/:id` | Get specific game details |
| POST | `/games/:id/action` | Execute game action (hit, stand, etc.) |

### WebSocket (Real-time)
| Endpoint | Purpose |
|----------|---------|
| GET `/ws?token=<JWT>&topics=<TOPIC{,TOPIC}>` | Create a websocket that subscribes to the specified topics |

**Events broadcast to connected clients:**
- `player_joined` - New player connected
- `player_left` - Player disconnected
- `game_state_update` - Game state changed
- Custom game-specific updates

---

## Authentication & Security

**JWT Flow:**
1. Client calls `POST /auth/register` or `POST /auth/login`
2. Server returns `{ "token": "...", "user_id": 123 }`
3. Client stores token locally
4. Client includes token in requests: `Authorization: Bearer <token>`
5. Middleware validates token before route handler executes

**Password Security:**
- Bcrypt with cost factor 12 (auto salt generation)
- Never stored plaintext
- Verified on login via `bcrypt.CompareHashAndPassword`

**WebSocket Security:**
- JWT passed in query string: `ws://localhost:8080/ws?token=<JWT>&topics=<TOPIC{,TOPIC}>`
- Token is moved from query string to header then validated as per usual

---

## Database

**Automatic Schema Migration:**
- Runs on startup via GORM `AutoMigrate()`
- Creates tables: `users`, `accounts`, `transactions`, `games`, `blackjack_games`, `poker_games`, `slots_games`, `game_statistics`, `friendships`
- Foreign key constraints with CASCADE delete

**Key Data Types:**
- **Amounts:** `decimal.Decimal` (numeric(19,2)) for precision financial operations
- **Game Data:** `[]byte` JSONB for flexible game-specific data
- **Soft Deletes:** `deleted_at` field for compliance

**Transaction Safety:**
- All financial operations wrapped in `db.Transaction()`
- Row-level UPDATE locks on account balance changes
- Account balance checked before bet placement

---

## Real-time WebSocket Architecture

**Topic-based client registry (`ws` package, in-memory):**
```
WebSocketState (global)
├── clients (by UserID)
│   ├── UserID: 10
│   │   ├── contextList     (one connectionContext per open tab/connection)
│   │   └── topicLists[]    (per-topic fan-out lists of connectionContexts)
│   └── UserID: 20
│       └── ...
└── readChannel             (inbound packets from all connections, drained by Main())
```

A user can have multiple simultaneous connections (e.g. multiple tabs); each subscribes to a subset of `topics` (`generic`, `game`, `chat`) passed as a query param. Messages are addressed to a topic via `SendToTopic`/`SendToAll` and fanned out to every connection subscribed to that topic for the target user(s).

**Connection Flow:**
1. Client connects to `/ws?token=JWT&topics=generic,game`
2. `AuthFix` middleware copies `token` query param into the `Authorization` header, then standard `AuthMiddleware` validates it
3. `WebSocketHandler.UpgradeConnection` upgrades the connection and calls `WebSocketState.AddConnection`
4. `AddConnection` registers the connection under the user's `client`, subscribes it to the requested topics, and starts `pumpFromConnection`/`pumpToConnection` goroutines
5. On first connection for a user, an `online` packet (topic `generic`) is broadcast to all clients; on last disconnection, a debounced `timeoutClient` goroutine broadcasts `offline` after a grace period (handles tab refreshes without flapping)

**Error Handling:**
- Read errors close the connection and trigger `cleanupConnection`, which removes the context from the user's `client` and topic lists
- Buffer overflow protection (non-blocking channel sends drop messages if a connection's buffer is full)
- Online/offline notifications are debounced via `timeoutClient` to avoid flapping on reconnects

---

## Services Layer

**UserService**
- `RegisterUser(username, email, password)` - Create account + account record
- `LoginUser(username, password)` - Authenticate, verify password
- `GetUserByID(userID)` - Fetch user (excludes soft-deleted)

**AccountService**
- `GetAccount(userID)` - Fetch account with balance
- `Deposit(userID, amount)` - Add funds atomically
- `Withdraw(userID, amount)` - Remove funds, check balance
- `GetTransactionHistory(userID, limit, offset)` - Paginated list

**GameService**
- `CreateGame(userID, gameType, betAmount)` - Create game, deduct bet
- `ExecuteAction(userID, gameID, action)` - Execute action, update result
- `GetGameByID(userID, gameID)` - Fetch game (ownership verified)
- `GetUserGames(userID, limit, offset)` - Paginated game history

**EngineClient** (Placeholder)
- `ExecuteBlackjackAction(...)` - Call C++ engine (stub)
- `ExecutePokerAction(...)` - Call C++ engine (stub)
- `ExecuteSlotsAction(...)` - Call C++ engine (stub)
- `Health(ctx)` - Health check

**FriendService**
- `AddFriend(userID, friendID)` - Advances the friend status between two users (ID order matters)
- `RemoveFriend(firstID, secondID)` - Removes a friendships between two users (ID order does not matter)
- `EnumerateFriends(userID, statuses, limit)` - Enumerate friends with a filter and a limit, applied in that order
- `AreFriends(firstID, secondID)` - Checks whether two users are friends (ID order does not matter)

---

## What's Implemented ✅

- ✅ User authentication (register, login, logout)
- ✅ JWT token generation & validation
- ✅ Bcrypt password hashing with salt
- ✅ Account balance management (deposit, withdraw)
- ✅ Transaction audit log (immutable records)
- ✅ Game creation with bet validation
- ✅ Game action execution (placeholder engine response)
- ✅ Game history retrieval with pagination
- ✅ Topic-based WebSocket real-time updates (generic/game/chat) with online/offline presence
- ✅ Friend system (add/remove/enumerate with pending states, online status)
- ✅ Avatar upload (multipart upload, served from `/uploads`)
- ✅ Username search
- ✅ CORS middleware
- ✅ PostgreSQL auto-migrations
- ✅ Email validation (regex + DNS MX check)
- ✅ Row-level database locking for concurrency safety
- ✅ Docker containerization
- ✅ Graceful error handling

---

## What's Placeholder 🚧

- 🚧 **Game Engine Integration** - `engine_client.go` returns hardcoded responses
  - Need: `.proto` files from C++ team
  - TODO: Implement actual gRPC calls

---

## Next Steps

1. **Integrate C++ Engine:**
   - Obtain `.proto` files from game engine team
   - Generate gRPC stubs via `protoc`
   - Replace placeholder responses in `engine_client.go`

2. **Testing:**
   - Integration tests for API endpoints
   - WebSocket connection/broadcast tests

3. **Monitoring:**
   - Add structured logging (zap/logrus)
   - Metrics collection (Prometheus)
   - Error tracking (Sentry)

4. **Production:**
   - Move secrets to vault
   - Add request rate limiting
   - Implement graceful shutdown
   - Add health check endpoint

---

## Configuration (.env)

```env
# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=casino_user
DATABASE_PASSWORD=secure_password
DATABASE_NAME=transcendence_casino

# JWT
JWT_SECRET=your_secret_key_change_in_production
JWT_EXPIRATION=86400  # 24 hours in seconds

# Game Engine
ENGINE_HOST=engine
ENGINE_PORT=9090

# Gin Mode
GIN_MODE=debug  # or 'release' for production
```

---

## Development Commands

```bash
# Run all services
docker compose up

# Rebuild after code changes
docker compose down && docker compose up --build

# View logs
docker compose logs -f backend

# Connect to database
docker exec -it transcendence-postgres psql -U casino_user -d transcendence_casino
```

---

## Dependencies

- `github.com/gin-gonic/gin` - Web framework
- `gorm.io/gorm` - ORM
- `gorm.io/driver/postgres` - PostgreSQL driver
- `github.com/golang-jwt/jwt/v5` - JWT handling
- `golang.org/x/crypto/bcrypt` - Password hashing
- `github.com/gorilla/websocket` - WebSocket support
- `github.com/shopspring/decimal` - Precise decimal arithmetic
- `google.golang.org/grpc` - gRPC client (for future C++ engine)

---

## Architecture Notes

**Why ACID Transactions?**
- Financial operations (bets, payouts) cannot be partial
- All-or-nothing semantics prevent balance corruption
- Rollback on error ensures consistency

**Why Row-Level Locking?**
- Multiple game actions might hit same account simultaneously
- Lock prevents race condition on balance update
- Pessimistic locking (safer than optimistic for financial ops)

**Why Decimal Type?**
- Floats lose precision (0.1 + 0.2 ≠ 0.3)
- Financial amounts require exact representation
- Database type: `numeric(19,2)` for cents precision

**Why WebSocket Hub Pattern?**
- Centralized client registry (in-memory)
- Broadcast to N clients efficiently
- Per-game rooms isolate traffic
- Graceful handling of disconnections

---

## Status Summary

🟢 **Ready for Testing**
- All core infrastructure complete
- Can authenticate users, manage accounts, create games
- Real-time WebSocket working
- Database schema auto-migrates on startup

🟡 **Needs Integration**
- C++ game engine (gRPC client stub ready)

🔴 **Not Yet**
- Production monitoring/observability
- Load testing
- Security audit

---

**Built with care for learning Go development.** Each file is self-contained and demonstrates Go patterns: interfaces, goroutines, error handling, concurrency safety.
