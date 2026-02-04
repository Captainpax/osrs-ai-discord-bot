# Bob Discord Bot

Bob is the Discord bot client in the OSRS AI project. It connects to Discord, registers slash commands, and handles user interactions.

## Requirements

- Node.js 22 or higher
- npm (bundled with Node.js)
- A Discord application and bot token from the Discord Developer Portal

## Environment Variables

Copy the example file and fill in your values:
```bash
cp .env.example .env
```
- `DISCORD_TOKEN` — Your bot token
- `DISCORD_CLIENT_ID` — Your application (client) ID
- `DISCORD_GUILD_ID` — Optional: a test guild ID for instant slash-command updates during development
- `DEBUG` — Optional: set to `true` for verbose logs

## Local Setup (Node 22)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the bot:
   ```bash
   npm start
   ```

## Run with Docker

A Dockerfile is provided (Node 22 base image). From the project root, you can also use Docker Compose to start all services:
```bash
# From project root
docker-compose up --build
```

To run just Bob with Docker (from `bob/`):
```bash
docker build -t osrs-bob .
# Ensure you pass the .env variables
docker run --env-file ./.env --name bob osrs-bob
```

## Commands

- `/ping` — Replies with "Pong!"

## Notes

- Commands are registered per-guild if `DISCORD_GUILD_ID` is set; otherwise they are registered globally (may take time to propagate).
- The bot includes a graceful shutdown handler and centralized logging.
