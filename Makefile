.PHONY: help up down logs logs-frontend logs-backend build rebuild clean ps frontend-shell backend-shell db-shell dev-up dev-down test retest

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
	@echo "make help           - Show this help message"

up:
	docker compose up -d

down:
	docker compose down

rebuild:
	docker compose down
	docker compose up -d --build

build:
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
	docker compose up

dev-down:
	docker compose down

test:
	docker exec transcendence-backend /app/test.sh

retest: rebuild test