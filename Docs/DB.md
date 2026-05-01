# Database Design - PostgreSQL

**Last Updated:** 2026-05-01

> **IMPORTANT:** Any database schema changes, table additions, column modifications, or indexing updates must be reflected in this document. This is the single source of truth for the database structure. Update this file before or alongside any migration.

## Overview

The Transcendence Casino Platform uses PostgreSQL for persistent data storage. The database supports:
- User authentication and account management
- Game sessions and results tracking
- Financial transactions (deposits, withdrawals, bets, winnings)
- Game-specific mechanics (cards, hands, dealer states)
- Audit trails and compliance logging

## Architecture Principles

1. **ACID Compliance**: All financial transactions use database transactions
2. **Immutability**: Game records and transactions are append-only
3. **Audit Trail**: Every state change is logged with timestamps
4. **Soft Deletes**: Users and sessions use `deleted_at` for data retention
5. **Denormalization**: Balance fields are cached for performance; synced via triggers

---

## Core Tables

### 1. `users`
Stores user account information and authentication credentials.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP DEFAULT NULL,

  CONSTRAINT email_valid CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT username_length CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 50)
);

CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
```

**Design Rationale:**
- `username` and `email` are unique and indexed for fast authentication lookups
- `deleted_at` enables soft deletes for user data retention compliance
- Email validation via CHECK constraint prevents invalid data at DB level
- Timestamps track account lifecycle

---

### 2. `user_profiles`
Extended user information and preferences.

```sql
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  preferred_language VARCHAR(5) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT bio_length CHECK (LENGTH(bio) <= 500)
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

**Design Rationale:**
- Separated from `users` to allow flexible profile updates without touching auth data
- 1:1 relationship with `users` via UNIQUE constraint
- Supports future features like avatars, bios, and localization

---

### 3. `sessions`
User authentication sessions for Web and Web3 logins.

```sql
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  session_type VARCHAR(20) DEFAULT 'web', -- 'web' or 'web3'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP DEFAULT NULL,

  CONSTRAINT session_type_valid CHECK (session_type IN ('web', 'web3'))
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at) WHERE deleted_at IS NULL;
```

**Design Rationale:**
- `token_hash` prevents storing plaintext tokens in the database
- Session expiry managed via `expires_at` with automatic cleanup queries
- `last_activity_at` tracks user activity for metrics and security
- Soft delete for session history preservation

---

### 4. `accounts`
User financial account with balance tracking.

```sql
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(19, 2) DEFAULT 0.00,
  total_wagered DECIMAL(19, 2) DEFAULT 0.00,
  total_won DECIMAL(19, 2) DEFAULT 0.00,
  total_lost DECIMAL(19, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT balance_non_negative CHECK (balance >= 0),
  CONSTRAINT wagered_non_negative CHECK (total_wagered >= 0),
  CONSTRAINT won_non_negative CHECK (total_won >= 0),
  CONSTRAINT lost_non_negative CHECK (total_lost >= 0)
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_balance ON accounts(balance) WHERE balance > 0;
```

**Design Rationale:**
- Cached balance fields for fast reads; synced via database triggers and transactions
- Aggregate statistics (`total_wagered`, `total_won`, `total_lost`) for analytics
- `updated_at` tracks last financial activity
- CHECK constraints prevent invalid account states

---

### 5. `transactions`
Immutable financial transaction log.

```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  account_id INT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL,
  amount DECIMAL(19, 2) NOT NULL,
  balance_after DECIMAL(19, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT transaction_type_valid CHECK (
    transaction_type IN ('deposit', 'withdrawal', 'bet', 'win', 'cashout', 'refund')
  ),
  CONSTRAINT status_valid CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  CONSTRAINT amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status IN ('pending', 'failed');
```

**Design Rationale:**
- Immutable audit trail for all financial operations
- `metadata` (JSONB) stores transaction-specific data without schema changes
- `balance_after` proves correctness of each transaction
- Indexed by `account_id` for user statement queries
- Status tracking for payment processing and reconciliation

---

### 6. `games`
Game session records (parent table for all game types).

```sql
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'in_progress',
  initial_bet DECIMAL(19, 2) NOT NULL,
  winnings DECIMAL(19, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP DEFAULT NULL,
  duration_ms INT,

  CONSTRAINT game_type_valid CHECK (game_type IN ('blackjack', 'poker', 'slots')),
  CONSTRAINT status_valid CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  CONSTRAINT initial_bet_positive CHECK (initial_bet > 0),
  CONSTRAINT winnings_non_negative CHECK (winnings >= 0)
);

CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_created_at ON games(created_at DESC);
CREATE INDEX idx_games_status ON games(status) WHERE status IN ('in_progress', 'abandoned');
CREATE INDEX idx_games_game_type ON games(game_type);
```

