"use client";

import { useEffect, useRef, useState } from "react";
import { useOriginalYear } from "@/hooks/useOriginalYear";
import { SpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import { Track } from "@/lib/spotify/types";
import NamekBackground from "./NamekBackground";

const ROUND_SECONDS = 45;

/**
 * Dende's `special_songster` sub-phase: plays a random not-yet-used track for
 * up to 45 seconds (auto-pausing at 0), then hold-to-reveal shows title,
 * artist and year — mirroring Songster's ClassicGame hold-twice mechanic, but
 * restyled to Dende's Namek theme.
 */
export default function SongsterCard({
  tracks,
  usedTrackIds,
  accessToken,
  player,
  onDone,
  onExit,
}: {
  tracks: Track[];
  usedTrackIds: string[];
  accessToken: string;
  player: SpotifyPlayer;
  /** Reports the track id that was played, so it isn't repeated next time. */
  onDone: (usedTrackId: string) => void;
  onExit: () => void;
}) {
  const [track] = useState<Track | undefined>(() => {
    const unused = tracks.filter((t) => !usedTrackIds.includes(t.id));
    const pool = unused.length > 0 ? unused : tracks;
    return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : undefined;
  });

  // Optimistically "playing" from the start — if Spotify fails to actually
  // start the track, the player must still be able to hold-to-reveal/advance
  // rather than getting stuck waiting on a connection that never resolves.
  const [phase, setPhase] = useState<"PLAYING" | "REVEALED">("PLAYING");
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const originalYear = useOriginalYear(track, accessToken);

  useEffect(() => {
    if (!track) return;
    player.playUri(track.uri);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  useEffect(() => {
    if (phase !== "PLAYING") return;
    if (timeLeft <= 0) {
      player.pause();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (holdTimerRef.current) return;

    setIsHolding(true);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setIsHolding(false);

      if (phase === "PLAYING") {
        player.pause();
        setPhase("REVEALED");
      } else if (track) {
        onDone(track.id);
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
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  // No tracks available at all (shouldn't happen — loadPlaylistTracks throws
  // on an empty playlist) — skip straight through. Deferred to an effect
  // rather than called during render, since it updates the parent's state.
  useEffect(() => {
    if (!track) onDone("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  if (!track) return null;

  return (
    <>
      <style>{`
        @keyframes dende-synth {
          0% { height: 20%; opacity: 0.5; }
          100% { height: 100%; opacity: 1; }
        }
      `}</style>
      <div
        className="fixed inset-0 bg-[#04120D] flex flex-col items-center justify-center select-none touch-none overflow-hidden text-[#EAF7EE]"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUpOrLeave}
        onPointerLeave={handlePointerUpOrLeave}
        onPointerCancel={handlePointerUpOrLeave}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        <NamekBackground />

        <div
          className="absolute top-0 left-0 h-2 bg-gradient-to-r from-[#2BB673] to-[#1B998B] transition-all ease-linear z-20 shadow-[0_0_12px_rgba(43,182,115,0.7)]"
          style={{ width: isHolding ? "100%" : "0%", transitionDuration: isHolding ? "600ms" : "150ms" }}
        />

        <div className="absolute top-4 left-4 z-20 text-[#8FBFA4] text-sm font-mono tracking-widest pointer-events-none mt-2 flex flex-col gap-1">
          <span className="text-xs opacity-70 uppercase">Canción namekiana</span>
        </div>

        <div className="absolute top-4 right-4 z-20 mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); player.disconnect(); onExit(); }}
            className="text-xs px-3 py-1 border border-[#1B4433] rounded text-[#8FBFA4] hover:bg-[#0B2A20] transition"
          >
            Terminar
          </button>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md px-6 text-center pointer-events-none">
          {phase === "PLAYING" && (
            <div className={`flex flex-col items-center transition-transform duration-500 ${isHolding ? "scale-95" : "scale-100"}`}>
              <div className={`text-[5rem] leading-none font-mono font-bold mb-8 transition-colors ${timeLeft <= 10 ? "text-[#2BB673] animate-pulse" : "text-[#EAF7EE]"}`}>
                00:{timeLeft.toString().padStart(2, "0")}
              </div>
              <div className="flex items-end justify-center space-x-1.5 h-16 mb-12">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 bg-[#2BB673] rounded-t-sm"
                    style={{
                      animation: timeLeft > 0 ? `dende-synth ${0.4 + (i % 3) * 0.15}s infinite alternate ease-in-out` : "none",
                      animationDelay: `${i * 0.1}s`,
                      height: timeLeft > 0 ? undefined : "20%",
                      opacity: timeLeft > 0 ? undefined : 0.4,
                    }}
                  />
                ))}
              </div>
              <p className={`text-sm uppercase tracking-widest transition-colors duration-300 ${isHolding ? "text-[#2BB673]" : "text-[#8FBFA4]"}`}>
                Mantén para revelar
              </p>
            </div>
          )}

          {phase === "REVEALED" && (
            <div className={`flex flex-col items-center w-full animate-in fade-in zoom-in duration-300 transition-transform duration-500 ${isHolding ? "scale-95" : "scale-100"}`}>
              <h2 className="text-3xl md:text-4xl font-bold text-[#EAF7EE] tracking-tight leading-tight mb-4">
                {track.name}
              </h2>
              <div className="flex flex-col items-center space-y-3 mb-16">
                <p className="text-xl md:text-2xl font-light text-[#2BB673]">
                  {track.artists.map((a) => a.name).join(", ")}
                </p>
                <p className="text-xl md:text-2xl font-light text-[#EAF7EE]">
                  {originalYear}
                </p>
              </div>
              <p className={`text-sm uppercase tracking-widest transition-colors duration-300 ${isHolding ? "text-[#2BB673]" : "text-[#8FBFA4]"}`}>
                Mantén para la siguiente tarjeta
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
