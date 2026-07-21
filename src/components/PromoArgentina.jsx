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
            <span className="eyebrow">⚽ Fútbol en pantalla gigante</span>
            <h2 className="section-title vivi__title">Tu equipo se vive <em>en Sala</em></h2>
            <div className="vivi__rule" />

            <p className="vivi__desc">
              Subí al <strong>primer piso</strong> y viví los partidos de <strong>tu equipo favorito</strong> en
              <strong> pantalla gigante</strong> y con <strong>nuestra gastronomía</strong>. Liga Argentina, España,
              Inglaterra y <strong>muchas más</strong> — el mismo sector donde vivimos el Mundial, ahora <strong>todo el año</strong>.
            </p>

            <div className="vivi__chips">
              <span className="vivi__chip">📺 Pantalla gigante</span>
              <span className="vivi__chip">⚽ Liga Argentina, España, Inglaterra y más</span>
              <span className="vivi__chip">🍽️ Nuestra gastronomía</span>
              <span className="vivi__chip">🔥 El mejor ambiente</span>
            </div>

            <p className="vivi__how">
              Te esperamos arriba — el fútbol como tiene que ser.
            </p>
          </div>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
