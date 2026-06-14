"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import Game from "@/components/Game";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"] });

export default function Home() {
  const { data: session, status } = useSession();
  const [playlistId, setPlaylistId] = useState("");
  const [isGameStarted, setIsGameStarted] = useState(false);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] text-foreground">
        <p className="text-xl text-[#BF953F] animate-pulse">Loading...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#0a0a0a] text-foreground">
        <h1 className={`${playfair.className} text-6xl font-black mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] drop-shadow-sm`}>
          Hitsteban
        </h1>
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
    return <Game playlistId={playlistId} accessToken={session.accessToken} onExit={() => setIsGameStarted(false)} />;
  }

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
    setIsGameStarted(true);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[#0a0a0a] text-foreground w-full">
      <div className="absolute top-4 right-4">
        <button 
          onClick={() => signOut()}
          className="text-sm px-4 py-2 border border-gray-600 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          Sign Out
        </button>
      </div>

      <div className="w-full max-w-md mx-auto">
        <h1 className={`${playfair.className} text-5xl font-black mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] drop-shadow-sm`}>
          Hitsteban
        </h1>
        
        <form onSubmit={handleStart} className="w-full flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="playlist" className="text-sm text-[#BF953F]/80 font-medium">
              Spotify Playlist ID
            </label>
            <input
              id="playlist"
              type="text"
              placeholder="e.g. 37i9dQZF1DXcBWIGoYBM5M"
              value={playlistId}
              onChange={(e) => setPlaylistId(e.target.value)}
              className="px-4 py-4 bg-[#111] border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#BF953F] text-white placeholder-gray-600 shadow-inner"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              You can find the Playlist ID in the Spotify URL or Share link.
            </p>
          </div>
          
          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black rounded-xl font-bold text-lg shadow-xl shadow-[#BF953F]/20 hover:shadow-[#BF953F]/40 hover:scale-[1.02] transition-all active:scale-95"
          >
            Start Game
          </button>
        </form>
      </div>
    </main>
  );
}
