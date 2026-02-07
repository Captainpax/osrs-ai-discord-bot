# OSRS AI Discord Bot

Monorepo for a multi-service Old School RuneScape Discord experience. The stack includes two Discord bots, an OSRS API, an n8n workflow, and supporting services (MongoDB, Redis, LocalAI).

## Services

- `bob/` - Discord bot that handles chat, slash commands, and n8n AI responses.
- `oldWiseMan/` - OSRS API + MongoDB-backed cache and profiles.
- `kingRoald/` - Admin Discord bot (health + orchestration commands).
- `n8n/` - Workflow definitions (AI agent, tools, callbacks).

## Quick Start (Docker)

```bash
docker-compose up --build
```

Ports:
- Bob: `8889`
- Old Wise Man: `8888`
- King Roald: `8890`
- n8n: `5678`
- LocalAI: `8080`

Stop:
```bash
docker-compose down
```

## Local Development (Node 22)

Each service is standalone. From the root:

```bash
cp .env.example .env
# fill in tokens and URLs
```

Then in each service:
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
- `OLD_WISE_MAN_URL`, `OLD_WISE_MAN_PORT`
- `KING_ROALD_DISCORD_TOKEN`, `KING_ROALD_DISCORD_CLIENT_ID`
- `AI_BASE_URL`, `AI_MODEL`
- `N8N_WEBHOOK_URL`, `N8N_API_KEY`

## Health

Each service exposes `GET /health` with system metrics, service checks, and PST timestamps.

## n8n Workflow

See `n8n/README.md` for import steps. The workflow uses:
- `/webhook/bob-prompt`
- callbacks to `BOB_URL/ai/callback/:sessionId`

## Troubleshooting

- 404 from n8n: import + activate the workflow and confirm `N8N_WEBHOOK_URL`.
- No AI response: check `BOBS_THOUGHTS` for webhook + callback logs.
- Slow AI: verify `AI_BASE_URL` and LocalAI health at `/readyz`.