**Design Rationale:**
- Central game record for all game types
- Timestamps and status track game lifecycle
- `duration_ms` for analytics (average session length)
- Separate tables per game type (see below) for game-specific logic

---

### 7. `blackjack_games`
Game-specific record for Blackjack.

```sql
CREATE TABLE blackjack_games (
  id SERIAL PRIMARY KEY,
  game_id INT UNIQUE NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_hand JSONB NOT NULL,
  dealer_hand JSONB NOT NULL,
  player_score INT,
  dealer_score INT,
  result VARCHAR(20) NOT NULL,

  CONSTRAINT result_valid CHECK (result IN ('win', 'loss', 'push', 'blackjack', 'bust')),

  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX idx_blackjack_games_game_id ON blackjack_games(game_id);
```

**Example Structure:**
```json
{
  "player_hand": [
    {"suit": "hearts", "rank": "king", "value": 10},
    {"suit": "diamonds", "rank": "ace", "value": 11}
  ],
  "dealer_hand": [
    {"suit": "clubs", "rank": "7", "value": 7},
    {"suit": "spades", "rank": "hidden", "value": null}
  ]
}
```

**Design Rationale:**
- Game-specific details stored separately; 1:1 with `games`
- JSONB for flexible card representation
- Includes computed scores for quick result validation
- Result enum prevents invalid game outcomes

---

### 8. `poker_games`
Game-specific record for Poker.

```sql
CREATE TABLE poker_games (
  id SERIAL PRIMARY KEY,
  game_id INT UNIQUE NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  table_id INT NOT NULL,
  player_position VARCHAR(20),
  hole_cards JSONB NOT NULL,
  community_cards JSONB,
  final_hand JSONB,
  result VARCHAR(30) NOT NULL,

  CONSTRAINT position_valid CHECK (position IN ('small_blind', 'big_blind', 'dealer', 'early', 'middle', 'late')),
  CONSTRAINT result_valid CHECK (result IN ('folded', 'won_showdown', 'won_fold', 'lost_showdown'))
);

CREATE INDEX idx_poker_games_game_id ON poker_games(game_id);
CREATE INDEX idx_poker_games_table_id ON poker_games(table_id);
```

**Design Rationale:**
- Multi-player game support with `table_id` for multiplayer sessions
- Card information stored as JSONB for flexibility
- Position tracking for variance analysis
- Result types differentiate winning mechanisms

---

### 9. `slots_games`
Game-specific record for Slot Machine.

```sql
CREATE TABLE slots_games (
  id SERIAL PRIMARY KEY,
  game_id INT UNIQUE NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  reels JSONB NOT NULL,
  payline_result VARCHAR(50) NOT NULL,
  multiplier INT DEFAULT 1,
  is_bonus_triggered BOOLEAN DEFAULT FALSE,

  CONSTRAINT multiplier_positive CHECK (multiplier > 0)
);

CREATE INDEX idx_slots_games_game_id ON slots_games(game_id);
```

**Example Structure:**
```json
{
  "reels": [
    {"symbol": "cherry", "position": 1},
    {"symbol": "seven", "position": 3},
    {"symbol": "diamond", "position": 2}
  ]
}
```

**Design Rationale:**
- Stores final reel state and outcome
- Bonus trigger tracking for RNG auditing
- Multiplier for jackpot support

---

## Analytics & Audit Tables

### 10. `game_statistics`
Aggregated player statistics for quick queries.

```sql
CREATE TABLE game_statistics (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Blackjack
  blackjack_games_played INT DEFAULT 0,
  blackjack_wins INT DEFAULT 0,
  blackjack_winrate DECIMAL(5, 2) DEFAULT 0.00,
  blackjack_total_wagered DECIMAL(19, 2) DEFAULT 0.00,

  -- Poker
  poker_games_played INT DEFAULT 0,
  poker_wins INT DEFAULT 0,
  poker_winrate DECIMAL(5, 2) DEFAULT 0.00,
  poker_total_wagered DECIMAL(19, 2) DEFAULT 0.00,

  -- Slots
  slots_games_played INT DEFAULT 0,
  slots_wins INT DEFAULT 0,
  slots_winrate DECIMAL(5, 2) DEFAULT 0.00,
  slots_total_wagered DECIMAL(19, 2) DEFAULT 0.00,

  -- Overall
  total_games_played INT DEFAULT 0,
  overall_winrate DECIMAL(5, 2) DEFAULT 0.00,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_game_statistics_user_id ON game_statistics(user_id);
CREATE INDEX idx_game_statistics_overall_winrate ON game_statistics(overall_winrate DESC);
```

**Design Rationale:**
- Denormalized for fast dashboard queries
- Updated via triggers when games are completed
- Prevents expensive aggregation queries on every dashboard load

