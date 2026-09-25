/**
 * AI provider abstraction.
 *
 * The rest of the app talks only to the `AIProvider` interface, never to a
 * concrete vendor. This makes the underlying AI service replaceable: swap the
 * implementation in `index.ts` (driven by the AI_PROVIDER env var) without
 * touching any feature code.
 */

export type ConversationMode =
  | "CONVERSATION"
  | "TEACHER"
  | "CORRECTION"
  | "INTERVIEW"
  | "ROLEPLAY"
  | "PRONUNCIATION";

export type EnglishLevel =
  | "BEGINNER"
  | "ELEMENTARY"
  | "INTERMEDIATE"
  | "UPPER_INTERMEDIATE"
  | "ADVANCED";

export interface ChatTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface TutorContext {
  level: EnglishLevel;
  mode: ConversationMode;
  supportLang: string;
  learnerName?: string;
  goals?: string[];
}

/** A single suggested correction attached to a learner's utterance. */
export interface Correction {
  original: string;
  corrected: string;
  category:
    | "GRAMMAR"
    | "VOCABULARY"
    | "SENTENCE_FORMATION"
    | "PRONUNCIATION"
    | "FLUENCY"
    | "OTHER";
  explanation: string;
}

/** The tutor's reply to a conversational turn. */
export interface TutorReply {
  /** The natural, encouraging conversational reply from Mira. */
  reply: string;
  /** The most important corrections, most significant first. May be empty. */
  corrections: Correction[];
}

/** Three registers of the same idea, for "What Should I Say?". */
export interface PhrasingSuggestions {
  simple: string;
  polite: string;
  professional: string;
  note: string;
}

/** Result for "Fix My English". */
export interface FixResult {
  simple: string;
  natural: string;
  professional: string;
  why: string;
}

/** Result for "Find the Right Word". */
export interface WordResult {
  word: string;
  meaning: string;
  example: string;
  synonyms: string[];
  usageNote: string;
}

export interface AIProvider {
  readonly id: string;
  /** Conversational tutor turn (Mira). */
  chat(messages: ChatTurn[], ctx: TutorContext): Promise<TutorReply>;
  /** "What Should I Say?" — same idea across three registers. */
  phrasing(idea: string, ctx: TutorContext): Promise<PhrasingSuggestions>;
  /** "Fix My English" — rewrite a sentence more naturally. */
  fix(sentence: string, ctx: TutorContext): Promise<FixResult>;
  /** "Find the Right Word" — from a description to a word. */
  findWord(description: string, ctx: TutorContext): Promise<WordResult>;
}
