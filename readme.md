# OSRS AI Discord Bot

Monorepo for a multi-service Old School RuneScape Discord stack. The system includes two Discord bots, an OSRS API with caching, an n8n workflow, and supporting services (MongoDB, Redis, LocalAI).

## Services

- `bob/` - Primary Discord bot. Handles chat, slash commands, and n8n AI replies.
- `oldWiseMan/` - OSRS API and MongoDB-backed cache and profiles.
- `kingRoald/` - Admin Discord bot (health and orchestration commands).
- `n8n/` - Workflow definitions (AI agent, tools, callbacks).
- `local-ai` - LLM provider (LocalAI).
- `mongodb`, `redis` - Data and cache services.

## Quick Start (Docker)

1. `cp .env.example .env` and fill tokens and URLs.
2. `docker compose up --build`
3. Verify:
   - Bob health: `http://localhost:8889/health`
   - Old Wise Man health: `http://localhost:8888/health`
   - King Roald health: `http://localhost:8890/health`
   - n8n: `http://localhost:5678`

Ports:
- Bob: `8889`
- Old Wise Man: `8888`
- King Roald: `8890`
- n8n: `5678`
- LocalAI: `8080`

Stop:
```
docker compose down
```

## Local Development (Node 22)

Each service can be run standalone.

```bash
cp .env.example .env
# fill in tokens and URLs
```

Then for a service:
```bash
cd bob
npm install
npm start
```

## Environment Variables

All services load from the root `.env`. Start with `.env.example`.

Key entries:
- `BOB_DISCORD_TOKEN`, `BOB_DISCORD_CLIENT_ID`, `BOB_DISCORD_GUILD_ID`
- `BOBS_CHAT` - channel where Bob listens for messages
- `BOBS_THOUGHTS` - channel for n8n + AI debug logs
- `BOB_ALLOWED_BOT_IDS` - comma-separated bot IDs allowed to trigger Bob
- `BOB_URL`, `OLD_WISE_MAN_URL`
- `KING_ROALD_DISCORD_TOKEN`, `KING_ROALD_DISCORD_CLIENT_ID`
- `AI_BASE_URL`, `AI_MODEL`
- `N8N_WEBHOOK_URL`, `N8N_API_KEY`

## Health

Each service exposes `GET /health` with:
- Service checks and latency
- PST timestamps
- Hostname, CPU, memory, and GPU metrics (if available)
- Error summaries

## n8n Workflow

See `n8n/README.md` for workflow details. The workflow uses:
- Webhook: `POST /webhook/bob-prompt`
- Callback: `POST BOB_URL/ai/callback/:sessionId`

## Testing

Quick smoke test for Bob chat:
```bash
node kingRoald/test-bob-chat.mjs
```

## Troubleshooting

- 404 from n8n: import and activate the workflow, and confirm `N8N_WEBHOOK_URL`.
- No AI response: check `BOBS_THOUGHTS` for webhook + callback logs.
- LocalAI not ready: check `http://localhost:8080/readyz`.
- Redis or Mongo issues: verify `docker compose ps` shows healthy services.
