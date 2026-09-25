import type { AIProvider } from "./types";
import { LocalProvider } from "./local-provider";
import { OpenAIProvider } from "./openai-provider";

export * from "./types";

let cached: AIProvider | null = null;

/**
 * Returns the configured AI provider. Selection is driven purely by env vars,
 * so the underlying AI service is replaceable without code changes.
 *
 *   AI_PROVIDER=local   -> offline rule-based tutor (default)
 *   AI_PROVIDER=openai  -> OpenAI-compatible endpoint (requires OPENAI_API_KEY)
 *
 * This runs server-side only; API keys never reach the browser.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const which = (process.env.AI_PROVIDER || "local").toLowerCase();

  if (which === "openai" && process.env.OPENAI_API_KEY) {
    cached = new OpenAIProvider(process.env.OPENAI_API_KEY);
  } else {
    cached = new LocalProvider();
  }
  return cached;
}
