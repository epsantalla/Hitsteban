import { Track } from "@/lib/spotify/types";
import { Player } from "./cards";

/**
 * Dende's payload for the generic saved-game layer (`src/lib/savedGame.ts`).
 *
 * Dende has no natural end (it's played until the group quits), so unlike
 * Songster there's no `onComplete` — the save is only ever cleared explicitly
 * from the setup screen ("Descartar").
 */

export const DENDE_GAME_ID = "dende";

/** Bump when `DendeSavedState` changes shape, to invalidate old saves. */
export const DENDE_SAVE_VERSION = 3;

/**
 * A norma card's rule. `roundsTotal` is the full number of rounds it lasts
 * (null = until the game closes); `cardsSeen` counts real cards shown since
 * *this norma* was created — it expires once `cardsSeen` reaches
 * `NORMA_BUFFER_CARDS + roundsTotal * playerCount` (see `cards.ts`), i.e. a
 * full round's worth of cards plus a flat buffer, always counted fresh from
 * when it appeared (not from the nearest round boundary).
 */
export interface ActiveNorma {
  text: string;
  roundsTotal: number | null;
  cardsSeen: number;
}

/** A regular card, already fully substituted and ready to render. */
export interface CardView {
  kind: "card";
  text: string;
  weight: number;
  flag: string;
  /** Seconds for a `{timer;X}` countdown on this card, if it had one. */
  timerSeconds: number | null;
}

/** A "SE ACABÓ" screen for an expired norma. */
export interface ExpiryView {
  kind: "expiry";
  text: string;
}

/** The follow-up card from a `&&` split — doesn't count as a card for norma aging. */
export interface ContinuationView {
  kind: "continuation";
  text: string;
  timerSeconds: number | null;
}

export type DendeView = CardView | ExpiryView | ContinuationView;

/** The slice of state `DendeGame` owns and reports upward on each checkpoint. */
export interface DendeRuntimeState {
  activeNormas: ActiveNorma[];
  pity: Record<string, number>;
  currentView: DendeView | null;
  /** Queued views (norma expiries, `&&` continuations) to show before drawing the next real card. */
  pendingViews: DendeView[];
  tracks?: Track[];
  usedTrackIds?: string[];
}

export interface DendeSavedState extends DendeRuntimeState {
  players: Player[];
  songsterEnabled: boolean;
  playlistId?: string;
}

/** Short human summary for the resume card, e.g. "Dende · 5 jugadores". */
export function buildDendeLabel(state: DendeSavedState): string {
  const n = state.players.length;
  return `Dende · ${n} jugador${n === 1 ? "" : "es"}`;
}
