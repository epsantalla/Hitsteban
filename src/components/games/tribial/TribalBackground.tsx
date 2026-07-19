"use client";

/**
 * Decorative, non-interactive backdrop for Tribial: a subtle leopard-print
 * texture, a warm torch glow, and two flickering wall torches in the bottom
 * corners. Pure inline SVG + CSS (no image files), mirroring the convention of
 * `ArtNouveauBackground`. Keyframes are injected via an inline <style> tag
 * because there is no tailwindcss-animate plugin in this project.
 */

// Where a leopard rosette sits within the 160×160 repeating tile.
const ROSETTES = [
  { x: 42, y: 40, r: 13, rot: 8 },
  { x: 118, y: 78, r: 15, rot: -14 },
  { x: 66, y: 128, r: 12, rot: 22 },
  { x: 138, y: 150, r: 10, rot: -6 },
  { x: 6, y: 112, r: 11, rot: 30 },
];

// A broken ring of dark blobs (with a gap) = one leopard rosette.
const BLOB_ANGLES = [20, 75, 130, 200, 255, 310];

function Rosette({ x, y, r, rot }: { x: number; y: number; r: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <ellipse cx="0" cy="0" rx={r * 0.42} ry={r * 0.5} fill="#4A3618" opacity="0.55" />
      {BLOB_ANGLES.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const bx = Math.cos(rad) * r;
        const by = Math.sin(rad) * r;
        return (
          <ellipse
            key={i}
            cx={bx}
            cy={by}
            rx={r * 0.28}
            ry={r * 0.36}
            fill="#1C1408"
            transform={`rotate(${deg + 90} ${bx} ${by})`}
          />
        );
      })}
    </g>
  );
}

function Torch({ side, duration, delay }: { side: "left" | "right"; duration: string; delay: string }) {
  const pos = side === "left" ? "left-3 sm:left-8" : "right-3 sm:right-8";
  return (
    <div className={`absolute bottom-0 ${pos} h-52 w-24 sm:h-64 sm:w-28`}>
      {/* warm glow */}
      <div
        className="absolute left-1/2 top-2 h-28 w-28 -translate-x-1/2 rounded-full blur-2xl"
        style={{
          background: "radial-gradient(circle, rgba(232,104,26,0.55) 0%, rgba(232,104,26,0) 70%)",
          animation: `tribial-glow ${duration} ease-in-out infinite`,
          animationDelay: delay,
        }}
      />
      <svg
        viewBox="0 0 100 220"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <linearGradient id={`torch-flame-${side}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#B23A0E" />
            <stop offset="45%" stopColor="#E8681A" />
            <stop offset="80%" stopColor="#F2A03D" />
            <stop offset="100%" stopColor="#FCE79B" />
          </linearGradient>
          <linearGradient id={`torch-handle-${side}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3A2A18" />
            <stop offset="50%" stopColor="#6B4A28" />
            <stop offset="100%" stopColor="#2A1D10" />
          </linearGradient>
        </defs>

        {/* handle */}
        <rect x="44" y="70" width="12" height="140" rx="4" fill={`url(#torch-handle-${side})`} />
        {/* binding / holder */}
        <rect x="36" y="66" width="28" height="14" rx="5" fill="#241811" />
        <path d="M36 74 L64 74 L60 84 L40 84 Z" fill="#3A2A18" />

        {/* flame (flickers) */}
        <g style={{ transformOrigin: "50px 74px", animation: `tribial-flicker ${duration} ease-in-out infinite`, animationDelay: delay }}>
          <path d="M50 6 C 30 40, 26 58, 34 72 C 40 82, 60 82, 66 72 C 74 58, 70 40, 50 6 Z" fill={`url(#torch-flame-${side})`} />
          <path d="M50 26 C 40 46, 38 58, 44 68 C 48 74, 56 74, 58 66 C 62 54, 58 44, 50 26 Z" fill="#FCE79B" opacity="0.85" />
        </g>
      </svg>
    </div>
  );
}

export default function TribalBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes tribial-flicker {
          0%, 100% { transform: scaleY(1) translateY(0); opacity: 0.95; }
          25%      { transform: scaleY(1.08) translateX(0.6px); opacity: 1; }
          50%      { transform: scaleY(0.93) translateX(-0.5px); opacity: 0.9; }
          75%      { transform: scaleY(1.05) translateX(0.3px); opacity: 1; }
        }
        @keyframes tribial-glow {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
          50%      { opacity: 0.85; transform: translateX(-50%) scale(1.08); }
        }
      `}</style>

      {/* leopard-print texture */}
      <svg className="absolute inset-0 h-full w-full" opacity="0.22" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="tribial-leopard" width="160" height="160" patternUnits="userSpaceOnUse">
            {ROSETTES.map((r, i) => (
              <Rosette key={i} {...r} />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tribial-leopard)" />
      </svg>

      {/* warm ambient glow rising from the bottom (where the torches are) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 100%, rgba(232,104,26,0.18) 0%, rgba(232,104,26,0.05) 40%, rgba(0,0,0,0) 70%)",
        }}
      />

      <Torch side="left" duration="0.55s" delay="0s" />
      <Torch side="right" duration="0.62s" delay="0.15s" />
    </div>
  );
}
