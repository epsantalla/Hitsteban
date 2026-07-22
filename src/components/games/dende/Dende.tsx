"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { Bangers } from "next/font/google";
import { Plus, X } from "lucide-react";
import { loadSavedGame, saveSavedGame, clearSavedGame, SavedGame } from "@/lib/savedGame";
import { useUserPlaylists } from "@/hooks/useUserPlaylists";
import DendeGame from "./DendeGame";
import NamekBackground from "./NamekBackground";
import { MAX_PLAYERS, MIN_PLAYERS, Player } from "./cards";
import {
  DENDE_GAME_ID,
  DENDE_SAVE_VERSION,
  DendeSavedState,
  DendeRuntimeState,
  buildDendeLabel,
} from "./savedState";

const bangers = Bangers({ subsets: ["latin"], weight: "400" });

/** sessionStorage key for the in-progress setup form, saved just before the
 * Spotify OAuth redirect (which fully reloads the app) and restored on
 * mount so login returns to the game being configured, not a blank form. */
const DENDE_DRAFT_KEY = "dende:setupDraft";

interface DendeSetupDraft {
  players: Player[];
  songsterEnabled: boolean;
  playlistId: string;
}

/**
 * The Dende game module. Self-contained: players are entered locally (no
 * account needed), and Spotify auth is only requested if the optional
 * Songster-card toggle is turned on — the rest of Dende never needs it.
 *
 * `onExit` returns the user to the Estebox main menu.
 */
