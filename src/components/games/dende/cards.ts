import juegoRaw from "./data/juego.tsv";
import listasRaw from "./data/listas.tsv";

/** A single drinking-card, parsed from `juego.tsv`. `nombre` is internal-only and dropped. */
export interface Card {
  text: string;
  weight: number;
  flag: string; // "" if none
}

export interface Player {
  id: string;
  name: string;
}

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 30;

/**
 * Flat grace period (in real cards shown) added on top of a norma's own
 * round-based duration, counted fresh from when it appears — so a norma
 * created right at the end of a round still gets a full round's worth of
 * life, never expiring almost immediately.
 */
export const NORMA_BUFFER_CARDS = 3;

export const FLAG_SPECIAL_TRIBIAL = "special_tribial";
export const FLAG_SPECIAL_SONGSTER = "special_songster";
/** Only eligible to be drawn when the table has an odd number of players. */
export const FLAG_SPECIAL_IMPARES = "special_impares";

function parseCards(raw: string): Card[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const cards: Card[] = [];
  // Row 0 is the header (nombre/texto/peso/flag) — skip it.
  for (const line of lines.slice(1)) {
    const cols = line.split("\t");
    const text = (cols[1] ?? "").trim();
    if (!text) continue;
    const weight = parseInt(cols[2] ?? "", 10) || 1;
    const flag = (cols[3] ?? "").trim();
    cards.push({ text, weight, flag });
  }
  return cards;
}

// `listas.tsv` rows are ragged — most rows only fill one or two of the
// columns, so lookups collect non-empty cells by column index.
function parseLists(raw: string): Record<string, string[]> {
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const headers = lines[0].split("\t").map((h) => h.trim());
  const lists: Record<string, string[]> = {};
  headers.forEach((h) => {
    if (h) lists[h] = [];
  });
  for (const line of lines.slice(1)) {
    const cols = line.split("\t");
    headers.forEach((h, i) => {
      if (!h) return;
      const val = (cols[i] ?? "").trim();
      if (val) lists[h].push(val);
    });
  }
  return lists;
}

export const ALL_CARDS: Card[] = parseCards(juegoRaw);
export const LISTS: Record<string, string[]> = parseLists(listasRaw);

/** Fisher-Yates shuffle on a copy (does not mutate the input). */
export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Random integer in [min, max], inclusive (order-independent). */
export function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

export function isNormaFlag(flag: string): boolean {
  return flag.startsWith("norma_");
}

/** `norma_N` -> N rounds, `norma_inf` -> null (active until the game is closed). */
export function parseNormaRounds(flag: string): number | null {
  const suffix = flag.slice("norma_".length);
  if (suffix === "inf") return null;
  const n = parseInt(suffix, 10);
  return Number.isFinite(n) ? n : null;
}

/** Weight <=5 -> gold glow, 6-10 -> silver glow, otherwise no glow. */
export function glowForWeight(weight: number): "gold" | "silver" | "none" {
  if (weight <= 5) return "gold";
  if (weight <= 10) return "silver";
  return "none";
}

/**
 * Weighted random pick, excluding `special_songster` cards unless Songster is
 * enabled and `special_impares` cards unless the table has an odd headcount.
 */
export function pickNextCard(cards: Card[], excludeCard: Card | null, songsterEnabled: boolean, oddPlayerCount: boolean): Card {
  let pool = cards.filter(
    (c) =>
      (songsterEnabled || c.flag !== FLAG_SPECIAL_SONGSTER) &&
      (oddPlayerCount || c.flag !== FLAG_SPECIAL_IMPARES)
  );
  if (pool.length === 0) pool = cards;
  if (excludeCard && pool.length > 1) {
    const withoutPrev = pool.filter((c) => c !== excludeCard);
    if (withoutPrev.length > 0) pool = withoutPrev;
  }
  const total = pool.reduce((sum, c) => sum + c.weight, 0);
  let r = Math.random() * total;
  for (const c of pool) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return pool[pool.length - 1];
}

/**
 * Pick the player for `{player}`, weighted by an aggressive pity system: the
 * longer since a player was last picked, the more likely (and eventually
 * guaranteed) they are picked next.
 */
