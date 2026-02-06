# OSRS AI Discord Bot Project

This monorepo contains multiple services that together power an OSRS AI experience on Discord.

## Project Structure

- `bob/` — Discord bot client (slash commands, interactions)
- `oldWiseMan/` — API and backend service (HTTP, DB, business logic)
- `kingRoald/` — Secondary Discord bot and service

## Requirements

- Docker + Docker Compose (recommended way to run everything)
- OR Node.js 22+ for local development (services enforce this via `engines`)
- Centralized `.env` file in the project root (use `.env.example` template)

## Quick Start (Docker Compose)

From the repository root:
```bash
docker-compose up --build
```
This will build images (using Node 22 base images) and start:
- `bob` (Discord bot on port 8889)
- `old-wise-man` (API on port 8888)
- `king-roald` (Discord bot on port 8890)

To stop and remove containers:
```bash
docker-compose down
```

## Local Development (Node 22)

- Bob (Discord bot): see `bob/readme.md` for detailed steps. In short:
  ```bash
  cd bob
  cp .env.example .env  # then fill in values
  npm install
  npm start
  ```

- Old Wise Man (API): similar process inside `oldWiseMan/` (ensure `.env` is set, port defaults to 8888).

## Notes

- All Dockerfiles use `node:22-slim`.
- `package.json` in each service (where applicable) sets `engines.node` to `>=22`.
- For development convenience, Bob supports per-guild command registration via `DISCORD_GUILD_ID` for instant updates.

## Documentation

- `bob/readme.md` — detailed bot setup and usage
- `oldWiseMan/` — API internals and utility modules (logger, env loading)
