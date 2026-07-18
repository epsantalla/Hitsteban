"use client";

import { useEffect, useState, useRef } from "react";
import { Play, Loader2 } from "lucide-react";
import { AVAILABLE_MODES } from "./modes";
import { usePlaylistTracks } from "@/hooks/usePlaylistTracks";
import { useOriginalYear } from "@/hooks/useOriginalYear";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";

export default function ClassicGame({ playlistId, accessToken, mode, onExit }: { playlistId: string, accessToken: string, mode: string, onExit: () => void }) {
  const { tracks, loading, error: loadError } = usePlaylistTracks(playlistId, accessToken);
  const player = useSpotifyPlayer(accessToken, "Guess the Song Player");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'READY_TO_START' | 'INITIALIZING_SDK' | 'PLAYING'>('READY_TO_START');
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [revealState, setRevealState] = useState<'HIDDEN' | 'REVEALED'>('HIDDEN');

  // The true release year, corrected for remaster/re-release dates.
  const originalYear = useOriginalYear(tracks[currentIndex], accessToken);

  const errorMsg = loadError || playerError;

  const goToTrack = async (index: number) => {
    const ok = await player.playUri(tracks[index].uri);
    if (ok) {
      setCurrentIndex(index);
      setPhase('PLAYING');
    }
  };

  const startGame = () => {
    setPhase('INITIALIZING_SDK');
    player.init({
      onReady: () => goToTrack(0),
      onError: (message) => setPlayerError(message),
    });
  };

  const handleExit = () => {
    player.disconnect();
    onExit();
  };

  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (holdTimerRef.current) return;

    setIsHolding(true);

    holdTimerRef.current = setTimeout(async () => {
      holdTimerRef.current = null;
      setIsHolding(false);

      if (revealState === 'HIDDEN') {
        setRevealState('REVEALED');
      } else {
        const nextIndex = currentIndex + 1;
        if (nextIndex < tracks.length) {
          setRevealState('HIDDEN');
          await goToTrack(nextIndex);
        } else {
          handleExit();
        }
      }
    }, 600);
  };

  const handlePointerUpOrLeave = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#0a0a0a] text-foreground">
        <p className="text-red-500 mb-4">{errorMsg}</p>
        <button onClick={handleExit} className="px-6 py-2 bg-gray-800 rounded-full text-white">Go Back</button>
      </div>
    );
  }

  if (loading || phase === 'INITIALIZING_SDK') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 bg-[#0a0a0a] text-foreground">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#D4AF37]" />
        <p className="text-[#D4AF37]/80">{loading ? 'Loading Tracks...' : 'Connecting to Spotify...'}</p>
      </div>
    );
  }

  if (phase === 'READY_TO_START') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#0a0a0a] text-foreground">
        <h2 className="text-3xl font-bold mb-8 text-white">{tracks.length} Tracks Loaded</h2>
        <button
          onClick={startGame}
          className="flex items-center gap-3 px-10 py-5 bg-[#D4AF37] hover:bg-[#b8952b] text-black rounded-full font-bold text-xl shadow-xl shadow-[#D4AF37]/20 transition-all active:scale-95"
        >
          <Play className="fill-current" />
          Start Game
        </button>
      </div>
    );
  }

  const currentTrack = tracks[currentIndex];

  return (
    <>
      <style>{`
        @keyframes synth {
          0% { height: 20%; opacity: 0.5; }
          100% { height: 100%; opacity: 1; }
        }
      `}</style>
      <div
        className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center select-none touch-none overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUpOrLeave}
        onPointerLeave={handlePointerUpOrLeave}
        onPointerCancel={handlePointerUpOrLeave}
        style={{ touchAction: 'none', userSelect: 'none' }}
      >
        <div
          className="absolute top-0 left-0 h-2 bg-[#D4AF37]/80 transition-all ease-linear"
          style={{
            width: isHolding ? '100%' : '0%',
            transitionDuration: isHolding ? '600ms' : '150ms'
          }}
        />

        <div className="absolute top-4 left-4 text-gray-500 text-sm font-mono tracking-widest pointer-events-none mt-2 flex flex-col gap-1">
          <span>{currentIndex + 1} / {tracks.length}</span>
          <span className="text-xs opacity-50 uppercase">{AVAILABLE_MODES.find(m => m.id === mode)?.name || mode}</span>
        </div>

        <div className="absolute top-4 right-4 z-10 mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleExit(); }}
            className="text-xs px-3 py-1 border border-gray-700 rounded text-gray-400 hover:bg-gray-800 transition"
          >
            End Game
          </button>
        </div>

        <div className="flex flex-col items-center justify-center w-full max-w-md px-6 text-center transition-opacity duration-300 pointer-events-none">
          {revealState === 'HIDDEN' ? (
            <div className={`flex flex-col items-center transition-transform duration-500 ${isHolding ? 'scale-110' : 'scale-100'}`}>
              <div className={`relative w-48 h-48 rounded-full bg-[#1e1e1e] border-[6px] border-[#2c2c2c] shadow-xl shadow-black/80 flex items-center justify-center mb-8 animate-[spin_3s_linear_infinite] transition-all duration-300 ${isHolding ? 'ring-4 ring-[#D4AF37]/50 border-[#444]' : ''}`}>
                {/* Grooves with asymmetrical border colors to catch the "light" while spinning */}
                <div className="absolute inset-[6px] rounded-full border border-t-white/20 border-r-transparent border-b-white/5 border-l-transparent rotate-12"></div>
                <div className="absolute inset-3 rounded-full border border-t-transparent border-r-white/10 border-b-transparent border-l-white/20 -rotate-45"></div>
                <div className="absolute inset-6 rounded-full border border-t-white/10 border-r-transparent border-b-white/20 border-l-transparent rotate-90"></div>
                <div className="absolute inset-10 rounded-full border border-t-transparent border-r-white/20 border-b-transparent border-l-white/5 rotate-180"></div>
                <div className="absolute inset-14 rounded-full border border-t-white/15 border-r-transparent border-b-transparent border-l-white/10 -rotate-12"></div>

                {/* Center Label */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] flex items-center justify-center border-2 border-black z-10 relative overflow-hidden">
                  {/* Decorative lines so the spin is visually obvious */}
                  <div className="absolute top-2 w-8 h-[2px] bg-black/40 rounded-full"></div>
                  <div className="absolute bottom-3 w-6 h-[2px] bg-black/40 rounded-full"></div>
                  <div className="absolute bottom-2 w-4 h-[2px] bg-black/40 rounded-full ml-2"></div>

                  {/* Spindle hole */}
                  <div className="w-3 h-3 rounded-full bg-[#0a0a0a] border border-black/50 z-20 shadow-inner"></div>
                </div>
              </div>
              <h2 className="text-2xl font-light text-[#D4AF37] tracking-widest uppercase opacity-80">
                Hold to Reveal
              </h2>
            </div>
          ) : (
            <div className={`flex flex-col items-center w-full animate-in fade-in zoom-in duration-300 transition-transform duration-500 ${isHolding ? 'scale-95' : 'scale-100'}`}>
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
                {currentTrack.name}
              </h2>

              <div className="flex flex-col items-center space-y-3 mb-16">
                <p className="text-2xl md:text-3xl font-light text-[#D4AF37]">
                  {currentTrack.artists.map(a => a.name).join(', ')}
                </p>
                <p className="text-2xl md:text-3xl font-light text-white">
                  {originalYear}
                </p>
              </div>

              <div className="flex items-end justify-center space-x-1.5 h-16 mb-12">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 bg-[#D4AF37] rounded-t-sm"
                    style={{
                      animation: `synth ${0.4 + (i % 3) * 0.15}s infinite alternate ease-in-out`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>

              <p className={`text-sm uppercase tracking-widest transition-colors duration-300 ${isHolding ? 'text-[#D4AF37]' : 'text-gray-600'}`}>
                Hold for next track
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
