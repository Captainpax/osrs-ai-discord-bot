# n8n Workflows

Workflow definitions used by Bob's AI agent.

## Bob Prompt Workflow

File: `n8n/workflows/bob-prompt.json`

Key behavior:
- Webhook: `POST /webhook/bob-prompt`
- Health shortcut: status questions route directly to `GET BOB_URL/health`
- AI Agent: LocalAI + Redis memory + OSRS tools + health tool
- Callback: `POST BOB_URL/ai/callback/:sessionId`

## Setup

Bob attempts to sync this workflow on startup if `N8N_API_KEY` is set.

Manual import steps:
1. Open n8n (default `http://localhost:5678`).
2. Add credentials:
   - OpenAI API (LocalAI can use any key string)
   - Redis (`redis:6379`)
3. Import the workflow JSON.
4. Save and activate the workflow.

## Required Env

- `N8N_WEBHOOK_URL`
- `N8N_API_KEY`
- `BOB_URL`
- `AI_BASE_URL`, `AI_MODEL`

## Notes

- Bob passes `sessionId`, `channelId`, and `thoughtsChannelId` in the webhook payload.
- Use `BOBS_THOUGHTS` to capture debug logs in Discord.
