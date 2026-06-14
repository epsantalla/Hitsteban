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

  const playTrack = async (index: number, deviceId: string) => {
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [tracks[index].uri] }),
      });
      setCurrentIndex(index);
      setStatus('PLAYING');
    } catch (err) {
      console.error(err);
    }
  };

  const handlePointerDown = async (e: React.PointerEvent) => {
    e.preventDefault();
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
        onExit();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, []);

  if (status === 'ERROR') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background text-foreground">
        <p className="text-red-500 mb-4">{errorMsg}</p>
        <button onClick={onExit} className="px-6 py-2 bg-gray-800 rounded-full text-white">Go Back</button>
      </div>
    );
  }

  if (status === 'FETCHING' || status === 'INITIALIZING_SDK') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 bg-background text-foreground">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p>{status === 'FETCHING' ? 'Loading Tracks...' : 'Connecting to Spotify...'}</p>
      </div>
    );
  }

  if (status === 'READY_TO_START') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background text-foreground">
        <h2 className="text-3xl font-bold mb-8">{tracks.length} Tracks Loaded</h2>
        <button 
          onClick={initPlayerAndStart}
          className="flex items-center gap-3 px-10 py-5 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-xl shadow-xl shadow-green-900/20 transition-all active:scale-95"
        >
          <Play className="fill-current" />
          Start Game
        </button>
      </div>
    );
  }

  const currentTrack = tracks[currentIndex];
  
  // State for the true release year, to fix remaster/re-release dates
  const [originalYear, setOriginalYear] = useState<string>('');

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
        
        const query = encodeURIComponent(`track:"${cleanBaseName}" artist:"${cleanArtistName}"`);
        const res = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=50`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (res.ok) {
          const data = await res.json();
          const items = data.tracks?.items || [];
          let oldestYear = parseInt(fallbackYear);
          
          for (const item of items) {
            const itemYear = parseInt(item.album.release_date.split('-')[0]);
            if (!isNaN(itemYear) && itemYear < oldestYear) {
              oldestYear = itemYear;
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

  return (
    <div 
      className="fixed inset-0 bg-background flex flex-col items-center justify-center select-none touch-none"
      onPointerDown={handlePointerDown}
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      <div className="absolute top-4 left-4 text-gray-500 text-sm font-mono tracking-widest pointer-events-none">
        {currentIndex + 1} / {tracks.length}
      </div>

      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); onExit(); }}
          className="text-xs px-3 py-1 border border-gray-700 rounded text-gray-400 hover:bg-gray-800 transition"
        >
          End Game
        </button>
      </div>

      <div className="flex flex-col items-center justify-center w-full max-w-md px-6 text-center transition-opacity duration-300 pointer-events-none">
        {revealState === 'HIDDEN' ? (
          <div className="animate-pulse flex flex-col items-center">
            <Music className="w-24 h-24 text-gray-600 mb-8" />
            <h2 className="text-2xl font-light text-gray-400 tracking-widest uppercase">
              Hold to Reveal
            </h2>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-300">
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
              {currentTrack.name}
            </h2>
            <div className="h-1 w-20 bg-green-500 rounded-full" />
            <p className="text-xl md:text-2xl text-gray-300 font-medium">
              {currentTrack.artists.map(a => a.name).join(', ')}
            </p>
            <p className="text-lg text-gray-500 font-mono bg-gray-900 px-4 py-1 rounded-full">
              {originalYear}
            </p>
            <p className="mt-12 text-sm text-gray-600 uppercase tracking-widest">
              Tap again for next track
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
