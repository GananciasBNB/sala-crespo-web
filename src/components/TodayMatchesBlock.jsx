import { useEffect, useState, useMemo } from 'react'
import { getMatchStats } from '../api/client'
import './TodayMatchesBlock.css'

// "HOY JUEGA" — bloque que aparece en el tab "Inicio" del Prode.
// Muestra los partidos del día con su estado (pre / live / finished).
// - Antes del kickoff: kickoff time + mi pronóstico cargado o CTA para cargarlo.
// - Durante el partido: cuenta como pre con etiqueta "Empezando" hasta que llega resultado.
// - Terminado: resultado final + acierto/error + cuántos socios acertaron.
// Si no hay partidos hoy (en TZ Argentina), no renderiza nada.
//
// Cero dependencias backend nuevas para el render base: usa matches y myPreds
// que ya tiene el ProdeApp en su state. Solo llama /api/prode/match/:id/stats
// para los partidos terminados (opcional, no rompe si falla).

const WORLDCUP_DAY_1_ART = '2026-06-11'

// YYYY-MM-DD de "hoy" en TZ Argentina (no depende del TZ del cliente)
function todayARDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

// YYYY-MM-DD del kickoff del partido en TZ Argentina
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
// 'starting' = ya pasó el kickoff pero no llegó el resultado.
function matchState(match) {
  if (match.result) return 'finished'
  const now = Date.now()
  const kickoff = new Date(match.date).getTime()
  if (now >= kickoff) return 'starting'
  return 'pre'
}

// Calcula puntos de un pronóstico igual que el backend (server.js calcPoints).
// 10 pts exacto, 5 pts ganador/empate correcto, 1 pt total de goles correcto.
// Doble si es partido de Argentina.
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

// ─── Card individual por match ────────────────────────────────────────────────
function MatchRow({ match, myPred, player, onParticipa, stats }) {
  const state = matchState(match)
  const isArgentina = match.isArgentina

  const pts = (state === 'finished' && myPred)
    ? calcPoints(myPred, match.result, isArgentina)
    : null

  return (
    <div className={`today__match today__match--${state} ${isArgentina ? 'today__match--arg' : ''}`}>
      <div className="today__match-time">
        {state === 'finished'
          ? <span className="today__match-state today__match-state--finished">✓ Final</span>
          : state === 'starting'
            ? <span className="today__match-state today__match-state--live">● Empezando</span>
            : <span className="today__match-state today__match-state--pre">⏰ {fmtTime(match.date)}</span>}
      </div>

      <div className="today__match-teams">
        <div className="today__team">
          <span className="today__team-flag">{match.homeFlag || '🏳️'}</span>
          <span className="today__team-name">{match.homeName}</span>
        </div>

        {state === 'finished' && match.result ? (
          <div className="today__match-score">
            <span className="today__match-score-num">{match.result.home}</span>
            <span className="today__match-score-sep">-</span>
            <span className="today__match-score-num">{match.result.away}</span>
          </div>
        ) : (
          <span className="today__match-vs">vs</span>
        )}

        <div className="today__team today__team--right">
          <span className="today__team-name">{match.awayName}</span>
          <span className="today__team-flag">{match.awayFlag || '🏳️'}</span>
        </div>
      </div>

      {isArgentina && (
        <div className="today__arg-badge">★ Argentina · puntos dobles</div>
      )}

      {/* Pronóstico del jugador */}
      {player && state !== 'finished' && (
        myPred ? (
          <div className="today__pred today__pred--ok">
            Tu pronóstico: <strong>{myPred.home}-{myPred.away}</strong> ✓
          </div>
        ) : (
          <button className="today__pred today__pred--cta" onClick={onParticipa}>
            ⚠ No cargaste pronóstico · Cargar ahora →
          </button>
        )
      )}

      {/* Resultado del jugador post-partido */}
      {player && state === 'finished' && (
        <div className={`today__verdict ${pts > 0 ? 'today__verdict--ok' : 'today__verdict--miss'}`}>
          {myPred ? (
            <>
              <div className="today__verdict-line">
                Pronosticaste <strong>{myPred.home}-{myPred.away}</strong>
              </div>
              <div className="today__verdict-pts">
                {pts >= 10 && '🎯 ¡Exacto!'}
                {pts === 5 && '✓ Acertaste el resultado'}
                {pts === 10 && isArgentina && ' (×2 Argentina)'}
                {pts >= 1 && pts < 5 && '· Total de goles correcto'}
                {pts === 0 && '✗ No acertaste'}
                <span className="today__verdict-pts-num">{pts > 0 ? `+${pts}` : '0'} pts</span>
              </div>
            </>
          ) : (
            <div className="today__verdict-line">No habías cargado pronóstico</div>
          )}
        </div>
      )}

      {/* Stats del partido (post) */}
      {state === 'finished' && stats && stats.total > 0 && (
        <div className="today__stats">
          {stats.acceptedExact > 0 && (
            <span className="today__stats-item">🎯 {stats.acceptedExact} acertaron exacto</span>
          )}
          {stats.acceptedWinner > 0 && (
            <span className="today__stats-item">✓ {stats.acceptedWinner} acertaron el resultado</span>
          )}
          <span className="today__stats-item today__stats-item--total">{stats.total} pronosticaron</span>
        </div>
      )}
    </div>
  )
}

// ─── Bloque principal ─────────────────────────────────────────────────────────
export default function TodayMatchesBlock({ matches, myPreds, player, onParticipa }) {
  const todayAR = todayARDate()
  const todayMatches = useMemo(
    () => (matches || []).filter(m => matchARDate(m.date) === todayAR),
    [matches, todayAR]
  )

  // Fetch stats SOLO para los partidos terminados de hoy (no rompe si falla).
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
        getMatchStats(id)
          .then(s => ({ id, stats: s }))
          .catch(() => ({ id, stats: null }))
      )
    ).then(results => {
      if (cancelled) return
      const next = {}
      for (const r of results) if (r.stats) next[r.id] = r.stats
      setStatsByMatch(next)
    })
    return () => { cancelled = true }
  }, [finishedMatchIds.join(',')])

  if (todayMatches.length === 0) return null

  // Ordenar por fecha
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
            onParticipa={onParticipa}
            stats={statsByMatch[m.id] || null}
          />
        ))}
      </div>
    </section>
  )
}
