import { Track } from "@/lib/spotify/types";

/**
 * Songster's payload for the generic saved-game layer (`src/lib/savedGame.ts`).
 *
 * We persist the resolved, already-shuffled `tracks` array so resume restores
 * the exact track order (the playlist is re-shuffled on every fresh load, so a
 * bare `currentIndex` would otherwise point at a different song) and needs no
 * Spotify re-fetch.
 */

export const SONGSTER_GAME_ID = "songster";

/** Bump when `SongsterSavedState` changes shape, to invalidate old saves. */
export const SONGSTER_SAVE_VERSION = 1;

/** A Carousel player. Shared between CarouselGame and the save payload. */
export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface CarouselSettings {
  initialTime: number;
  turnTime: number;
  ptsYear: number;
  ptsTitle: number;
  ptsArtist: number;
}

/** The Carousel-specific slice of a save (present only for the carousel mode). */
export interface CarouselSavedState {
  players: Player[];
  settings: CarouselSettings;
  startingPlayerIndexForSong: number;
}

export interface SongsterSavedState {
  mode: string; // "classic" | "carousel"
  playlistId: string;
  tracks: Track[];
  currentIndex: number;
  carousel?: CarouselSavedState;
}

/**
 * What a mode component reports upward on each checkpoint. Songster wraps this
 * with `mode`/`playlistId` (which it owns) into a full `SongsterSavedState`.
 */
export type SongsterProgress = Pick<SongsterSavedState, "currentIndex" | "tracks"> & {
  carousel?: CarouselSavedState;
};

/** Short human summary for the resume card, e.g. "Carousel · song 5/20 · 3 players". */
export function buildSongsterLabel(state: SongsterSavedState): string {
  const total = state.tracks.length;
  const position = Math.min(state.currentIndex + 1, total);
  if (state.mode === "carousel") {
    const players = state.carousel?.players.length ?? 0;
    return `Carousel · song ${position}/${total} · ${players} player${players === 1 ? "" : "s"}`;
  }
  return `Classic · track ${position}/${total}`;
}
