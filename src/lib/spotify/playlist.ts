import { Track } from "./types";

/** Fisher-Yates shuffle, in place. Returns the same array for convenience. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Fetch every playable track in a playlist, then shuffle it.
 *
 * Paginates `GET /v1/playlists/{id}/items` and filters out non-track,
 * non-playable and local items. We pass `additional_types=track` (and omit
 * `market=from_token`) to avoid 403s on playlists containing podcast episodes
 * or when the user hasn't granted the `user-read-private` scope.
 *
 * @throws Error with the Spotify error message on a failed request, or when
 *         the playlist yields no usable tracks.
 */
export async function loadPlaylistTracks(
  playlistId: string,
  accessToken: string
): Promise<Track[]> {
  let allTracks: Track[] = [];
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100&additional_types=track`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const errorData: any = await res.json().catch(() => ({}));
      const spotifyError = errorData.error?.message || res.statusText;
      throw new Error(`Spotify API Error: ${spotifyError}`);
    }
    const data: any = await res.json();
    const validTracks: Track[] = (data.items || [])
      .map((item: any) => item.track || item.item)
      .filter(
        (t: any) =>
          t && t.uri && t.type === "track" && t.is_playable !== false && !t.is_local
      );
    allTracks = [...allTracks, ...validTracks];
    url = data.next as string | null;
  }

  if (allTracks.length === 0) {
    throw new Error("Playlist is empty or contains unsupported tracks.");
  }

  return shuffle(allTracks);
}
