import MundialCountdown from './MundialCountdown'
import { useLiveMatches } from '../hooks/useLiveMatches'
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
  const live = liveMatches?.[0] || null  // Mostramos solo uno en el cintillo

  return (
    <div className={`prode-bar ${live ? 'prode-bar--live' : ''}`}>
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
            <div className="prode-bar__badge">NUEVO</div>
            <p className="prode-bar__text">
              <strong>Prode Mundial 2026 · Sala Crespo</strong>
              <span className="prode-bar__sep">—</span>
              <MundialCountdown variant="banner" />
            </p>
            <a href="/prode" className="prode-bar__cta">Participar gratis →</a>
          </>
        )}
      </div>
    </div>
  )
}
