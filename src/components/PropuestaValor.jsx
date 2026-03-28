import { useScrollRevealParent } from '../hooks/useScrollReveal'
import './PropuestaValor.css'

const IconSlot = () => (
  <svg width="100" height="68" viewBox="0 0 100 68" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="slotBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2a1a08"/>
        <stop offset="100%" stopColor="#140d04"/>
      </linearGradient>
      <linearGradient id="slotGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f0d060"/>
        <stop offset="100%" stopColor="#C9A84C"/>
      </linearGradient>
    </defs>

    {/* ── SLOT MACHINE (izquierda) ── */}
    <rect x="2" y="10" width="48" height="42" rx="6" fill="url(#slotBody)" stroke="#C9A84C" strokeWidth="1.5"/>
    <rect x="7" y="15" width="38" height="26" rx="3" fill="#0a0604" stroke="#C9A84C" strokeWidth="1"/>
    <rect x="10" y="18" width="10" height="20" rx="2" fill="#1a0e04"/>
    <rect x="23" y="18" width="10" height="20" rx="2" fill="#1a0e04"/>
    <rect x="36" y="18" width="10" height="20" rx="2" fill="#1a0e04"/>
    <text x="15" y="31" textAnchor="middle" fill="url(#slotGold)" fontSize="12" fontWeight="bold" fontFamily="Georgia,serif">7</text>
    <text x="28" y="31" textAnchor="middle" fill="url(#slotGold)" fontSize="12" fontWeight="bold" fontFamily="Georgia,serif">7</text>
    <text x="41" y="31" textAnchor="middle" fill="url(#slotGold)" fontSize="12" fontWeight="bold" fontFamily="Georgia,serif">7</text>
    <line x1="7" y1="28" x2="45" y2="28" stroke="#C9A84C" strokeWidth="0.7" strokeDasharray="3,2" opacity="0.5"/>
    {/* Palanca */}
    <rect x="51" y="17" width="4" height="1.5" rx="0.75" fill="#C9A84C"/>
    <line x1="53" y1="18.5" x2="53" y2="36" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="53" cy="39" r="3.5" fill="#C33" stroke="#C9A84C" strokeWidth="1"/>
    {/* Base slot */}
    <rect x="5" y="52" width="42" height="4" rx="2" fill="#1a0e04" stroke="#C9A84C" strokeWidth="1.2"/>
    {/* Monedas */}
    <circle cx="14" cy="62" r="3.5" fill="url(#slotGold)" opacity="0.9"/>
    <circle cx="26" cy="64" r="3.5" fill="url(#slotGold)" opacity="0.65"/>
    <circle cx="38" cy="62" r="3.5" fill="url(#slotGold)" opacity="0.45"/>

    {/* ── RULETA (derecha) ── */}
    {/* Plato exterior */}
    <circle cx="80" cy="32" r="18" fill="#1a0e04" stroke="#C9A84C" strokeWidth="1.8"/>
    <circle cx="80" cy="32" r="14" fill="#0d0704" stroke="#C9A84C" strokeWidth="0.8"/>
    {/* Sectores alternos */}
    {[0,1,2,3,4,5,6,7].map(i => {
      const a1 = (i * 45 - 90) * Math.PI / 180
      const a2 = ((i + 1) * 45 - 90) * Math.PI / 180
      const r = 13.5
      const x1 = 80 + r * Math.cos(a1), y1 = 32 + r * Math.sin(a1)
      const x2 = 80 + r * Math.cos(a2), y2 = 32 + r * Math.sin(a2)
      return (
        <path
          key={i}
          d={`M80,32 L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
          fill={i % 2 === 0 ? '#C33' : '#1a1a1a'}
          opacity="0.85"
        />
      )
    })}
    {/* Líneas divisorias */}
    {[0,1,2,3,4,5,6,7].map(i => {
      const a = (i * 45 - 90) * Math.PI / 180
      return <line key={i} x1="80" y1="32" x2={80 + 14 * Math.cos(a)} y2={32 + 14 * Math.sin(a)} stroke="#C9A84C" strokeWidth="0.6" opacity="0.7"/>
    })}
    {/* Aro interior */}
    <circle cx="80" cy="32" r="5.5" fill="#1a0e04" stroke="#C9A84C" strokeWidth="1.2"/>
    <circle cx="80" cy="32" r="2.5" fill="url(#slotGold)"/>
    {/* Bola */}
    <circle cx="80" cy="19.5" r="2.2" fill="white" opacity="0.9"/>
    {/* Base ruleta */}
    <rect x="76" y="50" width="8" height="3" rx="1.5" fill="#1a0e04" stroke="#C9A84C" strokeWidth="1"/>
    <rect x="72" y="53" width="16" height="3" rx="1.5" fill="#1a0e04" stroke="#C9A84C" strokeWidth="1.2"/>
  </svg>
)

const IconTrofeo = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="trofeoGold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f0d060"/>
        <stop offset="100%" stopColor="#b8860b"/>
      </linearGradient>
      <linearGradient id="trofeoShine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fff9e0" stopOpacity="0.3"/>
        <stop offset="100%" stopColor="#C9A84C" stopOpacity="0"/>
      </linearGradient>
    </defs>
    {/* Copa */}
    <path d="M22 8 L50 8 L46 34 Q44 42 36 44 Q28 42 26 34 Z" fill="url(#trofeoGold)"/>
    <path d="M22 8 L50 8 L46 34 Q44 42 36 44 Q28 42 26 34 Z" fill="url(#trofeoShine)"/>
    {/* Asas laterales */}
    <path d="M22 10 Q10 14 11 24 Q12 32 22 34" stroke="url(#trofeoGold)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    <path d="M50 10 Q62 14 61 24 Q60 32 50 34" stroke="url(#trofeoGold)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    {/* Cuello */}
    <rect x="33" y="44" width="6" height="10" rx="1" fill="url(#trofeoGold)"/>
    {/* Base */}
    <rect x="24" y="54" width="24" height="5" rx="2.5" fill="url(#trofeoGold)"/>
    <rect x="20" y="58" width="32" height="4" rx="2" fill="#b8860b"/>
    {/* Brillo copa */}
    <ellipse cx="31" cy="20" rx="4" ry="8" fill="white" opacity="0.12" transform="rotate(-15,31,20)"/>
    {/* Estrella central */}
    <path d="M36 16 L37.2 20 L41.5 20 L38.1 22.5 L39.3 26.5 L36 24 L32.7 26.5 L33.9 22.5 L30.5 20 L34.8 20Z" fill="white" opacity="0.55"/>
    {/* Destellos */}
    <circle cx="14" cy="10" r="2.5" fill="#f0d060" opacity="0.7"/>
    <circle cx="58" cy="8" r="1.8" fill="#f0d060" opacity="0.5"/>
    <path d="M60 18 L61 20 L63 20 L61.5 21.5 L62 24 L60 22.5 L58 24 L58.5 21.5 L57 20 L59 20Z" fill="#f0d060" opacity="0.6"/>
    <path d="M9 26 L9.8 28.5 L12.5 28.5 L10.3 30 L11.1 32.5 L9 31 L6.9 32.5 L7.7 30 L5.5 28.5 L8.2 28.5Z" fill="#f0d060" opacity="0.4"/>
    {/* Monedas */}
    <circle cx="20" cy="68" r="3.5" fill="url(#trofeoGold)" opacity="0.8"/>
    <circle cx="36" cy="70" r="3.5" fill="url(#trofeoGold)" opacity="0.9"/>
    <circle cx="52" cy="68" r="3.5" fill="url(#trofeoGold)" opacity="0.7"/>
  </svg>
)

const IconMicrofono = () => (
  <svg width="80" height="68" viewBox="0 0 80 68" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="micGold2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f0d060"/>
        <stop offset="100%" stopColor="#C9A84C"/>
      </linearGradient>
      <linearGradient id="micBody2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2e1e0a"/>
        <stop offset="100%" stopColor="#1a0e04"/>
      </linearGradient>
      <linearGradient id="micChrome" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#888"/>
        <stop offset="40%" stopColor="#ddd"/>
        <stop offset="100%" stopColor="#999"/>
      </linearGradient>
    </defs>

    {/* ── MICRÓFONO VINTAGE DE PIE ── */}
    {/* Base pesada */}
    <ellipse cx="36" cy="64" rx="14" ry="3.5" fill="#1a0e04" stroke="url(#micGold2)" strokeWidth="1.5"/>
    {/* Pie vertical */}
    <rect x="34" y="42" width="4" height="22" rx="2" fill="url(#micChrome)"/>
    {/* Cuello ajustable */}
    <rect x="32" y="38" width="8" height="6" rx="2" fill="#555" stroke="url(#micGold2)" strokeWidth="1"/>
    {/* Cuerpo principal - cápsula */}
    <rect x="26" y="8" width="20" height="32" rx="10" fill="url(#micBody2)" stroke="url(#micGold2)" strokeWidth="2"/>
    {/* Grilla metálica */}
    <rect x="27.5" y="10" width="17" height="28" rx="9" fill="none" stroke="#C9A84C" strokeWidth="0.5" opacity="0.3"/>
    <line x1="27" y1="16" x2="45" y2="16" stroke="#C9A84C" strokeWidth="0.8" opacity="0.45"/>
    <line x1="26.5" y1="20" x2="45.5" y2="20" stroke="#C9A84C" strokeWidth="0.8" opacity="0.45"/>
    <line x1="26.5" y1="24" x2="45.5" y2="24" stroke="#C9A84C" strokeWidth="0.8" opacity="0.45"/>
    <line x1="26.5" y1="28" x2="45.5" y2="28" stroke="#C9A84C" strokeWidth="0.8" opacity="0.45"/>
    <line x1="27" y1="32" x2="45" y2="32" stroke="#C9A84C" strokeWidth="0.8" opacity="0.45"/>
    {/* Brillo lateral */}
    <ellipse cx="30" cy="20" rx="2" ry="8" fill="white" opacity="0.08" transform="rotate(-5,30,20)"/>
    {/* Logo/insignia central */}
    <circle cx="36" cy="24" r="5" fill="none" stroke="url(#micGold2)" strokeWidth="1.2" opacity="0.7"/>
    <path d="M36 21 L37 23.5 L39.5 23.5 L37.5 25 L38.3 27.5 L36 26 L33.7 27.5 L34.5 25 L32.5 23.5 L35 23.5Z" fill="url(#micGold2)" opacity="0.8"/>

    {/* ── NOTAS MUSICALES ── */}
    {/* Nota 1 */}
    <circle cx="55" cy="14" r="3" fill="url(#micGold2)" opacity="0.85"/>
    <line x1="58" y1="14" x2="58" y2="6" stroke="url(#micGold2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.85"/>
    <line x1="58" y1="6" x2="63" y2="8" stroke="url(#micGold2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.85"/>
    {/* Nota 2 */}
    <circle cx="62" cy="28" r="2.5" fill="url(#micGold2)" opacity="0.6"/>
    <line x1="64.5" y1="28" x2="64.5" y2="21" stroke="url(#micGold2)" strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
    {/* Nota 3 pequeña */}
    <circle cx="57" cy="40" r="2" fill="url(#micGold2)" opacity="0.4"/>
    <line x1="59" y1="40" x2="59" y2="34.5" stroke="url(#micGold2)" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>

    {/* Destello arriba */}
    <path d="M14 6 L15 9 L18 9 L15.5 11 L16.5 14 L14 12.5 L11.5 14 L12.5 11 L10 9 L13 9Z" fill="#f0d060" opacity="0.5"/>
  </svg>
)

const PILARES = [
  {
    numero: '160',
    titulo: 'Máquinas',
    desc: 'Slots y ruletas electrónicas de última generación. Siempre hay lugar para vos.',
    acento: 'gold',
    Icon: IconSlot,
  },
  {
    numero: '+$5M',
    titulo: 'En premios progresivos',
    desc: 'Los acumulados crecen con cada jugada. El próximo gran ganador podés ser vos.',
    acento: 'crimson',
    Icon: IconTrofeo,
  },
  {
    numero: <svg viewBox="0 0 48 24" width="52" height="26" fill="currentColor" style={{display:'inline-block',verticalAlign:'middle'}}><path d="M37 2C31.5 2 27.3 5.8 24 10.2 20.7 5.8 16.5 2 11 2 5 2 0 7 0 13s5 11 11 11c5.5 0 9.7-3.8 13-8.2C27.3 20.2 31.5 24 37 24c6 0 11-5 11-11S43 2 37 2zM11 20c-3.9 0-7-3.1-7-7s3.1-7 7-7c3.8 0 7 3.8 10.2 7C17.9 16.4 14.8 20 11 20zm26 0c-3.8 0-7-3.8-10.2-7C30.1 9.6 33.2 6 37 6c3.9 0 7 3.1 7 7s-3.1 7-7 7z"/></svg>,
    titulo: 'Shows todos los meses',
    desc: 'Artistas en vivo, torneos especiales y eventos únicos para nuestros clientes.',
    acento: 'gold',
    Icon: IconMicrofono,
  },
]

export default function PropuestaValor() {
  const ref = useScrollRevealParent()

  return (
    <section className="pv" ref={ref}>
      <div className="pv__bg-photo" />
      <div className="pv__overlay" />

      <div className="container pv__inner">
        <div className="reveal pv__label">
          <span className="eyebrow">Por qué elegirnos</span>
          <div className="gold-line" />
        </div>

        <div className="pv__grid">
          {PILARES.map((p, i) => (
            <div key={p.titulo} className={`reveal reveal-d${i + 1} pv__item`}>
              <div className="pv__icon">
                <p.Icon />
              </div>
              <div className={`pv__numero pv__numero--${p.acento}`}>
                {p.numero}
              </div>
              <div className="pv__texto">
                <h3 className="pv__titulo">{p.titulo}</h3>
                <p className="pv__desc">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider" />
    </section>
  )
}
