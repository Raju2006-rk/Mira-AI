import type {
  AIProvider,
  ChatTurn,
  FixResult,
  PhrasingSuggestions,
  TutorContext,
  TutorReply,
  WordResult,
} from "./types";
import { LocalProvider } from "./local-provider";

/**
 * OpenAIProvider — talks to any OpenAI-compatible /chat/completions endpoint.
 *
 * Configured entirely via server-side env vars (OPENAI_API_KEY, OPENAI_BASE_URL,
 * OPENAI_MODEL). The API key is NEVER sent to the client — this class only runs
 * on the server.
 *
 * If a network/API error occurs, it transparently falls back to the offline
 * LocalProvider so the learner is never left with a broken experience.
 */
export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  private fallback = new LocalProvider();

  constructor(
    private apiKey: string,
    private baseUrl = process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1",
    private model = process.env.OPENAI_MODEL || "gpt-4o-mini",
  ) {}

  private systemPrompt(ctx: TutorContext): string {
    return [
      `You are Mira, a friendly, patient, encouraging personal English speaking coach.`,
      `The learner's level is ${ctx.level}. Their goals: ${(ctx.goals ?? []).join(", ") || "general fluency"}.`,
      `Prioritise communication first and correction second. Never be judgmental.`,
      `When correcting a beginner, never say "Incorrect"; say "Good attempt! A more natural way is...".`,
      `Keep replies short and conversational, and end by inviting the learner to keep speaking.`,
    ].join(" ");
  }

  private async call(
    messages: ChatTurn[],
    jsonSchemaHint?: string,
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: jsonSchemaHint
          ? [...messages, { role: "system", content: jsonSchemaHint }]
          : messages,
        temperature: 0.6,
        ...(jsonSchemaHint ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`AI provider responded ${res.status}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
  }

  async chat(messages: ChatTurn[], ctx: TutorContext): Promise<TutorReply> {
    try {
      const full: ChatTurn[] = [
        { role: "system", content: this.systemPrompt(ctx) },
        ...messages,
      ];
      const content = await this.call(
        full,
        `Respond ONLY with JSON: {"reply": string, "corrections": [{"original": string, "corrected": string, "category": "GRAMMAR"|"VOCABULARY"|"SENTENCE_FORMATION"|"PRONUNCIATION"|"FLUENCY"|"OTHER", "explanation": string}]}. Put the most important correction first; use an empty array if the sentence is fine.`,
      );
      const parsed = JSON.parse(content) as TutorReply;
      return {
        reply: parsed.reply ?? "",
        corrections: Array.isArray(parsed.corrections)
          ? parsed.corrections
          : [],
      };
    } catch {
      return this.fallback.chat(messages, ctx);
    }
  }

  async phrasing(
    idea: string,
    ctx: TutorContext,
  ): Promise<PhrasingSuggestions> {
    try {
      const content = await this.call(
        [
          { role: "system", content: this.systemPrompt(ctx) },
          { role: "user", content: `I want to say this: "${idea}"` },
        ],
        `Respond ONLY with JSON: {"simple": string, "polite": string, "professional": string, "note": string} giving the same idea in three registers of spoken English.`,
      );
      return JSON.parse(content) as PhrasingSuggestions;
    } catch {
      return this.fallback.phrasing(idea, ctx);
    }
  }

  async fix(sentence: string, ctx: TutorContext): Promise<FixResult> {
    try {
      const content = await this.call(
        [
          { role: "system", content: this.systemPrompt(ctx) },
          { role: "user", content: `Fix my English: "${sentence}"` },
        ],
        `Respond ONLY with JSON: {"simple": string, "natural": string, "professional": string, "why": string}.`,
      );
      return JSON.parse(content) as FixResult;
    } catch {
      return this.fallback.fix(sentence, ctx);
    }
  }

  async findWord(description: string, ctx: TutorContext): Promise<WordResult> {
    try {
      const content = await this.call(
        [
          { role: "system", content: this.systemPrompt(ctx) },
          {
            role: "user",
            content: `Find the right English word for: "${description}"`,
          },
        ],
        `Respond ONLY with JSON: {"word": string, "meaning": string, "example": string, "synonyms": string[], "usageNote": string}.`,
      );
      return JSON.parse(content) as WordResult;
    } catch {
      return this.fallback.findWord(description, ctx);
    }
  }
}
