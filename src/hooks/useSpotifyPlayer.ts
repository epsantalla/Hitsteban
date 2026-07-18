import { useCallback, useEffect, useRef } from "react";

interface InitOptions {
  /** Called once the player is registered as an active device. */
  onReady: (deviceId: string) => void;
  /** Called on any initialization/authentication/account error. */
  onError: (message: string) => void;
}

export interface SpotifyPlayer {
  /** The current playback device id, once ready (null before). */
  deviceIdRef: React.MutableRefObject<string | null>;
  /** Lazily load the Web Playback SDK and connect a player. */
  init: (options: InitOptions) => void;
  /** Start playback of a track URI on the active device, retrying while the
   *  device spins up on Spotify's backend. Resolves to whether it succeeded. */
  playUri: (uri: string, retries?: number) => Promise<boolean>;
  /** Pause playback (no-op if not connected). */
  pause: () => void;
  /** Pause then disconnect, releasing the device to avoid zombie playback. */
  disconnect: () => void;
}

/**
 * Manage the Spotify Web Playback SDK lifecycle for a game component.
 *
 * Encapsulates the SDK script injection, player construction (reading the
 * freshest token from a ref so NextAuth refreshes are picked up), the
 * device-not-yet-active retry loop, and cleanup on unmount.
 */
export function useSpotifyPlayer(
  accessToken: string,
  playerName: string
): SpotifyPlayer {
  const deviceIdRef = useRef<string | null>(null);
  const playerRef = useRef<any>(null);

  // Keep the latest token in a ref so `getOAuthToken` always hands the SDK a
  // valid token, even after NextAuth silently refreshes it.
  const accessTokenRef = useRef(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  const init = useCallback(
    ({ onReady, onError }: InitOptions) => {
      const startSdk = () => {
        // @ts-ignore - Spotify is injected globally by the SDK script.
        const player = new window.Spotify.Player({
          name: playerName,
          getOAuthToken: (cb: (token: string) => void) => cb(accessTokenRef.current),
          volume: 0.5,
        });
        playerRef.current = player;

        player.addListener("ready", ({ device_id }: { device_id: string }) => {
          deviceIdRef.current = device_id;
          onReady(device_id);
        });

        const fail = ({ message }: { message: string }) => {
          console.error(message);
          onError(message);
        };
        player.addListener("initialization_error", fail);
        player.addListener("authentication_error", fail);
        player.addListener("account_error", fail);

        player.connect();
      };

      // @ts-ignore
      if (window.Spotify) {
        startSdk();
      } else {
        // @ts-ignore
        window.onSpotifyWebPlaybackSDKReady = startSdk;
        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }
    },
    [playerName]
  );

  const playUri = useCallback(
    async (uri: string, retries = 3): Promise<boolean> => {
      const deviceId = deviceIdRef.current;
      if (!deviceId) return false;
      try {
        const res = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessTokenRef.current}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: [uri] }),
          }
        );
        if (!res.ok && retries > 0) {
          // Device might not be fully active on Spotify's backend yet.
          await new Promise((r) => setTimeout(r, 500));
          return playUri(uri, retries - 1);
        }
        if (!res.ok) {
          console.error("Failed to play track, Spotify API returned:", res.status);
        }
        return res.ok;
      } catch (err) {
        console.error("Network error playing track:", err);
        return false;
      }
    },
    []
  );

  const pause = useCallback(() => {
    if (playerRef.current) playerRef.current.pause().catch(() => {});
  }, []);

  const disconnect = useCallback(() => {
    if (playerRef.current) {
      playerRef.current
        .pause()
        .catch(() => {})
        .finally(() => playerRef.current.disconnect());
    }
  }, []);

  // Safety net: tear down the player if the component unmounts while active.
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current
          .pause()
          .catch(() => {})
          .finally(() => playerRef.current.disconnect());
      }
    };
  }, []);

  return { deviceIdRef, init, playUri, pause, disconnect };
}
