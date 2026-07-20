"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Cinzel } from "next/font/google";
import MainMenu from "@/components/MainMenu";
import PandoraBoxIcon from "@/components/PandoraBoxIcon";
import Songster from "@/components/games/songster/Songster";
import Tribial from "@/components/games/tribial/Tribial";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["500"] });

/**
 * Estebox entry point / router. Estebox is a multi-game site: the main menu is
 * the landing screen, and each game is a self-contained module that handles its
 * own requirements (e.g. Songster gates on Spotify auth internally). There is
 * no site-wide login — games opt into auth as needed.
 */
export default function Home() {
  const { status } = useSession();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <main className="flex h-[100dvh] overflow-hidden touch-none flex-col items-center justify-center gap-4 bg-[#0a0a0a] text-foreground">
        <PandoraBoxIcon className="w-14 h-14 animate-pulse drop-shadow-[0_0_16px_rgba(191,149,63,0.35)]" />
        <p className={`${cinzel.className} text-lg tracking-wide text-[#BF953F] animate-pulse`}>
          Cargando...
        </p>
      </main>
    );
  }

  if (selectedGame === "songster") {
    return <Songster onExit={() => setSelectedGame(null)} />;
  }

  if (selectedGame === "tribial") {
    return <Tribial onExit={() => setSelectedGame(null)} />;
  }

  // No game selected (or an unknown id) — show the Estebox menu.
  return <MainMenu onSelectGame={setSelectedGame} />;
}
