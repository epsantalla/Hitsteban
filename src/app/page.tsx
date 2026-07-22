"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Cinzel } from "next/font/google";
import MainMenu from "@/components/MainMenu";
import BoxIcon from "@/components/BoxIcon";
import Songster from "@/components/games/songster/Songster";
import Tribial from "@/components/games/tribial/Tribial";
import Dende from "@/components/games/dende/Dende";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["500"] });

const SELECTED_GAME_KEY = "estebox:selectedGame";

/**
 * Estebox entry point / router. Estebox is a multi-game site: the main menu is
 * the landing screen, and each game is a self-contained module that handles its
 * own requirements (e.g. Songster gates on Spotify auth internally). There is
 * no site-wide login — games opt into auth as needed.
 */
export default function Home() {
  const { status } = useSession();
  // Initialized from sessionStorage so a full-page reload (e.g. returning from
  // the Spotify OAuth redirect, which has no in-app URL to come back to) lands
  // back on the game that was active instead of resetting to the main menu.
  const [selectedGame, setSelectedGame] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(SELECTED_GAME_KEY);
  });

  useEffect(() => {
    if (selectedGame) sessionStorage.setItem(SELECTED_GAME_KEY, selectedGame);
    else sessionStorage.removeItem(SELECTED_GAME_KEY);
  }, [selectedGame]);

  if (status === "loading") {
    return (
      <main className="flex h-[100dvh] overflow-hidden touch-none flex-col items-center justify-center gap-4 bg-[#0a0a0a] text-foreground">
        <BoxIcon className="w-14 h-14 animate-pulse drop-shadow-[0_0_16px_rgba(169,113,63,0.35)]" />
        <p className={`${cinzel.className} text-lg tracking-wide text-[#D9A066] animate-pulse`}>
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

  if (selectedGame === "dende") {
    return <Dende onExit={() => setSelectedGame(null)} />;
  }

  // No game selected (or an unknown id) — show the Estebox menu.
  return <MainMenu onSelectGame={setSelectedGame} />;
}
