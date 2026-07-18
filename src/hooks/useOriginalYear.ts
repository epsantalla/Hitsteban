import { useEffect, useState } from "react";
import { releaseYear, resolveOriginalYear } from "@/lib/spotify/year";
import { Track } from "@/lib/spotify/types";

/**
 * Resolve the *original* release year for the given track.
 *
 * Immediately returns the playlist's own `release_date` year so the UI never
 * shows an empty value, then updates to the (possibly older) cross-referenced
 * year once the lookup resolves. Re-runs whenever the track changes.
 */
export function useOriginalYear(
  track: Track | undefined,
  accessToken: string
): string {
  const [year, setYear] = useState("");

  useEffect(() => {
    if (!track) return;
    let isMounted = true;

    // Show the fallback right away, then refine it.
    setYear(releaseYear(track.album.release_date));

    resolveOriginalYear(track, accessToken).then((resolved) => {
      if (isMounted) setYear(resolved);
    });

    return () => {
      isMounted = false;
    };
  }, [track, accessToken]);

  return year;
}
