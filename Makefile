SHELL := /bin/bash

# Variables
ROOT_DIR           := $(shell pwd)
DOCKER_COMPOSE_YML := $(ROOT_DIR)/docker-compose.yml

.PHONY: dev dev-ui dev-bff install install-ui install-bff \
        build build-ui build-bff start \
        lint lint-ui lint-bff lint-fix format typecheck test \
        up down logs reset rebuild clean \
        docker-build docker-run help

# --------------------------------------------------
# Desarrollo local (sin Docker)
# --------------------------------------------------
dev: ## Levanta UI + BFF en paralelo
	@echo "Starting UI + BFF..."
	@(cd api && yarn dev) & (cd ui && yarn dev) & wait

dev-ui: ## Levanta solo la UI (Vite)
	@echo "Starting UI..."
	@cd ui && yarn dev

dev-bff: ## Levanta solo el BFF (Express)
	@echo "Starting BFF..."
	@cd api && yarn dev

# --------------------------------------------------
# Instalación de dependencias
# --------------------------------------------------
install: install-ui install-bff ## Instala dependencias de UI y BFF

install-ui: ## Instala dependencias de la UI
	@echo "Installing UI dependencies..."
	@cd ui && yarn install --frozen-lockfile

install-bff: ## Instala dependencias del BFF
	@echo "Installing BFF dependencies..."
	@cd api && yarn install --frozen-lockfile

# --------------------------------------------------
# Build
# --------------------------------------------------
build: build-ui build-bff ## Build completo (UI + BFF)
	@echo "Moving UI assets to BFF public..."
	@mkdir -p api/dist/public && cp -r ui/dist/* api/dist/public

build-ui: ## Build de la UI (tsc + vite)
	@echo "Building UI..."
	@cd ui && yarn build

build-bff: ## Build del BFF (tsc)
	@echo "Building BFF..."
	@cd api && yarn build

start: ## Arranca el BFF en producción (requiere build previo)
	@echo "Starting production server..."
	@cd api && yarn start

# --------------------------------------------------
# Calidad de código
# --------------------------------------------------
lint: lint-ui lint-bff ## Lint de UI + BFF

lint-ui: ## Lint de la UI
	@echo "Linting UI..."
	@cd ui && yarn lint

lint-bff: ## Lint del BFF
	@echo "Linting BFF..."
	@cd api && yarn lint

lint-fix: ## Lint fix de UI + BFF
	@echo "Fixing lint issues..."
	@cd ui && yarn lint:fix
	@cd api && yarn lint:fix

format: ## Formatea código de la UI (Prettier)
	@echo "Formatting UI..."
	@cd ui && yarn format

typecheck: ## Type-check de la UI (tsc --noEmit)
	@echo "Type-checking UI..."
	@cd ui && yarn typecheck

test: ## Corre tests de la UI (vitest)
	@echo "Running tests..."
	@cd ui && yarn test

# --------------------------------------------------
# Docker Compose (desarrollo)
# --------------------------------------------------
up: ## Levanta servicios con Docker Compose
	@echo "Starting services (compose up)..."
	docker compose -f $(DOCKER_COMPOSE_YML) up

down: ## Baja servicios
	@echo "Stopping services (compose down)..."
	docker compose -f $(DOCKER_COMPOSE_YML) down --remove-orphans

logs: ## Tail de logs de los servicios
	@echo "Tailing logs..."
	docker compose -f $(DOCKER_COMPOSE_YML) logs -f

reset: down up ## Reinicia servicios (down + up)

rebuild: clean up ## Limpia y levanta de cero
	@echo "Rebuild completed."

clean: ## Baja servicios, borra volúmenes y artefactos de build
	@echo "Cleaning everything..."
	@docker compose -f $(DOCKER_COMPOSE_YML) down -v --remove-orphans 2>/dev/null || true
	@rm -rf ui/dist api/dist
	@echo "Clean completed."

# --------------------------------------------------
# Docker build (imagen de producción)
# --------------------------------------------------
docker-build: ## Construye la imagen Docker de producción
	@echo "Building production Docker image..."
	docker build -t ponti-frontend:latest .

docker-run: ## Corre la imagen Docker de producción
	@echo "Running production Docker image..."
	docker run --rm -p 3000:3000 --env-file api/.env ponti-frontend:latest

# --------------------------------------------------
# Help
# --------------------------------------------------
help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
