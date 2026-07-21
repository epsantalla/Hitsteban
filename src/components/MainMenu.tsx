"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, type CSSProperties } from "react";
import { Cinzel } from "next/font/google";
import { AVAILABLE_GAMES } from "@/lib/games";
import { loadSavedGame, SavedGame } from "@/lib/savedGame";
import PandoraBackground from "@/components/PandoraBackground";
import BoxIcon from "@/components/BoxIcon";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "700"] });

// Each game card gets its own tessera color, matching that game's own theme:
// Songster gold, Tribial orange, Dende Namek teal-green.
const MOSAIC_ACCENTS = ["#BF953F", "#E8681A", "#2BB673", "#C81D6B", "#2E6F95"];

interface MainMenuProps {
  onSelectGame: (gameId: string) => void;
}

export default function MainMenu({ onSelectGame }: MainMenuProps) {
  const { data: session } = useSession();

  // Any game left in progress (read client-side after mount). Generic: the
  // card works for whatever game saved it; that game handles the actual resume.
  const [saved, setSaved] = useState<SavedGame | null>(null);
  useEffect(() => {
    setSaved(loadSavedGame());
  }, []);
  const savedGameName = saved
    ? AVAILABLE_GAMES.find(g => g.id === saved.gameId)?.name
    : undefined;

  return (
    <main className="relative flex h-[100dvh] overflow-hidden flex-col items-center justify-center p-6 bg-[#0a0704] text-foreground w-full">
      <PandoraBackground />

      {/* Sign out is account-level (Spotify); only meaningful once a game has authenticated. */}
      {session && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => signOut()}
            className="text-sm px-4 py-2 border border-gray-700/60 rounded-md text-gray-400 hover:text-white hover:bg-white/5 backdrop-blur-sm transition"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center">
        <BoxIcon className="w-16 h-16 mb-4 drop-shadow-[0_0_16px_rgba(169,113,63,0.35)]" />

        <h1
          className={`${cinzel.className} text-5xl sm:text-6xl font-bold mb-10 text-center text-white tracking-wide drop-shadow-[0_2px_10px_rgba(169,113,63,0.25)]`}
        >
          Estebox
        </h1>

        <div className="w-full flex flex-col gap-4">
          {saved && savedGameName && (
            <button
              onClick={() => onSelectGame(saved.gameId)}
              className="w-full text-left px-6 py-5 bg-[#0b0906]/85 backdrop-blur-md border border-[#A9713F]/50 rounded-2xl hover:border-[#A9713F] hover:bg-[#0b0906]/95 transition-all duration-300 group active:scale-95 hover:shadow-[0_0_24px_rgba(169,113,63,0.2)]"
            >
              <p className="text-xs uppercase tracking-widest text-[#D9A066] mb-1">Continúa donde lo dejaste</p>
              <h2 className="text-lg font-bold text-white">{savedGameName}</h2>
              <p className="text-sm text-gray-300 mt-1">{saved.label}</p>
            </button>
          )}
          {AVAILABLE_GAMES.map((game, i) => {
            const accent = MOSAIC_ACCENTS[i % MOSAIC_ACCENTS.length];
            return (
              <button
                key={game.id}
                onClick={() => onSelectGame(game.id)}
                style={{ "--accent": accent } as CSSProperties}
                className="relative w-full text-left pl-7 pr-6 py-5 bg-[#0b0906]/85 backdrop-blur-md border border-white/10 rounded-2xl hover:border-[var(--accent)] hover:bg-[#0b0906]/95 transition-all duration-300 group active:scale-95 overflow-hidden"
              >
                <span
                  className="absolute top-0 left-0 h-full w-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: accent }}
                />
                <h2
                  className="text-xl font-bold text-white group-hover:text-[var(--accent)] transition-colors"
                >
                  {game.name}
                </h2>
                <p className="text-sm text-gray-300 mt-1">{game.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
