# Bob Discord Bot

Bob is the primary Discord bot. It handles chat, slash commands, and n8n-driven AI replies.

## Responsibilities

- Listens for messages in `BOBS_CHAT` and triggers n8n when users mention or reply to Bob.
- Sends debug logs and AI traces to `BOBS_THOUGHTS`.
- Exposes `GET /health` with system metrics and dependency checks.

## Message Flow

1. User posts a message in `BOBS_CHAT` that mentions Bob or includes "bob".
2. Bob replies with a short status message and sends a webhook payload to n8n.
3. n8n processes the request and calls back `POST /ai/callback/:sessionId`.
4. Bob edits the status message with the final response.

## Environment Variables

Uses the root `.env` file.

Required:
- `BOB_DISCORD_TOKEN`
- `BOB_DISCORD_CLIENT_ID`

Recommended:
- `BOB_DISCORD_GUILD_ID` (dev-only command registration)
- `BOBS_CHAT` (channel where Bob listens)
- `BOBS_THOUGHTS` (channel for n8n + AI logs)
- `BOB_ALLOWED_BOT_IDS` (comma-separated bot IDs allowed to trigger Bob)
- `BOB_PORT` (default `8889`)
- `BOB_URL`
- `N8N_WEBHOOK_URL`
- `N8N_API_KEY`
- `AI_BASE_URL`, `AI_MODEL`

## Local Run

```bash
npm install
npm start
```

## Docker

From repo root:
```bash
docker compose up --build
```

## Commands

- `/bob-ping`
- `/os ...` (stats, quest, boss, wiki, price)

## Notes

- n8n callbacks are session-based: `POST /ai/callback/:sessionId`.
- Check `BOBS_THOUGHTS` for webhook and callback logs.
