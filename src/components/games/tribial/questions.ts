import questionData from "./questions.json";
import { TriviaQuestion, QuestionFile } from "./types";

/**
 * All baked-in trivia questions, filtered to multiple-choice only.
 *
 * The JSON is the OpenTDB export (translated to Spanish by hand). We keep only
 * `type: "multiple"` defensively, in case a true/false entry slips in.
 */
export const ALL_QUESTIONS: TriviaQuestion[] = (questionData as QuestionFile).results.filter(
  (q): q is TriviaQuestion => q.type === "multiple"
);

/** All distinct categories present in the baked-in question set, sorted alphabetically. */
export const ALL_CATEGORIES: string[] = Array.from(
  new Set(ALL_QUESTIONS.map((q) => q.category))
).sort((a, b) => a.localeCompare(b));

/** All distinct difficulties present in the baked-in question set, in easy-to-hard order. */
export const DIFFICULTY_ORDER = ["easy", "medium", "hard"] as const;
export const ALL_DIFFICULTIES: string[] = DIFFICULTY_ORDER.filter((d) =>
  ALL_QUESTIONS.some((q) => q.difficulty === d)
);

/**
 * Fisher-Yates shuffle on a copy (does not mutate the input). Same algorithm as
 * the Spotify playlist shuffle in `lib/spotify/playlist.ts`, generalized here.
 */
export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Named HTML entities OpenTDB commonly emits (and that a translator may leave in
// place). Numeric entities (&#39; / &#x27;) are handled separately below.
const NAMED_ENTITIES: Record<string, string> = {
  "&quot;": '"',
  "&apos;": "'",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&eacute;": "é",
  "&Eacute;": "É",
  "&egrave;": "è",
  "&agrave;": "à",
  "&ntilde;": "ñ",
  "&Ntilde;": "Ñ",
  "&uuml;": "ü",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&hellip;": "…",
  "&nbsp;": " ",
};

/**
 * Decode the HTML entities OpenTDB emits, so questions/answers render as plain
 * text regardless of whether the translator preserved the entities. Regex/map
 * based (not the `<textarea>` trick) so it is safe on the server too.
 */
export function decodeEntities(s: string): string {
  return s
    // Numeric decimal: &#39;
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    // Numeric hex: &#x27;
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    // Named entities (do &amp; last-ish via the map so we don't double-decode)
    .replace(/&[a-zA-Z]+;/g, (m) => NAMED_ENTITIES[m] ?? m);
}
