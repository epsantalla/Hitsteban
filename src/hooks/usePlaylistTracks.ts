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
 */
export function usePlaylistTracks(
  playlistId: string,
  accessToken: string
): PlaylistTracksState {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
