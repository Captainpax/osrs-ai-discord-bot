# King Roald

King Roald is the admin bot. It provides operational commands and cluster health visibility.

## Responsibilities

- `/admin health` shows a paged health report (summary + per-service details).
- `/admin pushleaderboard` triggers a leaderboard update via Bob.
- Exposes `GET /health` with system metrics and dependency checks.

## Environment Variables

Uses the root `.env` file.

Required:
- `KING_ROALD_DISCORD_TOKEN`
- `KING_ROALD_DISCORD_CLIENT_ID`

Recommended:
- `KING_ROALD_DISCORD_GUILD_ID` (dev-only command registration)
- `KING_ROALD_PORT` (default `8890`)
- `BOB_URL`, `OLD_WISE_MAN_URL`
- `AI_BASE_URL` (optional for health checks)
- `N8N_WEBHOOK_URL` (optional for health checks)

## Local Run

```bash
npm install
npm start
```

## Commands

- `/king-ping`
- `/admin pushleaderboard`
- `/admin health` (paged health summary + per-service details)
