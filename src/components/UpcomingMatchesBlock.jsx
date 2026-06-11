import { useState, useMemo } from 'react'
import InlinePredForm from './InlinePredForm'
import './UpcomingMatchesBlock.css'
import './InlinePredForm.css'

// "Próximos a cargar" — bloque que muestra los próximos N partidos que el
// jugador AÚN no pronosticó. Solo aparece si hay player + matches sin
// pronóstico futuros. Permite cargar in-place sin navegar al tab pronósticos.

const LIMIT = 5

// Mapping local (mismo que TodayMatchesBlock — copia barata, evita import cruzado)
const NAME_TO_ISO = {
  'México':'mx','Sudáfrica':'za','República de Corea':'kr','República Checa':'cz',
  'Canadá':'ca','Bosnia y Herzegovina':'ba','Catar':'qa','Suiza':'ch',
  'Brasil':'br','Marruecos':'ma','Haití':'ht','Escocia':'gb-sct',
  'Estados Unidos':'us','Paraguay':'py','Australia':'au','Turquía':'tr',
  'Alemania':'de','Curazao':'cw','Costa de Marfil':'ci','Ecuador':'ec',
  'Países Bajos':'nl','Japón':'jp','Suecia':'se','Túnez':'tn',
  'Bélgica':'be','Egipto':'eg','RI de Irán':'ir','Nueva Zelanda':'nz',
  'España':'es','Cabo Verde':'cv','Arabia Saudí':'sa','Uruguay':'uy',
  'Francia':'fr','Senegal':'sn','Irak':'iq','Noruega':'no',
  'Argentina':'ar','Argelia':'dz','Austria':'at','Jordania':'jo',
  'Portugal':'pt','RD Congo':'cd','Uzbekistán':'uz','Colombia':'co',
  'Inglaterra':'gb-eng','Croacia':'hr','Ghana':'gh','Panamá':'pa',
}
const SHORT_NAMES = {
  'República de Corea':'Corea del Sur','República Checa':'Chequia',
  'Bosnia y Herzegovina':'Bosnia','Estados Unidos':'EE.UU.',
  'RI de Irán':'Irán','Nueva Zelanda':'N. Zelanda',
}
const shortName = n => SHORT_NAMES[n] || n

function FlagImg({ name, size = 22 }) {
  const iso = NAME_TO_ISO[name]
  if (!iso) return <span className="upcoming__flag-fallback" title={name}>🏳</span>
  return (
    <img
      src={`https://flagcdn.com/w80/${iso}.png`}
      alt={name}
      width={size}
      className="upcoming__flag"
      onError={e => { e.currentTarget.style.opacity = '0.3' }}
    />
  )
}

function fmtDateTime(iso) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short', day: 'numeric', month: 'short',
  })
  const time = d.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  // "lun. 16 jun · 16:00 hs"
  return `${date.charAt(0).toUpperCase() + date.slice(1)} · ${time} hs`
}

// ─── Card individual ────────────────────────────────────────────────────────
function UpcomingRow({ match, player, onPredictionSaved }) {
  const [savedFeedback, setSavedFeedback] = useState(false)

  function handleSaved(matchId, h, a) {
    onPredictionSaved?.(matchId, h, a)
    setSavedFeedback(true)
  }

  if (savedFeedback) {
    return (
      <div className="upcoming__match upcoming__match--saved">
        <div className="upcoming__match-info">
          <div className="upcoming__match-teams">
            <FlagImg name={match.homeName} />
            <span>{shortName(match.homeName)}</span>
            <span className="upcoming__vs">vs</span>
            <span>{shortName(match.awayName)}</span>
            <FlagImg name={match.awayName} />
          </div>
          <div className="upcoming__match-date">{fmtDateTime(match.date)}</div>
        </div>
        <div className="upcoming__saved">✓ Cargado</div>
      </div>
    )
  }

  return (
    <div className={`upcoming__match ${match.isArgentina ? 'upcoming__match--arg' : ''}`}>
      <div className="upcoming__match-info">
        <div className="upcoming__match-teams">
          <FlagImg name={match.homeName} />
          <span>{shortName(match.homeName)}</span>
          <span className="upcoming__vs">vs</span>
          <span>{shortName(match.awayName)}</span>
          <FlagImg name={match.awayName} />
        </div>
        <div className="upcoming__match-date">
          {fmtDateTime(match.date)}
          {match.isArgentina && <span className="upcoming__arg"> · ★ ×2</span>}
        </div>
      </div>
      <InlinePredForm
        matchId={match.id}
        token={player.token}
        onSaved={handleSaved}
        compact
      />
    </div>
  )
}

// ─── Bloque principal ──────────────────────────────────────────────────────
export default function UpcomingMatchesBlock({ matches, myPreds, player, onPredictionSaved, onSeeAll }) {
  // Solo partidos de fase de grupos pueden pronosticarse "de verdad" — los
  // de eliminatorias tienen homeDesc/awayDesc placeholder tipo "2º Grupo A"
  // y no se conoce el equipo real hasta que terminan los grupos.
  const { upcoming, hasGroupMatchesPending, allGroupsDone } = useMemo(() => {
    if (!player) return { upcoming: [], hasGroupMatchesPending: false, allGroupsDone: false }
    const now = Date.now()
    const candidates = (matches || []).filter(m => {
      if (m.phase !== 'group') return false
      if (new Date(m.date).getTime() <= now) return false
      if (m.result) return false
      if (!m.homeName || !m.awayName) return false
      return true
    })
    const pending = candidates.filter(m => !myPreds?.[m.id])
    return {
      upcoming: pending.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, LIMIT),
      hasGroupMatchesPending: pending.length > 0,
      // Todos los de grupos están pronosticados (o ya jugados) y NO quedan
      // partidos de grupos en el futuro sin pronóstico
      allGroupsDone: pending.length === 0 && candidates.length === 0,
    }
  }, [matches, myPreds, player])

  // Si no hay player o no hay nada que mostrar y NO terminaron los grupos, no renderizamos
  if (!player) return null
  if (!hasGroupMatchesPending && !allGroupsDone) return null

  // Cargaron todo: mensaje educativo en vez del listado
  if (allGroupsDone) {
    return (
      <section className="upcoming upcoming--done">
        <div className="upcoming__done">
          <div className="upcoming__done-icon">🎉</div>
          <h3 className="upcoming__done-title">¡Cargaste todos los partidos de grupos!</h3>
          <p className="upcoming__done-sub">
            Cuando terminen las eliminatorias, vas a poder cargar los octavos, cuartos y la final desde acá mismo.
          </p>
          {onSeeAll && (
            <button className="upcoming__see-all" onClick={onSeeAll}>
              Revisar todos mis pronósticos →
            </button>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="upcoming">
      <div className="upcoming__head">
        <span className="upcoming__eyebrow">⚡ Cargá rápido</span>
        <h2 className="upcoming__title">Próximos partidos sin pronóstico</h2>
        <p className="upcoming__sub">Cargá acá mismo, sin ir al tab Pronósticos.</p>
      </div>

      <div className="upcoming__list">
        {upcoming.map(m => (
          <UpcomingRow
            key={m.id}
            match={m}
            player={player}
            onPredictionSaved={onPredictionSaved}
          />
        ))}
      </div>

      {onSeeAll && (
        <div className="upcoming__more">
          <button className="upcoming__see-all" onClick={onSeeAll}>
            Ver todos los partidos →
          </button>
        </div>
      )}
    </section>
  )
}
