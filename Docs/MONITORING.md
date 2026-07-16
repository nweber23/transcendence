# Transcendence Casino - Monitoring Stack

**Status:** Live in dev, provisioned dashboards, Grafana-native alerting provisioned
**Components:** Prometheus, Grafana, cAdvisor, Caddy (as a scraped reverse proxy)

---

## Overview

The monitoring stack observes three things:
1. **App-level metrics** exposed by the Go backend itself (`prometheus/client_golang`)
2. **Edge metrics** from Caddy, the reverse proxy in front of frontend/backend
3. **Container-level metrics** from cAdvisor (CPU, memory, network per container)

Prometheus scrapes all three and Grafana visualizes them via two auto-provisioned dashboards. Grafana's own Unified Alerting evaluates rules against Prometheus and handles notification routing on top.

---

## Directory Layout

```
monitoring/
├── grafana/
│   ├── dashboards/
│   │   ├── caddy-overview.json         # Frontend vs backend Caddy traffic/latency split
│   │   └── transcendence-overview.json # Platform-wide request/auth/deposit overview
│   └── provisioning/
│       ├── alerting/
│       │   ├── rules.yml               # Alert rules (PromQL query + threshold), grouped by concern
│       │   ├── contactpoints.yml       # Where alerts get sent (Discord webhook)
│       │   └── policies.yml            # Routing: severity -> contact point, repeat interval
│       ├── dashboards/
│       │   └── dashboard.yml           # Points Grafana at /var/lib/grafana/dashboards
│       └── datasources/
│           └── datasource.yml          # Registers Prometheus as the default datasource
└── prometheus/
    └── prometheus.yml                  # Scrape configs: backend, prometheus, caddy, cadvisor
```

---

## Prometheus

**Config:** `monitoring/prometheus/prometheus.yml`

- Global `scrape_interval` and `evaluation_interval`: 5s

**Scrape jobs:**
| Job | Target | Notes |
|-----|--------|-------|
| `transcendence-backend` | `backend:8080` | Scrapes `/metrics`, labeled `service: backend` |
| `prometheus` | `localhost:9090` | Self-scrape, confirms the server is alive |
| `caddy` | `caddy:2019` | Caddy's admin/metrics endpoint |
| `cadvisor` | `cadvisor:1337` | Explicit 5s scrape interval |

Prometheus is **not port-mapped to the host** in any environment — it's reachable only from other containers on `monitoring-network` (i.e. by Grafana).

---

## Grafana

**Access:** `http://localhost:3000` in dev, using `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` from `.env`. `docker-compose.prod.yml` drops this port mapping entirely so no monitoring port is exposed publicly in production.

**Provisioning (auto-applied on startup):**
- `provisioning/datasources/datasource.yml` — registers `Prometheus` (`http://prometheus:9090`) as the default, non-editable datasource with a 5s time interval, and an explicit `uid: prometheus_ds` so alert rules can reference it by a stable ID
- `provisioning/dashboards/dashboard.yml` — file-based dashboard provider pointed at `/var/lib/grafana/dashboards`, `updateIntervalSeconds: 30`, `allowUiUpdates: true`, `disableDeletion: false`
- `provisioning/alerting/` — alert rules, contact points, and notification policies (see [Alerting](#alerting) below)

**Dashboards:**

1. **`caddy-overview.json` — "Caddy: Frontend vs Backend"**
   Request rate, status-code mix, and latency, split by Caddy server block (`srv0` = frontend, `srv1` = backend). Panels: requests/sec, 2xx/4xx/5xx % (frontend and backend side by side), latency p50/p95/p99, and response size by service.

2. **`transcendence-overview.json` — "Transcendence Overview"**
   Platform-wide panels: request rate by HTTP method, 5xx error %, latency p50/p95, active WebSocket connections, account creations & logins (success/failure) per minute, deposits vs withdrawals $/min, and an all-time totals stat panel (accounts created, total logins, deposit/withdrawal counts and amounts).

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
- Add `DISCORD_WEBHOOK_URL` to `.env` and pass it into the `grafana` service's `environment` block (same pattern as `GRAFANA_ADMIN_USER`/`GRAFANA_ADMIN_PASSWORD`) — Grafana provisioning files support `${VAR}` substitution from the container's environment
- Confirm the metric names used in `app-logic` (`logins_total`, `active_connections`, `deposit_amount_total`, `withdrawal_amount_total`) match what the backend actually exposes on `/metrics` — these were inferred from the existing `transcendence-overview.json` dashboard queries
- No engine-health alert yet — nothing scrapes/exposes metrics from the C++ engine service

---

## cAdvisor

Collects per-container CPU, memory, and network stats.

- Runs `--privileged`, port `1337`
- Mounts (read-only): Docker socket (`/run/user/${UID}/docker.sock`), host `/` as `/rootfs`, `/sys`, `/var/lib/docker`
- **Note:** the Docker socket path (`/run/user/${UID}/docker.sock`) is rootless-Docker-specific — adjust `UID` per host (flagged with an inline comment in compose: `# adjust UID!`)
- Not port-mapped to the host; scraped internally by Prometheus only

---

## Caddy (as a monitored edge)

Caddy sits in front of frontend and backend and is scraped for request-rate/latency metrics via its admin endpoint (`:2019`), split into two server blocks:
- `srv0` — frontend
- `srv1` — backend

**Host ports:** `3333 → 80`, `3334 → 81`
**Mounts:** `caddy/conf` → `/etc/caddy`, `caddy/site` → `/srv`, plus named volumes `caddy_data` and `caddy_config` for internal state.

---

## Network & Compose Topology

**Relevant services:** `backend`, `caddy`, `prometheus`, `grafana`, `cadvisor`

**Networks:**
- `transcendence-network` — app-facing traffic (frontend, backend, engine, postgres, caddy)
- `monitoring-network` — observability traffic (backend's `/metrics`, caddy, prometheus, grafana, cadvisor)

`backend` and `caddy` are dual-homed on both networks so Prometheus can scrape them without widening the app network's exposure; everything else is single-homed. `monitoring-network` has a commented-out `internal: true` option in the compose file for locking it down further later.

**Named volumes used by this stack:** `prometheus_data`, `grafana_data`, `caddy_data`, `caddy_config`

---

## Known Gaps / Next Steps

- Alerting is provisioned but unverified end-to-end: `DISCORD_WEBHOOK_URL` needs to be set and the `app-logic` rule metric names need to be confirmed against what the backend actually exposes
- No engine-health alert yet (nothing scrapes/exposes metrics from the C++ engine service)
- No structured application logging (zap/logrus) to complement metrics
- No error tracking (e.g. Sentry)
- cAdvisor's docker.sock mount path assumes rootless Docker with a specific `UID` — needs to be templated or documented per-environment before this is handed to anyone else
- Load testing and a security pass on the monitoring surface itself haven't happened yet