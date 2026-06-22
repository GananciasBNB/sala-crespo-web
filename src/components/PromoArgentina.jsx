import { useScrollRevealParent } from '../hooks/useScrollReveal'
import './PromoArgentina.css'

// Anuncio de la promo "Viví Argentina en Sala" en la home pública.
// Diseño propio (NO clon del bloque Prode). Los montos en $ van acá (material
// de venta); solo el anuncio hablado del cantante va sin pesos. Tope por gol /
// por partido NO se menciona — eso vive en las bases. Tickets = Free Play.
export default function PromoArgentina() {
  const ref = useScrollRevealParent()
  return (
    <section id="vivi-argentina" className="vivi" ref={ref}>
      <div className="container">
        <div className="reveal vivi__card">
          {/* Video propio de fondo (Flow) — overlay oscuro encima para legibilidad */}
          <div className="vivi__bg" aria-hidden="true">
            <video autoPlay loop muted playsInline preload="metadata">
              <source src="/vivi-argentina.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="vivi__inner">
            <span className="eyebrow">Mundial 2026 · Cuando juega Argentina</span>
            <h2 className="section-title vivi__title">Viví Argentina <em>en Sala</em></h2>
            <div className="vivi__rule" />

            <p className="vivi__desc">
              Cada partido de la Selección se vive en pantalla gigante, con la hinchada de Crespo.
              Y mientras alentás, <strong>jugás</strong>: por cada gol de Argentina te llevás
              <strong> tickets para las máquinas</strong>.
            </p>

            <p className="vivi__how">
              📍 Participás con solo <strong>estar en la sala durante los partidos de Argentina</strong>.
            </p>

            <div className="vivi__tickets">
              <div className="vivi__ticket">
                <span className="vivi__ticket-ico" aria-hidden="true">⚽</span>
                <span className="vivi__ticket-amt">$2.500</span>
                <span className="vivi__ticket-txt">en tickets por cada <strong>gol de Argentina</strong></span>
              </div>
              <div className="vivi__ticket vivi__ticket--blue">
                <span className="vivi__ticket-ico" aria-hidden="true">🎉</span>
                <span className="vivi__ticket-amt">$5.000</span>
                <span className="vivi__ticket-txt">de bono si <strong>llegás a la sala en la hora siguiente</strong> al partido</span>
              </div>
            </div>

            <p className="vivi__fine">
              🎟️ Tickets de juego (Free Play) para las máquinas. Te los entregamos en el momento
              con tu DNI. Para mayores de 18.
            </p>

            <a href="/legal/08-bases-promo-argentina.html" target="_blank" rel="noopener" className="vivi__baseslink">
              Bases y condiciones
            </a>
          </div>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
