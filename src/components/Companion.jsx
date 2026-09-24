// ── The Companion ────────────────────────────────────────────────────
// Flat, outlined chibi figure: afro, black sweatshirt with VOIDA across
// the chest, stone shorts, plain dark low-tops, carrying the Earth against his
// side. The globe between his body and his arm is the live, clickable
// globe, so the figure is drawn as two layers — the body BEHIND the globe
// and the carrying arm IN FRONT of it. Both ignore pointer events so the
// event pins stay clickable.
//
// Every layer shares one frame (FRAME below). Globe.jsx places the live
// globe inside that same frame using GLOBE_HELD / GLOBE_OPEN.

export const FRAME = { x: 40, y: 0, w: 340, h: 600 }
export const GLOBE_HELD = { cx: 190, cy: 354, r: 58 }   // in his arm
export const GLOBE_OPEN = { cx: 210, cy: 300, r: 150 }  // after he steps away

const INK = '#111111'
const SKIN = '#B97A4A'
const HAIR = '#141110'
const TEE = '#1A1A1A'
const SEAM = '#3D3D3D'
const STONE = '#D6D0C4'
const SHOE = '#2A2A2A'
const CHEEK = '#D98C6A'
const VIEWBOX = `${FRAME.x} ${FRAME.y} ${FRAME.w} ${FRAME.h}`

// VOIDA in capitals. As in the header logo, the V's right (inner) arm runs
// straight up into the bar that sits over O-I-D-A.
function Wordmark(props) {
  return (
    <g fill="none" stroke="#FFFFFF" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 30 L32 100 L54 10 H266" />
      <ellipse cx="90" cy="65" rx="22" ry="35" />
      <path d="M136 30 V100" />
      <path d="M160 30 V100 H174 Q206 100 206 65 Q206 30 174 30 Z" />
      <path d="M222 100 L244 30 L266 100 M231 76 H257" />
    </g>
  )
}

const layerProps = { viewBox: VIEWBOX, 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'xMidYMid meet' }

