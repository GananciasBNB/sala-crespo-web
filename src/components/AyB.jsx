import { useScrollRevealParent } from '../hooks/useScrollReveal'
import './AyB.css'

const IconPizza = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 28L16 4l12 24H4z"/>
    <circle cx="16" cy="15" r="2"/>
    <circle cx="11" cy="21" r="1.5"/>
    <circle cx="21" cy="21" r="1.5"/>
    <line x1="4" y1="28" x2="28" y2="28"/>
  </svg>
)

const IconFries = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="16" width="16" height="12" rx="2"/>
    <line x1="11" y1="16" x2="9" y2="6"/>
    <line x1="16" y1="16" x2="16" y2="5"/>
    <line x1="21" y1="16" x2="23" y2="6"/>
    <path d="M8 20h16"/>
  </svg>
)

const IconChicken = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 26c0-6 4-10 8-12"/>
    <path d="M22 14c2-2 4-5 3-8-3-1-6 1-8 3"/>
    <path d="M18 6c1-2 4-3 6-2"/>
    <ellipse cx="11" cy="26" rx="6" ry="3"/>
    <line x1="17" y1="23" x2="20" y2="27"/>
  </svg>
)

const IconEmpanada = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 18c0-7 5-13 12-13s12 6 12 13"/>
    <path d="M4 18h24"/>
    <path d="M4 18c2 4 6 6 12 6s10-2 12-6"/>
    <path d="M12 18c0-3 1-7 4-9"/>
    <path d="M20 18c0-3-1-7-4-9"/>
  </svg>
)

const IconDrink = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h16l-4 12a4 4 0 01-8 0L8 6z"/>
    <line x1="16" y1="18" x2="16" y2="26"/>
    <line x1="11" y1="26" x2="21" y2="26"/>
    <line x1="8" y1="10" x2="24" y2="10"/>
    <circle cx="22" cy="7" r="3" strokeWidth="1.2"/>
    <line x1="22" y1="4" x2="22" y2="3"/>
  </svg>
)

const IconSweet = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 6c5 0 10 4 10 10s-5 10-10 10S6 22 6 16 11 6 16 6z"/>
    <path d="M16 6c-2-3-6-3-7 0 0 3 3 4 7 4s7-1 7-4c-1-3-5-3-7 0z"/>
    <path d="M10 16c1 2 3 4 6 4s5-2 6-4"/>
    <line x1="16" y1="20" x2="16" y2="24"/>
  </svg>
)

const IconGift = () => (
  <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="13" width="24" height="15" rx="2"/>
    <rect x="2" y="8" width="28" height="6" rx="2"/>
    <line x1="16" y1="8" x2="16" y2="28"/>
    <path d="M16 8c0 0-4-6-7-4s0 4 7 4z"/>
    <path d="M16 8c0 0 4-6 7-4s0 4-7 4z"/>
  </svg>
)

const MENU_ITEMS = [
  { Icon: IconPizza,    name: 'Pizza Individual',      desc: 'Crocante y deliciosa. Todos los días.' },
  { Icon: IconFries,    name: 'Papas c/ Cheddar',      desc: 'Papas fritas bañadas en salsa cheddar.' },
  { Icon: IconChicken,  name: 'Cazuela de Pollo',      desc: 'A la crema con papas fritas. Nuestro hit.' },
  { Icon: IconEmpanada, name: 'Empanadas y Sandwiches', desc: 'Variedad para picar mientras jugás.' },
  { Icon: IconDrink,    name: 'Tragos y Bebidas',      desc: 'Con y sin alcohol. Para todo gusto.' },
  { Icon: IconSweet,    name: 'Cositas Dulces',        desc: 'El toque final perfecto.' },
]

export default function AyB() {
  const ref = useScrollRevealParent()

  return (
    <section id="ayb" className="ayb" ref={ref}>
      <div className="container">
        <div className="ayb__inner">
          <div className="reveal ayb__text-col">
            <span className="eyebrow">Alimentos y Bebidas</span>
            <h2 className="section-title">Comer bien<br /><em>mientras jugás</em></h2>
            <div className="gold-line" />
            <p className="ayb__desc">
              Amplia carta gastronómica a tu disposición. Pizza, empanadas,
              cazuela de pollo, sandwiches, tragos y cositas dulces.
              Buena comida cada vez que venís.
            </p>
            <div className="ayb__highlight">
              <div className="ayb__highlight-icon"><IconGift /></div>
              <p>
                <strong>Cortesías para nuestros clientes:</strong> en torneos especiales,
                la comida y las bebidas corren por nuestra cuenta para todos los participantes.
              </p>
            </div>
            <a
              href="https://cartamenusalacrespo.my.canva.site/?utm_source=ig&utm_medium=social&utm_content=link_in_bio"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold ayb__menu-btn"
            >
              Ver nuestra carta completa →
            </a>
          </div>

          <div className="ayb__menu-col">
            <div className="ayb__menu">
              {MENU_ITEMS.map((item, i) => (
                <div key={item.name} className={`reveal reveal-d${i + 1} ayb__item`}>
                  <div className="ayb__item-icon"><item.Icon /></div>
                  <div>
                    <h4 className="ayb__item-name">{item.name}</h4>
                    <p className="ayb__item-desc">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
