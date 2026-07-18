/**
 * Generic, game-agnostic "resume an in-progress game" persistence.
 *
 * Estebox has no backend database — game state lives in React state for the
 * session. This layer persists a single active game to the user's browser
 * (`localStorage`) so they can leave and come back to resume it. It is stored
 * locally per browser/device and is never sent to any server (unlike a cookie),
 * which is why `localStorage` is the right fit for this client-only state.
 *
 * Only one game runs at a time, so there is a single slot: "resume the game you
 * were playing". The `state` payload is opaque here — each game defines its own
 * shape and (de)serialization; this layer just stores whatever it's given.
 */

const STORAGE_KEY = "estebox:savedGame";

export interface SavedGame<T = unknown> {
  /** Which game this save belongs to — matches an `AVAILABLE_GAMES` id. */
  gameId: string;
  /** Schema version of `state`; a mismatch is ignored so old/corrupt saves
   *  can't crash resume. Bump it in the game when its payload shape changes. */
  version: number;
  /** When the save was written (`Date.now()`). */
  savedAt: number;
  /** Human summary for the resume UI, e.g. "Carousel · song 5/20". */
  label: string;
  /** Game-specific payload — opaque to this layer. */
  state: T;
}

/** Persist the active game. Never throws (storage may be full/unavailable). */
export function saveSavedGame(game: SavedGame): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  } catch {
    // Quota exceeded, private-mode restrictions, etc. — persistence is
    // best-effort; losing a save must never break the game in progress.
  }
}

/** Read the active game, or `null` if there is none / it can't be parsed. */
export function loadSavedGame(): SavedGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;
    if (!parsed || typeof parsed.gameId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Remove the active game (on completion or explicit discard). */
export function clearSavedGame(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — nothing we can do, and it's not worth surfacing.
  }
}
