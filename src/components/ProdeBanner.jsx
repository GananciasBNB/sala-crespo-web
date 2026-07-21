import { useState, useRef, useLayoutEffect } from 'react'
import MundialCountdown from './MundialCountdown'
import { useLiveMatches } from '../hooks/useLiveMatches'
import ResultsTicker from './ResultsTicker'
import './ProdeBanner.css'

// Selección de selecciones del Mundial 2026 — ticker decorativo
const FLAGS = [
  'ar','br','fr','de','es','pt','uy','mx','us','ma',
  'jp','nl','hr','ch','sn','ng','gb-eng','co','ec','pe',
]

// Map abreviatura ESPN → ISO de flagcdn para banderas del marcador en vivo.
// Solo selecciones del Mundial 2026 (no hace falta cubrir 200 países).
const ABBR_TO_ISO = {
  MEX:'mx', RSA:'za', KOR:'kr', CZE:'cz', CAN:'ca', BIH:'ba', QAT:'qa', SUI:'ch',
  BRA:'br', MAR:'ma', HAI:'ht', SCO:'gb-sct', USA:'us', PAR:'py', AUS:'au', TUR:'tr',
  GER:'de', CUW:'cw', CIV:'ci', ECU:'ec', NED:'nl', JPN:'jp', SWE:'se', TUN:'tn',
  BEL:'be', EGY:'eg', IRN:'ir', NZL:'nz', ESP:'es', CPV:'cv', KSA:'sa', URU:'uy',
  FRA:'fr', SEN:'sn', IRQ:'iq', NOR:'no', ARG:'ar', ALG:'dz', AUT:'at', JOR:'jo',
  POR:'pt', COD:'cd', UZB:'uz', COL:'co', ENG:'gb-eng', CRO:'hr', GHA:'gh', PAN:'pa',
}

function flagFromAbbr(abbr) {
  const iso = ABBR_TO_ISO[abbr]
  return iso ? `https://flagcdn.com/w20/${iso}.png` : null
}

export default function ProdeBanner() {
  const all = [...FLAGS, ...FLAGS]
  // Polleamos siempre — el endpoint corta solo si no hay partidos en vivo
  const { matches: liveMatches } = useLiveMatches({ intervalMs: 60000 })
  // SOLO un partido realmente en juego va al cintillo "EN VIVO". El endpoint
  // también devuelve los recién terminados (para el gap del HOY JUEGA), pero
  // esos NO deben aparecer como "EN VIVO" — el ticker ya los muestra con FT.
  const live = liveMatches?.find(m => m.status === 'in_progress') || null
  // Si hay partidos hoy, el ticker de resultados reemplaza la cinta de banderas
  const [noMatchesToday, setNoMatchesToday] = useState(null) // null = no sé aún

  // Reporta la altura real del banner como CSS var → el navbar y el hero se
  // acomodan solos (antes estaba hardcodeado en 68px y el banner creció).
  const barRef = useRef(null)
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const apply = () => document.documentElement.style.setProperty('--prode-bar-h', `${el.offsetHeight}px`)
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => { ro.disconnect(); document.documentElement.style.removeProperty('--prode-bar-h') }
  }, [])

  return (
    <div ref={barRef} className={`prode-bar ${live ? 'prode-bar--live' : ''}`}>
      {/* Cinta de resultados del día — devuelve null si no hay partidos hoy */}
      <ResultsTicker onEmpty={setNoMatchesToday} />
      {/* Banderas decorativas — solo los días sin partidos */}
      {noMatchesToday === true && (
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
      )}

      {/* Contenido principal — cambia a marcador en vivo si hay partido jugándose */}
      <div className="prode-bar__content">
        {live ? (
          <>
            <div className="prode-bar__live-dot" aria-hidden="true" />
            <p className="prode-bar__text prode-bar__text--live">
              <strong>EN VIVO</strong>
              <span className="prode-bar__sep">·</span>
              <span className="prode-bar__live-team">
                {flagFromAbbr(live.homeAbbr) && (
                  <img src={flagFromAbbr(live.homeAbbr)} alt={live.homeAbbr} className="prode-bar__live-flag" />
                )}
                <span>{live.homeAbbr}</span>
              </span>
              <span className="prode-bar__live-score">
                {live.homeScore ?? 0}–{live.awayScore ?? 0}
              </span>
              <span className="prode-bar__live-team">
                <span>{live.awayAbbr}</span>
                {flagFromAbbr(live.awayAbbr) && (
                  <img src={flagFromAbbr(live.awayAbbr)} alt={live.awayAbbr} className="prode-bar__live-flag" />
                )}
              </span>
              {live.minute && <span className="prode-bar__live-min">{live.minute}</span>}
            </p>
            <a href="/prode" className="prode-bar__cta">Jugar el Prode →</a>
          </>
        ) : (
          <>
            <div className="prode-bar__badge">🏆</div>
            <p className="prode-bar__text">
              <strong>Prode Mundial 2026 · Sala Crespo</strong>
              <span className="prode-bar__sep">—</span>
              <MundialCountdown variant="banner" />
            </p>
            <a href="/prode" className="prode-bar__cta">Ver la tabla final →</a>
          </>
        )}
      </div>
    </div>
  )
}
