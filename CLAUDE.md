# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Estebox** is a Next.js 14 (App Router) web app that hosts a collection of party games. It is a multi-game site: the main menu is the landing screen and each game is a self-contained module. There is no site-wide login — games opt into auth as needed.

Three games currently exist:
- **Songster** ("Guess the Song"): turns a Spotify playlist into a guess-the-song game, using the Spotify Web Playback SDK to stream full tracks in-browser. Songster authenticates with Spotify OAuth via NextAuth and gates on that auth *internally* (the rest of Estebox does not require it).
- **Tribial**: a caveman/tribal-themed trivia game. Questions are baked into the repo as JSON (fetched from opentdb.com ahead of time, not at runtime) so they can be hand-translated to Spanish. Two modes: **Basic** (hold-to-reveal a shuffled multiple-choice question; long-press ~0.6s to flip to the answer, long-press again to advance) and **Classic** (turn-based, multiplayer Trivial Pursuit: answer a question from a random category to win that category's "wedge", first to all six wins).
- **Dende**: a drinking game themed after Namek/Piccolo. Cards are drawn from a weighted deck baked into the repo as TSV data (hand-authored, not generated), with template substitutions (`{player}`, `{randomplayer}`, `{randomnum;x:y}`, `{list;column}`) and a "norma" system for rules that stay active for a number of rounds. An optional toggle mixes in Tribial questions and Songster song-guessing as special sub-phase cards; the Songster cards require Spotify Premium login only when that toggle is on — the rest of Dende never needs it.

There is no backend database — all game state lives in React component state for the duration of a session. A generic client-side layer (`src/lib/savedGame.ts`) persists a single in-progress game to `localStorage` so it can be resumed after closing the tab; this is per-browser/device state, never sent to a server.

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

**Do not run `npm install`/`npm run build`/`npm run lint`/`npm run dev` to verify changes, and do not go looking for a local node/npm install.** This user does not verify locally — they push and check the result on Vercel. Skip local verification entirely unless the user explicitly asks you to run one of these commands.

Requires a `.env.local` (see `.env.local.example`) with `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`. Playing a track requires a Spotify **Premium** account (Web Playback SDK limitation). The Spotify app's redirect URI must be `http://127.0.0.1:3000/api/auth/callback/spotify` in dev. `DEEPL_API_KEY` is only used by a one-off (not currently in the repo) Tribial question translation script — irrelevant to normal app usage.

## Architecture

This is effectively a single-page client app; almost every component is `"use client"`. There are no custom API routes except NextAuth's.

- **`src/app/api/auth/[...nextauth]/route.ts`** — the only server-side logic. Configures the NextAuth Spotify provider and scopes (`streaming`, `user-read-email`, `user-read-private`, `playlist-read-private`, `playlist-read-collaborative`). Its `jwt` callback stores `accessToken`/`refreshToken`/`accessTokenExpires` on the token and transparently refreshes the access token via Spotify's token endpoint when expired; the `session` callback exposes `accessToken` (and refresh errors) on the session object. Session typing is augmented in `src/types/next-auth.d.ts`.
- **`src/components/Providers.tsx`** — wraps the app in `SessionProvider` with a 50-minute `refetchInterval` to keep the session/token fresh.
- **`src/app/page.tsx`** — thin router. Waits for `useSession()` to finish loading, then holds `selectedGame` state (no URL routing), mirrored into `sessionStorage` so a full-page reload — e.g. returning from the Spotify OAuth redirect, which has no in-app URL to come back to — lands back on the game that was active instead of resetting to the menu. `null` (or an unknown id) shows `MainMenu`; a known id renders that game's module (`selectedGame === "songster"` → `Songster`, `"tribial"` → `Tribial`, `"dende"` → `Dende`). It intentionally holds **no** Spotify/auth logic — that lives inside each game module.
- **`src/components/MainMenu.tsx`** — the Estebox landing screen / game picker. Lists entries from `src/lib/games.ts` (`AVAILABLE_GAMES`), each tinted with its own accent color from a fixed `MOSAIC_ACCENTS` palette, and calls `onSelectGame(id)`. Also reads `src/lib/savedGame.ts` on mount and, if a game is left in progress, shows a "Continúa donde lo dejaste" card above the game list that jumps straight back into that game (generic across games — it just knows the id and a human label; each game handles the actual resume itself). Self-contained: it reads `useSession()` itself and shows a "Cerrar sesión" button only when a session exists (auth is account-level, established by a game). Backed by `PandoraBackground`.
- **`src/lib/savedGame.ts`** — generic, game-agnostic "resume an in-progress game" persistence. A single `localStorage` slot (`estebox:savedGame`) holding `{ gameId, version, savedAt, label, state }`; `state` is opaque to this layer — each game defines its own shape and bumps `version` when that shape changes (a version mismatch is ignored so a stale/corrupt save can't crash resume). `saveSavedGame`/`loadSavedGame`/`clearSavedGame` never throw.
- **`src/components/BoxIcon.tsx`, `src/components/FitBox.tsx`, `src/components/FitText.tsx`** — shared, game-agnostic UI: `BoxIcon` is the app's icon mark (menu header, loading screen); `FitText` auto-shrinks a single line of text to fit its container width (e.g. a long player name header); `FitBox` auto-shrinks *multi-line* text to fit both dimensions of its container without clipping or breaking words (used for Dende's variable-length card text). Both fit components binary-search/measure font size via `ResizeObserver` and re-run only when content or box size actually changes.
- **`src/components/games/songster/`** — the self-contained Songster game module:
  - **`Songster.tsx`** — Songster's entry point. Owns its Spotify auth gate (shows a "Log in with Spotify Premium" screen when signed out), the `RefreshAccessTokenError` re-auth, playlist fetching (client-side `fetch`, no server proxy) including a "choose from your library" picker via `useUserPlaylists`, pick/paste playlist (a regex extracts the ID from full playlist URLs/URIs), mode selection from `./modes`, and the resume/auto-save wiring against `./savedState` + `src/lib/savedGame.ts`; then renders `ClassicGame` or `CarouselGame`. `onExit` returns to the Estebox menu.
  - **`ClassicGame.tsx`** — "Classic" solo mode: hold-to-reveal a track, hold again to advance. Consumes the shared Spotify hooks (below), accepts an optional `initialState` (track order + position) to resume from, and calls `onProgress`/`onComplete` so `Songster.tsx` can checkpoint/clear the save.
  - **`CarouselGame.tsx`** — "Carousel" mode: turn-based multiplayer with a per-turn countdown timer, click-to-assign scoring icons (year/title/artist) per song, and a leaderboard between songs. Also built on the shared hooks, with the same resume/`onProgress`/`onComplete` wiring (including players/scores/settings) as `ClassicGame`; owns only the turn/scoring/leaderboard logic.
  - **`modes.ts`** — Songster's own mode registry (`AVAILABLE_MODES`).
  - **`savedState.ts`** — Songster's save payload shape (`SongsterSavedState`, `CarouselSavedState`) and `buildSongsterLabel` for the resume card. Persists the already-shuffled `tracks` array itself (not just an index) so resuming doesn't need a fresh, differently-shuffled Spotify fetch.
- **`src/components/games/tribial/`** — the self-contained Tribial game module:
  - **`Tribial.tsx`** — Tribial's entry point. No auth gate (trivia needs none). Owns mode selection from `./modes` and a settings panel to filter the question pool by category/difficulty (all included by default); shuffles the filtered `ALL_QUESTIONS` into a deck on Start and renders `BasicGame`, or — for Classic mode, which manages its own players/difficulty and always starts from the full `ALL_QUESTIONS` — renders `ClassicGame` directly. `onExit` returns to the Estebox menu.
  - **`BasicGame.tsx`** — "Basic" mode: hold-to-reveal a question with its shuffled multiple-choice options shown alongside it (holding highlights the correct one). Same long-press mechanic/timing as Songster's `ClassicGame` (600ms `pointerdown` timer via `holdTimerRef`), reimplemented locally since there's no Spotify state to coordinate with.
  - **`ClassicGame.tsx`** — "Clásico" mode: Trivial Pursuit-style multiplayer. Players are entered up front; each turn draws a random category + question, the active player picks an option and holds ~300ms to confirm, a correct answer wins that category's wedge (SVG `WedgeWheel`) and the player keeps their turn, a wrong answer passes to the next player. After a full round (one turn each) a round board shows everyone's wedges before continuing. First to all six wedges wins.
  - **`questions.json`** — baked trivia data in OpenTDB's native shape (`{ results: [...] }`), multiple-choice only. Fetched ahead of time from `opentdb.com/api.php` (not called at runtime) and hand-translated to Spanish.
  - **`types.ts`** — `TriviaQuestion`/`QuestionFile`, the on-disk question shape. `incorrect_answers` is kept per question so Basic/Classic can render the shuffled option set.
  - **`questions.ts`** — `ALL_QUESTIONS` (the JSON, filtered defensively to `type === "multiple"`), `ALL_CATEGORIES`/`ALL_DIFFICULTIES` (derived, sorted/ordered), `shuffle` (Fisher-Yates, same algorithm as `lib/spotify/playlist.ts`), and `decodeEntities` (decodes the HTML entities OpenTDB emits, e.g. `&quot;`/`&#039;`/accented-letter entities — regex/map based so it's SSR-safe).
  - **`TribalBackground.tsx`** — decorative inline-SVG backdrop (leopard-print pattern + two flickering torches). Pure CSS/SVG, no image files.
  - **`modes.ts`** — Tribial's own mode registry (`AVAILABLE_MODES`): `basic` and `classic`.
- **`src/components/games/dende/`** — the self-contained Dende game module. No `modes.ts` — Dende is a single continuous mode with no natural end (played until the group quits via `onExit`):
  - **`Dende.tsx`** — setup screen: player list (3–30), the optional "Activar cartas Songster" toggle (which requests Spotify login and a playlist only when turned on, saving the in-progress setup form to `sessionStorage` across the OAuth redirect), and the resume/auto-save wiring against `./savedState` + `src/lib/savedGame.ts`. Renders `DendeGame` when started.
  - **`DendeGame.tsx`** — the main card loop: draws a weighted-random card via `pickNextCard`, runs `substituteCardText` for its template tokens, ages every active "norma" by one card and expires any that hit their threshold, and hands off to `TribialCards`/`SongsterCard` when a card is flagged `special_tribial`/`special_songster`. Hold ~0.6s to advance (same mechanic as Tribial's Basic mode). Auto-saves via `onProgress` at each stable checkpoint (a new view being shown).
  - **`TribialCards.tsx`** — the `special_tribial` sub-phase: 3 random Tribial questions played exactly like Tribial's Basic mode, restyled to Dende's Namek theme.
  - **`SongsterCard.tsx`** — the `special_songster` sub-phase: plays a random not-yet-used track (up to 45s, auto-pausing at 0) then hold-to-reveal shows title/artist/year, mirroring Songster's `ClassicGame` hold-twice mechanic, restyled to Dende's Namek theme. Reports the played track id upward so it isn't repeated.
  - **`cards.ts`** — parses the TSV data files (below) into `ALL_CARDS`/`LISTS`, plus the game logic: `shuffle`, `pickNextCard` (weighted random, excludes `special_songster` cards unless Songster is enabled, avoids immediate repeats), `pickPlayerForPity`/`updatePityAfterPlayerPick` (an aggressive "pity" system so `{player}` substitutions can't neglect a player for too long), `substituteCardText` (applies all template tokens), and `parseBoldSegments` (splits `*bold*` markers for rendering).
  - **`data/juego.tsv`, `data/listas.tsv`** — the hand-authored card deck (text/weight/flag columns) and named lookup lists (for `{list;column}`), imported as raw strings via the `*.tsv` module declaration in `src/types/tsv.d.ts`.
  - **`savedState.ts`** — Dende's save payload shape (`DendeSavedState`/`DendeRuntimeState`: players, toggle/playlist, active normas, pity, current view, pending expiries, and — if Songster is enabled — the resolved tracks/used-track-ids) and `buildDendeLabel`. Unlike Songster, there's no `onComplete`; the save is only ever cleared explicitly from the setup screen ("Descartar").
  - **`NamekBackground.tsx`** — decorative backdrop for Dende's theme, mirrors `TribalBackground.tsx`/`PandoraBackground.tsx`.

### Shared Spotify layer (`src/lib/spotify/` + `src/hooks/`)

These are general Spotify building blocks (reusable by any game that needs them — currently Songster and Dende's optional Songster cards). The pieces of logic every consumer needs are factored out here so game components stay focused on their own UX. **Change behavior here, in one place — not per-component.**

- **`src/lib/spotify/types.ts`** — the shared `Track` shape.
- **`src/lib/spotify/playlist.ts`** — `loadPlaylistTracks(playlistId, accessToken)`: paginate `GET /v1/playlists/{id}/items`, filter out non-track/non-playable/local items, Fisher-Yates shuffle. Throws on API error / empty result.
- **`src/lib/spotify/year.ts`** — `resolveOriginalYear(track, accessToken)`: playlist metadata often reflects a remaster/reissue date, so this fuzzy cross-references Spotify search + the iTunes Search API (punctuation-stripping, accent-safe normalization), returning the oldest matching year and falling back to the track's own `album.release_date` year. Never throws. Also exports `releaseYear(dateString)`.
- **`src/hooks/usePlaylistTracks.ts`** — wraps `loadPlaylistTracks` in `{ tracks, loading, error }`. Takes an optional `initialTracks` (a resumed game's already-shuffled order) which, if non-empty, skips the Spotify fetch entirely; an empty `playlistId` is treated as "nothing to load" (not an error), since Dende's Songster cards are optional.
- **`src/hooks/useOriginalYear.ts`** — resolves the current track's year, showing the fallback immediately then refining it; re-runs when the track changes.
- **`src/hooks/useSpotifyPlayer.ts`** — Web Playback SDK lifecycle: lazily injects `https://sdk.scdn.co/spotify-player.js`, constructs `window.Spotify.Player` (named via the required `playerName` argument, e.g. `"Guess the Song Player"`/`"Songster Carousel"`/`"Dende"`, so the active-device name in Spotify is meaningful) with `getOAuthToken` reading from a ref (so the SDK always sees the latest token after a NextAuth refresh), and exposes `init({ onReady, onError })`, `playUri(uri)` (with the device-not-yet-active retry loop via `PUT /v1/me/player/play`), `pause()`, `disconnect()`, and `deviceIdRef`. Cleans up the player on unmount.
- **`src/hooks/useUserPlaylists.ts`** — fetches the signed-in user's Spotify playlists for the "choose from your library" picker (Songster, and Dende's Songster-card setup). Retries a couple of times on failure since a freshly-issued token can occasionally fail its very first use.

A new mode/game should reuse these hooks rather than re-implementing playlist/year/player logic.

### Adding a new game (top-level menu entry)

1. Register it in `src/lib/games.ts` (`AVAILABLE_GAMES`).
2. Create a self-contained module under `src/components/games/<game>/` with an entry component that takes `onExit: () => void` and handles its own requirements (auth, setup, etc.) internally — mirror `games/songster/` or `games/dende/`.
3. Branch on the game id in `src/app/page.tsx` (alongside `selectedGame === "songster"`) to render the module's entry component.
4. If the game should support resume, define its own save-state shape (mirror `games/songster/savedState.ts` or `games/dende/savedState.ts`) and wire it against the generic `src/lib/savedGame.ts` layer — it's optional, not required for every game.

### Adding a new Songster game mode

Register it in `src/components/games/songster/modes.ts` (`AVAILABLE_MODES`), then branch on the mode id in `Songster.tsx` to render the new component alongside `ClassicGame`/`CarouselGame`.

### Adding a new Tribial game mode

Register it in `src/components/games/tribial/modes.ts` (`AVAILABLE_MODES`), then branch on the mode id in `Tribial.tsx` to render the new component alongside `BasicGame`/`ClassicGame`. Reuse `ALL_QUESTIONS`/`ALL_CATEGORIES`/`ALL_DIFFICULTIES`/`shuffle`/`decodeEntities` from `./questions` rather than re-deriving question data.

## Important: Git Operations

**Do not commit or push without explicit permission.** Always ask the user before committing work. Wait for the user to tell you when to commit — they control the repository state. Git operations are listed here as reference only.

Git is configured to push from the `epsantalla` account (`user.email=epsantalla@pm.me`, `user.name=epsantalla`).

## Notes

- `graphify-out/` is a gitignored, generated directory (code analysis output) — not part of the source tree.
- Styling is Tailwind, with per-game/per-mode color theming done inline in components (gold for Songster Classic, ruby/red for Songster Carousel, orange/ochre for Tribial, teal-green for Dende) rather than via Tailwind theme config.
