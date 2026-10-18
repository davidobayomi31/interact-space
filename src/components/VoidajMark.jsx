// ── Voidaj logo ───────────────────────────────────────────────────────
// The badge: a black circle holding the white VJ mark, with VOIDAJ spelled
// out beneath it. A bold, slanted left arm meets a thin right arm at the
// point of the V, and the right arm runs into the J that closes it.
// Below ~44px the lettering can't be read, so small logos drop it and let
// the mark fill the circle. public/voidaj-logo.svg is the same drawing,
// used as the browser-tab icon.
export function VoidajMark({ size = 24, wordmark = size >= 44, className = '' }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={`voidaj-logo ${className}`} role="img" aria-label="Voidaj">
      <circle cx="50" cy="50" r="50" fill="#0b0b0b" />
      <g fill="#ffffff" transform={wordmark ? undefined : 'translate(-12.4 3.2) scale(1.3)'}>
        {/* bold left arm of the V */}
        <path d="M23 22 H38.5 L52 41.5 L45.5 50 Z" />
        {/* thin right arm, rising into the J */}
        <path d="M44 50 L63 22 H66.5 L48 50 Z" />
        {/* the J: down from the top and curling back left under the V */}
        <path d="M65 22 H73.5 V39.5 Q73.5 50 63 50 H47.5 L53.2 43 H62.5 Q65 43 65 40 Z" />
      </g>
      {wordmark && (
        <text x="50" y="70" fill="#ffffff" textAnchor="middle" fontSize="8.4" letterSpacing="4.2"
          fontFamily="'Helvetica Neue', Arial, sans-serif" fontWeight="300">VOIDAJ</text>
      )}
    </svg>
  )
}
