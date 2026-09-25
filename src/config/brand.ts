/**
 * =====================================================================
 *  CENTRAL BRAND CONFIGURATION
 * ---------------------------------------------------------------------
 *  This is the single source of truth for all product-facing naming and
 *  messaging. To rebrand the entire product, edit the values here.
 *  Nothing else in the codebase should hardcode the product name.
 * =====================================================================
 */

export const brand = {
  /** Product name shown across the whole app. */
  name: "SpeakMate AI",

  /** Short tagline used under the logo / in headers. */
  tagline: "Your 24/7 Personal English Speaking Coach",

  /** The AI tutor's name (persona). */
  tutorName: "Mira",

  /** Marketing hero copy. */
  hero: {
    headline: "Speak English Without Fear.",
    subheadline:
      "Practice every day with your personal AI English teacher and become more confident in real conversations.",
    primaryCta: "Start Speaking",
    secondaryCta: "Talk to AI Tutor",
  },

  /** Rotating brand messages used in various places. */
  messages: [
    "Don't memorize English. Use it.",
    "Make mistakes here, not in fear.",
    "Your English practice partner, available whenever you need it.",
    "Practice speaking without fear. Make mistakes, learn from them, and speak better every day.",
  ],

  /** Contact + legal. */
  supportEmail: "hello@speakmate.example",
  company: "SpeakMate Labs",

  /** Colors reference for non-Tailwind contexts (e.g. emails). */
  colors: {
    primary: "#1f47f5",
    accent: "#22c37c",
  },
} as const;

export type Brand = typeof brand;
