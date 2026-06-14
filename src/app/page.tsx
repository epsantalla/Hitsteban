"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import Game from "@/components/Game";

export default function Home() {
  const { data: session, status } = useSession();
  const [playlistId, setPlaylistId] = useState("");
  const [isGameStarted, setIsGameStarted] = useState(false);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <p className="text-xl">Loading...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
        <h1 className="text-4xl font-bold mb-8 text-center">Guess the Song</h1>
        <button
          onClick={() => signIn("spotify")}
          className="px-8 py-4 bg-green-500 text-white rounded-full font-bold text-lg shadow-lg hover:bg-green-600 transition-colors"
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
    
    // Automatically extract the ID if the user pastes a full URL
    if (finalId.includes('spotify.com/playlist/')) {
      const parts = finalId.split('spotify.com/playlist/');
      if (parts.length > 1) {
        finalId = parts[1].split('?')[0];
      }
    } else if (finalId.includes('spotify:playlist:')) {
      finalId = finalId.split('spotify:playlist:')[1];
    }

    setPlaylistId(finalId);
    setIsGameStarted(true);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground max-w-md mx-auto">
      <div className="absolute top-4 right-4">
        <button 
          onClick={() => signOut()}
          className="text-sm px-4 py-2 border border-gray-600 rounded-md hover:bg-gray-800 transition"
        >
          Sign Out
        </button>
      </div>

      <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
        Guess the Song
      </h1>
      
      <form onSubmit={handleStart} className="w-full flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="playlist" className="text-sm text-gray-400">
            Spotify Playlist ID
          </label>
          <input
            id="playlist"
            type="text"
            placeholder="e.g. 37i9dQZF1DXcBWIGoYBM5M"
            value={playlistId}
            onChange={(e) => setPlaylistId(e.target.value)}
            className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-white placeholder-gray-600"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            You can find the Playlist ID in the Spotify URL or Share link.
          </p>
        </div>
        
        <button
          type="submit"
          className="mt-4 w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-900/20 transition-all active:scale-95"
        >
          Start Game
        </button>
      </form>
    </main>
  );
}
