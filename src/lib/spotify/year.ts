import { Track } from "./types";

/** Strip a track title down to its core name ("Song - Remastered (feat. X)" -> "Song"). */
function baseName(name: string): string {
  return name.split(" - ")[0].split(" (")[0].trim();
}

/** Lowercase and drop punctuation so "Salta!!!" matches "Salta"; keeps accents. */
function normalize(str: string): string {
  return str.toLowerCase().replace(/[^\w\sÀ-ſ]/g, "").trim();
}

/** The year part of a Spotify/playlist `release_date` (or a full ISO date). */
export function releaseYear(releaseDate: string): string {
  return releaseDate.split("-")[0];
}

function isTrackMatch(candidate: string, target: string): boolean {
  const normCandidate = normalize(baseName(candidate));
  return (
    normCandidate === target ||
    normalize(candidate).includes(target) ||
    target.includes(normCandidate)
  );
}

function isArtistMatch(candidate: string, target: string): boolean {
  const norm = normalize(candidate);
  return norm.includes(target) || target.includes(norm);
}

/**
 * Resolve a track's *original* release year.
 *
 * Playlist metadata often reflects a remaster/reissue date rather than the true
 * original release. We cross-reference Spotify search and the iTunes Search API,
 * fuzzily matching name + artist, and take the oldest matching year found.
 * Falls back to the track's own `album.release_date` year if nothing older (or
 * an error) turns up — so this never throws and never returns empty.
 */
export async function resolveOriginalYear(
  track: Track,
  accessToken: string
): Promise<string> {
  const fallbackYear = releaseYear(track.album.release_date);

  try {
    const cleanBaseName = baseName(track.name).replace(/"/g, "");
    const cleanArtistName = track.artists[0].name.replace(/"/g, "");
    const normTargetTrack = normalize(cleanBaseName);
    const normTargetArtist = normalize(cleanArtistName);

    // Broad query so both search algorithms can find their own best matches.
    const query = encodeURIComponent(`${cleanBaseName} ${cleanArtistName}`);

    const [spotifyRes, itunesRes] = await Promise.allSettled([
      fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=15`),
    ]);

    let oldestYear = parseInt(fallbackYear);

    // Primary source: Spotify search.
    if (spotifyRes.status === "fulfilled" && spotifyRes.value.ok) {
      const data = await spotifyRes.value.json();
      for (const item of data.tracks?.items || []) {
        const artistMatch = item.artists.some((a: any) =>
          isArtistMatch(a.name, normTargetArtist)
        );
        if (artistMatch && isTrackMatch(item.name, normTargetTrack)) {
          const itemYear = parseInt(releaseYear(item.album.release_date));
          if (!isNaN(itemYear) && itemYear < oldestYear) oldestYear = itemYear;
        }
      }
    }

    // Secondary source: iTunes Search API.
    if (itunesRes.status === "fulfilled" && itunesRes.value.ok) {
      const data = await itunesRes.value.json();
      for (const item of data.results || []) {
        if (
          item.releaseDate &&
          isArtistMatch(item.artistName, normTargetArtist) &&
          isTrackMatch(item.trackName, normTargetTrack)
        ) {
          const itemYear = parseInt(item.releaseDate.substring(0, 4));
          if (!isNaN(itemYear) && itemYear < oldestYear) oldestYear = itemYear;
        }
      }
    }

    return oldestYear.toString();
  } catch (err) {
    console.error("Failed to fetch original year:", err);
    return fallbackYear;
  }
}
