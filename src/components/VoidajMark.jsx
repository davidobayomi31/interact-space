// ── Voidaj mark ───────────────────────────────────────────────────────
// One continuous stroke: down the V's left arm, up the right arm past cap
// height, then the bar runs right across where the rest of the word sits
// and drops into the j that ends it.
// Drawn as a single path so it stays one gesture at any size.
export function VoidajMark({ size = 24, className = '' }) {
  return (
    <svg
      viewBox="0 0 100 100" width={size} height={size}
      fill="none" stroke="currentColor" strokeWidth="11"
      strokeLinecap="round" strokeLinejoin="round"
      className={`icon ${className}`} aria-hidden="true"
    >
      <path d="M14 38 L36 76 L58 20 H82 V70 Q82 86 66 86" />
    </svg>
  )
}
