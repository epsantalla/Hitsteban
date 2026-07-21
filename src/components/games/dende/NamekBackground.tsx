"use client";

/**
 * Decorative, non-interactive backdrop for Dende: a painted-style rendering of
 * planet Namek (Dragon Ball) — a large 3D-shaded green/yellow sphere with
 * diagonal swirling bands, floating in a starfield. Pure CSS + inline SVG (no
 * image files), mirroring the convention of `PandoraBackground` /
 * `TribalBackground`.
 *
 * The sphere's 3D look comes from the classic CSS "ball" trick: a banded
 * texture + specular-highlight/diffuse-shading gradients, topped with a large
 * *inset* box-shadow that darkens the unlit hemisphere and curves naturally
 * with the circle's edge (rather than a flat disc with a gradient painted
 * on top).
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
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[#020509]">
      <style>{`
        @keyframes dende-twinkle {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 1; }
        }
      `}</style>

      {/* deep space + stars */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 800">
        <defs>
          <radialGradient id="dende-space" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#081326" />
            <stop offset="100%" stopColor="#020509" />
          </radialGradient>
        </defs>
        <rect width="800" height="800" fill="url(#dende-space)" />
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
      </svg>

      {/* the planet: banded texture + specular/diffuse gradients + a big inset
          shadow that curves with the circle's edge — the classic CSS "sphere
          shader" trick, giving real 3D shading instead of a flat painted disc. */}
      <div
        className="absolute rounded-full"
        style={{
          top: "-10vmin",
          right: "-12vmin",
          width: "100vmin",
          height: "100vmin",
          background: `
            radial-gradient(circle at 32% 26%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 5%, rgba(255,255,255,0) 15%),
            repeating-linear-gradient(112deg, #178552 0 22px, #1B9E63 22px 34px, #D8E86A 34px 42px, #2BB673 42px 60px, #8FE3A0 60px 66px, #149A5C 66px 86px),
            radial-gradient(circle at 40% 35%, #BFF0A8 0%, #2BB673 42%, #0F5A3C 78%, #063823 100%)
          `,
          backgroundBlendMode: "screen, soft-light, normal",
          boxShadow: `
            inset -24vmin -24vmin 32vmin rgba(0,3,2,0.9),
            inset 12vmin 12vmin 20vmin rgba(255,255,255,0.15),
            0 0 14vmin rgba(79,184,227,0.4)
          `,
        }}
      />

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
