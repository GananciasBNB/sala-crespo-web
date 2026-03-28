import './ProdeBanner.css'

// Selección de selecciones del Mundial 2026
const FLAGS = [
  'ar','br','fr','de','es','pt','uy','mx','us','ma',
  'jp','nl','hr','ch','sn','ng','gb-eng','co','ec','pe',
]

export default function ProdeBanner() {
  const all = [...FLAGS, ...FLAGS]

  return (
    <div className="prode-bar">
      {/* Fila de banderas animada */}
      <div className="prode-bar__ticker" aria-hidden="true">
        <div className="prode-bar__ticker-track">
          {[...all, ...all].map((iso, i) => (
            <img
              key={i}
              src={`https://flagcdn.com/w20/${iso}.png`}
              alt=""
              className="prode-bar__flag"
              loading="eager"
            />
          ))}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="prode-bar__content">
        <div className="prode-bar__badge">NUEVO</div>
        <p className="prode-bar__text">
          <strong>Prode Mundial 2026 · Sala Crespo</strong>
          <span className="prode-bar__sep">—</span>
          Pronosticá los 104 partidos y ganá fabulosos premios
        </p>
        <a href="/prode" className="prode-bar__cta">
          Participar gratis →
        </a>
      </div>
    </div>
  )
}
