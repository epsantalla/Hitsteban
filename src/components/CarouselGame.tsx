"use client";

import { useEffect, useState, useRef } from "react";
import { Play, Loader2, Music, Calendar, Mic2, Plus, X, Check, Trophy, ChevronRight, SkipForward } from "lucide-react";

interface Track {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { release_date: string };
}

interface Player {
  id: string;
  name: string;
  score: number;
}

const RUBY_COLOR = "#B81137";
const RUBY_LIGHT = "#FF2A55";

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
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);
    
    // Increased volume (from 0.3 to 1.5)
    gain.gain.setValueAtTime(1.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
};

export default function CarouselGame({ playlistId, accessToken, onExit }: { playlistId: string, accessToken: string, onExit: () => void }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'FETCHING' | 'SETUP' | 'INITIALIZING_SDK' | 'READY' | 'ERROR'>('FETCHING');
  const [errorMsg, setErrorMsg] = useState("");
  const [originalYear, setOriginalYear] = useState<string>('');

  const deviceIdRef = useRef<string | null>(null);
  const playerRef = useRef<any>(null);
  const accessTokenRef = useRef(accessToken);
  useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);

  // Game state
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'Player 1', score: 0 },
    { id: '2', name: 'Player 2', score: 0 }
  ]);
  const [carouselPhase, setCarouselPhase] = useState<'intro' | 'playing' | 'scoring' | 'leaderboard'>('intro');
  const [startingPlayerIndexForSong, setStartingPlayerIndexForSong] = useState(0);
  const [turnsTaken, setTurnsTaken] = useState(1);
  const [timeLeft, setTimeLeft] = useState(40);
  const [isGracePeriod, setIsGracePeriod] = useState(false);

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

  useEffect(() => {
    const loadTracks = async () => {
      try {
        let allTracks: Track[] = [];
        let url = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100&additional_types=track`;
        
        while (url) {
          const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
          if (!res.ok) throw new Error("Failed to fetch tracks");
          const data = await res.json();
          const validTracks = data.items
            .map((item: any) => item.track || item.item)
            .filter((t: any) => t && t.uri && t.type === 'track' && t.is_playable !== false && !t.is_local);
          allTracks = [...allTracks, ...validTracks];
          url = data.next;
        }

        for (let i = allTracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
        }
        
        if (allTracks.length === 0) throw new Error(`Playlist is empty.`);
        setTracks(allTracks);
        setStatus('SETUP');
      } catch (err: any) {
        setErrorMsg(err.message);
        setStatus('ERROR');
      }
    };
    loadTracks();
  }, [playlistId, accessToken]);

  useEffect(() => {
    if (tracks.length === 0 || !tracks[currentIndex]) return;
    let isMounted = true;
    const fetchYear = async () => {
      const track = tracks[currentIndex];
      const fallbackYear = track.album.release_date.split('-')[0];
      setOriginalYear(fallbackYear);
      try {
        const baseName = track.name.split(' - ')[0].split(' (')[0].trim().replace(/"/g, '');
        const artistName = track.artists[0].name.replace(/"/g, '');
        const query = encodeURIComponent(`${baseName} ${artistName}`);
        
        const res = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        let oldestYear = parseInt(fallbackYear);
        if (res.ok) {
          const data = await res.json();
          for (const item of (data.tracks?.items || [])) {
            const itemYear = parseInt(item.album.release_date.split('-')[0]);
            if (!isNaN(itemYear) && itemYear < oldestYear) {
              oldestYear = itemYear;
            }
          }
        }
        if (isMounted) setOriginalYear(oldestYear.toString());
      } catch (err) {}
    };
    fetchYear();
    return () => { isMounted = false; };
  }, [currentIndex, tracks, accessToken]);

  const initPlayerAndStart = () => {
    setStatus('INITIALIZING_SDK');
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    // @ts-ignore
    window.onSpotifyWebPlaybackSDKReady = () => {
      // @ts-ignore
      const player = new window.Spotify.Player({
        name: 'Hitsteban Carousel',
        getOAuthToken: (cb: any) => { cb(accessTokenRef.current); },
        volume: 0.5
      });
      playerRef.current = player;
      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        deviceIdRef.current = device_id;
        setStatus('READY');
        setCarouselPhase('intro'); // Go to intro first
      });
      player.connect();
    };
  };

  const playTrack = async (index: number, deviceId: string) => {
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessTokenRef.current}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [tracks[index].uri] }),
    });
  };

  const startGame = () => {
    const validPlayers = players.filter(p => p.name.trim() !== "").map(p => ({...p, name: p.name.trim()}));
    if (validPlayers.length < 2) return;
    setPlayers(validPlayers);
    setStartingPlayerIndexForSong(Math.floor(Math.random() * validPlayers.length));
    setTurnsTaken(1);
    setTimeLeft(40); // 40s for the first player
    initPlayerAndStart();
  };

  // Intro logic: Wait 2s, then play music and transition to playing phase
  useEffect(() => {
    if (status === 'READY' && carouselPhase === 'intro') {
      const timer = setTimeout(() => {
        setCarouselPhase('playing');
        if (deviceIdRef.current) {
          playTrack(currentIndex, deviceIdRef.current);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, carouselPhase, currentIndex]);

  const handleReveal = () => {
    if (playerRef.current) playerRef.current.pause().catch(() => {});
    setCarouselPhase('scoring');
  };

  const moveToNextPlayer = () => {
    const nextTurns = turnsTaken + 1;
    setTurnsTaken(nextTurns);
    setTimeLeft(nextTurns === 1 ? 40 : 30);
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
    if (iconAssignments.year) { const p = newPlayers.find(p => p.id === iconAssignments.year); if (p) p.score += 5; }
    if (iconAssignments.title) { const p = newPlayers.find(p => p.id === iconAssignments.title); if (p) p.score += 3; }
    if (iconAssignments.artist) { const p = newPlayers.find(p => p.id === iconAssignments.artist); if (p) p.score += 2; }
    
    // Sort leaderboard
    newPlayers.sort((a, b) => b.score - a.score);
    setPlayers(newPlayers);
    setCarouselPhase('leaderboard');
  };

  const nextSong = () => {
    if (currentIndex + 1 >= tracks.length) {
      onExit(); return;
    }
    setCurrentIndex(prev => prev + 1);
    setStartingPlayerIndexForSong(prev => (prev + 1) % players.length);
    setTurnsTaken(1);
    setTimeLeft(40); // 40s for first player
    setIconAssignments({ year: null, title: null, artist: null });
    setSelectedIconToAssign(null);
    setCarouselPhase('intro'); // Go to intro for the new song
  };

  // --- RENDERING ---

  if (status === 'ERROR') return <div className="flex flex-col items-center justify-center min-h-screen text-red-500 bg-[#0a0a0a]">{errorMsg}</div>;
  if (status === 'FETCHING' || status === 'INITIALIZING_SDK') return <div className="flex flex-col items-center justify-center min-h-screen text-[#B81137] bg-[#0a0a0a]"><Loader2 className="animate-spin w-12 h-12 mb-4" />Loading...</div>;
  
  if (status === 'SETUP') {
    return (
      <div className="flex flex-col items-center min-h-[100dvh] pt-12 pb-24 px-6 bg-[#0a0a0a] text-foreground overflow-y-auto touch-pan-y">
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
        <h2 className="text-4xl font-black mb-2 gem-text uppercase tracking-widest">Carousel Mode</h2>
        <p className="text-sm text-gray-400 mb-8 text-center max-w-sm">
          Enter player names in the order they are seated around the table. Minimum 2, max 12.
        </p>
        <div className="w-full max-w-sm flex flex-col gap-3 mb-8">
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="text-gray-500 font-mono w-6">{i+1}.</span>
              <input 
                value={p.name}
                onChange={(e) => { const newP = [...players]; newP[i].name = e.target.value; setPlayers(newP); }}
                placeholder={`Player ${i+1}`}
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
              <Plus size={18} /> Add New
            </button>
          )}
        </div>
        <button onClick={startGame} className="w-full max-w-sm py-4 gem-bg text-white font-bold rounded-xl text-lg active:scale-95 transition">
          Start Game
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
        <span className="text-xs opacity-50 uppercase text-[#B81137]">CAROUSEL</span>
      </div>
      <div className="absolute top-4 right-4 z-40 mt-2">
        <button onClick={() => { if(playerRef.current) playerRef.current.disconnect(); onExit(); }} className="text-xs px-3 py-1 border border-gray-700 rounded text-gray-400 hover:bg-gray-800 transition">End Game</button>
      </div>

      {carouselPhase === 'intro' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-500">
          <h3 className="text-2xl text-gray-400 tracking-widest uppercase mb-4">Get Ready</h3>
          <h2 className="text-7xl font-bold text-white mb-6 gem-text drop-shadow-lg">{players[activePlayerIndex].name}</h2>
          <div className="mt-8 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#B81137] w-12 h-12" />
          </div>
        </div>
      )}

      {carouselPhase === 'playing' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-12">
            <h3 className="text-xl text-gray-400 tracking-widest uppercase mb-2">Current Player</h3>
            <h2 className="text-7xl font-bold text-white mb-6 tracking-tight drop-shadow-md">{players[activePlayerIndex].name}</h2>
            <div className={`text-[6rem] leading-none font-mono font-bold transition-colors ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[#B81137] drop-shadow-md'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-8 w-full max-w-xs z-30">
            {!isLastPlayer && (
              <button 
                onPointerDown={handleNextPlayerDown}
                className="relative w-full py-6 rounded-2xl bg-[#1a1a1a] border border-[#B81137]/40 overflow-hidden active:scale-95 transition-transform shadow-lg"
              >
                <div className="absolute left-0 top-0 bottom-0 bg-white/10 transition-all ease-linear" style={{ width: isHoldingNext ? '100%' : '0%', transitionDuration: isHoldingNext ? '300ms' : '150ms' }} />
                <span className="relative z-10 font-bold text-2xl text-white tracking-widest uppercase">Next Player</span>
              </button>
            )}
            <button 
              onPointerDown={handleEndDown}
              className="relative w-full py-6 rounded-2xl gem-bg overflow-hidden active:scale-95 transition-transform"
            >
              <div className="absolute left-0 top-0 bottom-0 bg-white/30 transition-all ease-linear" style={{ width: isHoldingEnd ? '100%' : '0%', transitionDuration: isHoldingEnd ? '600ms' : '150ms' }} />
              <span className={`relative z-10 font-bold text-2xl tracking-widest uppercase text-white drop-shadow-md`}>End & Reveal</span>
            </button>
          </div>
        </div>
      )}

      {carouselPhase === 'scoring' && (
        <div className="flex-1 flex flex-col items-center justify-start pt-20 px-4 w-full h-full overflow-hidden">
          <h2 className="text-3xl font-bold text-white text-center mb-1">{tracks[currentIndex].name}</h2>
          <p className="gem-text text-xl text-center mb-1 font-medium">{tracks[currentIndex].artists.map(a => a.name).join(', ')}</p>
          <p className="text-gray-400 text-md text-center mb-6">{originalYear}</p>

          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Click an icon, then click a player</p>

          <div className="flex justify-center gap-6 mb-8">
            {[
              { type: 'year', icon: Calendar, color: 'text-blue-400', label: 'Year', pts: 5 },
              { type: 'title', icon: Music, color: 'text-green-400', label: 'Title', pts: 3 },
              { type: 'artist', icon: Mic2, color: 'text-purple-400', label: 'Artist', pts: 2 }
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
                  <span className="text-white font-medium text-lg">{p.name}</span>
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
              <span className="relative z-10 font-bold text-xl text-white tracking-widest uppercase drop-shadow-md">Confirm Points</span>
            </button>
          </div>
        </div>
      )}

      {carouselPhase === 'leaderboard' && (
        <div className="flex-1 flex flex-col items-center justify-start pt-20 px-4 w-full h-full overflow-hidden z-30 pb-6">
          <Trophy className="w-20 h-20 text-[#B81137] mb-4 flex-shrink-0 drop-shadow-[0_0_15px_rgba(184,17,55,0.5)]" />
          <h2 className="text-4xl font-bold text-white tracking-widest uppercase mb-6 flex-shrink-0">Leaderboard</h2>
          
          <div className="w-full max-w-sm flex flex-col gap-3 mb-6 flex-1 overflow-y-auto min-h-0 pb-4">
            {players.map((p, i) => (
              <div key={p.id} className="flex items-center p-4 rounded-xl bg-[#111] border border-[#B81137]/20 shadow-sm flex-shrink-0">
                <span className={`w-10 text-2xl font-black ${i === 0 ? 'text-[#B81137]' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-700' : 'text-gray-600'}`}>#{i+1}</span>
                <span className="flex-1 text-white text-xl font-medium">{p.name}</span>
                <span className="gem-text font-bold text-2xl">{p.score} <span className="text-sm text-gray-500">pts</span></span>
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
                <SkipForward className="fill-current" /> Next Song
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
