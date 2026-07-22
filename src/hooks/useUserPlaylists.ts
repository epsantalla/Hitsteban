"use client";

import { useEffect, useState } from "react";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Fetches the current user's Spotify playlists, for the "choose from your
 * library" picker (Songster, Dende's Songster-card setup). Retries a couple
 * of times on failure: a token that was just issued (e.g. right after the
 * OAuth redirect) can occasionally fail its very first use, and this request
 * was previously wired to fail silently with no retry, leaving the picker
 * permanently empty until the whole page was reloaded.
 */
export function useUserPlaylists(accessToken: string | undefined) {
  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    const load = async (attempt: number) => {
      try {
        const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`Spotify playlists request failed: ${res.status}`);
        const data = await res.json();
        if (!cancelled && data.items) {
          setPlaylists(data.items.filter((p: any) => p !== null));
        }
      } catch (err) {
        if (cancelled) return;
        if (attempt + 1 < MAX_ATTEMPTS) {
          setTimeout(() => load(attempt + 1), RETRY_DELAY_MS);
        } else {
          console.error("Error fetching playlists", err);
        }
      }
    };

    load(0);
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return playlists;
}
