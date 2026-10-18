// The Companion's face: a friendly cartoon eagle. It stands in wherever the
// Companion itself is shown (the floating button, the drawer header, the
// onboarding chat), so the guide has a character rather than a generic icon.
const INK = '#111111'
const BODY = '#6B3E1F'
const WING = '#4E2C14'
const GOLD = '#F2B01E'

export function Eagle({ size = 24, className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64"
      className={`eagle ${className}`} aria-hidden="true" focusable="false"
    >
      <g stroke={INK} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        {/* wings, then body */}
        <path d="M14 40 Q4 44 6 56 Q14 54 20 48 Z" fill={WING} />
        <path d="M50 40 Q60 44 58 56 Q50 54 44 48 Z" fill={WING} />
        <ellipse cx="32" cy="47" rx="16" ry="14" fill={BODY} />
        {/* feet */}
        <path d="M25 60 l-2 3 M27 60 v3 M29 60 l2 3" fill="none" stroke={GOLD} strokeWidth="2.4" />
        <path d="M35 60 l-2 3 M37 60 v3 M39 60 l2 3" fill="none" stroke={GOLD} strokeWidth="2.4" />
        {/* white head with a ruffled crown */}
        <path d="M20 22 L18 14 L24 17 L26 9 L31 15 L35 8 L38 15 L44 10 L44 18 L48 16 L45 24 Z" fill="#FFFFFF" />
        <circle cx="32" cy="27" r="15" fill="#FFFFFF" />
        {/* eyes with a determined brow */}
        <circle cx="26" cy="25" r="4.4" fill="#FFFFFF" />
        <circle cx="38" cy="25" r="4.4" fill="#FFFFFF" />
        <circle cx="26.8" cy="25.6" r="2.3" fill={INK} stroke="none" />
        <circle cx="37.2" cy="25.6" r="2.3" fill={INK} stroke="none" />
        <circle cx="27.6" cy="24.7" r="0.8" fill="#FFFFFF" stroke="none" />
        <circle cx="38" cy="24.7" r="0.8" fill="#FFFFFF" stroke="none" />
        <path d="M20.5 19.5 L29 21.5 M43.5 19.5 L35 21.5" fill="none" strokeWidth="2.6" />
        {/* hooked beak */}
        <path d="M26 31 Q32 28 38 31 Q38.5 36 33.5 40.5 Q32 41.5 31.6 39.6 Q30.5 35 26 31 Z" fill={GOLD} />
        <path d="M28.5 33 Q32 34.5 35.5 33" fill="none" strokeWidth="1.6" />
      </g>
    </svg>
  )
}
