import { useEffect, useState } from "react";
import { loadPlaylistTracks } from "@/lib/spotify/playlist";
import { Track } from "@/lib/spotify/types";

export interface PlaylistTracksState {
  tracks: Track[];
  loading: boolean;
  error: string | null;
}

/**
 * Load (and shuffle) a playlist's playable tracks once per `playlistId`/token.
 * Shared by every game so playlist fetching lives in exactly one place.
 *
 * When `initialTracks` is provided (a resumed game already has its shuffled
 * order), those are used as-is and the Spotify fetch is skipped entirely.
 *
 * An empty `playlistId` is treated as "nothing to load" rather than an error
 * (e.g. Dende's Songster cards are optional, so there may be no playlist at
 * all) — `tracks` stays empty and `loading` resolves to `false`.
 */
export function usePlaylistTracks(
  playlistId: string,
  accessToken: string,
  initialTracks?: Track[]
): PlaylistTracksState {
  const hasInitial = !!initialTracks && initialTracks.length > 0;
  const [tracks, setTracks] = useState<Track[]>(initialTracks ?? []);
  const [loading, setLoading] = useState(!hasInitial && !!playlistId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Resumed game: reuse the saved order, no need to hit Spotify.
    if (hasInitial) return;
    if (!playlistId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    loadPlaylistTracks(playlistId, accessToken)
      .then((loaded) => {
        if (!isMounted) return;
        setTracks(loaded);
        setLoading(false);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [playlistId, accessToken]);

  return { tracks, loading, error };
}
