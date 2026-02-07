# Bob Discord Bot

Bob is the primary Discord bot. It handles chat, slash commands, and n8n-driven AI replies.

## Requirements

- Node.js 22+
- Discord bot token + app ID

## Environment Variables

Uses the root `.env` file.

Required:
- `BOB_DISCORD_TOKEN`
- `BOB_DISCORD_CLIENT_ID`

Recommended:
- `BOB_DISCORD_GUILD_ID` (dev-only command registration)
- `BOBS_CHAT` (channel where Bob listens)
- `BOBS_THOUGHTS` (channel for n8n + AI logs)
- `BOB_PORT` (default `8889`)
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
docker-compose up --build
```

## Commands

- `/bob-ping`
- `/os ...` (stats, quest, boss, wiki, price)

## Notes

- n8n callbacks are session-based: `POST /ai/callback/:sessionId`.
- Check `BOBS_THOUGHTS` for webhook and callback logs.

