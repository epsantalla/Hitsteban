interface PandoraBoxIconProps {
  className?: string;
}

/**
 * Estebox's mark: a Pandora's box with the lid propped open and colored wisps
 * escaping — echoes the multi-game "collection released from one box" idea.
 * Pure inline SVG, no image assets, mirrors the icon.svg app icon.
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

      <circle cx="50" cy="38" r="26" fill="url(#pbi-glow)" />

      <g strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M 44 34 C 40 24, 34 20, 30 14" stroke="#1B998B" strokeWidth="2" />
        <path d="M 56 32 C 60 22, 58 16, 62 8" stroke="#C81D6B" strokeWidth="2" />
        <path d="M 50 28 C 50 18, 46 12, 48 4" stroke="#6A4C93" strokeWidth="2" />
      </g>

      <polygon points="34,50 74,50 70,20 38,20" fill="#1c1712" stroke="url(#pbi-gold)" strokeWidth="1.6" />
      <line x1="38" y1="30" x2="70" y2="30" stroke="url(#pbi-gold)" strokeWidth="1" opacity="0.6" />
      <circle cx="54" cy="35" r="2.6" fill="url(#pbi-gold)" />

      <polygon points="30,50 78,50 72,57 36,57" fill="url(#pbi-gold)" />
      <polygon points="36,57 72,57 72,54 36,54" fill="#0a0a0a" />

      <rect x="26" y="57" width="48" height="27" rx="3" fill="#1c1712" stroke="url(#pbi-gold)" strokeWidth="1.6" />
      <line x1="26" y1="67" x2="74" y2="67" stroke="url(#pbi-gold)" strokeWidth="1" opacity="0.5" />
      <line x1="26" y1="76" x2="74" y2="76" stroke="url(#pbi-gold)" strokeWidth="1" opacity="0.5" />

      <rect x="47" y="60" width="6" height="10" rx="1.5" fill="url(#pbi-gold)" />
    </svg>
  );
}
