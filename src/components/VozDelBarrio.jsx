import { useEffect, useState } from 'react'
import { useScrollRevealParent } from '../hooks/useScrollReveal'
import { getUpcomingVote } from '../api/client'
import './VozDelBarrio.css'

// "El pronóstico de Crespo" — feed de los próximos partidos con % de votos.
// Carga datos reales del Prode (backend: GET /api/prode/upcoming-vote?limit=4).
// Si no hay partidos próximos con suficientes votos, no se renderiza.
// Se requiere ≥5 votos por partido para mostrarlo (evita estadísticas ruidosas).

const MIN_VOTES_PER_MATCH = 5

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const day  = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' })
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' })
  return `${day.charAt(0).toUpperCase() + day.slice(1)} · ${time} hs`
}

function dominantTeam(votes, match) {
  if (!match || !votes) return null
  const { homeWin, awayWin, draw } = votes
  const max = Math.max(homeWin, awayWin, draw)
  if (max === 0) return null
  if (max === homeWin) return { name: match.homeName, flag: match.homeFlag, pct: homeWin }
  if (max === awayWin) return { name: match.awayName, flag: match.awayFlag, pct: awayWin }
  return { name: 'el empate', flag: '🤝', pct: draw }
}

function MatchCard({ entry }) {
  const { match, votes, totalVotes } = entry
  const pct = {
    home: Math.round((votes.homeWin / totalVotes) * 100),
    away: Math.round((votes.awayWin / totalVotes) * 100),
    draw: Math.round((votes.draw / totalVotes) * 100),
  }
  const top = dominantTeam(votes, match)
  const topPct = top ? Math.round((top.pct / totalVotes) * 100) : 0

  return (
    <div className="reveal voz__card">
      <div className="voz__match">
        <span className="voz__match-eye">{fmtDate(match.date)}</span>
        <div className="voz__match-teams">
          <span className="voz__match-flag">{match.homeFlag}</span>
          <span className="voz__match-name">{match.homeName}</span>
          <span className="voz__match-vs">vs</span>
          <span className="voz__match-name">{match.awayName}</span>
          <span className="voz__match-flag">{match.awayFlag}</span>
        </div>
      </div>

      {top && (
        <div className="voz__quote">
          El <strong>{topPct}%</strong> banca a{' '}
          <span className="voz__quote-team">
            <span className="voz__quote-flag">{top.flag}</span>{top.name}
          </span>
        </div>
      )}

      <div className="voz__bars">
        <div className="voz__bar">
          <div className="voz__bar-team">
            <span className="voz__bar-flag">{match.homeFlag}</span>
            {match.homeName}
          </div>
          <div className="voz__bar-track">
            <div className="voz__bar-fill voz__bar-fill--home" style={{ width: pct.home + '%' }} />
          </div>
          <div className="voz__bar-pct">{pct.home}%</div>
        </div>
        <div className="voz__bar">
          <div className="voz__bar-team">
            <span className="voz__bar-flag">🤝</span>
            Empate
          </div>
          <div className="voz__bar-track">
            <div className="voz__bar-fill voz__bar-fill--draw" style={{ width: pct.draw + '%' }} />
          </div>
          <div className="voz__bar-pct">{pct.draw}%</div>
        </div>
        <div className="voz__bar">
          <div className="voz__bar-team">
            <span className="voz__bar-flag">{match.awayFlag}</span>
            {match.awayName}
          </div>
          <div className="voz__bar-track">
            <div className="voz__bar-fill voz__bar-fill--away" style={{ width: pct.away + '%' }} />
          </div>
          <div className="voz__bar-pct">{pct.away}%</div>
        </div>
      </div>
    </div>
  )
}

export default function VozDelBarrio() {
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getUpcomingVote(4)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  // Filtrar a los partidos que tengan al menos MIN_VOTES_PER_MATCH votos
  // (los demás se ocultan para no mostrar estadísticas con muestra muy chica).
  const matches = (data?.matches || []).filter(m => (m?.totalVotes || 0) >= MIN_VOTES_PER_MATCH)
  const hasData = loaded && matches.length > 0

  // Wrapper SIEMPRE renderizado con ref para que el IntersectionObserver del
  // hook se setupee. hasData como dep re-bindea el observer cuando llegan los
  // hijos .reveal tras el fetch.
  const ref = useScrollRevealParent(0.05, hasData)
  if (!hasData) return <section id="voz-del-barrio" className="voz voz--hidden" ref={ref} aria-hidden="true" />

  const isSingle = matches.length === 1

  return (
    <section id="voz-del-barrio" className="voz" ref={ref}>
      <div className="container">
        <div className="reveal voz__head">
          <span className="eyebrow">El pronóstico de Crespo</span>
          <h2 className="section-title">
            {isSingle
              ? <>Cómo viene el <em>próximo partido</em></>
              : <>Cómo vienen los <em>próximos partidos</em></>}
          </h2>
          <div className="gold-line center" />
          <p className="voz__intro">Según los participantes del Prode Mundial de Sala Crespo.</p>
        </div>

        <div className={`voz__grid ${isSingle ? 'voz__grid--single' : ''}`}>
          {matches.map(entry => (
            <MatchCard key={entry.match.id} entry={entry} />
          ))}
        </div>

        <div className="reveal voz__foot">
          <a href="/prode" className="btn-primary voz__cta">¿Vos qué decís? Jugá gratis →</a>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
