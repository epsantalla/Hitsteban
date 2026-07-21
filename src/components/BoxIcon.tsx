interface BoxIconProps {
  className?: string;
}

// Isometric cube faces, shared by all three visible sides of the crate.
const TOP = "50,10 86,30 50,50 14,30";
const LEFT = "14,30 14,70 50,90 50,50";
const RIGHT = "86,30 86,70 50,90 50,50";

/**
 * Estebox's mark: a simple isometric packing crate. Pure inline SVG, no image
 * assets; kept in visual sync with the app icon (`src/app/icon.svg`).
 */
export default function BoxIcon({ className }: BoxIconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="bi-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E7C08E" />
          <stop offset="100%" stopColor="#C88C4E" />
        </linearGradient>
        <linearGradient id="bi-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A9713F" />
          <stop offset="100%" stopColor="#8A5A32" />
        </linearGradient>
        <linearGradient id="bi-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6E4526" />
          <stop offset="100%" stopColor="#54341C" />
        </linearGradient>
        <radialGradient id="bi-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E7C08E" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#E7C08E" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="50" cy="52" rx="38" ry="34" fill="url(#bi-glow)" />

      <g stroke="#3A2313" strokeWidth="2" strokeLinejoin="round">
        <polygon points={TOP} fill="url(#bi-top)" />
        <polygon points={LEFT} fill="url(#bi-left)" />
        <polygon points={RIGHT} fill="url(#bi-right)" />
      </g>
    </svg>
  );
}
