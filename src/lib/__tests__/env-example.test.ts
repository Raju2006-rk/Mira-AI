/**
 * Task 8.3 — Unit test asserting `.env.example` documents every required auth
 * key with an explanatory comment and carries no real secret values.
 * (Requirement 7.7; Design: Testing Strategy)
 *
 * Plain deterministic assertions (NOT property tests). Reads the file from disk.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ENV_EXAMPLE_PATH = fileURLToPath(
  new URL("../../../.env.example", import.meta.url),
);

const REQUIRED_KEYS = [
  "AUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "AUTH_SECRET",
  "DATABASE_URL",
];

function readLines(): string[] {
  return readFileSync(ENV_EXAMPLE_PATH, "utf8").split(/\r?\n/);
}

/** The line index where a `KEY=` assignment first appears, or -1. */
function lineOfKey(lines: string[], key: string): number {
  return lines.findIndex((line) => new RegExp(`^\\s*${key}\\s*=`).test(line));
}

describe(".env.example completeness (task 8.3)", () => {
  const lines = readLines();

  for (const key of REQUIRED_KEYS) {
    it(`documents ${key} with a preceding comment`, () => {
      const idx = lineOfKey(lines, key);
      expect(idx, `${key} should be present in .env.example`).toBeGreaterThanOrEqual(0);

      // A comment line (# ...) must appear in the contiguous block above the
      // key. A comment can document a group of related keys (e.g. the
      // "# --- Google OAuth ---" header covers both GOOGLE_CLIENT_ID and
      // GOOGLE_CLIENT_SECRET), so we scan upward past sibling assignment lines
      // within the same block and only stop at a blank-line gap (block
      // boundary).
      let commentFound = false;
      for (let i = idx - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line === "") break; // blank line = block boundary; stop.
        if (line.startsWith("#")) {
          commentFound = true;
          break;
        }
        // Otherwise it's a sibling assignment in the same block — keep scanning.
      }
      expect(commentFound, `${key} should have an explanatory comment above it`).toBe(true);
    });
  }

  it("contains no obviously-real secret values (placeholders only)", () => {
    // OAuth secrets/ids must be empty placeholders in the example file so no
    // real credential is ever committed.
    for (const key of [
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GITHUB_CLIENT_ID",
      "GITHUB_CLIENT_SECRET",
    ]) {
      const idx = lineOfKey(lines, key);
      const value = lines[idx].split("=").slice(1).join("=").trim();
      // Accept empty string placeholders: "" or ''.
      expect([`""`, `''`, ""], `${key} must be an empty placeholder`).toContain(
        value,
      );
    }

    // AUTH_SECRET must be a descriptive placeholder, not a plausible real secret.
    const secretIdx = lineOfKey(lines, "AUTH_SECRET");
    const secretValue = lines[secretIdx].toLowerCase();
    expect(secretValue).toContain("change-me");
  });
});
