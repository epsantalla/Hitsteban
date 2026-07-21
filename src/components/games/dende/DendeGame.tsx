"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Loader2, X } from "lucide-react";
import { usePlaylistTracks } from "@/hooks/usePlaylistTracks";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import FitBox from "@/components/FitBox";
import {
  ALL_CARDS,
  LISTS,
  Card,
  Player,
  FLAG_SPECIAL_TRIBIAL,
  FLAG_SPECIAL_SONGSTER,
  NORMA_BUFFER_CARDS,
  pickNextCard,
  substituteCardText,
  updatePityAfterPlayerPick,
  isNormaFlag,
  parseNormaRounds,
  glowForWeight,
  parseBoldSegments,
} from "./cards";
import { ActiveNorma, DendeView, DendeRuntimeState, ExpiryView } from "./savedState";
import NamekBackground from "./NamekBackground";
import TribialCards from "./TribialCards";
import SongsterCard from "./SongsterCard";

function renderTextSegments(text: string) {
  return parseBoldSegments(text).map((seg, i) =>
    seg.bold ? <strong key={i}>{seg.text}</strong> : <span key={i}>{seg.text}</span>
  );
}

// A base shadow always applied, so text reads clearly against the busy planet
// background regardless of weight-tier glow; the glow (if any) layers on top.
const BASE_SHADOW = "0 2px 8px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.6)";

function CardTextContent({ text, weight }: { text: string; weight: number }) {
  const glow = glowForWeight(weight);
  const textShadow =
    glow === "gold"
      ? `${BASE_SHADOW}, 0 0 14px rgba(212,175,55,0.9), 0 0 32px rgba(212,175,55,0.55), 0 0 60px rgba(212,175,55,0.3)`
      : glow === "silver"
      ? `${BASE_SHADOW}, 0 0 14px rgba(186,214,255,0.9), 0 0 32px rgba(150,195,255,0.55), 0 0 60px rgba(130,180,255,0.3)`
      : BASE_SHADOW;
  return (
    <div className="font-bold leading-snug text-[#F4FFF8]" style={{ textShadow }}>
      {renderTextSegments(text)}
    </div>
  );
}

function ExpiryTextContent({ text }: { text: string }) {
  return (
    <div className="font-bold leading-snug text-red-500" style={{ textShadow: `${BASE_SHADOW}, 0 0 20px rgba(239,68,68,0.65)` }}>
      {renderTextSegments(text)}
      <div className="mt-6 text-[1.3em] tracking-widest uppercase">SE ACABÓ</div>
    </div>
  );
}

/** Real cards a norma survives before expiring: a full round + the flat buffer. */
function normaThreshold(norma: ActiveNorma, playerCount: number): number | null {
  if (norma.roundsTotal === null) return null;
  return NORMA_BUFFER_CARDS + norma.roundsTotal * playerCount;
}

interface DendeGameProps {
  players: Player[];
  songsterEnabled: boolean;
  playlistId: string;
  accessToken: string;
  onExit: () => void;
  /** When resuming, the saved cards/normas/pity/etc. to restore. */
  initialState?: DendeRuntimeState;
  /** Reports resumable progress on each checkpoint (auto-save). */
  onProgress?: (progress: DendeRuntimeState) => void;
}

/**
 * Dende's main card loop: draws a weighted-random card, substitutes
 * `{player}`/`{randomplayer}`/`{randomnum}`/`{list}` tokens, tracks active
 * "normas" (each with its own per-norma card-count until expiry), and hands
 * off to the Tribial/Songster sub-phases for special cards. Dende has no
 * natural end — it plays until `onExit`.
 */
