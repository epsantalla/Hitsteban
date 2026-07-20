"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, type CSSProperties } from "react";
import { Cinzel } from "next/font/google";
import { AVAILABLE_GAMES } from "@/lib/games";
import { loadSavedGame, SavedGame } from "@/lib/savedGame";
import PandoraBackground from "@/components/PandoraBackground";
import PandoraBoxIcon from "@/components/PandoraBoxIcon";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["500", "700"] });

// Polished-gold wordmark, matching the logo.
const goldTitleStyle = {
  backgroundImage: "linear-gradient(160deg, #F5E7A8 0%, #D4AF37 38%, #BF953F 62%, #9C7A2E 100%)",
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
          style={goldTitleStyle}
          className={`${cinzel.className} text-5xl sm:text-6xl font-bold mb-10 text-center bg-clip-text text-transparent tracking-wide drop-shadow-[0_2px_10px_rgba(191,149,63,0.25)]`}
        >
          Estebox
        </h1>

        <div className="w-full flex flex-col gap-4">
          {saved && savedGameName && (
            <button
              onClick={() => onSelectGame(saved.gameId)}
              className="w-full text-left px-6 py-5 bg-[#0b0906]/85 backdrop-blur-md border border-[#BF953F]/50 rounded-2xl hover:border-[#BF953F] hover:bg-[#0b0906]/95 transition-all duration-300 group active:scale-95 hover:shadow-[0_0_24px_rgba(191,149,63,0.2)]"
            >
              <p className="text-xs uppercase tracking-widest text-[#D4AF37] mb-1">Continúa donde lo dejaste</p>
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
