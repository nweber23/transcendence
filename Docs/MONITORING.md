# Transcendence Casino - Monitoring Stack

**Status:** Live in dev, provisioned dashboards, Grafana-native alerting provisioned and verified bootable
**Components:** Prometheus, Grafana, cAdvisor, node-exporter, postgres-exporter, Caddy (as a scraped reverse proxy), Postgres (scraped + queried directly)

---

## Overview

The monitoring stack observes five things:
1. **App-level metrics** exposed by the Go backend itself (`prometheus/client_golang`) — HTTP traffic, Go runtime, and business counters (accounts created, logins, deposits/withdrawals)
2. **Edge metrics** from Caddy, the reverse proxy in front of frontend/backend
3. **Container-level metrics** from cAdvisor (CPU, memory, network per container)
4. **Host-level metrics** from node-exporter (CPU, memory, disk, network for the machine running Docker)
5. **Database metrics** from postgres-exporter (connections, cache hit ratio, throughput, table health), plus a **direct SQL datasource** in Grafana for business questions (`accounts`/`transactions`/`games`) that don't map onto Prometheus counters

Prometheus scrapes the first five and Grafana visualizes them via six auto-provisioned dashboards; the sixth (business/revenue) queries Postgres directly instead. Grafana's own Unified Alerting evaluates rules against Prometheus and handles notification routing on top.

---

## Directory Layout

```
monitoring/
├── grafana/
│   ├── dashboards/
│   │   ├── caddy-overview.json         # Frontend vs backend Caddy traffic/latency split
│   │   ├── transcendence-overview.json # Platform-wide request/auth/deposit overview
│   │   ├── postgres-overview.json      # Connections, cache hit ratio, throughput, table health
│   │   ├── backend-runtime.json        # Go goroutines/heap/GC/CPU (client_golang built-ins)
│   │   ├── host-containers.json        # node-exporter host metrics + cAdvisor per-container
│   │   └── business-overview.json      # Total amount lost, revenue, deposits/withdrawals (SQL)
│   └── provisioning/
│       ├── alerting/
│       │   ├── rules.yml               # Alert rules (PromQL query + threshold), grouped by concern
│       │   ├── contactpoints.yml       # Where alerts get sent (Discord webhook)
│       │   └── policies.yml            # Routing: severity -> contact point, repeat interval
│       ├── dashboards/
│       │   └── dashboard.yml           # Points Grafana at /var/lib/grafana/dashboards
│       └── datasources/
│           ├── datasource.yml          # Registers Prometheus (uid: prometheus_ds) as default
│           └── postgres.yml            # Registers Postgres (uid: Postgres) for SQL dashboards
└── prometheus/
    └── prometheus.yml                  # Scrape configs: backend, prometheus, caddy, cadvisor, postgres, node
```

---

## Prometheus

**Config:** `monitoring/prometheus/prometheus.yml`

- Global `scrape_interval` and `evaluation_interval`: 5s
- Prometheus does **not** hot-reload this file on change — after editing it, run `docker compose restart prometheus` (or recreate it) to pick up new scrape jobs.

**Scrape jobs:**
| Job | Target | Notes |
|-----|--------|-------|
| `transcendence-backend` | `backend:8080` | Scrapes `/metrics`, labeled `service: backend` |
| `prometheus` | `localhost:9090` | Self-scrape, confirms the server is alive |
| `caddy` | `caddy:2019` | Caddy's admin/metrics endpoint |
| `cadvisor` | `cadvisor:1337` | Explicit 5s scrape interval |
| `postgres` | `postgres-exporter:9187` | Labeled `service: postgres` |
| `node` | `node-exporter:9100` | Labeled `service: host` |

Prometheus is **not port-mapped to the host** in any environment — it's reachable only from other containers on `monitoring-network` (i.e. by Grafana).

---

## Grafana

**Access:** `http://localhost:3000` in dev, using `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` from `.env`. `docker-compose.prod.yml` maps it to `127.0.0.1:3001` instead in production (loopback-only, use an SSH tunnel to view it remotely).

