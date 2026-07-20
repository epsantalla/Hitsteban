"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, type CSSProperties } from "react";
import { Cinzel } from "next/font/google";
import { AVAILABLE_GAMES } from "@/lib/games";
import { loadSavedGame, SavedGame } from "@/lib/savedGame";
import PandoraBackground from "@/components/PandoraBackground";
import PandoraBoxIcon from "@/components/PandoraBoxIcon";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "700"] });

const multicolorTitleStyle = {
  backgroundImage:
    "linear-gradient(90deg, #BF953F, #1B998B, #6A4C93, #C81D6B, #2E6F95, #BF953F)",
};

// Each game card gets its own tessera color, like tiles in a mosaic.
const MOSAIC_ACCENTS = ["#BF953F", "#1B998B", "#6A4C93", "#C81D6B", "#2E6F95"];

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
    <main className="relative flex h-[100dvh] overflow-hidden flex-col items-center justify-center p-6 bg-[#0a0a0a] text-foreground w-full">
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
        <PandoraBoxIcon className="w-16 h-16 mb-4 drop-shadow-[0_0_16px_rgba(191,149,63,0.35)]" />

        <h1
          style={multicolorTitleStyle}
          className={`${cinzel.className} text-4xl sm:text-5xl font-bold mb-10 text-center bg-clip-text text-transparent drop-shadow-sm tracking-wide`}
        >
          Estebox
        </h1>

        <div className="w-full flex flex-col gap-4">
          {saved && savedGameName && (
            <button
              onClick={() => onSelectGame(saved.gameId)}
              className="w-full text-left px-6 py-5 bg-white/[0.03] backdrop-blur-sm border border-[#BF953F]/40 rounded-2xl hover:border-[#BF953F] hover:bg-white/[0.06] transition-all duration-300 group active:scale-95 shadow-[0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_24px_rgba(191,149,63,0.15)]"
            >
              <p className="text-xs uppercase tracking-widest text-[#BF953F] mb-1">Continúa donde lo dejaste</p>
              <h2 className="text-lg font-bold text-white">{savedGameName}</h2>
              <p className="text-sm text-gray-500 mt-1">{saved.label}</p>
            </button>
          )}
          {AVAILABLE_GAMES.map((game, i) => {
            const accent = MOSAIC_ACCENTS[i % MOSAIC_ACCENTS.length];
            return (
              <button
                key={game.id}
                onClick={() => onSelectGame(game.id)}
                style={{ "--accent": accent } as CSSProperties}
                className="relative w-full text-left px-6 py-5 bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl hover:border-[var(--accent)] hover:bg-white/[0.06] transition-all duration-300 group active:scale-95 overflow-hidden"
              >
                <span
                  className="absolute top-0 left-0 h-full w-1 opacity-70 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: accent }}
                />
                <h2
                  className="text-xl font-bold text-white group-hover:text-[var(--accent)] transition-colors"
                >
                  {game.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{game.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
