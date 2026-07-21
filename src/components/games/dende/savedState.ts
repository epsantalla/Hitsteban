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
export const DENDE_SAVE_VERSION = 1;

/** A norma card's rule, active for a number of rounds (null = until the game closes). */
export interface ActiveNorma {
  text: string;
  roundsLeft: number | null;
}

/** A regular card, already fully substituted and ready to render. */
export interface CardView {
  kind: "card";
  text: string;
  weight: number;
  flag: string;
}

/** A "SE ACABÓ" screen for an expired norma. */
export interface ExpiryView {
  kind: "expiry";
  text: string;
}

export type DendeView = CardView | ExpiryView;

/** The slice of state `DendeGame` owns and reports upward on each checkpoint. */
export interface DendeRuntimeState {
  activeNormas: ActiveNorma[];
  pity: Record<string, number>;
  realCardsShown: number;
  lastRoundProcessed: number;
  currentView: DendeView | null;
  pendingExpiries: ExpiryView[];
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
