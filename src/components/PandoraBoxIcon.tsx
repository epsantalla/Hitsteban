interface PandoraBoxIconProps {
  className?: string;
}

// Greek key (meander) band across the chest front — 4 square-spiral units.
const KEY_UNITS = [0, 1, 2, 3].map((i) => {
  const x = 25 + i * 12.5;
  const y = 61;
  return `M${x + 1.5},${y + 1.5} H${x + 10.5} V${y + 10.5} H${x + 4.5} V${y + 4.5} H${x + 8} V${y + 8}`;
});

/**
 * Estebox's mark: a Greek-style Pandora's box (an ornate chest with a domed lid
 * thrown open, a meander band on the front, and coloured light escaping). Pure
 * inline SVG, no image assets; kept in visual sync with the app icon
 * (`src/app/icon.svg`).
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
          <stop offset="0%" stopColor="#FCF6BA" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#BF953F" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#BF953F" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Domed lid, thrown open behind the box */}
      <g fill="#1a140c" stroke="url(#pbi-gold)" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M32 55 C32 33, 40 22, 50 22 C60 22, 68 33, 68 55 Z" />
      </g>
      <path
        d="M37 55 C37 35, 44 28, 50 28 C56 28, 63 35, 63 55"
        fill="none"
        stroke="url(#pbi-gold)"
        strokeWidth="0.8"
        opacity="0.5"
      />
      <circle cx="50" cy="20" r="2.2" fill="url(#pbi-gold)" />

      {/* Light escaping from the open box */}
      <ellipse cx="50" cy="52" rx="26" ry="16" fill="url(#pbi-glow)" />

      {/* Rising rays + coloured motes */}
      <g fill="none" strokeWidth="1.4" strokeLinecap="round" opacity="0.55">
        <path d="M50 50 L40 32" stroke="#BF953F" />
        <path d="M50 50 L50 26" stroke="#BF953F" />
        <path d="M50 50 L60 32" stroke="#BF953F" />
      </g>
      <circle cx="39" cy="38" r="1.8" fill="#1B998B" />
      <circle cx="61" cy="35" r="1.8" fill="#C81D6B" />
      <circle cx="50" cy="30" r="1.6" fill="#6A4C93" />
      <circle cx="44" cy="44" r="1.4" fill="#2E6F95" />
      <circle cx="57" cy="43" r="1.4" fill="#D4AF37" />

      {/* Box mouth (opening rim) */}
      <ellipse cx="50" cy="54" rx="28" ry="5.5" fill="#0a0a0a" stroke="url(#pbi-gold)" strokeWidth="1.6" />

      {/* Chest body / front wall */}
      <path
        d="M23 54 H77 V80 Q77 84 73 84 H27 Q23 84 23 80 Z"
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
      <rect x="46" y="55" width="8" height="9" rx="1.5" fill="url(#pbi-gold)" />
      <rect x="21" y="84" width="58" height="4" rx="1.5" fill="url(#pbi-gold)" />
    </svg>
  );
}