export function pickPlayerForPity(players: Player[], pity: Record<string, number>): Player {
  const gap = (p: Player) => pity[p.id] ?? 0;
  const maxGap = Math.max(...players.map(gap));

  // Hard rule: once someone has gone a full round-length without being
  // picked, only the most "starved" players are eligible.
  let candidates = players;
  if (maxGap >= players.length) {
    candidates = players.filter((p) => gap(p) === maxGap);
  }

  const weights = candidates.map((p) => Math.pow(gap(p) + 1, 3));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/** After `{player}` is used, reset their gap to 0 and bump everyone else's. */
export function updatePityAfterPlayerPick(
  players: Player[],
  pity: Record<string, number>,
  pickedId: string
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const p of players) {
    next[p.id] = p.id === pickedId ? 0 : (pity[p.id] ?? 0) + 1;
  }
  return next;
}

/** Pick `count` distinct random players, excluding `excludeIds`. No pity. */
export function pickDistinctRandomPlayers(players: Player[], excludeIds: string[], count: number): Player[] {
  const pool = shuffle(players.filter((p) => !excludeIds.includes(p.id)));
  return pool.slice(0, count);
}

export interface SubstitutionOutcome {
  /** Fully substituted text, `*bold*` markers still present. */
  text: string;
  /** The player chosen for `{player}` in this text, if any (for pity bookkeeping). */
  playerPicked?: Player;
}

/**
 * Apply all Dende template substitutions to a raw card's text:
 * `{player}` (pity-weighted), `{randomplayer}`/`{randomplayer2}` (uniform,
 * distinct from `{player}` and each other), `{randomnum;x:y}`, and
 * `{list;column}`. Bold `*...*` markers are left in place for the renderer.
 */
export function substituteCardText(
  rawText: string,
  players: Player[],
  pity: Record<string, number>,
  lists: Record<string, string[]>
): SubstitutionOutcome {
  let text = rawText;
  let playerPicked: Player | undefined;

  if (text.includes("{player}")) {
    playerPicked = pickPlayerForPity(players, pity);
    text = text.split("{player}").join(playerPicked.name);
  }

  const usedIds = playerPicked ? [playerPicked.id] : [];
  const needsRandomplayer = text.includes("{randomplayer}");
  const needsRandomplayer2 = text.includes("{randomplayer2}");
  if (needsRandomplayer || needsRandomplayer2) {
    const count = (needsRandomplayer ? 1 : 0) + (needsRandomplayer2 ? 1 : 0);
    const picks = pickDistinctRandomPlayers(players, usedIds, count);
    let idx = 0;
    if (needsRandomplayer) {
      const p = picks[idx++];
      if (p) text = text.split("{randomplayer}").join(p.name);
    }
    if (needsRandomplayer2) {
      const p = picks[idx++];
      if (p) text = text.split("{randomplayer2}").join(p.name);
    }
  }

  text = text.replace(/\{randomnum;(-?\d+):(-?\d+)\}/g, (_, a, b) => String(randomInt(parseInt(a, 10), parseInt(b, 10))));

  text = text.replace(/\{list;([^}]+)\}/g, (_, col) => {
    const key = (col as string).trim();
    const options = lists[key];
    if (!options || options.length === 0) return "";
    return options[Math.floor(Math.random() * options.length)];
  });

  return { text, playerPicked };
}

const CONTINUATION_MARKER = "&&";

/**
 * Splits a card's (already-substituted) text on the first `&&`, if present.
 * The part after it is shown as a separate follow-up card and doesn't count
 * as a real card for norma aging.
 */
export function splitContinuation(text: string): { main: string; continuation: string | null } {
  const idx = text.indexOf(CONTINUATION_MARKER);
  if (idx === -1) return { main: text.trim(), continuation: null };
  return {
    main: text.slice(0, idx).trim(),
    continuation: text.slice(idx + CONTINUATION_MARKER.length).trim(),
  };
}

const TIMER_REGEX = /\{timer;(\d+)\}/;

/** Strips a `{timer;X}` token from a card's text, returning the duration (seconds) if present. */
export function extractTimer(text: string): { text: string; timerSeconds: number | null } {
  const match = text.match(TIMER_REGEX);
  if (!match) return { text, timerSeconds: null };
  const seconds = parseInt(match[1], 10);
  return {
    text: text.replace(TIMER_REGEX, "").trim(),
    timerSeconds: Number.isFinite(seconds) ? seconds : null,
  };
}

export interface TextSegment {
  text: string;
  bold: boolean;
}

/** Split `*bold*`-marked text into plain/bold segments for rendering. */
export function parseBoldSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }
  return segments;
}
