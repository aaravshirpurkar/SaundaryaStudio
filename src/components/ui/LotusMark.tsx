export function LotusMark({ size = 26, bright = false }: { size?: number; bright?: boolean }) {
  const stops = bright
    ? ["#FE654F", "#FED18C", "#5BA7D9", "#2BB3A3"]
    : ["#FE654F", "#E09A3C", "#2E7CB8", "#1E9E8E"];
  const id = bright ? "lotus-bright" : "lotus-studio";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id={`${id}-stroke`} x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset="0.45" stopColor={stops[1]} />
          <stop offset="0.78" stopColor={stops[2]} />
          <stop offset="1" stopColor={stops[3]} />
        </linearGradient>
        <pattern id={`${id}-dots`} width="2.1" height="2.1" patternUnits="userSpaceOnUse">
          <circle cx="1.05" cy="1.05" r="0.5" fill="#FE654F" opacity={bright ? 0.5 : 0.4} />
        </pattern>
      </defs>
      <g stroke={`url(#${id}-stroke)`} strokeWidth="1.5" strokeLinejoin="round" fill={`url(#${id}-dots)`}>
        <path d="M16 26 C13 20 13 10 16 3.5 C19 10 19 20 16 26 Z" />
        <path d="M16 26 C12.4 21.5 9.4 13.5 10.2 6.5 C15.4 10.5 17.6 19 16 26 Z" />
        <path d="M16 26 C19.6 21.5 22.6 13.5 21.8 6.5 C16.6 10.5 14.4 19 16 26 Z" />
        <path d="M16 26 C11 23.5 5.4 18.5 3.8 12.5 C10.4 13.5 15 20 16 26 Z" />
        <path d="M16 26 C21 23.5 26.6 18.5 28.2 12.5 C21.6 13.5 17 20 16 26 Z" />
      </g>
      <circle cx="16" cy="26" r="1.4" fill="#FE654F" />
    </svg>
  );
}