// Friendly tooth illustration (inline SVG, no external assets)
export default function ToothArt() {
  return (
    <svg
      viewBox="0 0 240 260"
      className="w-full max-w-[240px] mx-auto"
      role="img"
      aria-label="Tooth illustration"
    >
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e6f4f2" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="130" r="118" fill="#d7efec" />
      <path
        d="M120 34c-30 0-48 14-62 14S30 42 24 60c-9 27 4 60 14 92 7 22 12 46 24 62 7 9 18 8 22-4 5-14 6-34 16-34s11 20 16 34c4 12 15 13 22 4 12-16 17-40 24-62 10-32 23-65 14-92-6-18-20-12-34-12s-32-14-62-14z"
        fill="url(#tg)"
        stroke="#0f766e"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M92 82c8-6 22-8 34-4"
        stroke="#5eead4"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M150 96c6 16 6 34 0 52"
        stroke="#99f6e4"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}
