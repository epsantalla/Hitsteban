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
  const [carouselPhase, setCarouselPhase] = useState<'playing' | 'scoring' | 'leaderboard'>('playing');
  const [startingPlayerIndexForSong, setStartingPlayerIndexForSong] = useState(0);
  const [turnsTaken, setTurnsTaken] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30);

  // Scoring state
  const [iconAssignments, setIconAssignments] = useState<{year: string | null, title: string | null, artist: string | null}>({
    year: null, title: null, artist: null
  });
  const [dragState, setDragState] = useState<{ type: 'year'|'title'|'artist', x: number, y: number } | null>(null);

  // Holds
  const [isHoldingNext, setIsHoldingNext] = useState(false);
  const [isHoldingEnd, setIsHoldingEnd] = useState(false);
  const [isHoldingConfirm, setIsHoldingConfirm] = useState(false);
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
        playTrack(0, device_id).then(() => {
          setStatus('READY');
          setCarouselPhase('playing');
        });
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
    setTimeLeft(30);
    initPlayerAndStart();
  };

  const handleReveal = () => {
    if (playerRef.current) playerRef.current.pause().catch(() => {});
    setCarouselPhase('scoring');
  };

  // Timer logic
  useEffect(() => {
    if (status === 'READY' && carouselPhase === 'playing') {
      if (timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        if (!isLastPlayer) {
          setTurnsTaken(prev => prev + 1);
          setTimeLeft(30);
        } else {
          handleReveal();
        }
      }
    }
  }, [status, carouselPhase, timeLeft, isLastPlayer]);

  // Pointer Holds
  const cancelHolds = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setIsHoldingNext(false);
    setIsHoldingEnd(false);
    setIsHoldingConfirm(false);
  };

  const holdAction = (setter: any, action: () => void, delay: number) => {
    setter(true);
    holdTimerRef.current = setTimeout(() => {
      setter(false);
      action();
    }, delay);
  };

  const handleNextPlayerDown = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); holdAction(setIsHoldingNext, () => { setTurnsTaken(prev => prev + 1); setTimeLeft(30); }, 300); };
  const handleEndDown = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); holdAction(setIsHoldingEnd, handleReveal, 600); };
  const handleConfirmDown = (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); holdAction(setIsHoldingConfirm, handleConfirmScoring, 300); };

  // Drag and drop
  const handleDragStart = (e: React.PointerEvent, type: 'year'|'title'|'artist') => {
    e.preventDefault(); e.stopPropagation();
    setDragState({ type, x: e.clientX, y: e.clientY });
  };
  const handleDragMove = (e: React.PointerEvent) => {
    if (dragState) setDragState({ ...dragState, x: e.clientX, y: e.clientY });
  };
  const handleDragEnd = (e: React.PointerEvent) => {
    if (dragState) {
      const dropzones = document.querySelectorAll('.player-dropzone');
      let matchedPlayerId: string | null = null;
      dropzones.forEach(dz => {
        const rect = dz.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          matchedPlayerId = dz.getAttribute('data-player-id');
        }
      });
      if (matchedPlayerId) {
        const currentIconForPlayer = Object.entries(iconAssignments).find(([_, pId]) => pId === matchedPlayerId);
        let newAssignments = { ...iconAssignments };
        if (currentIconForPlayer) newAssignments[currentIconForPlayer[0] as keyof typeof iconAssignments] = null;
        newAssignments[dragState.type] = matchedPlayerId;
        setIconAssignments(newAssignments);
      } else {
        setIconAssignments({ ...iconAssignments, [dragState.type]: null });
      }
      setDragState(null);
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

  const nextSong = async () => {
    if (currentIndex + 1 >= tracks.length) {
      onExit(); return;
    }
    setCurrentIndex(prev => prev + 1);
    setStartingPlayerIndexForSong(prev => (prev + 1) % players.length);
    setTurnsTaken(1);
    setTimeLeft(30);
    setIconAssignments({ year: null, title: null, artist: null });
    setCarouselPhase('playing');
    if (deviceIdRef.current) await playTrack(currentIndex + 1, deviceIdRef.current);
  };

  // --- RENDERING ---

  if (status === 'ERROR') return <div className="flex flex-col items-center justify-center min-h-screen text-red-500 bg-[#0a0a0a]">{errorMsg}</div>;
  if (status === 'FETCHING' || status === 'INITIALIZING_SDK') return <div className="flex flex-col items-center justify-center min-h-screen text-[#D4AF37] bg-[#0a0a0a]"><Loader2 className="animate-spin w-12 h-12 mb-4" />Loading...</div>;
  
  if (status === 'SETUP') {
    return (
      <div className="flex flex-col items-center min-h-[100dvh] pt-12 pb-24 px-6 bg-[#0a0a0a] text-foreground overflow-y-auto touch-pan-y">
        <h2 className="text-3xl font-bold mb-2 text-[#D4AF37]">Carousel Mode</h2>
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
                className="flex-1 bg-[#111] border border-gray-800 rounded-lg px-3 py-3 text-white focus:ring-1 focus:ring-[#D4AF37] outline-none"
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
              className="flex items-center justify-center gap-2 py-3 mt-2 border border-dashed border-gray-700 rounded-lg text-gray-400 hover:text-[#D4AF37] hover:border-[#D4AF37] transition"
            >
              <Plus size={18} /> Add New
            </button>
          )}
        </div>
        <button onClick={startGame} className="w-full max-w-sm py-4 bg-[#D4AF37] text-black font-bold rounded-xl text-lg active:scale-95 transition">
          Start Game
        </button>
      </div>
    );
  }

  // Common wrapper for playing, scoring, leaderboard
  return (
    <div 
      className="fixed inset-0 bg-[#0a0a0a] flex flex-col select-none overflow-hidden touch-none"
      onPointerMove={handleDragMove}
      onPointerUp={(e) => { handleDragEnd(e); cancelHolds(); }}
      onPointerLeave={cancelHolds}
      onPointerCancel={cancelHolds}
    >
      <div className="absolute top-4 left-4 text-gray-500 text-sm font-mono tracking-widest pointer-events-none mt-2 flex flex-col gap-1">
        <span>{currentIndex + 1} / {tracks.length}</span>
        <span className="text-xs opacity-50 uppercase">CAROUSEL</span>
      </div>
      <div className="absolute top-4 right-4 z-20 mt-2">
        <button onClick={() => { if(playerRef.current) playerRef.current.disconnect(); onExit(); }} className="text-xs px-3 py-1 border border-gray-700 rounded text-gray-400 hover:bg-gray-800 transition">End Game</button>
      </div>

      {carouselPhase === 'playing' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-12">
            <h3 className="text-xl text-gray-400 tracking-widest uppercase mb-2">Current Player</h3>
            <h2 className="text-5xl font-bold text-white mb-6">{players[activePlayerIndex].name}</h2>
            <div className={`text-6xl font-mono font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-[#D4AF37]'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-8 w-full max-w-xs">
            {!isLastPlayer && (
              <button 
                onPointerDown={handleNextPlayerDown}
                className="relative w-full py-6 rounded-2xl bg-[#1a1a1a] border border-gray-800 overflow-hidden active:scale-95 transition-transform"
              >
                <div className="absolute left-0 top-0 bottom-0 bg-white/10 transition-all ease-linear" style={{ width: isHoldingNext ? '100%' : '0%', transitionDuration: isHoldingNext ? '300ms' : '150ms' }} />
                <span className="relative z-10 font-bold text-xl text-white tracking-widest uppercase">Next Player</span>
              </button>
            )}
            <button 
              onPointerDown={handleEndDown}
              className="relative w-full py-6 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/50 overflow-hidden active:scale-95 transition-transform"
            >
              <div className="absolute left-0 top-0 bottom-0 bg-[#D4AF37] transition-all ease-linear" style={{ width: isHoldingEnd ? '100%' : '0%', transitionDuration: isHoldingEnd ? '600ms' : '150ms' }} />
              <span className={`relative z-10 font-bold text-xl tracking-widest uppercase ${isHoldingEnd ? 'text-black' : 'text-[#D4AF37]'}`}>End & Reveal</span>
            </button>
          </div>
        </div>
      )}

      {carouselPhase === 'scoring' && (
        <div className="flex-1 flex flex-col items-center justify-start pt-20 px-4 w-full h-full overflow-hidden">
          <h2 className="text-2xl font-bold text-white text-center mb-1">{tracks[currentIndex].name}</h2>
          <p className="text-[#D4AF37] text-lg text-center mb-1">{tracks[currentIndex].artists.map(a => a.name).join(', ')}</p>
          <p className="text-gray-400 text-sm text-center mb-8">{originalYear}</p>

          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Drag icons to the winning players</p>

          <div className="flex justify-center gap-6 mb-12">
            {[
              { type: 'year', icon: Calendar, color: 'text-blue-400', label: 'Year', pts: 5 },
              { type: 'title', icon: Music, color: 'text-green-400', label: 'Title', pts: 3 },
              { type: 'artist', icon: Mic2, color: 'text-purple-400', label: 'Artist', pts: 2 }
            ].map(item => {
              const Icon = item.icon;
              const isAssigned = iconAssignments[item.type as keyof typeof iconAssignments] !== null;
              const isDragging = dragState?.type === item.type;
              
              return (
                <div key={item.type} className="relative flex flex-col items-center">
                  <div 
                    className={`w-16 h-16 rounded-full flex items-center justify-center border-2 touch-none z-30 transition-all ${isAssigned && !isDragging ? 'opacity-20 border-gray-700 bg-transparent' : `bg-[#111] border-gray-600 ${item.color} ${isDragging ? 'scale-110 shadow-xl' : ''}`}`}
                    onPointerDown={(e) => handleDragStart(e, item.type as any)}
                    style={isDragging ? { position: 'fixed', left: dragState.x - 32, top: dragState.y - 32, pointerEvents: 'none' } : {}}
                  >
                    <Icon size={28} />
                    <div className="absolute -bottom-2 -right-2 bg-black text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border border-gray-700">
                      {item.pts}
                    </div>
                  </div>
                  {!isDragging && <span className="text-xs text-gray-500 mt-2">{item.label}</span>}
                </div>
              )
            })}
          </div>

          <div className="w-full max-w-md flex-1 overflow-y-auto flex flex-col gap-3 pb-24">
            {players.map(p => {
              const pIcons = Object.entries(iconAssignments).filter(([_, id]) => id === p.id).map(([type]) => type);
              return (
                <div key={p.id} data-player-id={p.id} className="player-dropzone flex items-center justify-between p-4 rounded-xl bg-[#111] border-2 border-transparent transition-colors">
                  <span className="text-white font-medium">{p.name}</span>
                  <div className="flex gap-2 min-h-[32px] min-w-[32px]">
                    {pIcons.map(type => {
                      const IconComponent = type === 'year' ? Calendar : type === 'title' ? Music : Mic2;
                      const color = type === 'year' ? 'text-blue-400' : type === 'title' ? 'text-green-400' : 'text-purple-400';
                      return <div key={type} className={`w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center ${color}`}><IconComponent size={16} /></div>
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-auto">
            <button 
              onPointerDown={handleConfirmDown}
              className="relative w-full max-w-xs py-4 rounded-full bg-[#D4AF37] border border-[#D4AF37] overflow-hidden active:scale-95 transition-transform"
            >
              <div className="absolute left-0 top-0 bottom-0 bg-white/40 transition-all ease-linear" style={{ width: isHoldingConfirm ? '100%' : '0%', transitionDuration: isHoldingConfirm ? '300ms' : '150ms' }} />
              <span className="relative z-10 font-bold text-lg text-black tracking-widest uppercase">Confirm Points</span>
            </button>
          </div>
        </div>
      )}

      {carouselPhase === 'leaderboard' && (
        <div className="flex-1 flex flex-col items-center justify-center pt-20 px-6 w-full">
          <Trophy className="w-16 h-16 text-[#D4AF37] mb-6" />
          <h2 className="text-3xl font-bold text-white tracking-widest uppercase mb-8">Leaderboard</h2>
          
          <div className="w-full max-w-sm flex flex-col gap-3 mb-12 flex-1 overflow-y-auto">
            {players.map((p, i) => (
              <div key={p.id} className="flex items-center p-4 rounded-xl bg-[#111] border border-gray-800">
                <span className={`w-8 text-lg font-bold ${i === 0 ? 'text-[#D4AF37]' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-600'}`}>#{i+1}</span>
                <span className="flex-1 text-white text-lg font-medium">{p.name}</span>
                <span className="text-[#D4AF37] font-bold text-xl">{p.score} <span className="text-xs text-gray-500">pts</span></span>
              </div>
            ))}
          </div>

          <button 
            onClick={nextSong}
            className="w-full max-w-sm py-5 rounded-xl bg-gray-800 text-white font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition hover:bg-gray-700 mb-8"
          >
            <SkipForward className="fill-current" /> Next Song
          </button>
        </div>
      )}
    </div>
  );
}
