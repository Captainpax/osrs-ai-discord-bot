# King Roald Service

King Roald is a secondary service and Discord bot in the OSRS AI project.

## Requirements

- Node.js 22 or higher
- npm (bundled with Node.js)
- A Discord application and bot token from the Discord Developer Portal

## Environment Variables

This service uses the centralized `.env` file in the project root.
- `KING_ROALD_DISCORD_TOKEN` — Your bot token
- `KING_ROALD_DISCORD_CLIENT_ID` — Your application (client) ID
- `KING_ROALD_DISCORD_GUILD_ID` — Optional: a test guild ID for instant slash-command updates during development
- `DEBUG` — Optional: set to `true` for verbose logs
- `KING_ROALD_PORT` — The port for the API (default 8890)
- `MONGODB_URI` — Connection string for MongoDB
- `OPENAI_API_KEY` — Required for LangChain OpenAI models

## Local Setup (Node 22)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the service:
   ```bash
   npm start
   ```

## Run with Docker

A Dockerfile is provided. From the project root:
```bash
docker-compose up --build
```

## Commands

- `/king-ping` — Replies with "King Roald says Pong!"
