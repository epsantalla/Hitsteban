"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Music, Calendar, Mic2, Plus, X, Trophy, SkipForward, Settings } from "lucide-react";
import { usePlaylistTracks } from "@/hooks/usePlaylistTracks";
import { useOriginalYear } from "@/hooks/useOriginalYear";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import { Track } from "@/lib/spotify/types";
import { Player, CarouselSettings, CarouselSavedState } from "./savedState";
import FitText from "@/components/FitText";

interface CarouselInitialState {
  currentIndex: number;
  tracks: Track[];
  players: Player[];
  settings: CarouselSettings;
  startingPlayerIndexForSong: number;
}

const playErrorSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Harsher, louder error sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.5);

    // Increased volume (from 1.5 to 1.95, 30% higher)
    gain.gain.setValueAtTime(1.95, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
};

export default function CarouselGame({ playlistId, accessToken, onExit, initialState, onProgress, onComplete }: {
  playlistId: string,
  accessToken: string,
  onExit: () => void,
  /** When resuming, the saved track order, players, scores and settings to restore. */
  initialState?: CarouselInitialState,
  /** Reports resumable progress on each checkpoint (auto-save). */
  onProgress?: (progress: { currentIndex: number; tracks: Track[]; carousel: CarouselSavedState }) => void,
  /** Called when the last song is finished (natural completion). */
  onComplete?: () => void,
}) {
  const { tracks, loading: isFetchingTracks, error: loadError } = usePlaylistTracks(playlistId, accessToken, initialState?.tracks);
  const player = useSpotifyPlayer(accessToken, "Songster Carousel");

  const [currentIndex, setCurrentIndex] = useState(initialState?.currentIndex ?? 0);
  const [status, setStatus] = useState<'SETUP' | 'INITIALIZING_SDK' | 'READY'>('SETUP');
  const [playerError, setPlayerError] = useState<string | null>(null);
  const originalYear = useOriginalYear(tracks[currentIndex], accessToken);

  const errorMsg = loadError || playerError;

  // Game state
  const [players, setPlayers] = useState<Player[]>(initialState?.players ?? [
    { id: '1', name: '', score: 0 },
    { id: '2', name: '', score: 0 }
  ]);
  const [carouselPhase, setCarouselPhase] = useState<'intro' | 'playing' | 'scoring' | 'leaderboard'>('intro');
  const [startingPlayerIndexForSong, setStartingPlayerIndexForSong] = useState(initialState?.startingPlayerIndexForSong ?? 0);
  const [turnsTaken, setTurnsTaken] = useState(1);
  const [timeLeft, setTimeLeft] = useState(initialState?.settings.initialTime ?? 40);
  const [isGracePeriod, setIsGracePeriod] = useState(false);

  // Settings
  const [settings, setSettings] = useState<CarouselSettings>(initialState?.settings ?? {
    initialTime: 40,
    turnTime: 30,
    ptsYear: 5,
    ptsTitle: 3,
    ptsArtist: 2,
  });
  const [showSettings, setShowSettings] = useState(false);

  // Scoring state (Click to assign)
  const [iconAssignments, setIconAssignments] = useState<{year: string | null, title: string | null, artist: string | null}>({
    year: null, title: null, artist: null
  });
  const [selectedIconToAssign, setSelectedIconToAssign] = useState<'year' | 'title' | 'artist' | null>(null);

  // Holds
  const [isHoldingNext, setIsHoldingNext] = useState(false);
  const [isHoldingEnd, setIsHoldingEnd] = useState(false);
  const [isHoldingConfirm, setIsHoldingConfirm] = useState(false);
  const [isHoldingNextSong, setIsHoldingNextSong] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activePlayerIndex = (startingPlayerIndexForSong + turnsTaken - 1) % players.length;
  const isLastPlayer = turnsTaken === players.length;

  const initPlayerAndStart = () => {
    setStatus('INITIALIZING_SDK');
    player.init({
      onReady: () => {
        setStatus('READY');
        setCarouselPhase('intro');
      },
      onError: (message) => setPlayerError(message),
    });
  };

  const startGame = () => {
    if (isFetchingTracks) return;

    // Convert empty names to "Jugador X"
    const finalPlayers = players.map((p, i) => ({
      ...p,
      name: p.name.trim() === "" ? `Jugador ${i + 1}` : p.name.trim()
    }));

    if (finalPlayers.length < 2) return;
    setPlayers(finalPlayers);
    setStartingPlayerIndexForSong(Math.floor(Math.random() * finalPlayers.length));
    setTurnsTaken(1);
    setTimeLeft(settings.initialTime); // configured initial time
    initPlayerAndStart();
  };

  // Resume a saved game: players/scores/settings/whose-song are already
  // hydrated from `initialState`, so — unlike startGame — we keep them and just
  // restart the current song's turn cycle (timer/scoring reset per the design).
  const resumeGame = () => {
    if (isFetchingTracks) return;
    setTurnsTaken(1);
    setTimeLeft(settings.initialTime);
    setIconAssignments({ year: null, title: null, artist: null });
    setSelectedIconToAssign(null);
    setCarouselPhase('intro');
    initPlayerAndStart();
  };

  // Auto-save at stable checkpoints (song change, score confirm, settings).
  // Only once the game is actually running, and deliberately excluding the
  // per-second timer and the current song's in-progress turn/scoring state,
  // which resume does not restore.
  useEffect(() => {
    if (status === 'READY') {
      onProgress?.({
        currentIndex,
        tracks,
        carousel: { players, settings, startingPlayerIndexForSong },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, players, settings, startingPlayerIndexForSong, status]);

  // Intro logic: Wait 2s, then play music and transition to playing phase
  useEffect(() => {
    if (status === 'READY' && carouselPhase === 'intro') {
      const timer = setTimeout(() => {
        setCarouselPhase('playing');
        player.playUri(tracks[currentIndex].uri);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, carouselPhase, currentIndex]);

  const handleReveal = () => {
    setCarouselPhase('scoring');
  };

  const moveToNextPlayer = () => {
    const nextTurns = turnsTaken + 1;
    setTurnsTaken(nextTurns);
    setTimeLeft(nextTurns === 1 ? settings.initialTime : settings.turnTime);
    setIsGracePeriod(true);
    setTimeout(() => setIsGracePeriod(false), 1500); // 1.5s grace period to match longer flash
  };

  // Timer logic
  useEffect(() => {
    if (status === 'READY' && carouselPhase === 'playing') {
      if (isGracePeriod) return;

      if (timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        playErrorSound();
        if (!isLastPlayer) {
          moveToNextPlayer();
        } else {
          handleReveal();
        }
      }
    }
  }, [status, carouselPhase, timeLeft, isLastPlayer, isGracePeriod, turnsTaken]);

  // Pointer Holds
  const cancelHolds = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setIsHoldingNext(false);
    setIsHoldingEnd(false);
    setIsHoldingConfirm(false);
    setIsHoldingNextSong(false);
  };

  const holdAction = (setter: any, action: () => void, delay: number) => {
    setter(true);
    holdTimerRef.current = setTimeout(() => {
      setter(false);
      action();
    }, delay);
  };

  const handleNextPlayerDown = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); holdAction(setIsHoldingNext, moveToNextPlayer, 300); };
  const handleEndDown = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); holdAction(setIsHoldingEnd, handleReveal, 600); };
  const handleConfirmDown = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); holdAction(setIsHoldingConfirm, handleConfirmScoring, 300); };
  const handleNextSongDown = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); holdAction(setIsHoldingNextSong, nextSong, 600); };

  // Click & Click Scoring Logic
  const handleTopIconClick = (type: 'year' | 'title' | 'artist') => {
    setSelectedIconToAssign(type);
  };

  const handlePlayerClick = (playerId: string) => {
    // Check what icon the player currently has
    const currentIconForPlayer = (Object.keys(iconAssignments) as Array<'year'|'title'|'artist'>).find(
      (key) => iconAssignments[key] === playerId
    );

    if (selectedIconToAssign) {
      // Assign the selected icon to this player
      let newAssignments = { ...iconAssignments };

      // If player already had an icon, remove it
      if (currentIconForPlayer) {
        newAssignments[currentIconForPlayer] = null;
      }

      // Assign the new one
      newAssignments[selectedIconToAssign] = playerId;
      setIconAssignments(newAssignments);
      setSelectedIconToAssign(null);
    } else {
      // No icon selected. If player has an icon, pick it up (select it) and unassign it.
      if (currentIconForPlayer) {
        setSelectedIconToAssign(currentIconForPlayer);
        setIconAssignments({ ...iconAssignments, [currentIconForPlayer]: null });
      }
    }
  };

  const handleConfirmScoring = () => {
    const newPlayers = [...players];
    if (iconAssignments.year) { const p = newPlayers.find(p => p.id === iconAssignments.year); if (p) p.score += settings.ptsYear; }
    if (iconAssignments.title) { const p = newPlayers.find(p => p.id === iconAssignments.title); if (p) p.score += settings.ptsTitle; }
    if (iconAssignments.artist) { const p = newPlayers.find(p => p.id === iconAssignments.artist); if (p) p.score += settings.ptsArtist; }

    // Keep players in original seating order in the state!
    setPlayers(newPlayers);
    setCarouselPhase('leaderboard');
  };

  const nextSong = () => {
    player.pause();
    if (currentIndex + 1 >= tracks.length) {
      onComplete?.();
      onExit(); return;
    }
    setCurrentIndex(prev => prev + 1);
    setStartingPlayerIndexForSong(prev => (prev + 1) % players.length);
    setTurnsTaken(1);
    setTimeLeft(settings.initialTime);
    setIconAssignments({ year: null, title: null, artist: null });
    setSelectedIconToAssign(null);
    setCarouselPhase('intro'); // Go to intro for the new song
  };

  // --- RENDERING ---

  if (errorMsg) return <div className="flex flex-col items-center justify-center min-h-screen text-red-500 bg-[#0a0a0a]">{errorMsg}</div>;
  if (status === 'INITIALIZING_SDK') return <div className="flex flex-col items-center justify-center min-h-screen text-[#B81137] bg-[#0a0a0a]"><Loader2 className="animate-spin w-12 h-12 mb-4" />Cargando...</div>;

  // Resume screen: skip name entry, keep the saved players/scores, and continue
  // the current song. Playback can't auto-start, so we still need this tap.
  if (status === 'SETUP' && initialState) {
    return (
      <div className="flex flex-col items-center min-h-[100dvh] pt-12 pb-24 px-6 bg-[#0a0a0a] text-foreground overflow-y-auto touch-pan-y relative">
        <style>{`
          .gem-bg {
            background: linear-gradient(135deg, #FF2A55 0%, #B81137 50%, #7A0B22 100%);
            box-shadow: inset 0px 5px 15px rgba(255, 255, 255, 0.4),
                        inset 0px -5px 15px rgba(0, 0, 0, 0.5),
                        0px 8px 25px rgba(184, 17, 55, 0.5);
            border: 2px solid #FF4D79;
          }
          .gem-text {
            background: linear-gradient(to bottom, #FF4D79, #B81137);
            -webkit-background-clip: text;
            color: transparent;
            text-shadow: 0px 2px 10px rgba(184, 17, 55, 0.4);
          }
        `}</style>

        <div className="absolute top-4 left-4 z-40">
          <button onClick={onExit} className="text-sm px-4 py-2 border border-gray-700 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition">
            &larr; Menú
          </button>
        </div>

        <h2 className="text-4xl font-black mb-2 gem-text uppercase tracking-widest mt-4">Reanudar Carrusel</h2>
        <p className="text-sm text-gray-400 mb-8 text-center max-w-sm">
          Canción {Math.min(currentIndex + 1, tracks.length)} de {tracks.length} · clasificación actual
        </p>

        <div className="w-full max-w-sm flex flex-col gap-3 mb-8">
          {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
            <div key={p.id} className="flex items-center p-4 rounded-xl bg-[#111] border border-[#B81137]/20 overflow-hidden">
              <span className={`w-10 text-2xl font-black ${i === 0 ? 'text-[#B81137]' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-700' : 'text-gray-600'}`}>#{i + 1}</span>
              <span className="flex-1 text-white text-lg font-medium truncate pr-2">{p.name}</span>
              <span className="gem-text font-bold text-xl flex-shrink-0">{p.score} <span className="text-sm text-gray-500">pts</span></span>
            </div>
          ))}
        </div>

        <button onClick={resumeGame} disabled={isFetchingTracks} className={`w-full max-w-sm py-4 text-white font-bold rounded-xl text-lg transition ${isFetchingTracks ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' : 'gem-bg active:scale-95 shadow-lg shadow-[#B81137]/20'}`}>
          {isFetchingTracks ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /> Cargando playlist...</span> : 'Continuar partida'}
        </button>
      </div>
    );
  }

  if (status === 'SETUP') {
    return (
      <div className="flex flex-col items-center min-h-[100dvh] pt-12 pb-24 px-6 bg-[#0a0a0a] text-foreground overflow-y-auto touch-pan-y relative">
        <style>{`
          .gem-bg {
            background: linear-gradient(135deg, #FF2A55 0%, #B81137 50%, #7A0B22 100%);
            box-shadow: inset 0px 5px 15px rgba(255, 255, 255, 0.4),
                        inset 0px -5px 15px rgba(0, 0, 0, 0.5),
                        0px 8px 25px rgba(184, 17, 55, 0.5);
            border: 2px solid #FF4D79;
          }
          .gem-text {
            background: linear-gradient(to bottom, #FF4D79, #B81137);
            -webkit-background-clip: text;
            color: transparent;
            text-shadow: 0px 2px 10px rgba(184, 17, 55, 0.4);
          }
        `}</style>

        <div className="absolute top-4 right-4 z-40">
          <button onClick={() => setShowSettings(true)} aria-label="Configuración" className="p-2 text-gray-500 hover:text-white transition rounded-full hover:bg-gray-800">
            <Settings size={24} />
          </button>
        </div>

        {showSettings && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#111] border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white uppercase tracking-widest gem-text">Configuración</h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 mb-8 text-white">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Tiempo primer jugador (s)</label>
                  <input type="number" min="5" max="120" value={settings.initialTime} onChange={(e) => setSettings({...settings, initialTime: parseInt(e.target.value) || 0})} className="w-16 bg-[#222] border border-gray-700 rounded px-2 py-1 text-center focus:outline-none focus:border-[#B81137]" />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Tiempo siguiente jugador (s)</label>
                  <input type="number" min="5" max="120" value={settings.turnTime} onChange={(e) => setSettings({...settings, turnTime: parseInt(e.target.value) || 0})} className="w-16 bg-[#222] border border-gray-700 rounded px-2 py-1 text-center focus:outline-none focus:border-[#B81137]" />
                </div>
                <div className="h-px bg-gray-800 w-full my-2"></div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Puntos por año</label>
                  <input type="number" min="0" max="100" value={settings.ptsYear} onChange={(e) => setSettings({...settings, ptsYear: parseInt(e.target.value) || 0})} className="w-16 bg-[#222] border border-gray-700 rounded px-2 py-1 text-center focus:outline-none focus:border-[#B81137]" />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Puntos por título</label>
                  <input type="number" min="0" max="100" value={settings.ptsTitle} onChange={(e) => setSettings({...settings, ptsTitle: parseInt(e.target.value) || 0})} className="w-16 bg-[#222] border border-gray-700 rounded px-2 py-1 text-center focus:outline-none focus:border-[#B81137]" />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm text-gray-400">Puntos por artista</label>
                  <input type="number" min="0" max="100" value={settings.ptsArtist} onChange={(e) => setSettings({...settings, ptsArtist: parseInt(e.target.value) || 0})} className="w-16 bg-[#222] border border-gray-700 rounded px-2 py-1 text-center focus:outline-none focus:border-[#B81137]" />
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition">
                Listo
              </button>
            </div>
          </div>
        )}

        <h2 className="text-4xl font-black mb-2 gem-text uppercase tracking-widest">Modo Carrusel</h2>
        <p className="text-sm text-gray-400 mb-8 text-center max-w-sm">
          Introduce los nombres de los jugadores en el orden en que están sentados. Mínimo 2, máximo 12.
        </p>
        <div className="w-full max-w-sm flex flex-col gap-3 mb-8">
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="text-gray-500 font-mono w-6">{i+1}.</span>
              <input
                value={p.name}
                onChange={(e) => { const newP = [...players]; newP[i].name = e.target.value; setPlayers(newP); }}
                placeholder={`Jugador ${i+1}`}
                className="flex-1 bg-[#111] border border-gray-800 rounded-lg px-3 py-3 text-white focus:ring-1 focus:ring-[#B81137] outline-none"
              />
              {players.length > 2 && (
                <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="p-3 text-gray-500 hover:text-red-500">
                  <X size={20} />
                </button>
              )}
            </div>
          ))}
          {players.length < 12 && (
            <button
              onClick={() => setPlayers([...players, {id: Date.now().toString(), name: '', score: 0}])}
              className="flex items-center justify-center gap-2 py-3 mt-2 border border-dashed border-gray-700 rounded-lg text-gray-400 hover:text-[#B81137] hover:border-[#B81137] transition"
            >
              <Plus size={18} /> Añadir jugador
            </button>
          )}
        </div>
        <button onClick={startGame} disabled={isFetchingTracks} className={`w-full max-w-sm py-4 text-white font-bold rounded-xl text-lg transition ${isFetchingTracks ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' : 'gem-bg active:scale-95 shadow-lg shadow-[#B81137]/20'}`}>
          {isFetchingTracks ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /> Cargando playlist...</span> : 'Empezar'}
        </button>
      </div>
    );
  }

  // Common wrapper for playing, scoring, leaderboard
  return (
    <div
      className="fixed inset-0 bg-[#0a0a0a] flex flex-col select-none overflow-hidden touch-none"
      onPointerLeave={cancelHolds}
      onPointerCancel={cancelHolds}
      onPointerUp={cancelHolds}
    >
      <style>{`
        .gem-bg {
          background: linear-gradient(135deg, #FF2A55 0%, #B81137 50%, #7A0B22 100%);
          box-shadow: inset 0px 5px 15px rgba(255, 255, 255, 0.4),
                      inset 0px -5px 15px rgba(0, 0, 0, 0.5),
                      0px 8px 25px rgba(184, 17, 55, 0.5);
          border: 2px solid #FF4D79;
        }
        .gem-text {
          background: linear-gradient(to bottom, #FF4D79, #B81137);
          -webkit-background-clip: text;
          color: transparent;
        }
        @keyframes flash {
          0% { opacity: 0.9; }
          100% { opacity: 0; }
        }
      `}</style>

      {isGracePeriod && (
        <div className="fixed inset-0 bg-[#B81137] z-50 animate-[flash_2s_ease-out_forwards] pointer-events-none mix-blend-screen" />
      )}

      <div className="absolute top-4 left-4 text-gray-500 text-sm font-mono tracking-widest pointer-events-none mt-2 flex flex-col gap-1 z-40">
        <span>{currentIndex + 1} / {tracks.length}</span>
        <span className="text-xs opacity-50 uppercase text-[#B81137]">CARRUSEL</span>
      </div>
      <div className="absolute top-4 right-4 z-40 mt-2">
        <button onClick={() => { player.disconnect(); onExit(); }} className="text-xs px-3 py-1 border border-gray-700 rounded text-gray-400 hover:bg-gray-800 transition">Terminar partida</button>
      </div>

      {carouselPhase === 'intro' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-500 w-full">
          <h3 className="text-2xl text-gray-400 tracking-widest uppercase mb-4">Prepárate</h3>
          <FitText max={72} min={28} className="mb-6 px-4 pb-2" textClassName="font-bold gem-text drop-shadow-lg">{players[activePlayerIndex].name}</FitText>
          <div className="mt-8 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#B81137] w-12 h-12" />
          </div>
        </div>
      )}

      {carouselPhase === 'playing' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center w-full">
          <div className="mb-12 w-full flex flex-col items-center">
            <h3 className="text-xl text-gray-400 tracking-widest uppercase mb-2">Jugador actual</h3>
            <FitText max={72} min={28} className="mb-6 px-4 pb-2" textClassName="font-bold text-white tracking-tight drop-shadow-md">{players[activePlayerIndex].name}</FitText>
            <div className={`text-[6rem] leading-none font-mono font-bold transition-colors ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white drop-shadow-md'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          </div>

          <div className="flex flex-col items-center gap-8 w-full max-w-xs z-30">
            {!isLastPlayer && (
              <button
                onPointerDown={handleNextPlayerDown}
                className="relative w-full py-6 rounded-2xl gem-bg overflow-hidden active:scale-95 transition-transform shadow-lg"
              >
                <div className="absolute left-0 top-0 bottom-0 bg-white/30 transition-all ease-linear" style={{ width: isHoldingNext ? '100%' : '0%', transitionDuration: isHoldingNext ? '300ms' : '150ms' }} />
                <span className="relative z-10 font-bold text-2xl text-white tracking-widest uppercase drop-shadow-md">Siguiente jugador</span>
              </button>
            )}
            <button
              onPointerDown={handleEndDown}
              className={`relative w-full py-6 rounded-2xl overflow-hidden active:scale-95 transition-transform ${isLastPlayer ? 'gem-bg shadow-lg' : 'bg-[#1a1a1a] border border-[#B81137]/40'}`}
            >
              <div className="absolute left-0 top-0 bottom-0 bg-white/10 transition-all ease-linear" style={{ width: isHoldingEnd ? '100%' : '0%', transitionDuration: isHoldingEnd ? '600ms' : '150ms' }} />
              <span className={`relative z-10 font-bold text-2xl tracking-widest uppercase text-white ${isLastPlayer ? 'drop-shadow-md' : 'opacity-60'}`}>Terminar y revelar</span>
            </button>
          </div>
        </div>
      )}

      {carouselPhase === 'scoring' && (
        <div className="flex-1 flex flex-col items-center justify-start pt-20 px-4 w-full h-full overflow-hidden">
          <h2 className="text-3xl font-bold text-white text-center mb-1">{tracks[currentIndex].name}</h2>
          <p className="gem-text text-xl text-center mb-1 font-medium">{tracks[currentIndex].artists.map(a => a.name).join(', ')}</p>
          <p className="text-gray-400 text-md text-center mb-6">{originalYear}</p>

          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Toca un icono y luego toca un jugador</p>

          <div className="flex justify-center gap-6 mb-8">
            {[
              { type: 'year', icon: Calendar, color: 'text-blue-400', label: 'Año', pts: settings.ptsYear },
              { type: 'title', icon: Music, color: 'text-green-400', label: 'Título', pts: settings.ptsTitle },
              { type: 'artist', icon: Mic2, color: 'text-purple-400', label: 'Artista', pts: settings.ptsArtist }
            ].map(item => {
              const Icon = item.icon;
              const isAssigned = iconAssignments[item.type as keyof typeof iconAssignments] !== null;
              const isSelected = selectedIconToAssign === item.type;

              return (
                <div key={item.type} className="relative flex flex-col items-center">
                  <button
                    onClick={() => { if (!isAssigned) handleTopIconClick(item.type as any) }}
                    className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all active:scale-95 ${
                      isAssigned ? 'opacity-20 border-gray-700 bg-transparent cursor-not-allowed'
                      : isSelected ? `bg-[#222] border-[#B81137] ${item.color} shadow-[0_0_20px_rgba(184,17,55,0.8)] scale-110`
                      : `bg-[#111] border-gray-600 ${item.color} hover:border-[#B81137]/50`
                    }`}
                  >
                    <Icon size={28} />
                    <div className="absolute -bottom-2 -right-2 bg-black text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border border-gray-700">
                      {item.pts}
                    </div>
                  </button>
                  <span className={`text-xs mt-2 ${isSelected ? 'text-[#B81137] font-bold' : 'text-gray-500'}`}>{item.label}</span>
                </div>
              )
            })}
          </div>

          <div className="w-full max-w-md flex-1 overflow-y-auto flex flex-col gap-3 pb-24 z-20">
            {players.map(p => {
              const pIcons = Object.entries(iconAssignments).filter(([_, id]) => id === p.id).map(([type]) => type);
              return (
                <button
                  key={p.id}
                  onClick={() => handlePlayerClick(p.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-colors active:scale-[0.98] ${
                    selectedIconToAssign ? 'bg-[#1a1a1a] border-[#B81137]/30 hover:border-[#B81137]' : 'bg-[#111] border-transparent hover:bg-[#1a1a1a]'
                  }`}
                >
                  <span className="text-white font-medium text-lg truncate pr-4 max-w-[150px] text-left">{p.name}</span>
                  <div className="flex gap-2 min-h-[32px] min-w-[32px]">
                    {pIcons.map(type => {
                      const IconComponent = type === 'year' ? Calendar : type === 'title' ? Music : Mic2;
                      const color = type === 'year' ? 'text-blue-400' : type === 'title' ? 'text-green-400' : 'text-purple-400';
                      return <div key={type} className={`w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center ${color}`}><IconComponent size={20} /></div>
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-auto z-30">
            <button
              onPointerDown={handleConfirmDown}
              className="relative w-full max-w-xs py-5 rounded-full gem-bg overflow-hidden active:scale-95 transition-transform"
            >
              <div className="absolute left-0 top-0 bottom-0 bg-white/30 transition-all ease-linear" style={{ width: isHoldingConfirm ? '100%' : '0%', transitionDuration: isHoldingConfirm ? '300ms' : '150ms' }} />
              <span className="relative z-10 font-bold text-xl text-white tracking-widest uppercase drop-shadow-md">Confirmar puntos</span>
            </button>
          </div>
        </div>
      )}

      {carouselPhase === 'leaderboard' && (
        <div className="flex-1 flex flex-col items-center justify-start pt-20 px-4 w-full h-full overflow-hidden z-30 pb-6">
          <Trophy className="w-20 h-20 text-[#B81137] mb-4 flex-shrink-0 drop-shadow-[0_0_15px_rgba(184,17,55,0.5)]" />
          <h2 className="text-4xl font-bold text-white tracking-widest uppercase mb-6 flex-shrink-0">Clasificación</h2>

          <div className="w-full max-w-sm flex flex-col gap-3 mb-6 flex-1 overflow-y-auto min-h-0 pb-4">
            {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={p.id} className="flex items-center p-4 rounded-xl bg-[#111] border border-[#B81137]/20 shadow-sm flex-shrink-0 overflow-hidden">
                <span className={`w-10 text-2xl font-black ${i === 0 ? 'text-[#B81137]' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-700' : 'text-gray-600'}`}>#{i+1}</span>
                <span className="flex-1 text-white text-xl font-medium truncate pr-2">{p.name}</span>
                <span className="gem-text font-bold text-2xl flex-shrink-0">{p.score} <span className="text-sm text-gray-500">pts</span></span>
              </div>
            ))}
          </div>

          <div className="w-full flex justify-center flex-shrink-0">
            <button
              onPointerDown={handleNextSongDown}
              className="relative w-full max-w-sm py-6 rounded-xl bg-gray-800 border border-gray-700 overflow-hidden active:scale-95 transition-transform shadow-md"
            >
              <div className="absolute left-0 top-0 bottom-0 bg-[#B81137] transition-all ease-linear" style={{ width: isHoldingNextSong ? '100%' : '0%', transitionDuration: isHoldingNextSong ? '600ms' : '150ms' }} />
              <span className="relative z-10 font-bold text-xl text-white flex items-center justify-center gap-3 tracking-widest uppercase">
                <SkipForward className="fill-current" /> Siguiente canción
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
