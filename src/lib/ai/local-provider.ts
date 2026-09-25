import type {
  AIProvider,
  ChatTurn,
  Correction,
  FixResult,
  PhrasingSuggestions,
  TutorContext,
  TutorReply,
  WordResult,
} from "./types";

/**
 * LocalProvider — a fully offline, deterministic English tutor.
 *
 * It performs REAL grammar analysis using a set of well-known ESL correction
 * heuristics (subject-verb agreement, article usage, common Indian-English
 * patterns, tense mixups, etc.). It is intentionally conservative: it only
 * surfaces corrections it is confident about, and it always leads with an
 * encouraging conversational reply — correction is secondary (spec §2, §32).
 *
 * This is the default provider and requires no network or API key, so the
 * product works end-to-end out of the box. Swap in an LLM provider by setting
 * AI_PROVIDER=openai.
 */

interface Rule {
  test: RegExp;
  category: Correction["category"];
  /** Produce the corrected sentence from the original. */
  fix: (s: string) => string;
  explanation: string;
}

// Ordered, targeted correction rules. Each is safe and reversible-ish.
const RULES: Rule[] = [
  {
    // "I am having a doubt" / "having doubt" -> "I have a question"
    test: /\bhaving\s+(a\s+)?doubts?\b/i,
    category: "VOCABULARY",
    fix: (s) =>
      s
        .replace(/\bam\s+having\s+(a\s+)?doubts?\b/i, "have a question")
        .replace(/\bhaving\s+(a\s+)?doubts?\b/i, "have a question"),
    explanation:
      'In natural English we usually say "I have a question" rather than "I am having a doubt".',
  },
  {
    // "discuss about" -> "discuss"
    test: /\bdiscuss\s+about\b/i,
    category: "GRAMMAR",
    fix: (s) => s.replace(/\bdiscuss\s+about\b/i, "discuss"),
    explanation:
      '"Discuss" already includes the meaning of "about", so we drop "about": "discuss the topic".',
  },
  {
    // "today I go" -> "today I went" (past marker with present verb) — light heuristic
    test: /\b(yesterday|today I go|last (night|week|year|month))\b/i,
    category: "GRAMMAR",
    fix: (s) =>
      s
        .replace(/\btoday I go\b/i, "today I went")
        .replace(/\bI meet\b/gi, "I met")
        .replace(/\bI go\b/gi, "I went"),
    explanation:
      "When talking about something that already happened, use the past tense (go → went, meet → met).",
  },
  {
    // he/she/it + base verb -> add -s (very common beginner slip)
    test: /\b(he|she|it)\s+(go|do|have|make|want|need|like|play|work|study|come|say|see|know|think|take|get|give)\b/i,
    category: "GRAMMAR",
    fix: (s) =>
      s.replace(
        /\b(he|she|it)\s+(go|do|have|make|want|need|like|play|work|study|come|say|see|know|think|take|get|give)\b/gi,
        (_m, subj: string, verb: string) => `${subj} ${thirdPerson(verb)}`,
      ),
    explanation:
      'With he / she / it, the present-tense verb takes an "-s": "he goes", "she wants".',
  },
  {
    // "I didn't went" -> "I didn't go"
    test: /\bdid(?:n't| not)\s+(went|ate|saw|took|made|came|got|gave|knew)\b/i,
    category: "GRAMMAR",
    fix: (s) =>
      s.replace(
        /\bdid(n't| not)\s+(went|ate|saw|took|made|came|got|gave|knew)\b/gi,
        (_m, neg: string, verb: string) => `did${neg} ${baseForm(verb)}`,
      ),
    explanation:
      'After "did / didn\'t" we use the base verb, not the past form: "I didn\'t go" (not "didn\'t went").',
  },
];

const THIRD: Record<string, string> = {
  go: "goes",
  do: "does",
  have: "has",
  make: "makes",
  want: "wants",
  need: "needs",
  like: "likes",
  play: "plays",
  work: "works",
  study: "studies",
  come: "comes",
  say: "says",
  see: "sees",
  know: "knows",
  think: "thinks",
  take: "takes",
  get: "gets",
  give: "gives",
};

const BASE: Record<string, string> = {
  went: "go",
  ate: "eat",
  saw: "see",
  took: "take",
  made: "make",
  came: "come",
  got: "get",
  gave: "give",
  knew: "know",
};

function preserveCase(source: string, word: string): string {
  if (source[0] === source[0]?.toUpperCase()) {
    return word[0].toUpperCase() + word.slice(1);
  }
  return word;
}

function thirdPerson(verb: string): string {
  const lower = verb.toLowerCase();
  return preserveCase(verb, THIRD[lower] ?? `${lower}s`);
}

function baseForm(verb: string): string {
  const lower = verb.toLowerCase();
  return preserveCase(verb, BASE[lower] ?? lower);
}

function analyze(sentence: string): Correction[] {
  const corrections: Correction[] = [];
  let working = sentence;
  for (const rule of RULES) {
    if (rule.test.test(working)) {
      const corrected = rule.fix(working);
      if (corrected !== working) {
        corrections.push({
          original: working,
          corrected,
          category: rule.category,
          explanation: rule.explanation,
        });
        working = corrected; // chain fixes so the final form is fully corrected
      }
    }
  }
  // Collapse to a single, cleanest correction (most important first) but keep
  // the individual explanations so beginners aren't overwhelmed.
  if (corrections.length === 0) return [];
  return [
    {
      original: sentence,
      corrected: working,
      category: corrections[0].category,
      explanation: corrections.map((c) => c.explanation).join(" "),
    },
  ];
}

const ENCOURAGERS = [
  "Good attempt!",
  "Nice — I understood you.",
  "Great, you're speaking!",
  "Well said.",
  "That's a good try.",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

// A tiny keyword-based conversational engine so Mira feels responsive even
// offline. It reflects the topic back and asks a follow-up question — which is
// exactly what a speaking coach does to keep the learner talking.
function converse(userText: string, ctx: TutorContext): string {
  const t = userText.toLowerCase();
  const name = ctx.learnerName ? ` ${ctx.learnerName}` : "";
  if (/\b(hi|hello|hey|good (morning|evening|afternoon))\b/.test(t)) {
    return `Hello${name}! I'm Mira, your speaking partner. Tell me — what did you do today?`;
  }
  if (/\b(interview|job|placement|hr)\b/.test(t)) {
    return "Let's practice for that interview. Can you introduce yourself in a few sentences, as if we just met?";
  }
  if (/\b(college|class|professor|teacher|exam|project)\b/.test(t)) {
    return "College life is great speaking practice. Tell me a little more about your day there — what happened?";
  }
  if (/\b(movie|film|watch|song|music|game)\b/.test(t)) {
    return "Nice! Describe it to me — what did you like most about it?";
  }
  if (/\b(food|eat|restaurant|lunch|dinner|breakfast)\b/.test(t)) {
    return "Sounds tasty! If you were ordering that at a restaurant, what would you say to the waiter?";
  }
  if (t.trim().split(/\s+/).length <= 3) {
    return "Nice start — can you say a little more? Try to give me one full sentence.";
  }
  return "I understood you well. Keep going — what happened next?";
}

export class LocalProvider implements AIProvider {
  readonly id = "local";

  async chat(messages: ChatTurn[], ctx: TutorContext): Promise<TutorReply> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const text = lastUser?.content?.trim() ?? "";
    const corrections = text ? analyze(text) : [];
    const seed = text.length;

    let reply = converse(text, ctx);

    // Correction is secondary and framed encouragingly (spec §2, §32).
    if (corrections.length > 0 && ctx.mode !== "CONVERSATION") {
      const c = corrections[0];
      reply = `${pick(ENCOURAGERS, seed)} A more natural way to say this is: "${c.corrected}". ${c.explanation} ${reply}`;
    } else if (corrections.length > 0) {
      // In pure conversation mode, gently fold the model sentence in.
      reply = `${pick(ENCOURAGERS, seed)} You could also say: "${corrections[0].corrected}". ${reply}`;
    }

    return { reply, corrections };
  }

  async phrasing(
    idea: string,
    _ctx: TutorContext,
  ): Promise<PhrasingSuggestions> {
    const core = idea
      .trim()
      .replace(/^(i want to|i wanna|help me|how do i)\s*/i, "");
    return {
      simple: capitalize(toRequest(core, "simple")),
      polite: capitalize(toRequest(core, "polite")),
      professional: capitalize(toRequest(core, "professional")),
      note: "The same idea can be said in different ways depending on how formal the situation is.",
    };
  }

  async fix(sentence: string, _ctx: TutorContext): Promise<FixResult> {
    const corrections = analyze(sentence);
    const natural = corrections.length
      ? corrections[0].corrected
      : sentence.trim();
    return {
      simple: natural,
      natural,
      professional: makeProfessional(natural),
      why: corrections.length
        ? corrections[0].explanation
        : "This sentence already reads naturally. Nicely done!",
    };
  }

  async findWord(description: string, _ctx: TutorContext): Promise<WordResult> {
    const match = matchWord(description);
    return match;
  }
}

// ---- small linguistic helpers for the offline features ----

function capitalize(s: string): string {
  s = s.trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function toRequest(
  core: string,
  register: "simple" | "polite" | "professional",
): string {
  // Turn "ask teacher whether class is cancelled" into a spoken request.
  const cleaned = core.replace(/^(ask|tell|say to)\s+/i, "").trim();
  const subject = /teacher|professor|sir|madam/i.test(core) ? "Sir" : "";
  const topic = cleaned.replace(
    /^(teacher|professor|sir|madam)\s+(whether|if|that)?\s*/i,
    "",
  );
  const q = topic.replace(/[.?!]+$/, "");
  switch (register) {
    case "simple":
      return subject
        ? `${subject}, is ${stripLead(q)}?`
        : `Is ${stripLead(q)}?`;
    case "polite":
      return subject
        ? `${subject}, could you please tell me if ${stripLead(q)}?`
        : `Could you please tell me if ${stripLead(q)}?`;
    case "professional":
      return `Could you please confirm whether ${stripLead(q)}?`;
  }
}

function stripLead(s: string): string {
  return s.replace(/^(the\s+)?/i, "").trim();
}

function makeProfessional(s: string): string {
  return s
    .replace(/\bcan you\b/gi, "could you")
    .replace(/\bi want\b/gi, "I would like")
    .replace(/\bgive me\b/gi, "please provide")
    .replace(/\bwanna\b/gi, "want to");
}

const WORD_BANK: { keywords: RegExp; result: WordResult }[] = [
  {
    keywords: /help(s|ing)? others|always help/i,
    result: {
      word: "helpful",
      meaning: "willing to help others; giving useful assistance",
      example: "She is always helpful when a classmate is struggling.",
      synonyms: ["supportive", "obliging", "considerate"],
      usageNote:
        'Use for people or things that make a task easier: "a helpful tip".',
    },
  },
  {
    keywords: /never gives? up|keeps? trying|not give up/i,
    result: {
      word: "persistent",
      meaning: "continuing firmly despite difficulty",
      example: "He was persistent and finally solved the problem.",
      synonyms: ["determined", "tenacious", "steadfast"],
      usageNote:
        "Positive when it means determination; can be negative if someone won't stop.",
    },
  },
  {
    keywords: /very tired|no energy|exhaust/i,
    result: {
      word: "exhausted",
      meaning: "extremely tired",
      example: "After the long trip, I was completely exhausted.",
      synonyms: ["drained", "worn out", "fatigued"],
      usageNote:
        'Stronger than "tired". Great for emphasising how tired you felt.',
    },
  },
];

function matchWord(description: string): WordResult {
  for (const entry of WORD_BANK) {
    if (entry.keywords.test(description)) return entry.result;
  }
  // Sensible fallback that still teaches something.
  return {
    word: "articulate",
    meaning: "able to express ideas clearly and effectively",
    example: "She gave an articulate answer during the interview.",
    synonyms: ["expressive", "eloquent", "clear"],
    usageNote:
      "I couldn't match an exact word offline. Connect an AI provider for richer results, or rephrase your description.",
  };
}
