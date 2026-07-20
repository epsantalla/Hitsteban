export default function PandoraBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 800 800"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Tessellated mosaic tile, like ancient tile floor grout lines */}
        <pattern id="pb-mosaic" width="80" height="80" patternUnits="userSpaceOnUse">
          <rect width="80" height="80" fill="none" />
          <path
            d="M 40 0 L 80 40 L 40 80 L 0 40 Z"
            fill="none"
            stroke="#BF953F"
            strokeWidth="1"
            opacity="0.5"
          />
          <circle cx="40" cy="40" r="3" fill="none" stroke="#BF953F" strokeWidth="0.75" opacity="0.4" />
          <circle cx="0" cy="0" r="2" fill="#BF953F" opacity="0.3" />
          <circle cx="80" cy="0" r="2" fill="#BF953F" opacity="0.3" />
          <circle cx="0" cy="80" r="2" fill="#BF953F" opacity="0.3" />
          <circle cx="80" cy="80" r="2" fill="#BF953F" opacity="0.3" />
        </pattern>

        <radialGradient id="pb-boxglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FCF6BA" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#BF953F" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#BF953F" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pb-violet" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6A4C93" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#6A4C93" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pb-ruby" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C81D6B" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#C81D6B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pb-teal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1B998B" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1B998B" stopOpacity="0" />
        </radialGradient>

        <filter id="pb-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="45" />
        </filter>
      </defs>

      {/* Base mosaic tessellation, whole canvas */}
      <rect width="800" height="800" fill="url(#pb-mosaic)" />

      {/* Wisps of color escaping the (implied) box, bottom-center */}
      <g filter="url(#pb-blur)">
        <circle cx="400" cy="620" r="260" fill="url(#pb-boxglow)" />
        <circle cx="220" cy="520" r="180" fill="url(#pb-violet)" />
        <circle cx="600" cy="500" r="200" fill="url(#pb-ruby)" />
        <circle cx="420" cy="720" r="160" fill="url(#pb-teal)" />
      </g>

      {/* Thin escaping-light rays rising from the box */}
      <g fill="none" strokeWidth="1.5" opacity="0.35" strokeLinecap="round">
        <path d="M 380 640 C 340 500, 300 420, 260 300" stroke="#1B998B" />
        <path d="M 420 640 C 460 500, 440 380, 500 240" stroke="#C81D6B" />
        <path d="M 400 620 C 400 480, 420 360, 400 200" stroke="#6A4C93" />
        <path d="M 400 620 C 380 470, 440 400, 420 260" stroke="#BF953F" />
      </g>
    </svg>
  );
}