**Provisioning (auto-applied on startup):**
- `provisioning/datasources/datasource.yml` — registers `Prometheus` (`http://prometheus:9090`) as the default, non-editable datasource with a 5s time interval and explicit `uid: prometheus_ds` so alert rules and dashboards can reference it by a stable ID
- `provisioning/datasources/postgres.yml` — registers a second datasource, `Postgres` (`uid: Postgres`), pointed straight at the app database for SQL panels. Credentials come from the same `.env` the `grafana` service already loads via `env_file`, resolved with Grafana's `$__env{VAR}` provisioning syntax (not docker-compose variable substitution — compose does not expand variables inside files it merely mounts). `grafana` is dual-homed onto `transcendence-network` so it can actually reach `postgres:5432`.
- `provisioning/dashboards/dashboard.yml` — file-based dashboard provider pointed at `/var/lib/grafana/dashboards`, `updateIntervalSeconds: 30`, `allowUiUpdates: true`, `disableDeletion: false`
- `provisioning/alerting/` — alert rules, contact points, and notification policies (see [Alerting](#alerting) below)

**Dashboards:**

1. **`caddy-overview.json` — "Caddy: Frontend vs Backend"**
   Request rate, status-code mix, and latency, split by Caddy server block (`srv0` = frontend, `srv1` = backend). Panels: requests/sec, 2xx/4xx/5xx % (frontend and backend side by side), latency p50/p95/p99, and response size by service.

2. **`transcendence-overview.json` — "Transcendence Overview"**
   Platform-wide panels: request rate by HTTP method, 5xx error %, latency p50/p95, active WebSocket connections, account creations & logins (success/failure) per minute, deposits vs withdrawals $/min, and an all-time totals stat panel (accounts created, total logins, deposit/withdrawal counts and amounts).

3. **`postgres-overview.json` — "Postgres Overview"**
   Instance up/down, active connections & pool saturation, cache hit ratio, transactions/sec, row ops/sec, deadlocks, temp-file usage (memory pressure signal), dead-vs-live tuple bloat per table, database and WAL size.

4. **`backend-runtime.json` — "Backend Go Runtime"**
   Goroutines, OS threads, open file descriptors, process uptime, CPU usage, heap vs RSS memory, GC pause duration (p50/p100) and GC frequency — all from `client_golang`'s built-in Go/process collectors, no extra instrumentation needed beyond exposing `/metrics`.

5. **`host-containers.json` — "Host & Containers"**
   Host CPU/memory/disk/load (node-exporter) plus per-container CPU, memory, and network I/O broken out by container name (cAdvisor).

6. **`business-overview.json` — "Business Overview"**
   Total amount lost by players (`SUM(accounts.total_lost)`), total wagered/won, net platform revenue, deposits vs withdrawals per day, net deposits all-time, amount lost per day and by game type (from `games`), and a top-10-players-by-losses table. Queries Postgres directly via SQL — not Prometheus.

---

## Alerting

Alerts run on **Grafana's native Unified Alerting** (built into Grafana ≥ 9, no separate Alertmanager service in the stack) — Grafana queries Prometheus directly and manages its own routing/notifications. Provisioned the same way as dashboards and the datasource, under `monitoring/grafana/provisioning/alerting/`:

```
monitoring/grafana/provisioning/alerting/
├── rules.yml            # Alert rules (PromQL query + threshold), grouped by concern
├── contactpoints.yml    # Where alerts get sent (Discord webhook)
└── policies.yml         # Routing: which severity goes to which contact point, how often it repeats
```

**Rule groups (folder: `Transcendence Alerts`, `interval: 1m`):**

| Group | Rules | Trigger |
|---|---|---|
| `service-availability` | `BackendDown`, `CaddyDown`, `CadvisorDown` | `up == 0` on the respective job for 1–2m |
| `caddy-errors` | `CaddyBackend5xxHigh`, `CaddyFrontend5xxHigh`, `CaddyBackend4xxSpike` | 5xx ratio > 5% (5m), 4xx ratio > 25% (10m), split by `srv0`/`srv1` |
| `caddy-latency` | `CaddyBackendLatencyHighP95`, `CaddyBackendLatencyHighP99` | Backend p95 > 1s or p99 > 2.5s for 5m |
| `app-logic` | `LoginFailureSpike`, `NoActiveWebsocketConnections`, `WithdrawalsExceedDeposits` | Login failure ratio > 50%, zero active WS connections for 10m, withdrawals > 3x deposits over 30m |
| `container-resources` | `ContainerHighCPU`, `ContainerHighMemory`, `ContainerRestartingFrequently` | >90% CPU or memory limit for 10m, any restart in 15m, scoped to `transcendence-*` containers |
| `prometheus-self` | `PrometheusTargetMissing`, `PrometheusScrapeSlow` | Any `up == 0` for 5m, scrape duration > 5s for 5m |

Each rule uses Grafana's native two-stage format: a query (`refId: A`) against `prometheus_ds`, then a `threshold` expression (`refId: C`, `datasourceUid: __expr__`) that evaluates the condition — this is Grafana's alerting model, not raw PromQL alerting syntax, even though the underlying queries are the same ones you'd write directly against Prometheus.

**Notification routing (`policies.yml`):** everything defaults to the `discord-alerts` contact point; `severity: critical` alerts re-notify every 15m, `severity: warning` every 4h.

**Setup required before this is fully live:**
- `DISCORD_WEBHOOK_URL` **must** be set in `.env` for Grafana to start at all — `contactpoints.yml` validates the Discord integration at provisioning time and Grafana refuses to boot (crash-loops) if the URL is missing or malformed. This is not just "alerting won't fire," the whole container fails. `.env` currently ships a syntactically-valid placeholder (`https://discord.com/api/webhooks/000000000000000000/placeholder-replace-me`) so the stack boots in dev; replace it with a real webhook to actually receive alerts. `.env` is gitignored, so this never leaves your machine.
- The `app-logic` rule metric names (`logins_total`, `active_connections`, `deposit_amount_total`, `withdrawal_amount_total`) are now confirmed live — the backend emits all of them (see the Backend App Metrics section below) — but the alert thresholds themselves haven't been exercised under real load yet.
- No engine-health alert yet — nothing scrapes/exposes metrics from the C++ engine service

---

## Backend App Metrics

Exposed on `/metrics` via `prometheus/client_golang`, wired in `Backend/middleware/metrics.go`:

| Metric | Type | Labels | Where it's recorded |
|---|---|---|---|
| `http_requests_total` | Counter | `method`, `path`, `status` | `PrometheusMiddleware`, every request |
| `http_request_duration_seconds` | Histogram | `method`, `path` | `PrometheusMiddleware`, every request |
| `active_connections` | Gauge | — | `ws.AddConnection` (inc) / `ws.cleanupConnection` (dec) |
| `accounts_created_total` | Counter | — | `AuthHandler.Register`, on success |
| `logins_total` | Counter | `result` (`success`/`failure`) | `AuthHandler.Login` |
| `deposits_total`, `deposit_amount_total` | Counter | — | `UserHandler.Deposit`, on success |
| `withdrawals_total`, `withdrawal_amount_total` | Counter | — | `UserHandler.Withdraw`, on success |

Plus the free Go/process collectors (`go_*`, `process_*`) that `client_golang` registers automatically — no extra code, see the Backend Go Runtime dashboard.

`path` uses `c.FullPath()` (the route pattern, e.g. `/user/:id/friends`) rather than the raw URL, so per-request IDs don't blow up label cardinality.

---

## postgres-exporter

Collects Postgres internals (connections, cache hit ratio, transaction/row throughput, deadlocks, table bloat, DB/WAL size) for the `postgres-overview.json` dashboard.

- Image pinned to **v0.17.1** — v0.15.0's `stat_bgwriter` collector errors (`column "checkpoints_timed" does not exist`) against Postgres 18, since PG17+ moved checkpoint stats to `pg_stat_checkpointer`.
- `DATA_SOURCE_NAME` built from the same `DATABASE_USER`/`PASSWORD`/`NAME` vars the backend uses.
- Not port-mapped to the host; scraped internally by Prometheus only.

## node-exporter

Collects host-level CPU, memory, disk, and network metrics for the `host-containers.json` dashboard.

- Mounts `/proc`, `/sys`, and `/` read-only (as `/host/proc`, `/host/sys`, `/host/root`) with matching `--path.*` flags so reported paths (e.g. filesystem `mountpoint` labels) reflect the real host paths, not the container's own.
- `pid: host` so it can see host processes for its process collectors.
- Not port-mapped to the host; scraped internally by Prometheus only.

## cAdvisor

Collects per-container CPU, memory, and network stats.

- Runs `--privileged`, port `1337`
- Mounts (read-only): Docker socket (`/run/user/${UID}/docker.sock`), host `/` as `/rootfs`, `/sys`, `/var/lib/docker`
- **Note:** the Docker socket path (`/run/user/${UID}/docker.sock`) is rootless-Docker-specific — adjust `UID` per host (flagged with an inline comment in compose: `# adjust UID!`)
- Not port-mapped to the host; scraped internally by Prometheus only
- Confirmed working with full container-name labeling (`name`, `image`, `container_label_com_docker_compose_service`, etc.) under this rootless + `--privileged` setup — on hosts where cAdvisor can't reach the Docker socket at all (e.g. `userns-remap` without the above), it silently falls back to unlabeled raw cgroups instead of failing loudly, so a per-container dashboard going blank is the symptom to watch for.

---

## Caddy (as a monitored edge)

Caddy sits in front of frontend and backend and is scraped for request-rate/latency metrics via its admin endpoint (`:2019`), split into two server blocks:
- `srv0` — frontend
- `srv1` — backend

**Host ports:** `3333 → 80`, `3334 → 81`
**Mounts:** `caddy/conf` → `/etc/caddy`, `caddy/site` → `/srv`, plus named volumes `caddy_data` and `caddy_config` for internal state.

---

## Network & Compose Topology

**Relevant services:** `backend`, `caddy`, `prometheus`, `grafana`, `cadvisor`, `node-exporter`, `postgres-exporter`

**Networks:**
- `transcendence-network` — app-facing traffic (frontend, backend, engine, postgres, caddy, postgres-exporter, grafana)
- `monitoring-network` — observability traffic (backend's `/metrics`, caddy, prometheus, grafana, cadvisor, node-exporter, postgres-exporter)

`backend`, `caddy`, and `postgres-exporter` are dual-homed on both networks so Prometheus can scrape them without widening the app network's exposure; `grafana` is also dual-homed so its Postgres SQL datasource can reach `postgres:5432` directly. `node-exporter` and `cadvisor` are monitoring-network-only (they read the host/Docker directly via mounts, not through the app network). `monitoring-network` has a commented-out `internal: true` option in the compose file for locking it down further later.

**Named volumes used by this stack:** `prometheus_data`, `grafana_data`, `caddy_data`, `caddy_config`

**Makefile:** `PROD_SERVICES` in the root `Makefile` must list every service `make prod-up`/`prod-rebuild` should build and start — it's a plain list, not "everything in the compose file," so a new service is invisible to prod deploys until added there.

---

## Known Gaps / Next Steps

- Alert thresholds are provisioned and the datasource/metric-name wiring is verified end-to-end, but the rules themselves haven't been exercised under real triggering conditions (e.g. actually taking the backend down to confirm `BackendDown` fires and reaches Discord)
- No engine-health alert yet (nothing scrapes/exposes metrics from the C++ engine service)
- No structured application logging (zap/logrus) to complement metrics
- No error tracking (e.g. Sentry)
- cAdvisor's docker.sock mount path assumes rootless Docker with a specific `UID` — needs to be templated or documented per-environment before this is handed to anyone else
- `DISCORD_WEBHOOK_URL` in `.env` is a placeholder — replace with a real webhook to actually receive alerts
- Load testing and a security pass on the monitoring surface itself haven't happened yet
