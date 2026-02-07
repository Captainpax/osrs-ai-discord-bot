### n8n Workflows for Bob

This directory contains n8n workflows for Bob's AI capabilities.

#### Bob Prompt Workflow (`bob-prompt.json`)

This workflow allows Bob to respond to messages using LocalAI. It listens for a POST request on the `/webhook/bob-prompt` endpoint.

**Setup Instructions:**

1. Open your n8n instance (usually at `http://localhost:5678`).
2. **Setup Credentials:**
    - Go to the **Credentials** tab on the left.
    - Click **Add Credential** and search for **OpenAI API**.
    - For LocalAI, enter any string as the **API Key** (it's required by n8n but ignored by LocalAI).
    - If you are using real OpenAI, enter your actual key.
3. Click on the **Workflows** tab on the left.
4. Click on the **Add Workflow** button (top right).
5. Click on the three dots menu (**...**) in the top right and select **Import from File**.
6. Select the `n8n/workflows/bob-prompt.json` file from this project.
7. Once imported, click the **Save** button.
8. Click the **Active** toggle in the top right to enable the production webhook.

**Technical Details:**

- **Webhook Path:** `bob-prompt`
- **Method:** `POST`
- **Nodes:**
    - **Webhook**: Receives the prompt from Bob.
    - **Respond to Webhook**: Returns an immediate "processing" status to Bob.
    - **AI Agent1**: The core brain that processes the prompt using the model, memory, and tools.
    - **OpenAI Chat Model**: Connects to your LocalAI instance using environment variables (`AI_BASE_URL` and `AI_MODEL`). **Note:** You must select the OpenAI API credential you created in step 2.
    - **Simple Memory**: Provides conversational memory for the agent.
    - **HTTP Request**: A generic tool that allows the AI Agent to fetch information from the web.
    - **OSRS Stats Tool**: A specialized tool for looking up OSRS player statistics from the Old Wise Man API.
    - **Edit Fields**: Pass-through or transformation node before callback.
    - **Bob Callback**: Sends the final AI-generated response back to Bob's REST API.

**Note:** Ensure your LocalAI service is running and accessible at the address specified in your `.env` file.
