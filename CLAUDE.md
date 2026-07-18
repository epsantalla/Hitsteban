# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Hitsteban ("Guess the Song") is a Next.js 14 (App Router) web app that turns a Spotify playlist into a "guess the song" party game, using the Spotify Web Playback SDK to stream full tracks in-browser. Auth is Spotify OAuth via NextAuth. There is no backend database — all game state lives in React component state for the duration of a session.

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
- **`src/app/page.tsx`** — the home screen and router of sorts. Gates on `useSession()`: shows a Spotify login button when signed out; once signed in, gates on `selectedGame` state (`null` = show `MainMenu`, the top-level menu of games from `src/lib/games.ts`). Selecting "Hitster" reveals the existing setup screen: it fetches the user's Spotify playlists directly from the Spotify Web API (client-side `fetch`, no server proxy), lets the user pick/paste a playlist (a regex extracts the ID from full playlist URLs/URIs) and a mode from `src/lib/modes.ts`, then renders either `Game` or `CarouselGame` based on the selected mode. All of this is still client-side state (no routing) — a "&larr; Menu" button resets `selectedGame` to `null`.
- **`src/components/MainMenu.tsx`** — top-level game picker rendered when `selectedGame` is `null`. Lists entries from `src/lib/games.ts` (`AVAILABLE_GAMES`); currently just "Hitster".
- **`src/components/Game.tsx`** — "Classic" solo mode: hold-to-reveal a track, hold again to advance.
- **`src/components/CarouselGame.tsx`** — "Carousel" mode: turn-based multiplayer with a per-turn countdown timer, click-to-assign scoring icons (year/title/artist) per song, and a leaderboard between songs.

### Duplicated logic between `Game.tsx` and `CarouselGame.tsx`

These two components are independent and intentionally do not share code today, but both re-implement the same three pieces of logic nearly verbatim:
1. **Playlist loading**: paginate `GET /v1/playlists/{id}/items`, filter out non-track/non-playable/local items, then Fisher-Yates shuffle.
2. **"Original year" resolution**: playlist metadata often reflects a remaster/reissue date rather than the true original release year. Both components run a fuzzy cross-reference against Spotify search and the iTunes Search API (name/artist normalization strips punctuation and diacritics-safe casing), taking the oldest matching year found, falling back to the playlist track's own `album.release_date` year.
3. **Web Playback SDK bootstrap**: lazily inject `https://sdk.scdn.co/spotify-player.js`, construct `window.Spotify.Player` with `getOAuthToken` reading from a ref (so the SDK always sees the latest token even after a NextAuth refresh), and `playTrack` with a retry loop (device not yet active on Spotify's backend) via `PUT /v1/me/player/play`.

If you change one of these behaviors, check whether the same fix is needed in the other component.

### Adding a new game (top-level menu entry)

Register it in `src/lib/games.ts` (`AVAILABLE_GAMES`), then branch on the game id in `src/app/page.tsx` (alongside the `selectedGame === "hitster"` setup screen) to render its own setup UI/component(s).

### Adding a new Hitster game mode

Register it in `src/lib/modes.ts` (`AVAILABLE_MODES`), then branch on the mode id in `src/app/page.tsx` to render the new component alongside `Game`/`CarouselGame`.

## Important: Git Operations

**Do not commit or push without explicit permission.** Always ask the user before committing work. Wait for the user to tell you when to commit — they control the repository state. Git operations are listed here as reference only.

Git is configured to push from the `epsantalla` account (`user.email=epsantalla@pm.me`, `user.name=epsantalla`).

## Notes

- `graphify-out/` is a gitignored, generated directory (code analysis output) — not part of the source tree.
- Styling is Tailwind, with per-mode color theming done inline in components (gold for Classic, ruby/red for Carousel) rather than via Tailwind theme config.
