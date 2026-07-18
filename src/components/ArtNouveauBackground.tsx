export default function ArtNouveauBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 800 800"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="an-gold-teal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BF953F" />
          <stop offset="100%" stopColor="#1B998B" />
        </linearGradient>
        <linearGradient id="an-violet-ruby" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6A4C93" />
          <stop offset="100%" stopColor="#C81D6B" />
        </linearGradient>
        <linearGradient id="an-teal-azure" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0B6E4F" />
          <stop offset="100%" stopColor="#2E6F95" />
        </linearGradient>
        <filter id="an-blur-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="38" />
        </filter>
      </defs>

      <g filter="url(#an-blur-soft)" opacity="0.35">
        <circle cx="90" cy="120" r="180" fill="url(#an-gold-teal)" />
        <circle cx="720" cy="680" r="220" fill="url(#an-violet-ruby)" />
        <circle cx="700" cy="90" r="150" fill="url(#an-teal-azure)" />
      </g>

      <g fill="none" strokeWidth="2.5" opacity="0.4">
        <path
          d="M -40 640 C 140 560, 160 760, 340 700 S 560 520, 760 600"
          stroke="url(#an-gold-teal)"
        />
        <path
          d="M -20 160 C 160 260, 260 40, 440 140 S 700 260, 840 120"
          stroke="url(#an-violet-ruby)"
        />
        <path
          d="M 60 420 C 220 380, 240 520, 400 460 S 620 340, 780 440"
          stroke="url(#an-teal-azure)"
        />
      </g>
    </svg>
  );
}
