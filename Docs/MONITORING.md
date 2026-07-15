# Transcendence Casino - Monitoring Stack

**Status:** Live in dev, provisioned dashboards, no alerting yet
**Components:** Prometheus, Grafana, cAdvisor, Caddy (as a scraped reverse proxy)

---

## Overview

The monitoring stack observes three things:
1. **App-level metrics** exposed by the Go backend itself (`prometheus/client_golang`)
2. **Edge metrics** from Caddy, the reverse proxy in front of frontend/backend
3. **Container-level metrics** from cAdvisor (CPU, memory, network per container)

Prometheus scrapes all three and Grafana visualizes them via two auto-provisioned dashboards.

---

## Directory Layout

```
monitoring/
├── grafana/
│   ├── dashboards/
│   │   ├── caddy-overview.json         # Frontend vs backend Caddy traffic/latency split
│   │   └── transcendence-overview.json # Platform-wide request/auth/deposit overview
│   └── provisioning/
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
- `provisioning/datasources/datasource.yml` — registers `Prometheus` (`http://prometheus:9090`) as the default, non-editable datasource with a 5s time interval
- `provisioning/dashboards/dashboard.yml` — file-based dashboard provider pointed at `/var/lib/grafana/dashboards`, `updateIntervalSeconds: 30`, `allowUiUpdates: true`, `disableDeletion: false`

**Dashboards:**

1. **`caddy-overview.json` — "Caddy: Frontend vs Backend"**
   Request rate, status-code mix, and latency, split by Caddy server block (`srv0` = frontend, `srv1` = backend). Panels: requests/sec, 2xx/4xx/5xx % (frontend and backend side by side), latency p50/p95/p99, and response size by service.

2. **`transcendence-overview.json` — "Transcendence Overview"**
   Platform-wide panels: request rate by HTTP method, 5xx error %, latency p50/p95, active WebSocket connections, account creations & logins (success/failure) per minute, deposits vs withdrawals $/min, and an all-time totals stat panel (accounts created, total logins, deposit/withdrawal counts and amounts).

---

## cAdvisor

Collects per-container CPU, memory, and network stats.

- Runs `--privileged`, port `1337`
- Mounts (read-only): Docker socket (`/run/user/${UID}/docker.sock`), host `/` as `/rootfs`, `/sys`, `/var/lib/docker`
- **Note:** the Docker socket path (`/run/user/${UID}/docker.sock`) is rootless-Docker-specific — adjust `UID` per host (marked `# UID anpassen!` in compose)
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

- No alerting rules yet on top of the existing scrape configs (error-rate, latency, engine health)
- No structured application logging (zap/logrus) to complement metrics
- No error tracking (e.g. Sentry)
- cAdvisor's docker.sock mount path assumes rootless Docker with a specific `UID` — needs to be templated or documented per-environment before this is handed to anyone else
- Load testing and a security pass on the monitoring surface itself haven't happened yet