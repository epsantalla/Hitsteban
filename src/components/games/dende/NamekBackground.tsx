"use client";

/**
 * Decorative, non-interactive backdrop for Dende: a painted-style rendering of
 * planet Namek (Dragon Ball) — a large glowing green/yellow sphere with
 * diagonal swirling bands and a bright highlight, floating in a starfield.
 * Pure inline SVG + CSS (no image files), mirroring the convention of
 * `PandoraBackground` / `TribalBackground`.
 *
 * A uniform dark scrim sits on top of everything so card text stays legible
 * no matter how bright/busy the sphere rendering underneath gets.
 */

// Cheap deterministic hash → [0,1), so stars are stable across renders/SSR.
function rand(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const STAR_COUNT = 90;
const STARS = Array.from({ length: STAR_COUNT }, (_, i) => {
  const seed = i * 17.31;
  return {
    cx: rand(seed) * 800,
    cy: rand(seed + 3.7) * 800,
    r: 0.6 + rand(seed + 7.1) * 1.6,
    opacity: 0.25 + rand(seed + 9.9) * 0.6,
    dur: 4 + (i % 5),
    delay: (i % 7) * 0.6,
  };
});

export default function NamekBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes dende-twinkle {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 1; }
        }
      `}</style>

      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 800">
        <defs>
          <radialGradient id="dende-space" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#081326" />
            <stop offset="100%" stopColor="#020509" />
          </radialGradient>

          <pattern id="dende-bands" width="70" height="70" patternUnits="userSpaceOnUse" patternTransform="rotate(115)">
            <rect width="70" height="70" fill="#1B9E63" />
            <rect x="0" width="26" height="70" fill="#149A5C" />
            <rect x="26" width="10" height="70" fill="#D8E86A" />
            <rect x="36" width="18" height="70" fill="#2BB673" />
            <rect x="54" width="6" height="70" fill="#8FE3A0" />
            <rect x="60" width="10" height="70" fill="#178552" />
          </pattern>

          <filter id="dende-soften" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4.5" />
          </filter>

          <radialGradient id="dende-limb" cx="32%" cy="72%" r="78%">
            <stop offset="0%" stopColor="#010301" stopOpacity="0" />
            <stop offset="65%" stopColor="#010301" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#010301" stopOpacity="0.8" />
          </radialGradient>

          <radialGradient id="dende-hotspot" cx="66%" cy="30%" r="55%">
            <stop offset="0%" stopColor="#F3FFF2" stopOpacity="0.8" />
            <stop offset="45%" stopColor="#E8FFC8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#E8FFC8" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="dende-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4FB8E3" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4FB8E3" stopOpacity="0" />
          </radialGradient>

          <clipPath id="dende-sphere-clip">
            <circle cx="470" cy="360" r="430" />
          </clipPath>
        </defs>

        {/* deep space base */}
        <rect width="800" height="800" fill="url(#dende-space)" />

        {/* stars */}
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="#EAF7EE"
            opacity={s.opacity}
            style={{ animation: `dende-twinkle ${s.dur}s ease-in-out infinite`, animationDelay: `${s.delay}s` }}
          />
        ))}

        {/* soft outer halo */}
        <circle cx="470" cy="360" r="470" fill="url(#dende-halo)" />

        {/* the planet body: banded pattern, softened, clipped to a circle */}
        <g clipPath="url(#dende-sphere-clip)">
          <rect x="0" y="0" width="800" height="800" fill="url(#dende-bands)" filter="url(#dende-soften)" />
          <circle cx="470" cy="360" r="430" fill="url(#dende-hotspot)" />
          <circle cx="470" cy="360" r="430" fill="url(#dende-limb)" />
        </g>
      </svg>

      {/* uniform dark scrim so text always reads clearly regardless of what's behind it */}
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.7) 100%)",
        }}
      />
    </div>
  );
}
