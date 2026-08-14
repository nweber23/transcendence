*This project has been created as part of the 42 curriculum by fbraune, ghodges, ngoyat, nweber.*

# ft_transcendence — Casino Platform

A real-time multiplayer casino web application built as the final project of the 42 Common Core. Players can register, manage a virtual balance, and compete across three casino games — Blackjack, Texas Hold'em Poker, and Slots — powered by a dedicated C++23 game engine, a Go REST API, a React frontend, and a full monitoring stack.

---

## Table of Contents

1. [Team Information](#team-information)
2. [Description](#description)
3. [Features List](#features-list)
4. [Modules](#modules)
5. [Technical Stack](#technical-stack)
6. [Database Schema](#database-schema)
7. [Project Management](#project-management)
8. [Instructions](#instructions)
9. [Resources](#resources)
10. [Individual Contributions](#individual-contributions)

---

## Team Information

| Login | Role(s) | Responsibilities |
|---|---|---|
| fbraune | Developer | Game engine (C++23 / gRPC), Blackjack & Poker logic |
| ghodges | Tech Lead / Developer | Backend architecture, JWT auth,WebSocket server |
| ngoyat | Developer / PM | Monitoring stack (Prometheus, Grafana), Docker orchestration, CI, OAuth 2.0 (GitHub & Google), encryption,|
| nweber | PO / Developer | Product vision, Slots game, user management, friend system, Frontend (React/TypeScript), routing, UI components |

---

## Description

**ft_transcendence** is a full-stack web casino platform where authenticated users can:

- Sign up with email/password or via GitHub / Google OAuth 2.0.
- Deposit virtual currency into a personal account and track their balance.
- Play **Blackjack**, **Texas Hold'em Poker**, and **Slot Machine** games against a high-performance C++23 game engine over gRPC.
- Manage a friends list, view online statuses, and receive real-time notifications via WebSockets.
- Monitor their personal statistics (win rate, total wagered, match history) from a profile page.

The entire stack is containerized and launched with a single `make` command.

---

## Features List

### Authentication & User Management
| Feature | Developer(s) | Description |
|---|---|---|
| Email/password registration & login | ghodges | Hashed (bcrypt) passwords, JWT sessions |
| GitHub OAuth 2.0 | ngoyat | Encrypted token storage (AES-GCM) |
| Google OAuth 2.0 | ngoyat | Encrypted token storage (AES-GCM) |
| JWT session management | ghodges | 24-hour tokens, refresh flow |
| Profile page & avatar upload | ghodges | Image stored as persistent Docker volume |
| Friend system | ghodges | Add/remove, online status, pending/active states |
| Notification system | ghodges | Friend, game, and system notifications via WebSocket |

### Gaming
| Feature | Developer(s) | Description |
|---|---|---|
| Blackjack | fbraune | Hit/Stand flow, dealer reveal, standard rules |
| Texas Hold'em Poker | fbraune | Betting rounds, hand evaluation, multi-player |
| Slot Machine | fbraune | Configurable reels, payline calculation |
| Game statistics | fbraune | Per-game win rate, total wagered, history |
| Financial accounts | nweber | Balance, deposits, withdrawals, transaction log |

### Infrastructure
| Feature | Developer(s) | Description |
|---|---|---|
| Real-time WebSocket server | ghodges | Notification delivery, online presence |
| Prometheus metrics | ngoyat | Scraped from `/metrics` on backend |
| Grafana dashboards | ngoyat | Container and app metrics |
| cAdvisor | ngoyat | Per-container resource monitoring |
| Caddy reverse proxy | ngoyat | HTTPS termination, access logs |

---

## Modules

**Required: 14 points minimum**

| Module | Category | Type | Points | Developer(s) |
|---|---|---|---|---|
| 1 | Framework for both Front and Backend | Major | 2 | Gabriel, Niklas |
| 2 | Frontend Framework | Minor | 1 | Niklas |
| 3 | Backend Framework | Minor | 1 | Gabriel |
| 4 | Use on ORM for the Database | Minor | 1 | Gabriel |
| 5 | Implement real-time features (Blackjack, Poker) | Major | 2 | Gabriel, Florian |
| 6 | Notification System for all actions | Minor | 1 | Gabriel, Niklas|
| 7 | Support additional browsers | Minor | 1 | Niklas |
| 8 | Custom-made design system (min. 10 reusable components) | Minor | 1 | Niklas |
| 9 | Standard User Management and auth | Major | 2 | Gabriel |
| 10 | Implement OAuth 2.0 | Minor | 1 | Nathan |
| 12 | Implement 2FA | Minor | 1 | Niklas |
| 13 | AI Opponent (Blackjack Dealer) | Major | 2 | Florian |
| 14 | Implement web-based game (poker, blackjack) | Major | 2 | Gabriel, Florian, Niklas|
| 15 | Remote Players | Major | 2 | Gabriel, Florian|
| 16 | Multiplayer Game (Poker) | Major | 2 | Gabriel, Florian|
| 17 | Monitoring system with Prometheus and Grafana | Major | 2 | Nathan |
| 18 | Implement spectator mode for games | Minor | 1 | Niklas |

**Total: 25 points**

---

## Technical Stack

### Frontend
- **Framework:** React 18 + TypeScript (Vite 6)
- **Routing:** React Router DOM v7
- **3D / Graphics:** Three.js, React Three Fiber, React Three Drei
- **Animation:** Framer Motion
- **Styling:** Tailwind CSS
- **Package manager:** pnpm

### Backend
- **Language:** Go 1.26
- **Framework:** Gin-Gonic v1.12
- **ORM:** GORM v1.31 with PostgreSQL driver
- **Auth:** JWT (golang-jwt/jwt v5), bcrypt
- **Real-time:** Gorilla WebSocket v1.5
- **OAuth:** Custom OAuth 2.0 state/callback handlers (GitHub, Google)
- **Encryption:** AES-GCM for OAuth token storage (golang.org/x/crypto)

### Game Engine
- **Language:** C++23 (GCC-14)
- **Communication:** gRPC + Protocol Buffers
- **Serialization:** glaze (JSON)

### Database
- **Engine:** PostgreSQL 18
- **Access:** GORM (ORM)

### Infrastructure
- **Containerization:** Docker Compose (dev + prod overlays)
- **Reverse Proxy:** Caddy 2.11
- **Monitoring:** Prometheus v3.1 + Grafana 11.4 + cAdvisor v0.49
- **Browser compatibility:** Google Chrome (primary), compatible with modern Firefox/Edge

### Justification for major choices

| Choice | Reason |
|---|---|
| Go + Gin | High concurrency for WebSocket connections, fast compilation, strong typing |
| C++23 game engine via gRPC | Offloads heavy game logic from the API layer; enables future engine reuse |
| PostgreSQL 18 | Mature RDBMS with strong consistency for financial data |
| React + Three.js | Rich interactive UI with 3D visual elements for game scenes |
| Caddy | Automatic HTTPS, simple config, built-in access logs consumed by Prometheus |

---

## Database Schema

```
┌──────────────────┐     ┌──────────────────────┐
│      users       │     │    oauth_accounts    │
├──────────────────┤     ├──────────────────────┤
│ id (PK)          │◄────│ user_id (FK)         │
│ username         │     │ provider             │
│ email            │     │ provider_user_id     │
│ password_hash    │     │ access_token (enc.)  │
│ avatar           │     │ refresh_token (enc.) │
│ created_at       │     │ expires_at           │
└──────┬───────────┘     └──────────────────────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
┌──────▼───────────┐     ┌────────────────────▼──┐
│    accounts      │     │     friendships       │
├──────────────────┤     ├───────────────────────┤
│ id (PK)          │     │ id (PK)               │
│ user_id (FK)     │     │ requester_id (FK)     │
│ balance          │     │ addressee_id (FK)     │
│ total_wagered    │     │ status                │
│ total_won        │     │ created_at            │
│ total_lost       │     └───────────────────────┘
└──────┬───────────┘
       │
┌──────▼───────────┐     ┌──────────────────────┐
│  transactions    │     │       games          │
├──────────────────┤     ├──────────────────────┤
│ id (PK)          │     │ id (PK)              │
│ account_id (FK)  │     │ user_id (FK)         │
│ type             │     │ type (blackjack/     │
│ amount           │     │       poker/slots)   │
│ created_at       │     │ status               │
└──────────────────┘     │ bet                  │
                         │ winnings             │
                         └──────┬───────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
┌──────────▼──────┐  ┌──────────▼──────┐  ┌─────────▼───────┐
│ blackjack_games │  │   poker_games   │  │   slots_games   │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ game_id (FK)    │  │ game_id (FK)    │  │ game_id (FK)    │
│ player_hand     │  │ community_cards │  │ reels           │
│ dealer_hand     │  │ player_hands    │  │ paylines        │
│ deck_state      │  │ pot             │  │ result          │
└─────────────────┘  │ round           │  └─────────────────┘
                     └─────────────────┘

┌──────────────────┐     ┌──────────────────────┐
│ game_statistics  │     │    notifications     │
├──────────────────┤     ├──────────────────────┤
│ user_id (FK)     │     │ id (PK)              │
│ game_type        │     │ user_id (FK)         │
│ games_played     │     │ type                 │
│ games_won        │     │ message              │
│ total_wagered    │     │ read                 │
│ total_won        │     │ created_at           │
└──────────────────┘     └──────────────────────┘
```

---

## Project Management

- **Task tracking:** GitHub Issues and a shared Notion board for sprint planning.
- **Communication:** Discord server.
- **Code reviews:** Pull requests required before merging to `main`; at least one reviewer per PR.
- **Branching:** Feature branches per task; `main` is always deployable.
- **Meetings:** Weekly sync to review progress and unblock issues.

---

## Instructions

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (v2)
- `make`
- A modern browser (Google Chrome recommended)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd transcendence
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in the required values:

   | Variable | Description |
   |---|---|
   | `DATABASE_USER` | PostgreSQL username |
   | `DATABASE_PASSWORD` | PostgreSQL password |
   | `DATABASE_NAME` | Database name |
   | `JWT_SECRET` | Random secret string (min 32 chars) |
   | `JWT_EXPIRY` | Token lifetime in seconds (e.g. `86400`) |
   | `GITHUB_CLIENT_ID` | GitHub OAuth app Client ID |
   | `GITHUB_CLIENT_SECRET` | GitHub OAuth app Client Secret |
   | `GOOGLE_CLIENT_ID` | Google OAuth app Client ID |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth app Client Secret |
   | `OAUTH_ENCRYPTION_KEY` | 32-byte hex key for token encryption |
   | `VITE_API_BASE_URL` | Backend URL seen by the browser (e.g. `http://localhost:8080`) |

3. **Start all services**
   ```bash
   make up
   ```
   This starts: PostgreSQL, game engine (gRPC), backend API, frontend, Prometheus, Grafana, Caddy, cAdvisor.

4. **Open the app**
   - Application: `http://localhost:3333`
   - Grafana dashboards: `http://localhost:3000` (default: `admin` / `admin123`)

### Useful commands

```bash
make up            # Start all services (detached)
make down          # Stop all services
make rebuild       # Rebuild images and restart
make logs          # Stream logs from all services
make logs-backend  # Backend logs only
make logs-frontend # Frontend logs only
make ps            # List running containers
make db-shell      # Open psql session
make clean         # Remove containers, volumes, and images
```

### Production deployment

```bash
cp .env.example .env          # and fill in production values
make prod-up                  # Builds and starts the production stack
make prod-logs                # Follow production logs
make prod-down                # Stop production stack
```

Production overlays (`docker-compose.prod.yml`) disable debug modes, restrict CORS to your domain, and expect a proper reverse-proxy (e.g. nginx) for public TLS termination in front of Caddy.

---

## Resources

### Documentation used
- [Go documentation](https://go.dev/doc/)
- [Gin Web Framework](https://gin-gonic.com/docs/)
- [GORM documentation](https://gorm.io/docs/)
- [React documentation](https://react.dev/)
- [Three.js documentation](https://threejs.org/docs/)
- [gRPC documentation](https://grpc.io/docs/)
- [Protocol Buffers](https://protobuf.dev/)
- [Docker Compose reference](https://docs.docker.com/compose/)
- [Prometheus documentation](https://prometheus.io/docs/)
- [Grafana documentation](https://grafana.com/docs/)
- [Caddy documentation](https://caddyserver.com/docs/)
- [JWT specification (RFC 7519)](https://datatracker.ietf.org/doc/html/rfc7519)
- [OAuth 2.0 specification (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749)

### AI usage
AI tools (Claude, GitHub Copilot) were used during this project for:
- **Boilerplate generation:** scaffolding repetitive GORM models and Go handler stubs.
- **Debugging assistance:** explaining compiler errors in C++23 (concepts, ranges) and helping trace gRPC connection issues.
- **Documentation drafting:** first drafts of inline code comments and this README, reviewed and corrected by team members.
- **Code review support:** suggesting edge cases in game logic validation (hand evaluation, payline calculation).

All AI-generated content was reviewed, tested, and understood by the team member responsible for the corresponding feature before being merged.

---

## Individual Contributions

### ngoyat — Tech Lead / Developer

### fbraune — Developer
- Wrote the C++23 game engine (multi-threaded gRPC server).
- Implemented Blackjack game logic (deck, dealer rules, state machine).
- Implemented Texas Hold'em Poker (hand evaluation, betting rounds, multi-player session management).
- Defined and maintained the Protobuf schema (`engine.proto`).
- Multi-stage Docker build for the engine service.

### ghodges — Developer / Project Manager
- Wrote user and account service layer (balance management, transaction recording).
- Built the WebSocket server: connection lifecycle, topic-based packet routing, online presence broadcasting.
- Implemented JWT authentication (login, register, token refresh, protected routes).
- Designed overall backend architecture (Gin router layout, middleware chain, service layer).
- Built the friend system (add/remove, pending/active status, online indicator).
- Developed the notification service (creation, delivery via WebSocket, mark-as-read).

### ngoyat — Developer
- Integrated GitHub and Google OAuth 2.0 with AES-GCM encrypted token storage.
- Set up Docker Compose orchestration for all services (dev and prod overlays).
- Configured Prometheus scraping, recording rules, and alerting.
- Built Grafana dashboards (app latency, DB connections, container CPU/memory via cAdvisor).
- Managed Makefile targets and deployment scripts.
- Facilitated weekly team syncs and maintained the GitHub Issues board.

### nweber — Product Owner / Developer
- Built the React + TypeScript SPA with React Router DOM v7 protected routes.
- Implemented login, sign-up, and OAuth redirect/callback pages.
- Developed reusable UI component library (buttons, modals, cards) with Tailwind CSS.
- Wrote frontend WebSocket client and notification hook.
- Integrated Three.js scenes for game visuals (3D card renders, slot machine).
- Set up HTTPS enforcement and CORS policy.
- Defined the product scope, feature priority, and acceptance criteria.
- Implemented the Slot Machine game (reel configuration, payline logic, animation triggers).
- Created profile page UI (avatar upload, game statistics display, transaction history).