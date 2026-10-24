// ── Voidaj logo ───────────────────────────────────────────────────────
// The wordmark: VOIDAJ spelled out in wide, spaced capitals, deep navy with
// the A in electric blue. `size` is the cap height in px. `light` is the
// white version for dark grounds (the ID card, the welcome hero).
// public/voidaj-logo.svg is the same lettering, used as the browser-tab icon.
export function VoidajMark({ size = 20, light = false, className = '' }) {
  return (
    <span className={`voidaj-logo ${light ? 'light' : ''} ${className}`} style={{ fontSize: size }} role="img" aria-label="VOIDAJ">
      <span aria-hidden="true">VOID</span><span className="voidaj-logo-a" aria-hidden="true">A</span><span aria-hidden="true">J</span>
    </span>
  )
}
