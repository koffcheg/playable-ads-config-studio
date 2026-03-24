# Playable Ads Config Studio

A small full-stack monorepo for **generating structured playable-ad configurations** from constrained input, with deterministic fallback behavior and a lightweight internal UI for preview/history.

## Purpose

This project demonstrates how to put an LLM behind a reliable backend contract for game-ad prototyping:

- accept constrained generation inputs (game type, theme, audience, etc.)
- return a validated config object (not executable game code)
- persist generation history
- provide a simple frontend for generation, preview, and review

## Architecture (high level)

- `apps/api` — Fastify API, LLM provider selection (mock/OpenRouter), validation, persistence.
- `apps/web` — React + Vite internal tool UI.
- `packages/shared` — shared Zod schemas + TS types used by both API and web.

Flow:

1. Web posts generation input to API.
2. API validates input with Zod.
3. API calls selected provider (`mock` or `openrouter`).
4. API validates provider output against shared schema.
5. If validation fails, API emits a fallback config.
6. API stores input/output/provider metadata in MongoDB.
7. Web renders current result + history.

## Why generate config instead of raw AI game code?

For playable ads, structured config generation is safer and more production-friendly than accepting arbitrary model-generated runtime code:

- **Reliability:** schema-validated output reduces brittle runtime behavior.
- **Observability:** easier to inspect and debug typed fields than opaque generated code.
- **Security:** avoids executing arbitrary model output.
- **Iteration speed:** UI/engine can stay stable while prompts/config evolve.
- **Fallbackability:** invalid model output can degrade to deterministic defaults.

## Stack

- **Backend:** Node.js, TypeScript, Fastify, MongoDB, Zod
- **Frontend:** React, Vite, React Hook Form, Zod
- **Monorepo:** pnpm workspaces

## Local setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (optional but recommended for MongoDB via compose)

### Install

```bash
pnpm install
```

### Configure environment

```bash
cp .env.example .env
```

Update values as needed (especially OpenRouter settings if using that mode).

### Start services

If using local Mongo with Docker:

```bash
docker compose up -d
```

Run API + web in dev mode:

```bash
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:8080`

## Environment variables

Defined in `.env.example` (root). Key values:

- `PORT`, `HOST` — API bind settings
- `MONGO_URL`, `MONGO_DB_NAME` — Mongo connection
- `LLM_PROVIDER` — `mock` or `openrouter`
- `OPENROUTER_API_KEY` — required only for OpenRouter mode
- `OPENROUTER_MODEL` — required only for OpenRouter mode
- `OPENROUTER_TIMEOUT_MS` — OpenRouter request timeout in ms

## API endpoints

Base URL: `http://localhost:8080`

- `POST /api/v1/playable-ads/generate-config`
  - body: generation input schema from `packages/shared`
  - returns: playable ad config (`status: success|fallback`)
- `GET /api/v1/playable-ads`
  - returns recent generation history list
- `GET /api/v1/playable-ads/:id`
  - returns a full history record by generated output id

## Mock vs OpenRouter modes

### Mock mode (`LLM_PROVIDER=mock`)

- deterministic local provider
- no external API dependency
- best for local dev, demos, and contract testing

### OpenRouter mode (`LLM_PROVIDER=openrouter`)

- uses configured OpenRouter model via API key
- provider output is still schema-validated before use
- supports timeout protection (`OPENROUTER_TIMEOUT_MS`)

## What fallback means in this system

Fallback is a **safe, deterministic config** returned when provider output is invalid for the expected schema.

- API still returns a valid config contract.
- `status` is set to `fallback`.
- history persists provider + output metadata for debugging.
- system remains responsive even when model output quality is poor.

## Future improvements

- add API-level tests for success/fallback/timeout branches
- add request IDs + structured logging correlation
- expose lightweight generation metrics (success vs fallback rate)
- add Dockerized one-command local bootstrap for full stack
- optional auth + multi-user history scoping for production hardening
