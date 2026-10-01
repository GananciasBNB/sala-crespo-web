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

// Small icons for the redemption tabs (inherit the tab text color)
export function IconTicket() {
  return (
    <svg className="kiosk__tab-ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M15 8v8" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 2" />
    </svg>
  )
}
export function IconCopa() {
  return (
    <svg className="kiosk__tab-ico" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h14l-7 8z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 12v7M8 20h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Daily visit: gold coin with "+50" and a few sparkles
export function ArtVisita() {
  const g = 'kv'
  return (
    <svg className="kiosk-art" viewBox="0 0 160 110" aria-hidden="true">
      <GoldDefs id={g} />
      <ellipse cx="80" cy="100" rx="34" ry="5" fill="#000" opacity=".35" />
      <circle cx="80" cy="54" r="42" fill={`url(#${g}-gold)`} stroke="#7A5716" strokeWidth="1.5" />
      <circle cx="80" cy="54" r="34" fill="none" stroke="#7A5716" strokeWidth="1.4" strokeDasharray="2 3" opacity=".8" />
      <circle cx="80" cy="54" r="30" fill="#8E1B2B" />
      <text x="80" y="64" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="28" fill="#FBE7A1">+50</text>
      <path d="M58 26 Q70 18 86 17" fill="none" stroke="#FFF7D6" strokeWidth="3" strokeLinecap="round" opacity=".6" />
      {[[132, 22, 7], [26, 34, 5], [138, 80, 5]].map(([x, y, r]) => (
        <path key={x} d={`M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z`} fill="#FBE7A1" />
      ))}
    </svg>
  )
}

// Monthly raffle: glass ballot box full of handwritten coupons
export function ArtSorteo() {
  const g = 'ks'
  // coupons inside: [x, y, rotation, gold?]
  const cupones = [
    [40, 80, -14, 0], [62, 84, 9, 1], [86, 79, -5, 0], [106, 83, 12, 1],
    [50, 66, 16, 1], [74, 68, -18, 0], [98, 65, 7, 0],
    [60, 53, -8, 0], [86, 52, 20, 1],
  ]
  return (
    <svg className="kiosk-art" viewBox="0 0 160 110" aria-hidden="true">
      <GoldDefs id={g} />
      <ellipse cx="80" cy="104" rx="50" ry="5" fill="#000" opacity=".35" />
      {/* coupons with scribbled names */}
      {cupones.map(([x, y, r, oro], i) => (
        <g key={i} transform={`rotate(${r} ${x + 12} ${y + 8})`}>
          <rect x={x} y={y} width="24" height="16" rx="1.5" fill={oro ? '#F0D275' : '#FFF7D6'} stroke="#A87C2A" strokeWidth=".8" />
          <path d={`M${x + 4} ${y + 6} q2 -2 4 0 t4 0 t4 0 t3 0`} fill="none" stroke="#5B0F1C" strokeWidth=".9" strokeLinecap="round" opacity=".75" />
          <path d={`M${x + 4} ${y + 11} q2 -1.6 4 0 t4 0 t3 0`} fill="none" stroke="#5B0F1C" strokeWidth=".8" strokeLinecap="round" opacity=".55" />
        </g>
      ))}
      {/* glass box */}
      <rect x="30" y="34" width="100" height="68" rx="4" fill="rgba(255,240,200,.08)" stroke={`url(#${g}-goldH)`} strokeWidth="2.5" />
      <path d="M38 40 L46 40 L42 96 L36 96 Z" fill="#fff" opacity=".13" />
      <path d="M118 40 L122 40 L121 70 L117 70 Z" fill="#fff" opacity=".08" />
      {/* lid with slot */}
      <rect x="26" y="27" width="108" height="10" rx="2" fill={`url(#${g}-gold)`} stroke="#7A5716" strokeWidth="1" />
      <rect x="62" y="30" width="36" height="4" rx="2" fill="#1a0b05" />
      <rect x="30" y="98" width="100" height="6" rx="2" fill={`url(#${g}-goldH)`} />
    </svg>
  )
}
