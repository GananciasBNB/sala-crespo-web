import { useState, useEffect } from 'react'
import './MundialCountdown.css'

// 11 jun 2026 16:00 hs ART — México vs Sudáfrica, partido inaugural en Azteca.
// Cuando esta fecha ya pasó, el componente muestra "EL MUNDIAL ESTÁ EN MARCHA".
const KICKOFF = new Date('2026-06-11T16:00:00-03:00')

function calcDiff() {
  const now = new Date()
  const diff = KICKOFF - now
  if (diff <= 0) return null
  const days  = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const mins  = Math.floor((diff / (1000 * 60)) % 60)
  return { days, hours, mins }
}

export default function MundialCountdown({ variant = 'inline' }) {
  const [diff, setDiff] = useState(calcDiff())

  useEffect(() => {
    const id = setInterval(() => setDiff(calcDiff()), 60_000) // cada 1 min alcanza
    return () => clearInterval(id)
  }, [])

  if (!diff) {
    return (
      <div className={`mundial-cd mundial-cd--${variant} mundial-cd--live`}>
        <span className="mundial-cd__pulse" />
        <strong>EL MUNDIAL ESTÁ EN MARCHA</strong>
      </div>
    )
  }

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
