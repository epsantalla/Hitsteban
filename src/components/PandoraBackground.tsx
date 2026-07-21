// Deterministic mosaic made of thousands of individual tesserae (small tiles)
// with grout gaps between them — the real Roman/Byzantine mosaic look, not a
// grid of lines. Tiles are mostly dark stone; warm kraft/tan tesserae
// concentrate near a light source at bottom-center, like light catching the
// logo's crate.
// Built once at module load (deterministic hash → same output every render, no
// hydration mismatch, no per-render cost).

const VIEW = 800;
const CELL = 22; // tile pitch
const TILE = 17; // tile size (CELL - TILE = grout gap)
const COLS = Math.ceil(VIEW / CELL) + 1;
const ROWS = Math.ceil(VIEW / CELL) + 1;

// Light source (the open box), bottom-center.
const FX = 400;
const FY = 720;
const FALLOFF = 640;

const STONE = ["#161009", "#1b130b", "#0f0b07", "#20160d", "#130e08"];
// Warm kraft/cardboard tones, like sunlit tesserae cut from brown glass.
const SMALTI = [
  "#A9713F", "#A9713F", "#D9A066", "#C88C4E", "#E7C08E",
  "#8A5A32", "#6E4526", "#BC8552", "#54341C",
];

// Cheap deterministic hash → [0,1).
function rand(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

interface Tessera {
  x: number;
  y: number;
  size: number;
  rot: number;
  fill: string;
  opacity: number;
}

function buildTiles(): Tessera[] {
  const tiles: Tessera[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const seed = r * 137.17 + c * 3.71;
      const a = rand(seed);
      const b = rand(seed + 4.2);
      const jx = (rand(seed + 8.1) - 0.5) * 2.4;
      const jy = (rand(seed + 11.3) - 0.5) * 2.4;
      const size = TILE + (rand(seed + 5.5) - 0.5) * 2.2;

      const cx = c * CELL + CELL / 2;
      const cy = r * CELL + CELL / 2;
      const dist = Math.hypot(cx - FX, cy - FY);
      const intensity = Math.max(0, 1 - dist / FALLOFF);

      // Lit (coloured) tesserae get denser toward the light.
      const isLit = a < 0.08 + intensity * intensity * 0.95;

      const fill = isLit
        ? SMALTI[Math.floor(b * SMALTI.length)]
        : STONE[Math.floor(b * STONE.length)];
      const opacity = isLit ? 0.3 + intensity * 0.62 : 0.85;

      tiles.push({
        x: c * CELL + jx,
        y: r * CELL + jy,
        size,
        rot: (rand(seed + 2.7) - 0.5) * 6,
        fill,
        opacity,
      });
    }
  }
  return tiles;
}

const TILES = buildTiles();

export default function PandoraBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="pb-spill" cx="50%" cy="90%" r="65%">
          <stop offset="0%" stopColor="#E7C08E" stopOpacity="0.18" />
          <stop offset="45%" stopColor="#A9713F" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#A9713F" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pb-vignette" cx="50%" cy="45%" r="75%">
          <stop offset="55%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
        </radialGradient>
      </defs>

      {/* Dark grout that shows through the gaps between tesserae. */}
      <rect width={VIEW} height={VIEW} fill="#070503" />

      {TILES.map((t, i) => (
        <rect
          key={i}
          x={t.x}
          y={t.y}
          width={t.size}
          height={t.size}
          rx={1.5}
          fill={t.fill}
          opacity={t.opacity}
          transform={`rotate(${t.rot} ${t.x + t.size / 2} ${t.y + t.size / 2})`}
        />
      ))}

      {/* Soft light spilling from the box + edge vignette for depth. */}
      <rect width={VIEW} height={VIEW} fill="url(#pb-spill)" />
      <rect width={VIEW} height={VIEW} fill="url(#pb-vignette)" />
    </svg>
  );
}
