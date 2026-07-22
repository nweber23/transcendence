.PHONY: help up down logs logs-frontend logs-backend build rebuild clean ps frontend-shell backend-shell db-shell dev-up dev-down test retest prod-up prod-down prod-rebuild prod-logs

help:
	@echo "Transcendence Docker Commands"
	@echo "=============================="
	@echo "make up             - Start all services"
	@echo "make down           - Stop all services"
	@echo "make rebuild        - Rebuild images and start services"
	@echo "make build          - Build Docker images without starting"
	@echo "make logs           - View logs from all services"
	@echo "make logs-frontend  - View logs from frontend only"
	@echo "make logs-backend   - View logs from backend only"
	@echo "make ps             - Show running containers"
	@echo "make clean          - Remove containers and images"
	@echo "make frontend-shell - Opens frontend container shell"
	@echo "make backend-shell  - Opens backend container shell"
	@echo "make db-shell       - Opens database shell"
	@echo "make prod-up        - Start production stack (transcendence.nweber.me)"
	@echo "make prod-down      - Stop production stack"
	@echo "make prod-rebuild   - Rebuild images and start production stack"
	@echo "make prod-logs      - View logs from production stack"
	@echo "make help           - Show this help message"

up:
	UID=$$(id -u) docker compose up -d

down:
	docker compose down

rebuild:
	cp engine.proto Engine
	cp engine.proto Backend
	docker compose down
	UID=$$(id -u) docker compose up -d --build

build:
	cp engine.proto Engine
	cp engine.proto Backend
	docker compose build

logs:
	docker compose logs -f

logs-frontend:
	docker compose logs -f frontend

logs-backend:
	docker compose logs -f backend

ps:
	docker compose ps

clean:
	docker compose down -v --rmi all

frontend-shell:
	docker compose exec frontend sh

backend-shell:
	docker compose exec backend sh

db-shell:
	@. ./.env && docker compose exec postgres psql -U $$DATABASE_USER -d $$DATABASE_NAME

dev-up:
	UID=$$(id -u) docker compose up

dev-down:
	docker compose down

test:
	docker exec transcendence-backend /app/test.sh

retest: rebuild test

# nginx on the VPS host terminates public TLS and forwards to caddy's
# loopback ports; caddy stays in the stack behind it for access logs and
# the Prometheus metrics Grafana's dashboards use.
PROD_SERVICES := postgres postgres-exporter engine backend frontend prometheus grafana caddy cadvisor node-exporter

prod-up:
	UID=$$(id -u) docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build $(PROD_SERVICES)

prod-down:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

prod-rebuild:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down
	UID=$$(id -u) docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build $(PROD_SERVICES)

prod-logs:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f