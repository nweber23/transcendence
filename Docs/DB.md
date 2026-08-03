# Database Design - PostgreSQL

**Last Updated:** 2026-07-30

> **IMPORTANT:** Any database schema changes, table additions, column modifications, or indexing updates must be reflected in this document. This is the single source of truth for the database structure. Update this file before or alongside any migration.

## Overview

The Transcendence Casino Platform uses PostgreSQL for persistent data storage, accessed exclusively through GORM. The database supports:
- User authentication and account management
- Game sessions and results tracking
- Financial transactions (deposits, withdrawals, bets, winnings)
- Game-specific mechanics (cards, hands, dealer states)
- Friendships
- In-app notifications

There is no separate `Docs/DB.md`-adjacent migrations tooling: **the schema is defined entirely by the GORM model structs in `Backend/models/` and created via `db.AutoMigrate(...)`** in `Backend/config/database.go`. `Backend/migrations/` exists but is empty (only a `.gitkeep`) — it is not currently wired into anything. Treat the model files as the actual source of truth; this document describes what they currently produce.

## Architecture Principles

1. **Application-level transactions**: Financial operations (deposits, withdrawals, bets, payouts) are wrapped in `db.Transaction(...)` in the service layer (`account_service.go`, `game_service.go`), with `SELECT ... FOR UPDATE` row locking on `accounts` to keep concurrent balance updates safe.
2. **Immutability**: `transactions` rows are created once and never updated — each row's `balance_after` captures the resulting balance at that point in time.
3. **Soft Deletes**: Only `users` and `friendships` carry a `deleted_at` column. No other table soft-deletes.
4. **Denormalization**: `accounts.balance`/`total_*` and `game_statistics.*` are cached, derived fields. They are kept in sync by **application code inside the same DB transaction as the triggering write** — there are no Postgres triggers or stored procedures in this schema.
5. **No DB-level constraint enforcement**: None of the GORM models declare `CHECK` constraints or foreign keys (see [Constraints & Data Integrity](#constraints--data-integrity) below). All validation (email format, username length, non-negative balances, enum-like string values, ownership checks, etc.) happens in the Go service layer, not the database.

---

## Core Tables

### 1. `users`
Stores user account information and authentication credentials. Defined in `Backend/models/user.go`.

```go
type User struct {
    ID                  uint       `gorm:"primaryKey"`
    Username            string     `gorm:"uniqueIndex,size:50"`
    Email               string     `gorm:"uniqueIndex,size:255"`
    PasswordHash        string     `gorm:"size:255"`
    AvatarURL           string
    NotificationTypes   string
    NotificationsSeenAt *time.Time
    CreatedAt           time.Time
    UpdatedAt           time.Time
    DeletedAt           *time.Time `gorm:"index"`
}
```

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `username` | `VARCHAR(50)` | unique index |
| `email` | `VARCHAR(255)` | unique index; format validated in `utils.ValidateEmail`, not a DB `CHECK` |
| `password_hash` | `VARCHAR(255)` | bcrypt hash |
| `avatar_url` | `TEXT` | filename served from `/uploads/<avatar_url>`; defaults to the app-level constant `"default_avatar"` (no DB default) |
| `notification_types` | `TEXT` | comma-joined list of opted-in notification types (see [`notifications`](#10-notifications)) |
| `notifications_seen_at` | `TIMESTAMP`, nullable | server-persisted "notifications last opened" marker; see below |
| `created_at` / `updated_at` | `TIMESTAMP` | plain columns, no `DEFAULT CURRENT_TIMESTAMP` at the DB level — set by GORM on write |
| `deleted_at` | `TIMESTAMP`, nullable | indexed; soft delete, checked explicitly (`deleted_at IS NULL`) in queries |

**Design notes:**
- `username`/`email` uniqueness and length/format rules are enforced in `UserService` (`RegisterUser`, `UpdateUser`), not via DB constraints.
- `notifications_seen_at` was added to fix a bug where "read" state for the notification bell was tracked only in browser `localStorage`, so it reset on a new device or after storage was cleared. It's now updated via `PUT /user/notifications/seen` and returned from `GET /user/notifications`, so unread state is consistent across devices/sessions for a given user.
- There is **no `sessions` table**. Auth is stateless JWT (`Backend/utils/jwt.go`) — the server never persists issued tokens, so there's nothing to revoke/expire server-side beyond the token's own `exp` claim.
- There is **no `user_profiles` table**. Profile fields (bio, first/last name, timezone, etc.) do not exist anywhere in the current schema or handlers.

---

### 2. `accounts`
User financial account with cached balance tracking. Defined in `Backend/models/account.go`.

```go
type Account struct {
    ID           uint            `gorm:"primaryKey"`
    UserID       uint            `gorm:"uniqueIndex"`
    Balance      decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
    TotalWagered decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
    TotalWon     decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
    TotalLost    decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
    CreatedAt    time.Time
    UpdatedAt    time.Time
}
```

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `user_id` | `INT` | unique index — no FK constraint to `users.id` at the DB level; the relationship is only implicit |
| `balance` | `NUMERIC(19,2)` | default `0`; non-negativity enforced in `AccountService.Withdraw`, not a `CHECK` |
| `total_wagered` / `total_won` / `total_lost` | `NUMERIC(19,2)` | default `0`; updated alongside game settlement in the same DB transaction |

**Design notes:**
- Row-locked with `SELECT ... FOR UPDATE` during `Deposit`/`Withdraw`/bet settlement to prevent lost updates under concurrent requests.
- One account per user is enforced only by the unique index on `user_id`, not a formal 1:1 FK relationship.

---

### 3. `transactions`
Append-only financial transaction log. Defined in `Backend/models/transaction.go`.

```go
type Transaction struct {
    ID           uint `gorm:"primaryKey"`
    AccountID    uint
    Type         string          `gorm:"type:varchar(20);index"`
    Amount       decimal.Decimal `gorm:"type:numeric(19,2)"`
    BalanceAfter decimal.Decimal `gorm:"type:numeric(19,2)"`
    Status       string          `gorm:"type:varchar(20);default:'completed'"`
    Metadata     []byte          `gorm:"type:jsonb;default:'{}'"`
    CreatedAt    time.Time       `gorm:"index:idx_transactions_created_at"`
}
```

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `account_id` | `INT` | not indexed, no FK |
| `type` | `VARCHAR(20)`, indexed | app-level enum: `deposit`, `withdrawal`, `bet`, `win`, `cashout`, `refund` (`models.TransactionType*`) — not a DB `CHECK` |
| `amount` | `NUMERIC(19,2)` | |
| `balance_after` | `NUMERIC(19,2)` | snapshot of the resulting balance |
| `status` | `VARCHAR(20)`, default `'completed'` | app-level enum: `pending`, `completed`, `failed`, `cancelled` |
| `metadata` | `JSONB`, default `'{}'` | transaction-specific payload |
| `created_at` | `TIMESTAMP`, indexed | |

---

### 4. `games`
Game session records (parent table for all game types). Defined in `Backend/models/game.go`.

```go
type Game struct {
    ID           uint `gorm:"primaryKey"`
    UserID       uint
    GameType     string          `gorm:"type:varchar(20);index"`
    Status       string          `gorm:"type:varchar(20);index:idx_games_status"`
    InitialBet   decimal.Decimal `gorm:"type:numeric(19,2)"`
    Winnings     decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
    CreatedAt    time.Time       `gorm:"index:idx_games_created_at"`
    CompletedAt  *time.Time
    DurationMs   *int
    EngineGameID *uint64
}
```

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `user_id` | `INT` | not indexed, no FK |
| `game_type` | `VARCHAR(20)`, indexed | `blackjack`, `poker`, `slots` (`models.GameType*`) |
| `status` | `VARCHAR(20)`, indexed | `in_progress`, `completed`, `abandoned` (`models.GameStatus*`) |
| `initial_bet` | `NUMERIC(19,2)` | |
| `winnings` | `NUMERIC(19,2)`, default `0` | |
| `created_at` | `TIMESTAMP`, indexed | |
| `completed_at` | `TIMESTAMP`, nullable | |
| `duration_ms` | `INT`, nullable | |
| `engine_game_id` | `BIGINT`, nullable | correlates this row with the live in-memory game state held by the Engine process while a hand is still in progress (e.g. blackjack between deal and stand); unset once the game is settled |

**Design notes:**
- No soft delete — `games` rows are never deleted, only transitioned through `status`.

---

### 5. `blackjack_games`
Game-specific record for Blackjack. Defined in `Backend/models/game.go`.

```go
type BlackjackGame struct {
    ID          uint   `gorm:"primaryKey"`
    GameID      uint   `gorm:"uniqueIndex"`
    PlayerHand  []byte `gorm:"type:jsonb"`
    DealerHand  []byte `gorm:"type:jsonb"`
    PlayerScore *int
    DealerScore *int
    Result      string `gorm:"type:varchar(20)"`
}
```

`game_id` is uniquely indexed (1:1 with `games`, no FK). `player_hand`/`dealer_hand` are JSONB-encoded card arrays. `result` is an app-level enum: `win`, `loss`, `push`, `blackjack`, `bust`.

---

### 6. `poker_games`
Game-specific record for Poker. Defined in `Backend/models/game.go`.

```go
type PokerGame struct {
    ID             uint `gorm:"primaryKey"`
    GameID         uint `gorm:"uniqueIndex"`
    TableID        uint
    PlayerPosition string `gorm:"type:varchar(20)"`
    HoleCards      []byte `gorm:"type:jsonb"`
    CommunityCards []byte `gorm:"type:jsonb"`
    FinalHand      []byte `gorm:"type:jsonb"`
    Result         string `gorm:"type:varchar(30)"`
}
```

`table_id` is not indexed (unlike the previous version of this doc claimed). `result` is an app-level enum.

---

### 7. `slots_games`
Game-specific record for the Slot Machine. Defined in `Backend/models/game.go`.

```go
type SlotsGame struct {
    ID               uint   `gorm:"primaryKey"`
    GameID           uint   `gorm:"uniqueIndex"`
    Reels            []byte `gorm:"type:jsonb"`
    PaylineResult    string `gorm:"type:varchar(50)"`
    Multiplier       int    `gorm:"default:1"`
    IsBonusTriggered bool   `gorm:"default:false"`
}
```

---

### 8. `game_statistics`
Aggregated per-player statistics, one row per user. Defined in `Backend/models/game.go`.

```go
type GameStatistics struct {
    ID                    uint            `gorm:"primaryKey"`
    UserID                uint            `gorm:"uniqueIndex"`
    BlackjackGamesPlayed  int             `gorm:"default:0"`
    BlackjackWins         int             `gorm:"default:0"`
    BlackjackWinrate      float64         `gorm:"type:numeric(5,2);default:0"`
    BlackjackTotalWagered decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
    PokerGamesPlayed      int             `gorm:"default:0"`
    PokerWins             int             `gorm:"default:0"`
    PokerWinrate          float64         `gorm:"type:numeric(5,2);default:0"`
    PokerTotalWagered     decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
    SlotsGamesPlayed      int             `gorm:"default:0"`
    SlotsWins             int             `gorm:"default:0"`
    SlotsWinrate          float64         `gorm:"type:numeric(5,2);default:0"`
    SlotsTotalWagered     decimal.Decimal `gorm:"type:numeric(19,2);default:0"`
    TotalGamesPlayed      int             `gorm:"default:0"`
    OverallWinrate        float64         `gorm:"type:numeric(5,2);default:0"`
    LastUpdated           time.Time
}
```

Updated by application code inside the same DB transaction as game settlement (`game_service.go`) — not by a DB trigger.

---

### 9. `friendships`
Stores a one-way binding between two users, keyed symmetrically. Defined in `Backend/models/friendship.go`.

```go
type Friendship struct {
    LowID     uint       `gorm:"primaryKey;uniqueIndex:friendship_binding"`
    HighID    uint       `gorm:"primaryKey;uniqueIndex:friendship_binding"`
    Status    string     `gorm:"default:'dormant';index"`
    CreatedAt time.Time
    DeletedAt *time.Time `gorm:"index"`
}
```

| Column | Type | Notes |
|---|---|---|
| `low_id`, `high_id` | `INT`, composite `PRIMARY KEY` | `low_id < high_id` by convention, so a pair of users maps to exactly one row regardless of who initiated |
| `status` | `TEXT`, indexed, default `'dormant'` | app-level enum: `dormant`, `active`, `pending_id_low`, `pending_id_high`, `pending_self`, `pending_other` |
| `created_at` | `TIMESTAMP` | |
| `deleted_at` | `TIMESTAMP`, nullable, indexed | soft delete |

---

### 10. `notifications`
In-app notification feed. Defined in `Backend/models/notification.go`.

```go
type Notification struct {
    ID          uint      `gorm:"primaryKey;uniqueIndex"`
    UserID      uint
    Type        string
    Head        string
    Body        string
    ImageURL    string
    ActorUserID *uint
    ActionURL   string
    CreatedAt   time.Time
}
```

| Column | Type | Notes |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | |
| `user_id` | `INT` | recipient; **not indexed**, despite being the primary filter in `EnumerateNotifications` (`WHERE user_id = ?`) |
| `type` | `TEXT` | app-level enum: `friends`, `games`, `system` (`models.NotificationType*`) — **not indexed**, despite also being filtered on |
| `head` / `body` | `TEXT` | display copy |
| `image_url` | `TEXT` | resolved to actor avatar or a literal URL at read time |
| `actor_user_id` | `INT`, nullable | user who triggered the notification (e.g. friend requester), used to resolve `image_url` |
| `action_url` | `TEXT` | frontend route to navigate to on click |
| `created_at` | `TIMESTAMP` | **not indexed**, despite `ORDER BY created_at DESC` in `EnumerateNotifications` |

**Design notes:**
- No `is_read`/`read_at` column exists. There is no per-notification read state at all — "dismiss" (`DELETE /user/:id/notifications`) hard-deletes the row.
- Only notifications of type `friends` are persisted to this table. `games` and `system` notifications are delivered live over the WebSocket as toasts and are never written to the DB (see `NotificationTypeInformations` in `Backend/services/notification_service.go`, which gates `ShouldAdd` per type).
- "Unread" state for the bell dropdown is derived client-side by comparing each notification's `created_at` against `users.notifications_seen_at` (see [`users`](#1-users)), not stored per-notification.
- `notification_types` on `users` controls which types a user has opted into receiving at all (checked before `ShouldAdd`/`ShouldSend`).

---

## Relationships & ER Overview

```
users (1) ──── (1) accounts
  │                   │
  │                   └─ (1) ──── (n) transactions
  │
  ├─ (1) ──── (n) games
  │               │
  │               ├─ (1) ──── (1) blackjack_games
  │               ├─ (1) ──── (1) poker_games
  │               └─ (1) ──── (1) slots_games
  │
  ├─ (1) ──── (1) game_statistics
  │
  ├─ (n) ──── (n) friendships   (via low_id/high_id)
  │
  └─ (1) ──── (n) notifications
```

None of these relationships are enforced by a foreign key at the database level — every arrow above is an application-level invariant only (checked in the Go service layer, e.g. `NotificationService.AddNotification` verifies the user exists before inserting).

---

## Indexing Strategy

Indexes actually present, derived from GORM tags (not aspirational):

| Table | Index | Kind |
|---|---|---|
| `users` | `username` | unique |
| `users` | `email` | unique |
| `users` | `deleted_at` | plain |
| `accounts` | `user_id` | unique |
| `transactions` | `type` | plain |
| `transactions` | `created_at` | plain |
| `games` | `game_type` | plain |
| `games` | `status` | plain |
| `games` | `created_at` | plain |
| `blackjack_games` | `game_id` | unique |
| `poker_games` | `game_id` | unique |
| `slots_games` | `game_id` | unique |
| `game_statistics` | `user_id` | unique |
| `friendships` | `(low_id, high_id)` | unique (composite PK) |
| `friendships` | `status` | plain |
| `notifications` | *(none beyond the `id` PK)* | — |

Known gap: `notifications` has no index on `user_id`, `type`, or `created_at`, even though `EnumerateNotifications` filters/sorts on exactly those columns. Not currently a problem at this data volume, but worth revisiting if notification volume grows.

---

## Constraints & Data Integrity

**There are no foreign keys and no `CHECK` constraints anywhere in this schema.** GORM's `AutoMigrate` only creates what the struct tags ask for (primary keys, unique/plain indexes, column types/defaults) — none of the models declare a `foreignKey`/association field or a `check:` tag, so referential integrity, cascade deletes, and value-domain enforcement (non-negative balances, valid enum strings, email format, etc.) are **entirely the responsibility of the Go service layer**:

- Uniqueness (`username`, `email`) and format/length validation: `UserService.RegisterUser` / `UpdateUser`
- Non-negative balance / sufficient funds: `AccountService.Withdraw`
- Enum-like string values (`transaction.type`, `game.status`, `notification.type`, `friendship.status`, etc.): checked against Go constants at the point of insert, e.g. `NotificationTypeInformations[Type] == nil`
- Ownership checks (e.g. a notification belongs to the requesting user): `NotificationService.RemoveNotification`
- "No orphaned rows" on user deletion: **not currently guaranteed** — there is no `ON DELETE CASCADE`, so deleting a `users` row would leave `accounts`/`games`/`notifications`/etc. rows pointing at a dead `user_id`. In practice user deletion isn't exposed anywhere in the handlers today, so this hasn't come up, but it's a real gap if that changes.

If you need real referential integrity or value constraints going forward, they must be added explicitly — either as `gorm:"constraint:OnDelete:CASCADE"` / `check:"..."` tags on the model, or via a hand-written SQL migration, since none of that exists today.

---

## Migration Guidelines

There is no migration tooling in use. Schema changes are made by:

1. **Editing the relevant Go struct** in `Backend/models/`.
2. Confirming it's registered in the `db.AutoMigrate(...)` call in `Backend/config/database.go` (all current models are).
3. **Updating this document** to match.
4. Restarting the backend — `AutoMigrate` runs automatically on startup (`config.InitDB`) and applies additive changes (new tables/columns/indexes). It does **not** drop columns, rename anything, or change types out from under existing data — those need a manual, hand-run migration outside of this flow.

`Backend/migrations/` exists as a placeholder directory (`.gitkeep` only) for that eventuality but is not currently used by any code path.

---

## Testing & Validation

Schema-adjacent behavior is covered by Go unit tests in `Backend/services/services_test.go`, which exercise the service-layer validation described above (e.g. `updateUserExpect`, `addNotificationExpect`, `removeNotificationExpect`, `enumerateNotificationsExpect`) against an in-memory/test DB — there are no SQL-level constraint tests to write, since no SQL-level constraints exist.
