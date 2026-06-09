import { useEffect, useState } from 'react'
import { useScrollRevealParent } from '../hooks/useScrollReveal'
import { getUpcomingVote } from '../api/client'
import './VozDelBarrio.css'

// "Lo que piensa Crespo" — feed del próximo partido con % de votos.
// Carga datos reales del Prode (backend: GET /api/prode/upcoming-vote).
// Si no hay partido próximo o suficientes votos, no se renderiza (gracefully).

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

export default function VozDelBarrio() {
  const ref = useScrollRevealParent()
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getUpcomingVote()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  // No renderizar si no hay match próximo o muy pocos votos (menos de 5).
  if (!loaded || !data?.match || (data?.totalVotes || 0) < 5) return null

  const { match, votes, totalVotes } = data
  const pct = {
    home: Math.round((votes.homeWin / totalVotes) * 100),
    away: Math.round((votes.awayWin / totalVotes) * 100),
    draw: Math.round((votes.draw / totalVotes) * 100),
  }
  const top = dominantTeam(votes, match)
  const topPct = top ? Math.round((top.pct / totalVotes) * 100) : 0

  return (
    <section id="voz-del-barrio" className="voz" ref={ref}>
      <div className="container">
        <div className="reveal voz__head">
          <span className="eyebrow">El pronóstico de Crespo</span>
          <h2 className="section-title">Cómo viene el <em>próximo partido</em></h2>
          <div className="gold-line center" />
          <p className="voz__intro">Según los participantes del Prode Mundial de Sala Crespo.</p>
        </div>

        <div className="reveal voz__card">
          <div className="voz__match">
            <span className="voz__match-eye">Próximo partido · {fmtDate(match.date)}</span>
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
              El <strong>{topPct}%</strong> banca a<br/>
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

          <div className="voz__foot">
            <a href="/prode" className="btn-primary voz__cta">¿Vos qué decís? Jugá gratis →</a>
            <p className="voz__data">{totalVotes} socios votaron este partido</p>
          </div>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
