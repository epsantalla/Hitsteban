"use client";

/**
 * Decorative, non-interactive backdrop for Tribial. A modern take on a tribal
 * aesthetic: a warm ember-dark base, slow-breathing radial glows, a large
 * radiating "sun" emblem rising from the bottom, a seamless mudcloth-style line
 * motif tiled across, and a faint film grain for texture. Pure inline SVG + CSS
 * (no image files), mirroring the convention of `PandoraBackground`.
 *
 * Everything animates slowly (breathe/drift) rather than flickering, and the
 * geometry is thin-line + minimal on purpose — the goal is "refined tribal
 * graphic design", not skeuomorphic torches.
 */

// Warm palette, kept in sync with the Tribial UI (Tribial.tsx / BasicGame.tsx).
const INK = "#C99A5B"; // sandy line color for the tribal motif
const EMBER = "232,104,26"; // #E8681A as rgb, for glows

// ---------------------------------------------------------------------------
// Seamless mudcloth-style motif (tiles at 140×140).
// Each row's period divides 140 so the pattern is seamless horizontally.
// ---------------------------------------------------------------------------
function MudclothTile() {
  return (
    <g stroke={INK} fill={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Row A — zigzag (segment = 17.5, so 8 per tile) */}
      <polyline
        fill="none"
        points="0,24 17.5,12 35,24 52.5,12 70,24 87.5,12 105,24 122.5,12 140,24"
      />

      {/* Row B — small upward triangles (every 28, 5 per tile) */}
      {[14, 42, 70, 98, 126].map((cx) => (
        <path key={cx} d={`M${cx - 7} 62 L${cx} 48 L${cx + 7} 62 Z`} fillOpacity="0.9" strokeWidth="0" />
      ))}

      {/* Row C — dotted line (every 20, 7 per tile) */}
      {[10, 30, 50, 70, 90, 110, 130].map((cx) => (
        <circle key={cx} cx={cx} cy="84" r="2.1" strokeWidth="0" />
      ))}

      {/* Row D — hollow diamonds (every 28, 5 per tile) */}
      {[14, 42, 70, 98, 126].map((cx) => (
        <path key={cx} fill="none" d={`M${cx} 104 L${cx + 10} 118 L${cx} 132 L${cx - 10} 118 Z`} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Radiating "sun" emblem — a fan of thin rays + concentric arcs rising from a
// point just below the bottom edge. Reads as fire/sun without cartoon flames.
// ---------------------------------------------------------------------------
function SunEmblem() {
  const rays = Array.from({ length: 21 }, (_, i) => {
    // Fan across the upper half-plane (-100°..100° from vertical).
    const angle = (-100 + (i * 200) / 20) * (Math.PI / 180);
    const inner = 60;
    const outer = i % 2 === 0 ? 360 : 300; // alternate long/short rays
    const x1 = Math.sin(angle) * inner;
    const y1 = -Math.cos(angle) * inner;
    const x2 = Math.sin(angle) * outer;
    const y2 = -Math.cos(angle) * outer;
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
  });

  return (
    <svg
      className="absolute left-1/2 bottom-0 w-[130%] max-w-[900px] -translate-x-1/2 translate-y-[38%]"
      viewBox="-400 -400 800 400"
      preserveAspectRatio="xMidYMax meet"
      style={{ animation: "tribial-breathe 9s ease-in-out infinite" }}
    >
      <defs>
        <linearGradient id="tribial-sun" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#F2A03D" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#E8681A" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#E8681A" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="tribial-sun-core" cx="50%" cy="100%" r="90%">
          <stop offset="0%" stopColor="#F2A03D" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#F2A03D" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* rays */}
      <g stroke="url(#tribial-sun)" strokeWidth="2.5" strokeLinecap="round">
        {rays}
      </g>

      {/* concentric arcs (semicircle-ish, above the core) */}
      <g fill="none" stroke="url(#tribial-sun)" strokeWidth="2">
        <path d="M -150 0 A 150 150 0 0 1 150 0" />
        <path d="M -230 0 A 230 230 0 0 1 230 0" strokeOpacity="0.7" />
        <path d="M -320 0 A 320 320 0 0 1 320 0" strokeOpacity="0.45" />
      </g>

      {/* soft core */}
      <circle cx="0" cy="0" r="120" fill="url(#tribial-sun-core)" />
    </svg>
  );
}

export default function TribalBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes tribial-breathe {
          0%, 100% { opacity: 0.85; transform: translate(-50%, 38%) scale(1); }
          50%      { opacity: 1;    transform: translate(-50%, 36%) scale(1.03); }
        }
        @keyframes tribial-glow {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.9; }
        }
      `}</style>

      {/* Base warm-dark gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 108%, #241206 0%, #17100A 42%, #100C08 100%)",
        }}
      />

      {/* Seamless mudcloth tribal motif */}
      <svg className="absolute inset-0 h-full w-full" opacity="0.09" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="tribial-mudcloth" width="140" height="140" patternUnits="userSpaceOnUse">
            <MudclothTile />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tribial-mudcloth)" />
      </svg>

      {/* Radiating sun emblem rising from the bottom */}
      <SunEmblem />

      {/* Ambient ember glow (breathes slowly) */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(90% 60% at 50% 105%, rgba(${EMBER},0.22) 0%, rgba(${EMBER},0.06) 45%, rgba(0,0,0,0) 72%)`,
          animation: "tribial-glow 7s ease-in-out infinite",
        }}
      />

      {/* Faint top vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.35) 100%)",
        }}
      />

      {/* Film grain for a tactile, modern texture */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay">
        <filter id="tribial-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#tribial-grain)" />
      </svg>
    </div>
  );
}
