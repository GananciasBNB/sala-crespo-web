import { useScrollRevealParent } from '../hooks/useScrollReveal'
import './VeniALaSala.css'

// "Vení a verlo a la Sala" — anuncio del nuevo espacio en primer piso para
// ver los partidos del Mundial, con teaser de la carta de A&B y CTA al menú.
// Video: /public/mundial-cerveza.mp4 (cerveza vertida). Si falta, queda el
// fondo gradient como fallback warm.

const CARTA_HIGHLIGHTS = [
  'Pizza individual',
  'Papas con cheddar',
  'Cazuela de pollo',
  'Empanadas y sandwiches',
  'Tragos y bebidas',
  'Cositas dulces',
]

const CARTA_URL = 'https://cartamenusalacrespo.my.canva.site/?utm_source=ig&utm_medium=social&utm_content=link_in_bio'

export default function VeniALaSala() {
  const ref = useScrollRevealParent()

  return (
    <section id="veni-a-la-sala" className="veni" ref={ref}>
      <div className="container">
        <div className="reveal veni__head">
          <span className="eyebrow">★ Nuevo · Primer piso</span>
          <h2 className="section-title">Tu nuevo lugar para los <em>partidos</em></h2>
          <div className="gold-line center" />
          <p className="veni__intro">
            Abrimos un espacio exclusivo en el primer piso de la sala para vivir el Mundial.
            Ambiente, amigos y la carta completa a tu disposición.
          </p>
        </div>

        <div className="reveal veni__split">
          <div className="veni__video">
            <video autoPlay loop muted playsInline preload="metadata">
              <source src="/mundial-cerveza.mp4" type="video/mp4" />
            </video>
            <div className="veni__video-vignette" aria-hidden="true" />
          </div>

          <div className="veni__body">
            <span className="veni__eye">Carta completa de A&B</span>
            <h3 className="veni__title">Para acompañar <em>cada partido</em>.</h3>
            <p className="veni__desc">
              Pizza, empanadas, cazuela, papas con cheddar, tragos y dulces.
              Toda la carta de la sala disponible también en el primer piso.
            </p>

            <ul className="veni__features">
              {CARTA_HIGHLIGHTS.map(item => (
                <li key={item} className="veni__f">
                  <span className="veni__f-dot" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="veni__ctas">
              <a href={CARTA_URL} target="_blank" rel="noopener noreferrer" className="btn-gold">
                Ver la carta completa →
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
