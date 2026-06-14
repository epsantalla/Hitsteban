"use client";

import { useEffect, useState, useRef } from "react";
import { Play, Loader2, Music } from "lucide-react";

interface Track {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { release_date: string };
}

export default function Game({ playlistId, accessToken, onExit }: { playlistId: string, accessToken: string, onExit: () => void }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'FETCHING' | 'READY_TO_START' | 'INITIALIZING_SDK' | 'PLAYING' | 'ERROR'>('FETCHING');
  const [errorMsg, setErrorMsg] = useState("");
  const [revealState, setRevealState] = useState<'HIDDEN' | 'REVEALED'>('HIDDEN');
  
  // State for the true release year, to fix remaster/re-release dates
  const [originalYear, setOriginalYear] = useState<string>('');

  const deviceIdRef = useRef<string | null>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const loadTracks = async () => {
      try {
        let allTracks: Track[] = [];
        let debugTotalItems = 0;
        let debugValidTracks = 0;
        let firstItemRaw = "";
        let url = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100&market=from_token`;
        
        while (url) {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const spotifyError = errorData.error?.message || res.statusText;
            throw new Error(`Spotify API Error: ${spotifyError}`);
          }
          const data = await res.json();
          const validTracks = data.items
            .map((item: any) => item.track || item.item)
            .filter((t: any) => t && t.uri && t.type === 'track' && t.is_playable !== false && !t.is_local);
          
          debugTotalItems += (data.items || []).length;
          debugValidTracks += validTracks.length;
          if (!firstItemRaw && data.items && data.items.length > 0) {
            firstItemRaw = JSON.stringify(data.items[0]);
          }
          
          allTracks = [...allTracks, ...validTracks];
          url = data.next;
        }

        for (let i = allTracks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
        }
        
        if (allTracks.length === 0) {
          throw new Error(`Playlist is empty or contains unsupported tracks. ID: ${playlistId}, API Items: ${debugTotalItems}, Valid: ${debugValidTracks}`);
        }
        
        setTracks(allTracks);
        setStatus('READY_TO_START');
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
      
      // Set to fallback immediately so there's never an empty year
      setOriginalYear(fallbackYear);

      try {
        // Remove " - Remastered", " (feat. ...)", etc. to get the core song name
        const baseName = track.name.split(' - ')[0].split(' (')[0].trim();
        const artistName = track.artists[0].name;
        
        const cleanBaseName = baseName.replace(/"/g, '');
        const cleanArtistName = artistName.replace(/"/g, '');
        
        // Use a broad search query to let Spotify's algorithm find the best matches
        const query = encodeURIComponent(`${cleanBaseName} ${cleanArtistName}`);
        const res = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=50`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (res.ok) {
          const data = await res.json();
          const items = data.tracks?.items || [];
          let oldestYear = parseInt(fallbackYear);
          
          for (const item of items) {
            // Verify this result is actually the same song and artist
            const isArtistMatch = item.artists.some((a: any) => 
              a.name.toLowerCase().includes(cleanArtistName.toLowerCase()) || 
              cleanArtistName.toLowerCase().includes(a.name.toLowerCase())
            );
            
            const itemBaseName = item.name.split(' - ')[0].split(' (')[0].trim().toLowerCase();
            const isTrackMatch = itemBaseName === cleanBaseName.toLowerCase() || 
                                 item.name.toLowerCase().includes(cleanBaseName.toLowerCase());

            if (isArtistMatch && isTrackMatch) {
              const itemYear = parseInt(item.album.release_date.split('-')[0]);
              if (!isNaN(itemYear) && itemYear < oldestYear) {
                oldestYear = itemYear;
              }
            }
          }

          if (isMounted) {
            setOriginalYear(oldestYear.toString());
          }
        }
      } catch (err) {
        console.error("Failed to fetch original year:", err);
      }
    };

    fetchYear();
    
    return () => {
      isMounted = false;
    };
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
        name: 'Guess the Song Player',
        getOAuthToken: (cb: any) => { cb(accessToken); },
        volume: 0.5
      });

      playerRef.current = player;

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        deviceIdRef.current = device_id;
        playTrack(0, device_id);
      });

      player.addListener('initialization_error', ({ message }: any) => { console.error(message); setErrorMsg(message); setStatus('ERROR'); });
      player.addListener('authentication_error', ({ message }: any) => { console.error(message); setErrorMsg(message); setStatus('ERROR'); });
      player.addListener('account_error', ({ message }: any) => { console.error(message); setErrorMsg(message); setStatus('ERROR'); });
      
      player.connect();
    };
  };

  const playTrack = async (index: number, deviceId: string, retries = 3) => {
    try {
      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [tracks[index].uri] }),
      });
      
      if (!res.ok && retries > 0) {
        // Device might not be fully active on Spotify's backend yet, wait and retry
        await new Promise(r => setTimeout(r, 500));
        return playTrack(index, deviceId, retries - 1);
      }
      
      if (!res.ok) {
        console.error("Failed to play track, Spotify API returned:", res.status);
      } else {
        setCurrentIndex(index);
        setStatus('PLAYING');
      }
    } catch (err) {
      console.error("Network error playing track:", err);
    }
  };

  const handleExit = () => {
    if (playerRef.current) {
      // Pause before disconnecting to avoid zombie playback
      playerRef.current.pause().catch(() => {}).finally(() => {
        playerRef.current.disconnect();
      });
    }
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
          if (deviceIdRef.current) {
            await playTrack(nextIndex, deviceIdRef.current);
          }
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
      if (playerRef.current) {
        playerRef.current.pause().catch(() => {}).finally(() => {
          playerRef.current.disconnect();
        });
      }
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  if (status === 'ERROR') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#0a0a0a] text-foreground">
        <p className="text-red-500 mb-4">{errorMsg}</p>
        <button onClick={handleExit} className="px-6 py-2 bg-gray-800 rounded-full text-white">Go Back</button>
      </div>
    );
  }

  if (status === 'FETCHING' || status === 'INITIALIZING_SDK') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 bg-[#0a0a0a] text-foreground">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#D4AF37]" />
        <p className="text-[#D4AF37]/80">{status === 'FETCHING' ? 'Loading Tracks...' : 'Connecting to Spotify...'}</p>
      </div>
    );
  }

  if (status === 'READY_TO_START') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#0a0a0a] text-foreground">
        <h2 className="text-3xl font-bold mb-8 text-white">{tracks.length} Tracks Loaded</h2>
        <button 
          onClick={initPlayerAndStart}
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

        <div className="absolute top-4 left-4 text-gray-500 text-sm font-mono tracking-widest pointer-events-none mt-2">
          {currentIndex + 1} / {tracks.length}
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
              <div className={`relative w-48 h-48 rounded-full bg-[#111] border-[6px] border-[#222] shadow-xl shadow-black/80 flex items-center justify-center mb-8 animate-[spin_3s_linear_infinite] transition-all duration-300 ${isHolding ? 'ring-4 ring-[#D4AF37]/50 border-[#333]' : ''}`}>
                <div className="absolute inset-2 rounded-full border border-gray-800/50"></div>
                <div className="absolute inset-6 rounded-full border border-gray-800/50"></div>
                <div className="absolute inset-10 rounded-full border border-gray-800/50"></div>
                <div className="absolute inset-14 rounded-full border border-gray-800/50"></div>
                
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
              
              <div className="flex flex-col items-center space-y-2 mb-8">
                <p className="text-xl md:text-2xl font-light text-[#D4AF37]">
                  {currentTrack.artists.map(a => a.name).join(', ')}
                </p>
                <p className="text-xl md:text-2xl font-light text-white">
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
