import { useState, useEffect } from 'react'
import './MundialCountdown.css'

// 11 jun 2026 16:00 hs ART — México vs Sudáfrica, partido inaugural en Azteca.
const KICKOFF = new Date('2026-06-11T16:00:00-03:00')
// 19 jul 2026 — final España 1-0 Argentina. Pasada esta fecha, el Mundial terminó.
const ENDED = new Date('2026-07-19T18:00:00-03:00')
const CHAMPION = 'España'

function calcState() {
  const now = new Date()
  if (now >= ENDED) return { phase: 'ended' }
  const diff = KICKOFF - now
  if (diff <= 0) return { phase: 'live' }
  const days  = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const mins  = Math.floor((diff / (1000 * 60)) % 60)
  return { phase: 'countdown', days, hours, mins }
}

export default function MundialCountdown({ variant = 'inline' }) {
  const [st, setSt] = useState(calcState())

  useEffect(() => {
    const id = setInterval(() => setSt(calcState()), 60_000) // cada 1 min alcanza
    return () => clearInterval(id)
  }, [])

  if (st.phase === 'ended') {
    return (
      <div className={`mundial-cd mundial-cd--${variant} mundial-cd--ended`}>
        <span className="mundial-cd__trophy">🏆</span>
        <strong>{CHAMPION.toUpperCase()} CAMPEÓN · EL MUNDIAL TERMINÓ</strong>
      </div>
    )
  }

  if (st.phase === 'live') {
    return (
      <div className={`mundial-cd mundial-cd--${variant} mundial-cd--live`}>
        <span className="mundial-cd__pulse" />
        <strong>EL MUNDIAL ESTÁ EN MARCHA</strong>
      </div>
    )
  }

  const diff = st

  return (
    <div className={`mundial-cd mundial-cd--${variant}`}>
      <span className="mundial-cd__label">Faltan</span>
      <div className="mundial-cd__digits">
        <span className="mundial-cd__num">{diff.days}</span>
        <span className="mundial-cd__unit">{diff.days === 1 ? 'día' : 'días'}</span>
      </div>
      <div className="mundial-cd__digits">
        <span className="mundial-cd__num">{diff.hours}</span>
        <span className="mundial-cd__unit">{diff.hours === 1 ? 'hora' : 'hs'}</span>
      </div>
      <div className="mundial-cd__digits">
        <span className="mundial-cd__num">{diff.mins}</span>
        <span className="mundial-cd__unit">{diff.mins === 1 ? 'min' : 'min'}</span>
      </div>
      <span className="mundial-cd__suffix">para el Mundial</span>
    </div>
  )
}
