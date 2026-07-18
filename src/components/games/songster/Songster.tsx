"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Playfair_Display } from "next/font/google";
import ClassicGame from "./ClassicGame";
import CarouselGame from "./CarouselGame";
import { AVAILABLE_MODES } from "./modes";
import { loadSavedGame, saveSavedGame, clearSavedGame, SavedGame } from "@/lib/savedGame";
import {
  SONGSTER_GAME_ID,
  SONGSTER_SAVE_VERSION,
  SongsterSavedState,
  SongsterProgress,
  buildSongsterLabel,
} from "./savedState";

const playfair = Playfair_Display({ subsets: ["latin"] });

/**
 * The Songster game module. Self-contained: it owns its own Spotify auth gate
 * (Songster needs a Spotify Premium account; the rest of Estebox does not),
 * playlist selection, mode selection, and hands off to the mode components.
 *
 * `onExit` returns the user to the Estebox main menu.
 */
export default function Songster({ onExit }: { onExit: () => void }) {
  const { data: session, status } = useSession();
  const [playlistId, setPlaylistId] = useState("");
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [selectedMode, setSelectedMode] = useState(AVAILABLE_MODES[0].id);

  // A previously saved, resumable game (or null). Refreshed whenever we return
  // to the setup screen so the resume card always reflects the current save.
  const [resume, setResume] = useState<SavedGame<SongsterSavedState> | null>(null);
  // The state to hydrate the mode with when resuming (null for a fresh game).
  const [resumeState, setResumeState] = useState<SongsterSavedState | null>(null);

  useEffect(() => {
    if ((session as any)?.error === "RefreshAccessTokenError") {
      signIn("spotify");
    }
  }, [session]);

  // Read the saved game on mount and every time we come back to setup.
  // (localStorage is client-only, so we read it in an effect, not during render.)
  useEffect(() => {
    if (isGameStarted) return;
    const saved = loadSavedGame();
    setResume(
      saved && saved.gameId === SONGSTER_GAME_ID && saved.version === SONGSTER_SAVE_VERSION
        ? (saved as SavedGame<SongsterSavedState>)
        : null
    );
  }, [isGameStarted]);

  // Resume the saved game: restore playlist + mode, and pass the saved state
  // down to the mode component to hydrate from.
  const handleResume = () => {
    if (!resume) return;
    const state = resume.state;
    setPlaylistId(state.playlistId);
    setSelectedMode(state.mode);
    setResumeState(state);
    setIsGameStarted(true);
  };

  const handleDiscard = () => {
    clearSavedGame();
    setResume(null);
  };

  // Auto-save callback handed to the mode. The mode reports its own progress;
  // Songster owns `gameId`/`mode`/`playlistId` and wraps it into a full save.
  const handleProgress = (progress: SongsterProgress) => {
    const state: SongsterSavedState = {
      mode: selectedMode,
      playlistId,
      currentIndex: progress.currentIndex,
      tracks: progress.tracks,
      carousel: progress.carousel,
    };
    saveSavedGame({
      gameId: SONGSTER_GAME_ID,
      version: SONGSTER_SAVE_VERSION,
      savedAt: Date.now(),
      label: buildSongsterLabel(state),
      state,
    });
  };

  // Natural completion — nothing left to resume.
  const handleComplete = () => {
    clearSavedGame();
    setResume(null);
    setResumeState(null);
  };

  useEffect(() => {
    if (session?.accessToken) {
      fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.items) {
          setUserPlaylists(data.items.filter((p: any) => p !== null));
        }
      })
      .catch(err => console.error("Error fetching playlists", err));
    }
  }, [session?.accessToken]);

  if (status === "loading") {
    return (
      <main className="flex h-[100dvh] overflow-hidden touch-none flex-col items-center justify-center bg-[#0a0a0a] text-foreground">
        <p className="text-xl text-[#BF953F] animate-pulse">Loading...</p>
      </main>
    );
  }

  // Songster requires Spotify — gate here rather than at the site level.
  if (!session) {
    return (
      <main className="flex h-[100dvh] overflow-hidden touch-none flex-col items-center justify-center p-6 bg-[#0a0a0a] text-foreground">
        <div className="absolute top-4 left-4">
          <button
            onClick={onExit}
            className="text-sm px-4 py-2 border border-gray-600 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            &larr; Menu
          </button>
        </div>
        <h1 className={`${playfair.className} text-6xl font-black mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] drop-shadow-sm`}>
          Songster
        </h1>
        <p className="text-gray-400 mb-12 text-center max-w-sm">
          Songster streams full tracks in your browser, so it needs a Spotify Premium account.
        </p>
        <button
          onClick={() => signIn("spotify")}
          className="px-8 py-4 bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black rounded-full font-bold text-lg shadow-xl shadow-[#BF953F]/20 hover:shadow-[#BF953F]/40 hover:scale-105 transition-all active:scale-95"
        >
          Log in with Spotify Premium
        </button>
      </main>
    );
  }

  if (isGameStarted && session.accessToken) {
    if (selectedMode === "carousel") {
      const carouselResume =
        resumeState && resumeState.mode === "carousel" && resumeState.carousel
          ? {
              currentIndex: resumeState.currentIndex,
              tracks: resumeState.tracks,
              players: resumeState.carousel.players,
              settings: resumeState.carousel.settings,
              startingPlayerIndexForSong: resumeState.carousel.startingPlayerIndexForSong,
            }
          : undefined;
      return (
        <CarouselGame
          playlistId={playlistId}
          accessToken={session.accessToken}
          onExit={() => setIsGameStarted(false)}
          initialState={carouselResume}
          onProgress={handleProgress}
          onComplete={handleComplete}
        />
      );
    }
    const classicResume =
      resumeState && resumeState.mode !== "carousel"
        ? { currentIndex: resumeState.currentIndex, tracks: resumeState.tracks }
        : undefined;
    return (
      <ClassicGame
        playlistId={playlistId}
        accessToken={session.accessToken}
        mode={selectedMode}
        onExit={() => setIsGameStarted(false)}
        initialState={classicResume}
        onProgress={handleProgress}
        onComplete={handleComplete}
      />
    );
  }

  const isCarousel = selectedMode === "carousel";
  const theme = {
    gradient: isCarousel ? "from-[#FF2A55] via-[#B81137] to-[#7A0B22]" : "from-[#BF953F] via-[#FCF6BA] to-[#B38728]",
    text: isCarousel ? "text-[#FF2A55]" : "text-[#BF953F]",
    text80: isCarousel ? "text-[#FF2A55]/80" : "text-[#BF953F]/80",
    ring: isCarousel ? "focus:ring-[#FF2A55]" : "focus:ring-[#BF953F]",
    shadow: isCarousel ? "shadow-[#FF2A55]/20" : "shadow-[#BF953F]/20",
    hoverShadow: isCarousel ? "hover:shadow-[#FF2A55]/40" : "hover:shadow-[#BF953F]/40",
    hoverBorder: isCarousel ? "group-hover:border-[#FF2A55]" : "group-hover:border-[#BF953F]",
    buttonText: isCarousel ? "text-white" : "text-black",
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistId.trim()) return;

    let finalId = playlistId.trim();

    // Automatically extract the ID using a regex to handle various formats (including localized URLs)
    const match = finalId.match(/(?:playlist\/|playlist:)([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      finalId = match[1];
    } else {
      finalId = finalId.split('?')[0];
    }

    setPlaylistId(finalId);
    setResumeState(null); // fresh game — don't inherit any saved state
    setIsGameStarted(true);
  };

  return (
    <main className="flex h-[100dvh] overflow-hidden flex-col items-center justify-center p-6 bg-[#0a0a0a] text-foreground w-full">
      <div className="absolute top-4 left-4">
        <button
          onClick={onExit}
          className="text-sm px-4 py-2 border border-gray-600 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          &larr; Menu
        </button>
      </div>
      <div className="absolute top-4 right-4">
        <button
          onClick={() => signOut()}
          className="text-sm px-4 py-2 border border-gray-600 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          Sign Out
        </button>
      </div>

      <div className="w-full max-w-md mx-auto">
        <h1 className={`${playfair.className} text-5xl font-black mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r ${theme.gradient} drop-shadow-sm transition-all duration-500`}>
          Songster
        </h1>

        {resume && (
          <div className="mb-8 p-4 rounded-xl bg-[#111] border border-[#BF953F]/40 shadow-lg shadow-black/40">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Game in progress</p>
            <p className="text-white font-medium mb-4">{resume.label}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleResume}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black font-bold transition-all hover:scale-[1.02] active:scale-95"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="px-4 py-3 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 transition"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleStart} className="w-full flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="mode" className={`text-sm ${theme.text80} font-medium transition-colors duration-500`}>
              Game Mode
            </label>
            <div className="relative">
              <select
                id="mode"
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className={`w-full px-4 py-4 bg-[#111] border border-gray-800 rounded-xl focus:outline-none focus:ring-2 ${theme.ring} text-white shadow-inner appearance-none cursor-pointer transition-shadow duration-500`}
              >
                {AVAILABLE_MODES.map(mode => (
                  <option key={mode.id} value={mode.id}>
                    {mode.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              {AVAILABLE_MODES.find(m => m.id === selectedMode)?.description}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="playlist" className={`text-sm ${theme.text80} font-medium transition-colors duration-500`}>
              Spotify Playlist ID
            </label>
            <input
              id="playlist"
              type="text"
              placeholder="e.g. 37i9dQZF1DXcBWIGoYBM5M"
              value={playlistId}
              onChange={(e) => setPlaylistId(e.target.value)}
              className={`px-4 py-4 bg-[#111] border border-gray-800 rounded-xl focus:outline-none focus:ring-2 ${theme.ring} text-white placeholder-gray-600 shadow-inner transition-shadow duration-500`}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              You can find the Playlist ID in the Spotify URL or Share link.
            </p>
          </div>

          <button
            type="submit"
            className={`w-full py-4 bg-gradient-to-r ${theme.gradient} ${theme.buttonText} rounded-xl font-bold text-lg shadow-xl ${theme.shadow} ${theme.hoverShadow} hover:scale-[1.02] transition-all duration-500 active:scale-95`}
          >
            Start Game
          </button>
        </form>

        {userPlaylists.length > 0 && (
          <div className="w-full mt-8">
            <div className="flex items-center justify-center gap-4 mb-6 opacity-50">
              <div className="h-px bg-white flex-1"></div>
              <span className="text-xs tracking-widest uppercase font-bold text-white">Or select from library</span>
              <div className="h-px bg-white flex-1"></div>
            </div>

            {/* The Carousel */}
            <div
              className="flex overflow-x-auto gap-4 pb-4 snap-x touch-pan-x [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {userPlaylists.map(playlist => (
                <button
                  key={playlist.id}
                  onClick={() => {
                    setPlaylistId(playlist.id);
                    setResumeState(null); // fresh game — don't inherit any saved state
                    setIsGameStarted(true);
                  }}
                  className="flex-shrink-0 w-28 flex flex-col items-center gap-3 snap-center group text-left transition-transform active:scale-95"
                >
                  <div className={`w-28 h-28 rounded-md bg-gray-800 overflow-hidden shadow-lg border-2 border-transparent ${theme.hoverBorder} transition-colors duration-500 relative`}>
                    {playlist.images?.[0]?.url ? (
                      <img src={playlist.images[0].url} alt={playlist.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#111] text-gray-600 text-xs uppercase font-bold tracking-widest">Mix</div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 w-full truncate text-center group-hover:text-white transition-colors font-medium">
                    {playlist.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