// Everything behind the globe.
export function CompanionBack({ className = '', style }) {
  return (
    <svg {...layerProps} className={`companion-layer ${className}`} style={style}>
      <g stroke={INK} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        {/* afro */}
        <g fill={HAIR}>
        <circle cx="163.1" cy="150.1" r="25" />
        <circle cx="148.2" cy="126.7" r="25" />
        <circle cx="143.0" cy="100.0" r="25" />
        <circle cx="148.2" cy="73.3" r="25" />
        <circle cx="163.1" cy="49.9" r="25" />
        <circle cx="186.0" cy="32.5" r="25" />
        <circle cx="214.1" cy="23.2" r="25" />
        <circle cx="243.9" cy="23.2" r="25" />
        <circle cx="272.0" cy="32.5" r="25" />
        <circle cx="294.9" cy="49.9" r="25" />
        <circle cx="309.8" cy="73.3" r="25" />
        <circle cx="315.0" cy="100.0" r="25" />
        <circle cx="309.8" cy="126.7" r="25" />
        <circle cx="294.9" cy="150.1" r="25" />
          <ellipse cx="229" cy="100" rx="86" ry="78" />
        </g>
        <ellipse cx="229" cy="100" rx="82" ry="74" fill={HAIR} stroke="none" />

        {/* neck, then the sweatshirt over it */}
        <path d="M212 220 V250 H246 V220 Z" fill={SKIN} />
        <path d="M150 268 Q154 248 196 242 Q229 256 262 242 Q304 248 308 268 L312 426 L146 426 Z" fill={TEE} />
        <path d="M198 245 Q229 262 260 245" fill="none" stroke={SEAM} strokeWidth="5" />
        <path d="M150 408 H308" fill="none" stroke={SEAM} strokeWidth="4" />
        <Wordmark transform="translate(191 259) scale(0.28)" />

        {/* his left arm, hanging relaxed */}
        <path d="M296 258 Q320 268 322 304 L324 402 L294 404 Z" fill={TEE} />
        <path d="M297 300 V398" fill="none" stroke={SEAM} strokeWidth="4" />
        <path d="M294 400 Q292 424 308 426 Q324 424 324 400 Z" fill={SKIN} />
        <path d="M303 410 h10" fill="none" strokeWidth="3.5" />

        {/* shorts, legs, plain dark low-tops */}
        <path d="M160 422 L302 422 L304 484 L236 484 L231 456 L226 484 L158 484 Z" fill={STONE} />
        <path d="M231 426 V448" fill="none" strokeWidth="4" />
        <path d="M184 482 H208 L206 540 H186 Z" fill={SKIN} />
        <path d="M254 482 H278 L276 540 H256 Z" fill={SKIN} />
        <path d="M178 562 Q172 538 196 536 Q218 536 218 554 L218 562 Q198 567 178 562 Z" fill={SHOE} />
        <path d="M284 562 Q290 538 266 536 Q244 536 244 554 L244 562 Q264 567 284 562 Z" fill={SHOE} />
        <path d="M181 555 H215 M281 555 H247" fill="none" stroke={STONE} strokeWidth="3" />

        {/* ears + studs */}
        <ellipse cx="168" cy="168" rx="11" ry="15" fill={SKIN} />
        <ellipse cx="290" cy="168" rx="11" ry="15" fill={SKIN} />
        <circle cx="166" cy="186" r="5" fill="#FFFFFF" strokeWidth="3" />
        <circle cx="292" cy="186" r="5" fill="#FFFFFF" strokeWidth="3" />

        {/* face: its curved top is the hairline */}
        <path d="M172 130 Q229 106 286 130 L286 174 Q286 226 229 230 Q172 226 172 174 Z" fill={SKIN} />
        <ellipse cx="210" cy="162" rx="7.5" ry="11" fill={INK} stroke="none" />
        <ellipse cx="248" cy="162" rx="7.5" ry="11" fill={INK} stroke="none" />
        <circle cx="207.6" cy="156.5" r="2.6" fill="#FFFFFF" stroke="none" />
        <circle cx="245.6" cy="156.5" r="2.6" fill="#FFFFFF" stroke="none" />
        <path d="M202 144 Q210 140 218 143 M240 143 Q248 140 256 144" fill="none" strokeWidth="3.5" />
        <ellipse cx="197" cy="186" rx="9" ry="5" fill={CHEEK} opacity="0.45" stroke="none" />
        <ellipse cx="261" cy="186" rx="9" ry="5" fill={CHEEK} opacity="0.45" stroke="none" />
        <path d="M224 181 Q229 188 234 181" fill="none" strokeWidth="4" />
        <path d="M213 197 Q229 209 245 197" fill="none" strokeWidth="4.5" />
      </g>
    </svg>
  )
}

// His right arm, wrapped round the globe — drawn over it.
export function CompanionFront({ className = '', style }) {
  return (
    <svg {...layerProps} className={`companion-layer ${className}`} style={style}>
      <g stroke={INK} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M158 274 Q136 298 134 340 Q132 382 168 400" fill="none" stroke={INK} strokeWidth="40" strokeLinecap="butt" />
        <path d="M158 274 Q136 298 134 340 Q132 382 168 400" fill="none" stroke={TEE} strokeWidth="29" strokeLinecap="butt" />
        <path d="M150 300 Q142 336 146 372" fill="none" stroke={SEAM} strokeWidth="4" />
        <path d="M164 386 Q182 372 208 380 Q220 390 212 404 Q198 414 176 410 Q160 402 164 386 Z" fill={SKIN} />
        <path d="M186 384 Q191 393 187 404 M199 382 Q204 392 200 405" fill="none" strokeWidth="3.5" />
      </g>
    </svg>
  )
}
