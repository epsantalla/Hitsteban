"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Playfair_Display } from "next/font/google";
import { AVAILABLE_GAMES } from "@/lib/games";
import { loadSavedGame, SavedGame } from "@/lib/savedGame";
import ArtNouveauBackground from "@/components/ArtNouveauBackground";

const playfair = Playfair_Display({ subsets: ["latin"] });

const multicolorTitleStyle = {
  backgroundImage:
    "linear-gradient(90deg, #BF953F, #1B998B, #6A4C93, #C81D6B, #2E6F95, #BF953F)",
};

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
      <ArtNouveauBackground />

      {/* Sign out is account-level (Spotify); only meaningful once a game has authenticated. */}
      {session && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => signOut()}
            className="text-sm px-4 py-2 border border-gray-600 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center">
        <h1
          style={multicolorTitleStyle}
          className={`${playfair.className} text-5xl font-black mb-12 text-center bg-clip-text text-transparent drop-shadow-sm`}
        >
          Estebox
        </h1>

        <div className="w-full flex flex-col gap-4">
          {saved && savedGameName && (
            <button
              onClick={() => onSelectGame(saved.gameId)}
              className="w-full text-left px-6 py-5 bg-[#111] border border-[#BF953F]/50 rounded-xl hover:border-[#BF953F] hover:bg-[#161616] transition-all duration-300 group active:scale-95"
            >
              <p className="text-xs uppercase tracking-widest text-[#BF953F] mb-1">Continúa donde lo dejaste</p>
              <h2 className="text-lg font-bold text-white">{savedGameName}</h2>
              <p className="text-sm text-gray-500 mt-1">{saved.label}</p>
            </button>
          )}
          {AVAILABLE_GAMES.map(game => (
            <button
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className="w-full text-left px-6 py-5 bg-[#111] border border-gray-800 rounded-xl hover:border-[#BF953F] hover:bg-[#161616] transition-all duration-300 group active:scale-95"
            >
              <h2 className="text-xl font-bold text-white group-hover:text-[#BF953F] transition-colors">
                {game.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{game.description}</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
