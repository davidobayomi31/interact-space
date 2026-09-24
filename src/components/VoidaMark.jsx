// ── Voida mark ───────────────────────────────────────────────────────
// One continuous stroke: down the V's left arm, up the right arm past cap
// height, then the bar runs right across where the rest of the word sits.
// Drawn as a single path so it stays one gesture at any size.
export function VoidaMark({ size = 24, className = '' }) {
  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size}
      fill="none" stroke="currentColor" strokeWidth="11"
      strokeLinecap="round" strokeLinejoin="round"
      className={`icon ${className}`} aria-hidden="true"
    >
      <path d="M22 41 L44 75 L66 25 H78" />
    </svg>
  )
}
