# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Estebox** is a Next.js 14 (App Router) web app that hosts a collection of party games. It is a multi-game site: the main menu is the landing screen and each game is a self-contained module. There is no site-wide login — games opt into auth as needed.

The first (currently only) game is **Songster** ("Guess the Song"): it turns a Spotify playlist into a guess-the-song game, using the Spotify Web Playback SDK to stream full tracks in-browser. Songster authenticates with Spotify OAuth via NextAuth and gates on that auth *internally* (the rest of Estebox does not require it). There is no backend database — all game state lives in React component state for the duration of a session.

> Note: the on-disk repo folder is still named `Hitsteban` (Songster/Estebox is the product rename); paths in this doc are relative to the repo root regardless of its folder name.

## Commands

```bash
npm install       # install dependencies
npm run dev       # start dev server at http://127.0.0.1:3000
npm run build     # production build
npm run start     # run production build
npm run lint      # next lint (eslint-config-next)
```

There is no test suite in this repo (no test runner configured, no test files).

Requires a `.env.local` (see `.env.local.example`) with `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`. Playing a track requires a Spotify **Premium** account (Web Playback SDK limitation). The Spotify app's redirect URI must be `http://127.0.0.1:3000/api/auth/callback/spotify` in dev.

## Architecture

This is effectively a single-page client app; almost every component is `"use client"`. There are no custom API routes except NextAuth's.

- **`src/app/api/auth/[...nextauth]/route.ts`** — the only server-side logic. Configures the NextAuth Spotify provider and scopes (`streaming`, `user-read-email`, `user-read-private`, `playlist-read-private`, `playlist-read-collaborative`). Its `jwt` callback stores `accessToken`/`refreshToken`/`accessTokenExpires` on the token and transparently refreshes the access token via Spotify's token endpoint when expired; the `session` callback exposes `accessToken` (and refresh errors) on the session object. Session typing is augmented in `src/types/next-auth.d.ts`.
- **`src/components/Providers.tsx`** — wraps the app in `SessionProvider` with a 50-minute `refetchInterval` to keep the session/token fresh.
- **`src/app/page.tsx`** — thin router. Waits for `useSession()` to finish loading, then holds `selectedGame` state (no URL routing): `null` (or an unknown id) shows `MainMenu`; a known id renders that game's module (currently `selectedGame === "songster"` → `Songster`). It intentionally holds **no** Spotify/auth logic — that lives inside the game module.
- **`src/components/MainMenu.tsx`** — the Estebox landing screen / game picker. Lists entries from `src/lib/games.ts` (`AVAILABLE_GAMES`; currently just "Songster") and calls `onSelectGame(id)`. Self-contained: it reads `useSession()` itself and shows a "Sign Out" button only when a session exists (auth is account-level, established by a game).
- **`src/components/games/songster/`** — the self-contained Songster game module:
  - **`Songster.tsx`** — Songster's entry point. Owns its Spotify auth gate (shows a "Log in with Spotify Premium" screen when signed out), the `RefreshAccessTokenError` re-auth, playlist fetching (client-side `fetch`, no server proxy), pick/paste playlist (a regex extracts the ID from full playlist URLs/URIs), and mode selection from `./modes`; then renders `ClassicGame` or `CarouselGame`. `onExit` returns to the Estebox menu.
  - **`ClassicGame.tsx`** — "Classic" solo mode: hold-to-reveal a track, hold again to advance. Consumes the shared Spotify hooks (below) and only owns its reveal/advance UI.
  - **`CarouselGame.tsx`** — "Carousel" mode: turn-based multiplayer with a per-turn countdown timer, click-to-assign scoring icons (year/title/artist) per song, and a leaderboard between songs. Also built on the shared hooks; owns only the turn/scoring/leaderboard logic.
  - **`modes.ts`** — Songster's own mode registry (`AVAILABLE_MODES`).

### Shared Spotify layer (`src/lib/spotify/` + `src/hooks/`)

These are general Spotify building blocks (reusable by any future music game, not just Songster). The three pieces of logic every Songster mode needs are factored out here so game components stay focused on their own UX. **Change behavior here, in one place — not per-component.**

- **`src/lib/spotify/types.ts`** — the shared `Track` shape.
- **`src/lib/spotify/playlist.ts`** — `loadPlaylistTracks(playlistId, accessToken)`: paginate `GET /v1/playlists/{id}/items`, filter out non-track/non-playable/local items, Fisher-Yates shuffle. Throws on API error / empty result.
- **`src/lib/spotify/year.ts`** — `resolveOriginalYear(track, accessToken)`: playlist metadata often reflects a remaster/reissue date, so this fuzzy cross-references Spotify search + the iTunes Search API (punctuation-stripping, accent-safe normalization), returning the oldest matching year and falling back to the track's own `album.release_date` year. Never throws. Also exports `releaseYear(dateString)`.
- **`src/hooks/usePlaylistTracks.ts`** — wraps `loadPlaylistTracks` in `{ tracks, loading, error }`.
- **`src/hooks/useOriginalYear.ts`** — resolves the current track's year, showing the fallback immediately then refining it; re-runs when the track changes.
- **`src/hooks/useSpotifyPlayer.ts`** — Web Playback SDK lifecycle: lazily injects `https://sdk.scdn.co/spotify-player.js`, constructs `window.Spotify.Player` with `getOAuthToken` reading from a ref (so the SDK always sees the latest token after a NextAuth refresh), and exposes `init({ onReady, onError })`, `playUri(uri)` (with the device-not-yet-active retry loop via `PUT /v1/me/player/play`), `pause()`, `disconnect()`, and `deviceIdRef`. Cleans up the player on unmount.

A new mode/game should reuse these hooks rather than re-implementing playlist/year/player logic.

### Adding a new game (top-level menu entry)

1. Register it in `src/lib/games.ts` (`AVAILABLE_GAMES`).
2. Create a self-contained module under `src/components/games/<game>/` with an entry component that takes `onExit: () => void` and handles its own requirements (auth, setup, etc.) internally — mirror `games/songster/`.
3. Branch on the game id in `src/app/page.tsx` (alongside `selectedGame === "songster"`) to render the module's entry component.

### Adding a new Songster game mode

Register it in `src/components/games/songster/modes.ts` (`AVAILABLE_MODES`), then branch on the mode id in `Songster.tsx` to render the new component alongside `ClassicGame`/`CarouselGame`.

## Important: Git Operations

**Do not commit or push without explicit permission.** Always ask the user before committing work. Wait for the user to tell you when to commit — they control the repository state. Git operations are listed here as reference only.

Git is configured to push from the `epsantalla` account (`user.email=epsantalla@pm.me`, `user.name=epsantalla`).

## Notes

- `graphify-out/` is a gitignored, generated directory (code analysis output) — not part of the source tree.
- Styling is Tailwind, with per-mode color theming done inline in components (gold for Classic, ruby/red for Carousel) rather than via Tailwind theme config.
