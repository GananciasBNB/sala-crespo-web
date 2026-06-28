import { useEffect, useState, useMemo } from 'react'
import { getMatchStats } from '../api/client'
import InlinePredForm from './InlinePredForm'
import { useLiveMatches } from '../hooks/useLiveMatches'
import './TodayMatchesBlock.css'
import './InlinePredForm.css'

// "HOY JUEGA" — bloque que aparece en el tab "Inicio" del Prode.
// Muestra los partidos del día con estado (pre / starting / finished).
// Si no hay partidos hoy (en TZ Argentina), no renderiza nada.

const WORLDCUP_DAY_1_ART = '2026-06-11'

// Etiquetas de fase para el badge cuando NO es 'group'
const PHASE_LABEL = {
  round32: '16avos de Final',
  round16: 'Octavos de Final',
  quarter: 'Cuartos de Final',
  semi:    'Semifinal',
  third:   'Tercer Puesto',
  final:   '🏆 Final',
}

// Mapeo nombre del fixture → código ISO para flagcdn.com.
// Copia local: las mismas claves están en ProdeApp.jsx. No vale la pena
// centralizar todavía porque son las únicas 2 vistas que usan banderas reales.
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

// Nombres cortos para títulos donde los oficiales son largos
const SHORT_NAMES = {
  'República de Corea':   'Corea del Sur',
  'República Checa':      'Chequia',
  'Bosnia y Herzegovina': 'Bosnia',
  'Estados Unidos':       'EE.UU.',
  'Arabia Saudí':         'Arabia Saudí',
  'RI de Irán':           'Irán',
  'Costa de Marfil':      'Costa de Marfil',
  'Países Bajos':         'Países Bajos',
  'Nueva Zelanda':        'N. Zelanda',
  'Cabo Verde':           'Cabo Verde',
}
const shortName = n => SHORT_NAMES[n] || n

function FlagImg({ name, size = 28 }) {
  const iso = NAME_TO_ISO[name]
  if (!iso) return <span className="today__flag-fallback" title={name}>🏳</span>
  return (
    <img
      src={`https://flagcdn.com/w80/${iso}.png`}
      alt={name}
      width={size}
      className="today__flag"
      onError={e => { e.currentTarget.style.opacity = '0.3' }}
    />
  )
}

// YYYY-MM-DD de "hoy" en TZ Argentina (no depende del TZ del cliente)
function todayARDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}
function matchARDate(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso))
}
function dayOfWorldCup() {
  const todayMs = new Date(todayARDate() + 'T12:00:00-03:00').getTime()
  const day1Ms  = new Date(WORLDCUP_DAY_1_ART + 'T12:00:00-03:00').getTime()
  const diff    = Math.floor((todayMs - day1Ms) / (24 * 60 * 60 * 1000))
  return diff + 1
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }) + ' hs'
}

// Match state: 'pre' | 'starting' | 'finished'
function matchState(match) {
  if (match.result) return 'finished'
  const now = Date.now()
  const kickoff = new Date(match.date).getTime()
  if (now >= kickoff) return 'starting'
  return 'pre'
}

// Puntos según fórmula del backend: 10 exacto, 5 ganador correcto, 1 total
// de goles. Doble en Argentina.
function calcPoints(pred, result, isArgentina) {
  if (!pred || !result) return 0
  const { home: ph, away: pa } = pred
  const { home: rh, away: ra } = result
  let pts = 0
  if (ph === rh && pa === ra) pts = 10
  else if ((ph > pa && rh > ra) || (ph < pa && rh < ra) || (ph === pa && rh === ra)) pts = 5
  else if (ph + pa === rh + ra) pts = 1
  if (isArgentina) pts *= 2
  return pts
}

// ─── Mini scoreboard del pronóstico cargado ─────────────────────────────────
function PredScoreboard({ pred }) {
  return (
    <div className="today__pred-board">
      <div className="today__pred-eye">★ Tu pronóstico</div>
      <div className="today__pred-row">
        <span className="today__pred-cell">{pred.home}</span>
        <span className="today__pred-dash">—</span>
        <span className="today__pred-cell">{pred.away}</span>
        <span className="today__pred-check">✓</span>
      </div>
    </div>
  )
}