export default function Dende({ onExit }: { onExit: () => void }) {
  const { data: session } = useSession();

  const [players, setPlayers] = useState<Player[]>([
    { id: "1", name: "" },
    { id: "2", name: "" },
    { id: "3", name: "" },
  ]);
  const [songsterEnabled, setSongsterEnabled] = useState(false);
  const [playlistId, setPlaylistId] = useState("");
  const userPlaylists = useUserPlaylists(session?.accessToken);
  const [isGameStarted, setIsGameStarted] = useState(false);

  // Restore the setup draft saved just before a Spotify login redirect, if any.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DENDE_DRAFT_KEY);
      if (!raw) return;
      sessionStorage.removeItem(DENDE_DRAFT_KEY);
      const draft = JSON.parse(raw) as DendeSetupDraft;
      setPlayers(draft.players);
      setSongsterEnabled(draft.songsterEnabled);
      setPlaylistId(draft.playlistId ?? "");
    } catch {}
  }, []);

  const handleSpotifyLogin = () => {
    try {
      const draft: DendeSetupDraft = { players, songsterEnabled, playlistId };
      sessionStorage.setItem(DENDE_DRAFT_KEY, JSON.stringify(draft));
    } catch {}
    signIn("spotify");
  };

  // A previously saved, resumable game (or null).
  const [resume, setResume] = useState<SavedGame<DendeSavedState> | null>(null);
  // The runtime state to hydrate DendeGame with when resuming (null for a fresh game).
  const [resumeState, setResumeState] = useState<DendeSavedState | null>(null);

  useEffect(() => {
    if ((session as any)?.error === "RefreshAccessTokenError") {
      signIn("spotify");
    }
  }, [session]);

  // Read the saved game on mount and every time we come back to setup.
  useEffect(() => {
    if (isGameStarted) return;
    const saved = loadSavedGame();
    setResume(
      saved && saved.gameId === DENDE_GAME_ID && saved.version === DENDE_SAVE_VERSION
        ? (saved as SavedGame<DendeSavedState>)
        : null
    );
  }, [isGameStarted]);

  const handleResume = () => {
    if (!resume) return;
    const state = resume.state;
    setPlayers(state.players);
    setSongsterEnabled(state.songsterEnabled);
    setPlaylistId(state.playlistId ?? "");
    setResumeState(state);
    setIsGameStarted(true);
  };

  const handleDiscard = () => {
    clearSavedGame();
    setResume(null);
  };

  // Auto-save callback handed to DendeGame. Dende owns players/songsterEnabled/
  // playlistId; DendeGame reports its own runtime progress on each checkpoint.
  const handleProgress = (progress: DendeRuntimeState) => {
    const state: DendeSavedState = {
      players,
      songsterEnabled,
      playlistId: songsterEnabled ? playlistId : undefined,
      ...progress,
    };
    saveSavedGame({
      gameId: DENDE_GAME_ID,
      version: DENDE_SAVE_VERSION,
      savedAt: Date.now(),
      label: buildDendeLabel(state),
      state,
    });
  };

  const addPlayer = () => {
    if (players.length >= MAX_PLAYERS) return;
    setPlayers([...players, { id: Date.now().toString(), name: "" }]);
  };

  const removePlayer = (id: string) => {
    if (players.length <= MIN_PLAYERS) return;
    setPlayers(players.filter((p) => p.id !== id));
  };

  const canStart = players.length >= MIN_PLAYERS && (!songsterEnabled || (!!session?.accessToken && playlistId.trim() !== ""));

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStart) return;

    const finalPlayers = players.map((p, i) => ({
      ...p,
      name: p.name.trim() === "" ? `Jugador ${i + 1}` : p.name.trim(),
    }));
    setPlayers(finalPlayers);

    if (songsterEnabled) {
      let finalId = playlistId.trim();
      const match = finalId.match(/(?:playlist\/|playlist:)([a-zA-Z0-9]+)/);
      finalId = match && match[1] ? match[1] : finalId.split("?")[0];
      setPlaylistId(finalId);
    }

    setResumeState(null); // fresh game — don't inherit any saved state
    setIsGameStarted(true);
  };

  if (isGameStarted) {
    return (
      <DendeGame
        players={players}
        songsterEnabled={songsterEnabled}
        playlistId={songsterEnabled ? playlistId : ""}
        accessToken={session?.accessToken ?? ""}
        onExit={() => setIsGameStarted(false)}
        initialState={resumeState ?? undefined}
        onProgress={handleProgress}
      />
    );
  }

  return (
    <main className="relative flex min-h-[100dvh] overflow-hidden flex-col items-center p-6 pt-12 pb-24 bg-[#04120D] text-[#EAF7EE] w-full overflow-y-auto">
      <NamekBackground />

      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={onExit}
          className="text-sm px-4 py-2 border border-[#1B4433] rounded-md text-[#8FBFA4] hover:text-white hover:bg-[#0B2A20] transition"
        >
          &larr; Menú
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center mt-4">
        <h1
          className={`${bangers.className} text-6xl mb-2 text-center bg-clip-text text-transparent bg-gradient-to-b from-[#8FF0C0] via-[#2BB673] to-[#1B998B] drop-shadow-[0_2px_8px_rgba(43,182,115,0.35)] tracking-wide`}
        >
          Dende
        </h1>
        <p className="text-[#8FBFA4] mb-8 text-center text-sm tracking-wide uppercase">
          Un juego de beber inspirado por el Piccolo (pero mejor)
        </p>

        {resume && (
          <div className="w-full mb-8 p-4 rounded-xl bg-[#0B2A20] border border-[#2BB673]/40 shadow-lg shadow-black/40">
            <p className="text-xs uppercase tracking-widest text-[#8FBFA4] mb-1">Partida en curso</p>
            <p className="text-white font-medium mb-4">{resume.label}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleResume}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-[#2BB673] to-[#1B998B] text-black font-bold transition-all hover:scale-[1.02] active:scale-95"
              >
                Reanudar
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="px-4 py-3 rounded-lg border border-[#1B4433] text-[#8FBFA4] hover:text-white hover:bg-[#0B2A20] transition"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleStart} className="w-full flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#2BB673]/90 font-medium">
              Jugadores ({players.length}/{MAX_PLAYERS}, mínimo {MIN_PLAYERS})
            </label>
            <div className="flex flex-col gap-3">
              {players.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-[#8FBFA4] font-mono w-6">{i + 1}.</span>
                  <input
                    value={p.name}
                    onChange={(e) => {
                      const newP = [...players];
                      newP[i] = { ...newP[i], name: e.target.value };
                      setPlayers(newP);
                    }}
                    placeholder={`Jugador ${i + 1}`}
                    className="flex-1 bg-[#0B2A20] border border-[#1B4433] rounded-lg px-3 py-3 text-white focus:ring-1 focus:ring-[#2BB673] outline-none"
                  />
                  {players.length > MIN_PLAYERS && (
                    <button
                      type="button"
                      onClick={() => removePlayer(p.id)}
                      className="p-3 text-[#8FBFA4] hover:text-red-400"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
              {players.length < MAX_PLAYERS && (
                <button
                  type="button"
                  onClick={addPlayer}
                  className="flex items-center justify-center gap-2 py-3 mt-1 border border-dashed border-[#1B4433] rounded-lg text-[#8FBFA4] hover:text-[#2BB673] hover:border-[#2BB673] transition"
                >
                  <Plus size={18} /> Añadir jugador
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#0B2A20] border border-[#1B4433]">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[#EAF7EE] font-medium">Activar cartas Songster</span>
              <input
                type="checkbox"
                checked={songsterEnabled}
                onChange={(e) => setSongsterEnabled(e.target.checked)}
                className="w-5 h-5 accent-[#2BB673]"
              />
            </label>
            <p className="text-xs text-[#8FBFA4]">
              Añade tarjetas donde suena una canción de Spotify. Requiere cuenta Premium y se activa antes de empezar.
            </p>

            {songsterEnabled && !session?.accessToken && (
              <button
                type="button"
                onClick={handleSpotifyLogin}
                className="mt-2 py-3 rounded-lg bg-gradient-to-r from-[#2BB673] to-[#1B998B] text-black font-bold transition-all hover:scale-[1.02] active:scale-95"
              >
                Iniciar sesión con Spotify Premium
              </button>
            )}

            {songsterEnabled && session?.accessToken && (
              <div className="flex flex-col gap-2 mt-2">
                <label htmlFor="playlist" className="text-xs text-[#8FBFA4]">
                  ID o enlace de playlist de Spotify
                </label>
                <input
                  id="playlist"
                  type="text"
                  placeholder="ej. 37i9dQZF1DXcBWIGoYBM5M"
                  value={playlistId}
                  onChange={(e) => setPlaylistId(e.target.value)}
                  className="px-3 py-3 bg-[#04120D] border border-[#1B4433] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2BB673] text-white placeholder-[#3A5C4E]"
                />

                {userPlaylists.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-[#8FBFA4] mb-2">O elige de tu biblioteca</p>
                    <div
                      className="flex overflow-x-auto gap-3 pb-2 snap-x touch-pan-x [&::-webkit-scrollbar]:hidden"
                      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                      {userPlaylists.map((playlist) => (
                        <button
                          key={playlist.id}
                          type="button"
                          onClick={() => setPlaylistId(playlist.id)}
                          className="flex-shrink-0 w-20 flex flex-col items-center gap-1.5 snap-center group text-left transition-transform active:scale-95"
                        >
                          <div
                            className={`w-20 h-20 rounded-md bg-[#04120D] overflow-hidden shadow-lg border-2 transition-colors ${
                              playlistId === playlist.id ? "border-[#2BB673]" : "border-transparent"
                            }`}
                          >
                            {playlist.images?.[0]?.url ? (
                              <img src={playlist.images[0].url} alt={playlist.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#3A5C4E] text-[10px] uppercase font-bold tracking-widest">
                                Mix
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-[#8FBFA4] w-full truncate text-center group-hover:text-white transition-colors">
                            {playlist.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!canStart}
            className="w-full py-4 bg-gradient-to-r from-[#2BB673] to-[#1B998B] text-black rounded-xl font-bold text-lg shadow-xl shadow-[#2BB673]/20 hover:shadow-[#2BB673]/40 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            Empezar
          </button>
        </form>
      </div>
    </main>
  );
}