---

## Relationships & ER Overview

```
users (1) ──── (1) user_profiles
  │
  ├─ (1) ──── (1) accounts
  │               │
  │               └─ (1) ──── (n) transactions
  │
  ├─ (1) ──── (n) sessions
  │
  ├─ (1) ──── (n) games
  │               │
  │               ├─ (1) ──── (1) blackjack_games
  │               ├─ (1) ──── (1) poker_games
  │               └─ (1) ──── (1) slots_games
  │
  └─ (1) ──── (1) game_statistics
```

---

## Indexing Strategy

### Primary Access Patterns

| Query Pattern | Index | Rationale |
|---------------|-------|-----------|
| Find user by username | `idx_users_username` | Authentication |
| Find user by email | `idx_users_email` | Password reset, signup |
| Get user sessions | `idx_sessions_user_id` | Session validation |
| Check active sessions | `idx_sessions_expires_at` | Session cleanup jobs |
| Get account balance | `idx_accounts_user_id` | Game startup, dashboard |
| User transaction history | `idx_transactions_account_id` | Statement queries |
| Recent game records | `idx_games_created_at` | Leaderboards, stats |
| Abandoned games | `idx_games_status` | Cleanup jobs |
| Game-specific queries | `idx_*_games_game_id` | Game detail pages |

---

## Constraints & Data Integrity

### Referential Integrity
- CASCADE deletes on `users` propagate to all related tables
- ON DELETE CASCADE ensures no orphaned records
- Foreign keys enforce data consistency

### Check Constraints
- Email format validation
- Username length requirements (3-50 characters)
- Balance/amount non-negative checks
- Enum validation via CHECK constraints

### Business Rules (Application Level)
- Bet amount <= account balance (checked before transaction)
- Game result must match card/outcome data
- Duplicate transactions prevented via unique constraint on tokens

---

## Performance Tuning

### Query Optimization
1. **Connection pooling**: Use PgBouncer for connection management
2. **Prepared statements**: Prevent SQL injection and improve caching
3. **Batch operations**: Use multi-row inserts for transactions
4. **VACUUM/ANALYZE**: Run nightly maintenance on high-churn tables

### Partitioning Strategy (Future)
For tables exceeding 10GB:
- Partition `transactions` by month: `transactions_2026_04`, etc.
- Partition `games` by month for archival
- Keep recent data (3 months) in main partition for hot queries

---

## Migration Guidelines

### Before Any Schema Change:
1. **Plan the migration**: Write a SQL script with steps
2. **Update this document**: Add new tables/fields to the schema section
3. **Test locally**: Run migration on a dev database copy
4. **Plan rollback**: Ensure migration is reversible
5. **Communicate timing**: Inform the team of potential downtime

### Migration Process:
```sql
-- New column additions
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- New indexes (non-blocking in PostgreSQL 11+)
CREATE INDEX CONCURRENTLY idx_users_phone ON users(phone_number);

-- Foreign key additions (requires no existing constraint)
ALTER TABLE table_name ADD CONSTRAINT fk_name
  FOREIGN KEY (column) REFERENCES other_table(id);

-- Triggers for denormalized fields
CREATE TRIGGER update_game_statistics
AFTER INSERT ON games
FOR EACH ROW
EXECUTE FUNCTION sync_game_statistics();
```

### Rollback Safety:
- Keep migration scripts in `/migrations/` directory
- Name files: `YYYYMMDD_HH_brief_description.sql`
- Always include both UP and DOWN migrations

---

## Testing & Validation

### Unit Tests for Constraints
```sql
-- Test email validation
INSERT INTO users (username, email, password_hash)
VALUES ('test', 'invalid-email', 'hash'); -- Should fail

-- Test balance non-negative
INSERT INTO accounts (user_id, balance)
VALUES (1, -100); -- Should fail
```

### Integration Tests
- Test transaction atomicity (all-or-nothing bet outcomes)
- Test cascade deletes (user deletion removes all related data)
- Test concurrent updates (prevent race conditions on balance)

### Performance Tests
- Query execution plans for slow queries: `EXPLAIN ANALYZE`
- Index effectiveness: Monitor missing index suggestions
- Connection pool saturation: Alert if > 80% of connections in use

---

## Backup & Disaster Recovery

### Backup Strategy
- **Frequency**: Continuous WAL archiving + daily full backups
- **Retention**: 30-day rolling backups
- **Location**: Geographically separate storage (S3, etc.)
- **Testing**: Monthly restore drills from backup

### Recovery Procedures
- RTO (Recovery Time Objective): < 1 hour
- RPO (Recovery Point Objective): < 5 minutes
- Point-in-time restore capability via WAL archiving
