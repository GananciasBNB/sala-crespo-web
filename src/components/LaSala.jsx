import { useScrollRevealParent } from '../hooks/useScrollReveal'
import './LaSala.css'

const GALLERY_PHOTOS = [
  { src: '/sala/saladesdearriba.jpg',  alt: 'Sala de Juegos Crespo — vista aérea' },
  { src: '/sala/gonxifacai.png',       alt: 'Fiesta en la Sala Crespo' },
  { src: '/sala/bar-luces.jpg',        alt: 'Bar con luces' },
  { src: '/sala/interior-bn.jpg',      alt: 'Interior de la sala' },
  { src: '/sala/IMG_3271.jpg',         alt: 'Interior de la sala' },
  { src: '/sala/IMG_3347.jpg',         alt: 'Noche de torneo' },
  { src: '/sala/IMG_3358.jpg',         alt: 'Sala Crespo' },
  { src: '/sala/IMG_3360.jpg',         alt: 'Sala Crespo' },
]

const IconSlot = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="26" height="20" rx="3"/>
    <line x1="12" y1="7" x2="12" y2="27"/>
    <line x1="20" y1="7" x2="20" y2="27"/>
    <circle cx="7.5" cy="17" r="2.5"/>
    <circle cx="16" cy="17" r="2.5"/>
    <circle cx="24.5" cy="17" r="2.5"/>
    <rect x="11" y="3" width="10" height="5" rx="2"/>
  </svg>
)

const IconTrophy = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 4h12v10a6 6 0 01-12 0V4z"/>
    <path d="M10 9H6a3 3 0 003 3"/>
    <path d="M22 9h4a3 3 0 01-4 3"/>
    <line x1="16" y1="20" x2="16" y2="26"/>
    <rect x="10" y="26" width="12" height="3" rx="1.5"/>
  </svg>
)

const IconMic = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="11" y="3" width="10" height="14" rx="5"/>
    <path d="M6 16a10 10 0 0020 0"/>
    <line x1="16" y1="26" x2="16" y2="30"/>
    <line x1="11" y1="30" x2="21" y2="30"/>
  </svg>
)

const IconFood = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="3" x2="10" y2="11"/>
    <line x1="14" y1="3" x2="14" y2="11"/>
    <path d="M10 11a3 3 0 006 0"/>
    <line x1="13" y1="14" x2="13" y2="29"/>
    <line x1="22" y1="3" x2="22" y2="11"/>
    <path d="M22 11c0 3-3 4.5-3 4.5V29"/>
  </svg>
)

const IconCard = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="28" height="18" rx="3"/>
    <line x1="2" y1="13" x2="30" y2="13"/>
    <rect x="7" y="18" width="8" height="3" rx="1"/>
  </svg>
)

const IconPin = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 2a10 10 0 00-10 10c0 7.5 10 18 10 18s10-10.5 10-18A10 10 0 0016 2z"/>
    <circle cx="16" cy="12" r="4"/>
  </svg>
)

const FEATURES = [
  {
    Icon: IconSlot,
    acento: 'gold',
    title: '160 Máquinas',
    desc: 'Slots modernos y ruletas electrónicas de última generación. Siempre hay una máquina esperándote.',
  },
  {
    Icon: IconTrophy,
    acento: 'crimson',
    title: 'Ganá en Grande',
    desc: 'Premios progresivos que superan el millón de pesos. Torneos mensuales con $200.000 en juego. En nuestra sala, los premios son reales.',
  },
  {
    Icon: IconMic,
    acento: 'gold',
    title: 'Shows Mensuales',
    desc: 'Artistas de primer nivel cada mes. Queremos ser tu centro de entretenimiento preferido en la región.',
  },
  {
    Icon: IconFood,
    acento: 'gold',
    title: 'Carta Gastronómica',
    desc: 'Amplia carta a tu disposición: pizza, empanadas, cazuela de pollo, sandwiches, tragos y cositas dulces. Con cortesías para nuestros clientes.',
  },
  {
    Icon: IconCard,
    acento: 'gold',
    title: 'Todos los Pagos',
    desc: 'Aceptamos tarjeta de débito, crédito, transferencias bancarias y efectivo.',
  },
  {
    Icon: IconPin,
    acento: 'crimson',
    title: 'En el Centro',
    desc: 'San Martín 1053, Crespo. Abrimos todos los días desde las 15:00 hs.',
  },
]

export default function LaSala() {
  const ref = useScrollRevealParent()

  return (
    <section id="sala" className="sala" ref={ref}>
      <div className="container">
        <div className="reveal sala__header">
          <span className="eyebrow">La sala</span>
          <h2 className="section-title">El entretenimiento<br /><em>que Crespo merece</em></h2>
          <div className="gold-line" />
          <p className="sala__intro">
            Más que una sala de juegos. Un espacio donde cada visita tiene su propia historia.
            Shows en vivo, torneos millonarios, buena comida y la mejor atención.
          </p>
        </div>

        <div className="sala__grid">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`reveal reveal-d${i + 1} card sala__card`}>
              <div className={`sala__card-icon sala__card-icon--${f.acento}`}>
                <f.Icon />
              </div>
              <h3 className="sala__card-title">{f.title}</h3>
              <p className="sala__card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Galería de fotos — strip infinito */}
      <div className="sala__gallery" aria-hidden="true">
        <div className="sala__gallery-track">
          {[...GALLERY_PHOTOS, ...GALLERY_PHOTOS].map((p, i) => (
            <div key={i} className="sala__gallery-item">
              <img src={p.src} alt={p.alt} loading="lazy" />
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider" />
    </section>
  )
}
