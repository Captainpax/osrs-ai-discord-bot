# Old Wise Man API

HTTP API for OSRS stats, wiki lookups, pricing, profiles, and caching.

## Responsibilities

- OSRS hiscores and skill lookups
- Wiki, boss, quest, and price search
- Profile linking and authentication
- MongoDB-backed caching
- `GET /health` with system metrics and OSRS ping

## Environment Variables

Uses the root `.env` file.

Required:
- `OLD_WISE_MAN_PORT` (default `8888`)
- `MONGODB_URI`
- `JWT_SECRET`

## Local Run

```bash
npm install
npm start
```

## Core Endpoints

Health:
- `GET /health`

OSRS:
- `GET /osrs/ping`
- `GET /osrs/stats/:identifier`
- `GET /osrs/stats/:identifier/skill/:skill`
- `GET /osrs/stats/:identifier/boss/:boss`
- `GET /osrs/stats/:identifier/clues/:clue`
- `GET /osrs/stats/:identifier/minigames/:minigame`
- `GET /osrs/wiki/:query`
- `GET /osrs/wiki/page/:title`
- `GET /osrs/price/:item`
- `GET /osrs/quest/:name`
- `GET /osrs/boss/:name`

Profiles:
- `POST /profile/create`
- `POST /profile/login`
- `POST /profile/logout`
- `POST /profile/ensure`
- `POST /profile/link` (JWT)
- `POST /profile/unlink` (JWT)
- `POST /profile/levels`
- `DELETE /profile/delete` (JWT)

Settings:
- `POST /settings/server`
- `GET /settings/server/:guildId`

## Notes

- Uses MongoDB TTL caching for wiki and price data.
- Hiscores pings are used for OSRS connectivity checks.
