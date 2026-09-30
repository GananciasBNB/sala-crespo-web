// Illustrations for the kiosk home cards (hand-made SVG + two small media files
// in /kiosk-art). Pure decoration: aria-hidden, no interaction.

function GoldDefs({ id }) {
  return (
    <defs>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFF1B8" />
        <stop offset=".45" stopColor="#F0D275" />
        <stop offset="1" stopColor="#A87C2A" />
      </linearGradient>
      <linearGradient id={`${id}-goldH`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#A87C2A" />
        <stop offset=".5" stopColor="#FBE7A1" />
        <stop offset="1" stopColor="#A87C2A" />
      </linearGradient>
    </defs>
  )
}

// Slot mini screen: real capture of Fortuna Dorada's reels
export function ArtFortuna() {
  return (
    <div className="kiosk-art kiosk-art--screen" aria-hidden="true">
      <img src="/kiosk-art/fortuna-mini.webp" alt="" draggable="false" />
      <span className="kiosk-art__shine" />
    </div>
  )
}

// Tournament: trophy between two laurel branches
export function ArtTorneo() {
  const g = 'kt'
  // points along the branch (left side); the right side is mirrored
  const pts = [[40, 94, -8], [35, 83, -4], [31, 71, 0], [29, 59, 4], [29, 47, 8], [31, 36, 12]]
  const leaf = 'M0 0 Q5 -7 0 -16 Q-5 -7 0 0 Z'
  const leaves = (side) => pts.flatMap(([x, y, tilt], i) => {
    const mx = side === 'l' ? x : 160 - x
    const k = side === 'l' ? 1 : -1
    const fill = `url(#${g}-gold)`
    return [
      <path key={side + 'o' + i} d={leaf} fill={fill} transform={`translate(${mx} ${y}) rotate(${k * (-62 + tilt)})`} />,
      <path key={side + 'i' + i} d={leaf} fill={fill} opacity=".85" transform={`translate(${mx} ${y}) rotate(${k * (14 + tilt)}) scale(.8)`} />,
    ]
  })
  return (
    <svg className="kiosk-art" viewBox="0 0 160 110" aria-hidden="true">
      <GoldDefs id={g} />
      <path d="M44 100 Q26 72 32 30" fill="none" stroke="#A87C2A" strokeWidth="2" />
      <path d="M116 100 Q134 72 128 30" fill="none" stroke="#A87C2A" strokeWidth="2" />
      {leaves('l')}{leaves('r')}
      {/* handles */}
      <path d="M58 22 H46 Q40 22 40 30 Q40 46 62 52" fill="none" stroke={`url(#${g}-gold)`} strokeWidth="5" strokeLinecap="round" />
      <path d="M102 22 H114 Q120 22 120 30 Q120 46 98 52" fill="none" stroke={`url(#${g}-gold)`} strokeWidth="5" strokeLinecap="round" />
      {/* cup */}
      <path d="M52 14 H108 V26 Q108 58 80 64 Q52 58 52 26 Z" fill={`url(#${g}-gold)`} stroke="#7A5716" strokeWidth="1.2" />
      <path d="M60 20 Q60 48 76 56" fill="none" stroke="#FFF7D6" strokeWidth="3" strokeLinecap="round" opacity=".55" />
      <path d="M80 26 l3.5 7.2 7.9 1.1 -5.7 5.6 1.4 7.9 -7.1-3.7 -7.1 3.7 1.4-7.9 -5.7-5.6 7.9-1.1z" fill="#8E1B2B" opacity=".85" />
      {/* stem and base */}
      <rect x="75" y="63" width="10" height="14" fill={`url(#${g}-goldH)`} />
      <path d="M64 77 H96 L100 88 H60 Z" fill={`url(#${g}-gold)`} stroke="#7A5716" strokeWidth="1" />
      <rect x="54" y="88" width="52" height="10" rx="2" fill="#5B0F1C" stroke={`url(#${g}-goldH)`} strokeWidth="2" />
      <rect x="70" y="91" width="20" height="4" rx="1" fill={`url(#${g}-goldH)`} />
    </svg>
  )
}

// Redemptions: golden ticket, a cocktail and a burger
export function ArtCanjes() {
  const g = 'kc'
  return (
    <svg className="kiosk-art" viewBox="0 0 220 110" aria-hidden="true">
      <GoldDefs id={g} />
      {/* golden ticket */}
      <g transform="rotate(-14 52 62)">
        <path d="M14 40 H90 V52 A8 8 0 0 0 90 68 V80 H14 V68 A8 8 0 0 0 14 52 Z"
          fill={`url(#${g}-gold)`} stroke="#7A5716" strokeWidth="1.2" />
        <line x1="70" y1="43" x2="70" y2="77" stroke="#7A5716" strokeWidth="1.4" strokeDasharray="3 3" />
        <rect x="22" y="48" width="42" height="24" rx="3" fill="none" stroke="#7A5716" strokeWidth="1.2" />
        <path d="M43 52 l2.6 5.3 5.8.8 -4.2 4.1 1 5.8 -5.2-2.7 -5.2 2.7 1-5.8 -4.2-4.1 5.8-.8z" fill="#8E1B2B" />
        <circle cx="80" cy="60" r="3" fill="#8E1B2B" />
      </g>
      {/* cocktail */}
      <g>
        <path d="M92 26 H136 L114 56 Z" fill="#8E1B2B" opacity=".9" />
        <path d="M88 22 H140 L114 58 Z" fill="none" stroke={`url(#${g}-gold)`} strokeWidth="3" strokeLinejoin="round" />
        <rect x="112.2" y="56" width="3.6" height="33" fill={`url(#${g}-goldH)`} />
        <ellipse cx="114" cy="90" rx="15" ry="3.5" fill={`url(#${g}-goldH)`} />
        <line x1="104" y1="14" x2="124" y2="44" stroke="#FBE7A1" strokeWidth="1.6" />
        <circle cx="120" cy="38" r="4" fill="#6FAE4E" stroke="#3E6E2A" strokeWidth="1" />
        <circle cx="137" cy="22" r="7" fill="none" stroke="#F0D275" strokeWidth="2.5" />
      </g>
      {/* burger */}
      <g>
        <path d="M158 56 Q158 30 184 30 Q210 30 210 56 Z" fill={`url(#${g}-gold)`} stroke="#7A5716" strokeWidth="1.2" />
        {[[170, 40], [182, 36], [194, 41], [188, 47], [176, 48]].map(([x, y]) =>
          <ellipse key={x + '-' + y} cx={x} cy={y} rx="2" ry="1.1" fill="#FFF7D6" />)}
        <path d="M155 58 q5 6 10 0 q5 6 10 0 q5 6 10 0 q5 6 10 0 q5 6 10 0 q5 6 8 0" fill="none" stroke="#6FAE4E" strokeWidth="4" strokeLinecap="round" />
        <rect x="157" y="62" width="54" height="10" rx="5" fill="#6B2A16" />
        <path d="M157 67 H211" stroke="#F0B43C" strokeWidth="3" opacity=".9" />
        <path d="M158 76 H210 Q210 86 200 86 H168 Q158 86 158 76 Z" fill={`url(#${g}-gold)`} stroke="#7A5716" strokeWidth="1.2" />
      </g>
    </svg>
  )
}

// Menu: the dancing beer + pizza mascots (tiny muted loop)
export function ArtCarta() {
  return (
    <div className="kiosk-art kiosk-art--screen kiosk-art--video" aria-hidden="true">
      <video src="/kiosk-art/carta-mini.mp4" autoPlay muted loop playsInline preload="auto" />
    </div>
  )
}
