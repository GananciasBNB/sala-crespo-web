import { useScrollRevealParent } from '../hooks/useScrollReveal'
import './PromoArgentina.css'

// Anuncio del espacio de fútbol del primer piso en la home pública.
// Antes era la promo "Viví Argentina en Sala" (Mundial 2026). Terminado el
// Mundial, el bloque pasa a ser permanente: en el mismo sector se pueden ver
// los partidos del equipo favorito de cada uno. Conserva las clases .vivi__*.
export default function PromoArgentina() {
  const ref = useScrollRevealParent()
  return (
    <section id="futbol-en-sala" className="vivi" ref={ref}>
      <div className="container">
        <div className="reveal vivi__card">
          {/* Video propio de fondo (Flow) — overlay oscuro encima para legibilidad */}
          <div className="vivi__bg" aria-hidden="true">
            <video autoPlay loop muted playsInline preload="metadata">
              <source src="/vivi-argentina.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="vivi__inner">
            <span className="eyebrow">Nuestro espacio del primer piso</span>
            <h2 className="section-title vivi__title">El fútbol se vive <em>en Sala</em></h2>
            <div className="vivi__rule" />

            <p className="vivi__desc">
              En nuestro <strong>espacio del primer piso</strong>, en <strong>pantalla grande</strong> y
              con el mejor ambiente, podés ver los partidos de <strong>tu equipo favorito</strong>.
              El mismo sector donde vivimos el Mundial, ahora todo el año.
            </p>

            <p className="vivi__how">
              Vení a disfrutar el fútbol como se debe — con la hinchada de Crespo.
            </p>
          </div>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