// ─── Card individual por match ──────────────────────────────────────────────
function MatchRow({ match, myPred, player, onPredictionSaved, stats, liveData }) {
  const state = matchState(match)
  const isArgentina = match.isArgentina
  const pts = (state === 'finished' && myPred)
    ? calcPoints(myPred, match.result, isArgentina)
    : null
  const [showForm, setShowForm] = useState(false)

  // "Gap" = ESPN ya marca el partido como terminado, pero el resultado oficial
  // todavía no llegó a nuestra base (el cron carga cada ~10 min). Mostramos el
  // marcador final + "calculando puntos" en vez de "Empezando".
  const isFinishingGap = state === 'starting' && liveData?.status === 'finished'
  const isLiveNow = state === 'starting' && liveData?.status === 'in_progress'

  const StateBadge = () => {
    if (state === 'finished') return <span className="today__state today__state--finished">FINAL</span>
    if (isFinishingGap) {
      return (
        <span className="today__state today__state--finishing">
          <span className="today__finishing-spin" /> FINAL · cargando…
        </span>
      )
    }
    if (isLiveNow) {
      return (
        <span className="today__state today__state--livescore">
          <span className="today__livedot" /> EN VIVO
          {liveData.minute && <span className="today__livemin">{liveData.minute}</span>}
        </span>
      )
    }
    if (state === 'starting') return <span className="today__state today__state--live">● Empezando</span>
    return <span className="today__state today__state--pre">{fmtTime(match.date)}</span>
  }

  return (
    <div className={`today__match today__match--${state} ${isArgentina ? 'today__match--arg' : ''}`}>
      <div className="today__match-head">
        {match.phase !== 'group' && PHASE_LABEL[match.phase] && (
          <span className="today__phase-badge">{PHASE_LABEL[match.phase]}</span>
        )}
        <StateBadge />
        {isArgentina && <span className="today__arg-badge">★ ×2 Argentina</span>}
      </div>

      <div className="today__match-teams">
        <div className="today__team">
          <FlagImg name={match.homeName} size={28} />
          <span className="today__team-name">{shortName(match.homeName)}</span>
        </div>

        {state === 'finished' && match.result ? (
          <div className="today__match-score">
            <span>{match.result.home}</span>
            <em>-</em>
            <span>{match.result.away}</span>
          </div>
        ) : liveData && (liveData.homeScore !== null || liveData.awayScore !== null) ? (
          <div className="today__match-score today__match-score--live">
            <span>{liveData.homeScore ?? 0}</span>
            <em>-</em>
            <span>{liveData.awayScore ?? 0}</span>
          </div>
        ) : (
          <span className="today__match-vs">VS</span>
        )}

        <div className="today__team today__team--right">
          <span className="today__team-name">{shortName(match.awayName)}</span>
          <FlagImg name={match.awayName} size={28} />
        </div>
      </div>

      {/* Pronóstico pre / starting */}
      {player && state === 'pre' && (
        showForm ? (
          <div className="today__pred-form">
            <div className="today__pred-eye today__pred-eye--cta">★ Tu pronóstico</div>
            <InlinePredForm
              matchId={match.id}
              token={player.token}
              initialHome={myPred?.home ?? ''}
              initialAway={myPred?.away ?? ''}
              onSaved={(mid, h, a) => {
                onPredictionSaved?.(mid, h, a)
                setShowForm(false)
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        ) : myPred ? (
          <div>
            <PredScoreboard pred={myPred} />
            <button
              className="today__pred-edit"
              onClick={() => setShowForm(true)}
              style={{ display: 'block', margin: '10px auto 0', background: 'none',
                border: '1px solid rgba(240,210,117,0.4)', color: '#F0D275', borderRadius: 8,
                padding: '7px 18px', fontSize: '0.84rem', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ✏️ Editar pronóstico
            </button>
          </div>
        ) : (
          <button className="today__pred-cta" onClick={() => setShowForm(true)}>
            ⚠ No cargaste pronóstico · Cargar ahora →
          </button>
        )
      )}

      {/* Partido empezando / terminando — sin form, solo info */}
      {player && state === 'starting' && (
        <>
          {myPred
            ? <PredScoreboard pred={myPred} />
            : <div className="today__pred-locked">⏱ El partido ya empezó — pronóstico cerrado</div>}
          {isFinishingGap && (
            <div className="today__calc">⏳ Calculando puntos del partido…</div>
          )}
        </>
      )}

      {/* Verdict post-partido */}
      {player && state === 'finished' && (
        <div className={`today__verdict ${pts > 0 ? 'today__verdict--ok' : 'today__verdict--miss'}`}>
          {myPred ? (
            <>
              <div className="today__verdict-pred">
                Pronosticaste <strong>{myPred.home}—{myPred.away}</strong>
              </div>
              <div className="today__verdict-line">
                {pts >= 10 && '🎯 ¡Acertaste el resultado exacto!'}
                {pts === 5 && '✓ Acertaste el ganador'}
                {pts >= 1 && pts < 5 && '· Total de goles correcto'}
                {pts === 0 && '✗ No acertaste'}
              </div>
              <div className="today__verdict-pts">
                {pts > 0 ? `+${pts}` : '0'}
                <em>pts{isArgentina && pts > 0 ? ' ×2' : ''}</em>
              </div>
            </>
          ) : (
            <div className="today__verdict-line">No habías cargado pronóstico</div>
          )}
        </div>
      )}

      {/* Stats del partido */}
      {state === 'finished' && stats && stats.total > 0 && (
        <div className="today__stats">
          {stats.acceptedExact > 0 && (
            <span className="today__stats-item">🎯 {stats.acceptedExact} exacto</span>
          )}
          {stats.acceptedWinner > 0 && (
            <span className="today__stats-item">✓ {stats.acceptedWinner} ganador</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Bloque principal ─────────────────────────────────────────────────────────
export default function TodayMatchesBlock({ matches, myPreds, player, onParticipa, onPredictionSaved }) {
  const todayAR = todayARDate()
  const todayMatches = useMemo(
    () => (matches || []).filter(m => matchARDate(m.date) === todayAR),
    [matches, todayAR]
  )

  const finishedMatchIds = useMemo(
    () => todayMatches.filter(m => !!m.result).map(m => m.id),
    [todayMatches]
  )
  const [statsByMatch, setStatsByMatch] = useState({})

  useEffect(() => {
    if (finishedMatchIds.length === 0) return
    let cancelled = false
    Promise.all(
      finishedMatchIds.map(id =>
        getMatchStats(id).then(s => ({ id, stats: s })).catch(() => ({ id, stats: null }))
      )
    ).then(results => {
      if (cancelled) return
      const next = {}
      for (const r of results) if (r.stats) next[r.id] = r.stats
      setStatsByMatch(next)
    })
    return () => { cancelled = true }
  }, [finishedMatchIds.join(',')])

  // Solo pollear live cuando hay un partido en estado "starting" (ya pasó
  // el kickoff pero no llegó el resultado final). No tiene sentido pollear
  // si todos los partidos del día son pre o finished.
  const hasStarting = todayMatches.some(m => matchState(m) === 'starting')
  const { byAbbr: liveByAbbr } = useLiveMatches({ enabled: hasStarting, intervalMs: 60000 })

  if (todayMatches.length === 0) return null

  const sorted = [...todayMatches].sort((a, b) => new Date(a.date) - new Date(b.date))
  const dayN = dayOfWorldCup()

  return (
    <section className="today">
      <div className="today__head">
        <div className="today__eyebrow">
          <span className="today__eyebrow-dot" />
          HOY · Día {dayN} del Mundial
        </div>
        <h2 className="today__title">
          {sorted.length === 1 ? 'Juega 1 partido' : `Juegan ${sorted.length} partidos`}
        </h2>
      </div>

      <div className="today__list">
        {sorted.map(m => (
          <MatchRow
            key={m.id}
            match={m}
            myPred={myPreds?.[m.id] || null}
            player={player}
            onPredictionSaved={onPredictionSaved}
            stats={statsByMatch[m.id] || null}
            liveData={liveByAbbr[`${m.home}-${m.away}`] || null}
          />
        ))}
      </div>
    </section>
  )
}
