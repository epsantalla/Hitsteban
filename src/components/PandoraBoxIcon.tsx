interface PandoraBoxIconProps {
  className?: string;
}

// Light rays bursting from behind the open lid — one upward beam, rotated into
// a fan across the top.
const RAY_ROT = [-74, -62, -50, -38, -26, -14, 0, 14, 26, 38, 50, 62, 74];
const RAY_LONG = "M50 50 L48.7 18 L51.3 18 Z";
const RAY_SHORT = "M50 50 L48.9 27 L51.1 27 Z";

// Greek key (meander) band across the chest front — 4 square-spiral units.
const KEY_UNITS = [0, 1, 2, 3].map((i) => {
  const x = 25 + i * 12.5;
  const y = 62;
  return `M${x + 1.5},${y + 1.5} H${x + 10.5} V${y + 10.5} H${x + 4.5} V${y + 4.5} H${x + 8} V${y + 8}`;
});

/**
 * Estebox's mark: a Greek-style Pandora's box thrown wide open, with light
 * bursting out from behind the raised lid. Pure inline SVG, no image assets;
 * kept in visual sync with the app icon (`src/app/icon.svg`).
 */
export default function PandoraBoxIcon({ className }: PandoraBoxIconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pbi-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BF953F" />
          <stop offset="50%" stopColor="#FCF6BA" />
          <stop offset="100%" stopColor="#B38728" />
        </linearGradient>
        <radialGradient id="pbi-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFBE6" stopOpacity="1" />
          <stop offset="35%" stopColor="#FCF6BA" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#BF953F" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#BF953F" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Glow core behind everything */}
      <ellipse cx="50" cy="44" rx="34" ry="30" fill="url(#pbi-glow)" />

      {/* Light rays bursting out (behind the lid) */}
      <g fill="url(#pbi-gold)">
        {RAY_ROT.map((a, i) => (
          <path
            key={i}
            d={i % 2 ? RAY_SHORT : RAY_LONG}
            opacity="0.5"
            transform={`rotate(${a} 50 50)`}
          />
        ))}
      </g>

      {/* Open lid, raised and tilted back — dark silhouette against the light */}
      <g transform="rotate(-10 50 50)">
        <path
          d="M33 49 C33 30, 41 20, 50 20 C59 20, 67 30, 67 49 Z"
          fill="#1a140c"
          stroke="url(#pbi-gold)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M38 49 C38 33, 44 25, 50 25 C56 25, 62 33, 62 49"
          fill="none"
          stroke="url(#pbi-gold)"
          strokeWidth="0.8"
          opacity="0.55"
        />
        <circle cx="50" cy="18" r="2.3" fill="url(#pbi-gold)" />
      </g>

      {/* Coloured motes drifting up out of the box */}
      <circle cx="37" cy="40" r="1.9" fill="#1B998B" />
      <circle cx="64" cy="37" r="1.9" fill="#C81D6B" />
      <circle cx="50" cy="32" r="1.6" fill="#6A4C93" />
      <circle cx="43" cy="47" r="1.5" fill="#2E6F95" />
      <circle cx="59" cy="46" r="1.5" fill="#D4AF37" />

      {/* Bright open mouth of the box */}
      <ellipse cx="50" cy="55" rx="27" ry="6" fill="url(#pbi-glow)" />
      <ellipse cx="50" cy="55" rx="27" ry="6" fill="none" stroke="url(#pbi-gold)" strokeWidth="1.6" />

      {/* Chest body / front wall */}
      <path
        d="M24 55 H76 V81 Q76 85 72 85 H28 Q24 85 24 81 Z"
        fill="#1a140c"
        stroke="url(#pbi-gold)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Greek key (meander) band */}
      <g fill="none" stroke="url(#pbi-gold)" strokeWidth="1.1" strokeLinejoin="miter">
        {KEY_UNITS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* Clasp + base moulding */}
      <rect x="46" y="56" width="8" height="9" rx="1.5" fill="url(#pbi-gold)" />
      <rect x="22" y="85" width="56" height="4" rx="1.5" fill="url(#pbi-gold)" />
    </svg>
  );
}
