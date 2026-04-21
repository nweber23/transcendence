.PHONY: help up down logs build rebuild clean ps dev-up dev-down

help:
	@echo "Transcendence Docker Commands"
	@echo "=============================="
	@echo "make up            - Start all services"
	@echo "make down          - Stop all services"
	@echo "make rebuild       - Rebuild images and start services"
	@echo "make build         - Build Docker images without starting"
	@echo "make logs          - View logs from all services"
	@echo "make logs-frontend - View logs from frontend only"
	@echo "make ps            - Show running containers"
	@echo "make clean         - Remove containers and images"
	@echo "make help          - Show this help message"

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

ps:
	docker compose ps

clean:
	docker compose down -v --rmi all

frontend-shell:
	docker compose exec frontend sh

dev-up:
	docker compose up

dev-down:
	docker compose down
