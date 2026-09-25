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
 * GeminiProvider — talks to the Google Gemini (Generative Language) API.
 *
 * Gemini's REST shape differs from OpenAI's:
 *   - Endpoint:  {baseUrl}/models/{model}:generateContent
 *   - Auth:      x-goog-api-key header (key is server-side only, never sent
 *                to the browser)
 *   - Body:      { systemInstruction, contents: [{ role, parts: [{text}] }],
 *                  generationConfig }
 *   - Roles:     "user" and "model" (there is no "assistant"/"system" role;
 *                the system prompt goes in `systemInstruction`)
 *   - JSON mode: generationConfig.responseMimeType = "application/json"
 *   - Response:  candidates[0].content.parts[].text
 *
 * Configured entirely via server-side env vars (GEMINI_API_KEY, GEMINI_MODEL,
 * GEMINI_BASE_URL). On any network/API/parse error it transparently falls back
 * to the offline LocalProvider so the learner is never stuck.
 */

interface GeminiPart {
  text: string;
}
interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  promptFeedback?: { blockReason?: string };
}

export class GeminiProvider implements AIProvider {
  readonly id = "gemini";
  private fallback = new LocalProvider();

  constructor(
    private apiKey: string,
    private model = process.env.GEMINI_MODEL || "gemini-1.5-flash",
    private baseUrl = process.env.GEMINI_BASE_URL ||
      "https://generativelanguage.googleapis.com/v1beta",
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

  /** Map the app's neutral ChatTurn[] onto Gemini's contents[] shape. */
  private toContents(messages: ChatTurn[]): GeminiContent[] {
    return (
      messages
        // The system turn is handled via systemInstruction, so drop it here.
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }))
    );
  }

  private async call(
    systemInstruction: string,
    messages: ChatTurn[],
    opts?: { json?: boolean },
  ): Promise<string> {
    const url = `${this.baseUrl}/models/${this.model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Key travels only server -> Google, never to the client.
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: this.toContents(messages),
        generationConfig: {
          temperature: 0.6,
          ...(opts?.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini responded ${res.status}`);
    }

    const data = (await res.json()) as GeminiResponse;
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);
    }
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p) => p.text ?? "").join("");
  }

  /** Strip ```json fences some models add, then JSON.parse. */
  private parseJson<T>(raw: string): T {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    return JSON.parse(cleaned) as T;
  }

  async chat(messages: ChatTurn[], ctx: TutorContext): Promise<TutorReply> {
    try {
      const hint = `Respond ONLY with JSON matching: {"reply": string, "corrections": [{"original": string, "corrected": string, "category": "GRAMMAR"|"VOCABULARY"|"SENTENCE_FORMATION"|"PRONUNCIATION"|"FLUENCY"|"OTHER", "explanation": string}]}. Put the most important correction first; use an empty array if the sentence is fine.`;
      const content = await this.call(
        `${this.systemPrompt(ctx)} ${hint}`,
        messages,
        { json: true },
      );
      const parsed = this.parseJson<TutorReply>(content);
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
      const hint = `Respond ONLY with JSON matching: {"simple": string, "polite": string, "professional": string, "note": string} giving the same idea in three registers of spoken English.`;
      const content = await this.call(
        `${this.systemPrompt(ctx)} ${hint}`,
        [{ role: "user", content: `I want to say this: "${idea}"` }],
        { json: true },
      );
      return this.parseJson<PhrasingSuggestions>(content);
    } catch {
      return this.fallback.phrasing(idea, ctx);
    }
  }

  async fix(sentence: string, ctx: TutorContext): Promise<FixResult> {
    try {
      const hint = `Respond ONLY with JSON matching: {"simple": string, "natural": string, "professional": string, "why": string}.`;
      const content = await this.call(
        `${this.systemPrompt(ctx)} ${hint}`,
        [{ role: "user", content: `Fix my English: "${sentence}"` }],
        { json: true },
      );
      return this.parseJson<FixResult>(content);
    } catch {
      return this.fallback.fix(sentence, ctx);
    }
  }

  async findWord(description: string, ctx: TutorContext): Promise<WordResult> {
    try {
      const hint = `Respond ONLY with JSON matching: {"word": string, "meaning": string, "example": string, "synonyms": string[], "usageNote": string}.`;
      const content = await this.call(
        `${this.systemPrompt(ctx)} ${hint}`,
        [
          {
            role: "user",
            content: `Find the right English word for: "${description}"`,
          },
        ],
        { json: true },
      );
      return this.parseJson<WordResult>(content);
    } catch {
      return this.fallback.findWord(description, ctx);
    }
  }
}
