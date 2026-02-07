# King Roald

King Roald is the admin bot. It provides operational commands and health visibility.

## Requirements

- Node.js 22+
- Discord bot token + app ID

## Environment Variables

Uses the root `.env` file.

Required:
- `KING_ROALD_DISCORD_TOKEN`
- `KING_ROALD_DISCORD_CLIENT_ID`

Recommended:
- `KING_ROALD_DISCORD_GUILD_ID` (dev-only command registration)
- `KING_ROALD_PORT` (default `8890`)
- `BOB_URL`, `OLD_WISE_MAN_URL`

## Local Run

```bash
npm install
npm start
```

## Commands

- `/king-ping`
- `/admin pushleaderboard`
- `/admin health` (paged health summary + per-service details)