export default function DendeGame({
  players,
  songsterEnabled,
  playlistId,
  accessToken,
  onExit,
  initialState,
  onProgress,
}: DendeGameProps) {
  const { tracks, loading: tracksLoading, error: loadError } = usePlaylistTracks(
    songsterEnabled ? playlistId : "",
    accessToken,
    initialState?.tracks
  );
  const player = useSpotifyPlayer(accessToken, "Dende");

  const [status, setStatus] = useState<"SETUP" | "INITIALIZING_SDK" | "READY">(songsterEnabled ? "SETUP" : "READY");
  const [playerError, setPlayerError] = useState<string | null>(null);

  const [view, setView] = useState<DendeView | null>(initialState?.currentView ?? null);
  const [pendingExpiries, setPendingExpiries] = useState<ExpiryView[]>(initialState?.pendingExpiries ?? []);
  const [activeNormas, setActiveNormas] = useState<ActiveNorma[]>(initialState?.activeNormas ?? []);
  const [pity, setPity] = useState<Record<string, number>>(initialState?.pity ?? {});
  const [usedTrackIds, setUsedTrackIds] = useState<string[]>(initialState?.usedTrackIds ?? []);

  const [subPhase, setSubPhase] = useState<"none" | "tribial" | "songster">("none");
  const [showNormas, setShowNormas] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCardRef = useRef<Card | null>(null);

  const errorMsg = (songsterEnabled ? loadError : null) || playerError;

  const handleConnectStart = () => {
    setStatus("INITIALIZING_SDK");
    player.init({
      onReady: () => setStatus("READY"),
      onError: (message) => setPlayerError(message),
    });
  };

  const handleExit = () => {
    if (songsterEnabled) player.disconnect();
    onExit();
  };

  function advanceToNextView() {
    if (pendingExpiries.length > 0) {
      const [next, ...rest] = pendingExpiries;
      setPendingExpiries(rest);
      setView(next);
      return;
    }

    const card = pickNextCard(ALL_CARDS, lastCardRef.current, songsterEnabled);
    lastCardRef.current = card;

    const outcome = substituteCardText(card.text, players, pity, LISTS);
    if (outcome.playerPicked) {
      setPity(updatePityAfterPlayerPick(players, pity, outcome.playerPicked.id));
    }

    // Age every active norma by this real card, splitting off any that have
    // now reached their own threshold (a full round + the flat buffer,
    // counted fresh from when each appeared).
    const stillActive: ActiveNorma[] = [];
    const justExpired: ExpiryView[] = [];
    for (const norma of activeNormas) {
      const aged: ActiveNorma = { ...norma, cardsSeen: norma.cardsSeen + 1 };
      const threshold = normaThreshold(aged, players.length);
      if (threshold !== null && aged.cardsSeen >= threshold) {
        justExpired.push({ kind: "expiry", text: aged.text });
      } else {
        stillActive.push(aged);
      }
    }

    if (isNormaFlag(card.flag)) {
      stillActive.push({ text: outcome.text, roundsTotal: parseNormaRounds(card.flag), cardsSeen: 0 });
    }

    setActiveNormas(stillActive);
    setPendingExpiries(justExpired);
    setView({ kind: "card", text: outcome.text, weight: card.weight, flag: card.flag });
  }

  // Draw the very first view once ready (fresh game — resumed games already have `view`).
  useEffect(() => {
    if (status === "READY" && !view) advanceToNextView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Auto-save at each stable checkpoint (a new view being shown).
  useEffect(() => {
    if (status === "READY" && view) {
      onProgress?.({
        activeNormas,
        pity,
        currentView: view,
        pendingExpiries,
        tracks,
        usedTrackIds,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeNormas, pity, pendingExpiries, tracks, usedTrackIds, status]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (holdTimerRef.current || !view) return;

    setIsHolding(true);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setIsHolding(false);

      if (view.kind === "card" && view.flag === FLAG_SPECIAL_TRIBIAL) {
        setSubPhase("tribial");
      } else if (view.kind === "card" && view.flag === FLAG_SPECIAL_SONGSTER && songsterEnabled) {
        setSubPhase("songster");
      } else {
        advanceToNextView();
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

  const handleTribialDone = () => {
    setSubPhase("none");
    advanceToNextView();
  };

  const handleSongsterDone = (trackId: string) => {
    if (trackId) setUsedTrackIds((ids) => [...ids, trackId]);
    setSubPhase("none");
    advanceToNextView();
  };

  if (subPhase === "tribial") {
    return <TribialCards onDone={handleTribialDone} onExit={handleExit} />;
  }
  if (subPhase === "songster") {
    return (
      <SongsterCard
        tracks={tracks}
        usedTrackIds={usedTrackIds}
        accessToken={accessToken}
        player={player}
        onDone={handleSongsterDone}
        onExit={handleExit}
      />
    );
  }

  // Songster is opt-in and needs its own user-gesture tap to connect the Web
  // Playback SDK, mirroring Songster's own Carousel/Classic "press to start".
  if (songsterEnabled && status !== "READY") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 bg-[#04120D] text-[#EAF7EE] relative overflow-hidden">
        <NamekBackground />
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={onExit}
            className="text-sm px-4 py-2 border border-[#1B4433] rounded-md text-[#8FBFA4] hover:text-white hover:bg-[#0B2A20] transition"
          >
            &larr; Menú
          </button>
        </div>
        <div className="relative z-10 flex flex-col items-center">
          {errorMsg ? (
            <>
              <p className="text-red-400 mb-6 text-center max-w-sm">{errorMsg}</p>
              <button onClick={onExit} className="px-6 py-3 bg-[#0B2A20] border border-[#1B4433] rounded-full text-white">
                Volver
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-8 text-center text-[#EAF7EE]">
                {status === "INITIALIZING_SDK" ? "Conectando con Spotify..." : tracksLoading ? "Cargando playlist..." : "Listo para empezar"}
              </h2>
              {status === "INITIALIZING_SDK" || tracksLoading ? (
                <Loader2 className="animate-spin text-[#2BB673] w-12 h-12" />
              ) : (
                <button
                  onClick={handleConnectStart}
                  className="px-10 py-5 bg-gradient-to-r from-[#2BB673] to-[#1B998B] text-black rounded-full font-bold text-xl shadow-xl shadow-[#2BB673]/20 transition-all active:scale-95"
                >
                  {initialState ? "Continuar" : "Empezar"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-[#04120D] flex flex-col select-none overflow-hidden touch-none text-[#EAF7EE]"
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

      <div className="absolute top-4 left-4 z-30">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerLeave={(e) => e.stopPropagation()}
          onPointerCancel={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setShowNormas(true);
          }}
          aria-label="Normas activas"
          className="relative p-2 border border-[#1B4433] rounded-md text-[#8FBFA4] hover:text-white hover:bg-[#0B2A20] transition bg-[#04120D]/60"
        >
          <BookOpen size={18} />
          {activeNormas.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#2BB673] text-black text-[10px] font-bold flex items-center justify-center">
              {activeNormas.length}
            </span>
          )}
        </button>
      </div>

      <div className="absolute top-4 right-4 z-30">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onPointerLeave={(e) => e.stopPropagation()}
          onPointerCancel={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handleExit();
          }}
          className="text-xs px-3 py-1 border border-[#1B4433] rounded text-[#8FBFA4] hover:bg-[#0B2A20] transition bg-[#04120D]/60"
        >
          Terminar
        </button>
      </div>

      {showNormas && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={() => setShowNormas(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0B2A20] border border-[#1B4433] rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#EAF7EE] uppercase tracking-widest">Normas activas</h3>
              <button onClick={() => setShowNormas(false)} className="text-[#8FBFA4] hover:text-white">
                <X size={24} />
              </button>
            </div>
            {activeNormas.length === 0 ? (
              <p className="text-[#8FBFA4] text-sm">No hay normas activas.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {activeNormas.map((norma, i) => {
                  const threshold = normaThreshold(norma, players.length);
                  const remaining = threshold === null ? null : Math.max(0, threshold - norma.cardsSeen);
                  return (
                    <div key={i} className="p-4 rounded-xl bg-[#04120D] border border-[#1B4433]">
                      <p className="text-[#EAF7EE] text-sm mb-2">{renderTextSegments(norma.text)}</p>
                      <p className="text-xs text-[#2BB673] uppercase tracking-widest">
                        {remaining === null
                          ? "Hasta el final de la partida"
                          : `${remaining} tarjeta${remaining === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-8 pt-24 pb-32 w-full pointer-events-none">
        {view?.kind === "card" && (
          <FitBox
            max={96}
            min={20}
            className={`w-full h-full transition-transform duration-500 ${isHolding ? "scale-95" : "scale-100"}`}
          >
            <CardTextContent text={view.text} weight={view.weight} />
          </FitBox>
        )}
        {view?.kind === "expiry" && (
          <FitBox
            max={96}
            min={20}
            className={`w-full h-full transition-transform duration-500 ${isHolding ? "scale-95" : "scale-100"}`}
          >
            <ExpiryTextContent text={view.text} />
          </FitBox>
        )}
        {!view && <Loader2 className="animate-spin text-[#2BB673] w-10 h-10" />}
      </div>

      <div className="pb-10 flex justify-center pointer-events-none">
        <p className={`text-sm uppercase tracking-widest transition-colors duration-300 ${isHolding ? "text-[#2BB673]" : "text-[#8FBFA4]"}`}>
          Mantén pulsado para continuar
        </p>
      </div>
    </div>
  );
}
