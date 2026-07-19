"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import MainMenu from "@/components/MainMenu";
import Songster from "@/components/games/songster/Songster";
import Tribial from "@/components/games/tribial/Tribial";

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
      <main className="flex h-[100dvh] overflow-hidden touch-none flex-col items-center justify-center bg-[#0a0a0a] text-foreground">
        <p className="text-xl text-[#BF953F] animate-pulse">Loading...</p>
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
