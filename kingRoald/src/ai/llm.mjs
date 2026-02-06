import { ChatOpenAI } from "@langchain/openai";
import { AI_BASE_URL, AI_MODEL, OPENAI_API_KEY } from "../utility/loadedVariables.mjs";

/**
 * @module AI/LLM
 * @description Minimal LangChain setup for King Roald. Provides a ChatOpenAI client and a simple helper.
 */

/**
 * Creates a ChatOpenAI instance. Uses AI_BASE_URL and AI_MODEL from env if available.
 * @param {object} [options]
 * @param {string} [options.model]
 * @param {number} [options.temperature=0.2]
 */
export function createOpenAIChat({ model = AI_MODEL, temperature = 0.2 } = {}) {
  const apiKey = OPENAI_API_KEY || "no-key-required";
  
  const config = {
    apiKey,
    model,
    temperature,
  };

  if (AI_BASE_URL) {
    config.configuration = {
      baseURL: AI_BASE_URL,
    };
  }

  return new ChatOpenAI(config);
}

/**
 * Simple convenience helper to get a response from the model.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function simpleAnswer(prompt) {
  const chat = createOpenAIChat({});
  const res = await chat.invoke([{ role: "user", content: prompt }]);
  const first = Array.isArray(res?.content) ? res.content[0]?.text : res?.content;
  return first ?? String(res);
}
