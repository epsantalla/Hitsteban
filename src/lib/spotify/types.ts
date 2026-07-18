/**
 * A playable Spotify track, trimmed to the fields the games actually use.
 * Shared by every game/mode so the shape stays in sync.
 */
export interface Track {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { release_date: string };
}
