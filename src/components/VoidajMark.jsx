// ── Voidaj logo ───────────────────────────────────────────────────────
// The wordmark: VOIDAJ spelled out in wide, spaced capitals, deep navy with
// the A in electric blue. `size` is the cap height in px. `light` is the
// white version for dark grounds (the ID card, the welcome hero).
export function VoidajMark({ size = 20, light = false, className = '' }) {
  return (
    <span className={`voidaj-logo ${light ? 'light' : ''} ${className}`} style={{ fontSize: size }} role="img" aria-label="VOIDAJ">
      <span aria-hidden="true">VOID</span><span className="voidaj-logo-a" aria-hidden="true">A</span><span aria-hidden="true">J</span>
    </span>
  )
}

// The VJ monogram from Nuel's logo file: a V whose right arm runs into a
// squared J, split by a hairline. Traced at its original 1254px scale.
// It draws in currentColor, so it is white on dark and navy on light.
// public/voidaj-logo.svg is the same shape, used as the browser-tab icon.
export const VJ_PATH = 'M248 430H457L636 708L848 428H1004V740C1004 800 955 852 885 852H590L665 763H830C858 763 880 741 880 713V458L576 848Z'

export function VjMark({ size = 28, className = '', title = 'VOIDAJ' }) {
  return (
    <svg className={`vj-mark ${className}`} viewBox="230 410 794 462" width={size * 1.72} height={size} role="img" aria-label={title}>
      <path d={VJ_PATH} fill="currentColor" />
    </svg>
  )
}

// Mark and wordmark side by side — the header lockup. Nuel: "keep
// [VOIDAJ], just add the logo".
export function VoidajLockup({ size = 19, light = false, className = '' }) {
  return (
    <span className={`voidaj-lockup ${light ? 'light' : ''} ${className}`}>
      <span className="voidaj-lockup-tile"><VjMark size={Math.round(size * 0.62)} title="" /></span>
      <VoidajMark size={size} light={light} />
    </span>
  )
}
