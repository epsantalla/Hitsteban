"use client";

/**
 * Decorative, non-interactive backdrop for Dende: a minimalist take on planet
 * Namek (Dragon Ball) — a clean emerald/teal sky, two pale distant suns, and a
 * single soft silhouette of rolling hills along the bottom. Pure inline SVG +
 * CSS (no image files), mirroring the convention of `PandoraBackground` /
 * `TribalBackground`. Kept deliberately sparse and low-contrast so card text
 * stays easy to read on top of it.
 */

const SKY_DEEP = "#04120D";
const SKY_MID = "#0B2A20";
const EMERALD = "#2BB673";

export default function NamekBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes dende-glow {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
      `}</style>

      {/* Base sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 50% -10%, ${SKY_MID} 0%, ${SKY_DEEP} 60%, #020806 100%)`,
        }}
      />

      {/* Two pale, distant suns */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 800">
        <defs>
          <radialGradient id="dende-sun-a" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EAF7EE" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#EAF7EE" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dende-sun-b" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#BFF2D6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#BFF2D6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dende-hill-glow" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor={EMERALD} stopOpacity="0.35" />
            <stop offset="100%" stopColor={EMERALD} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="230" cy="150" r="70" fill="url(#dende-sun-a)" style={{ animation: "dende-glow 8s ease-in-out infinite" }} />
        <circle cx="230" cy="150" r="18" fill="#F5FFF8" opacity="0.5" />

        <circle cx="560" cy="230" r="42" fill="url(#dende-sun-b)" style={{ animation: "dende-glow 11s ease-in-out infinite" }} />
        <circle cx="560" cy="230" r="10" fill="#DFFCE9" opacity="0.4" />

        {/* Rolling hill silhouette, low on the horizon */}
        <path
          d="M0,620 C120,560 220,660 340,600 C460,540 540,650 660,590 C740,550 780,610 800,600 L800,800 L0,800 Z"
          fill="#03110B"
          opacity="0.9"
        />
        <path
          d="M0,660 C140,620 260,690 400,650 C540,610 620,680 800,640 L800,800 L0,800 Z"
          fill="#020C08"
        />
        <rect x="0" y="560" width="800" height="120" fill="url(#dende-hill-glow)" opacity="0.5" />
      </svg>

      {/* Soft top-to-bottom vignette for text contrast */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </div>
  );
}
