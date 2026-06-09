import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useScrollRevealParent } from '../hooks/useScrollReveal'
import { getLeaderboardPublic } from '../api/client'
import './Top10Prode.css'

// Top 10 del Prode — leaderboard público, anonimizado (primer nombre + inicial).
// Si el jugador logueado no está en el top 10 pero ya jugó, muestra "vos estás en #X".
// No renderiza si no hay 5+ jugadores con played > 0 (todavía no arrancó el Prode).

const MASCOTAS = {
  cocodrilo: { src: '/mascotas/Cocodrilo.png', label: 'Cocodrilo' },
  gorilla:   { src: '/mascotas/Gorilla.png',   label: 'Gorila' },
  guepardo:  { src: '/mascotas/Guepardo.png',  label: 'Guepardo' },
  oso:       { src: '/mascotas/Oso.png',       label: 'Oso' },
  tigre:     { src: '/mascotas/Tigre.png',     label: 'Tigre' },
  elefante:  { src: '/mascotas/Elefante.png',  label: 'Elefante' },
  rino:      { src: '/mascotas/Rino.png',      label: 'Rinoceronte' },
  tibu:      { src: '/mascotas/Tibu.png',      label: 'Tiburón' },
  toro:      { src: '/mascotas/mascot-toro.svg', label: 'Toro' },
}

function mascotImg(id) {
  return MASCOTAS[id] || MASCOTAS.toro
}

function anonName(fullName = '') {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  const first = parts[0]
  const last  = parts[parts.length - 1]
  return `${first} ${last.charAt(0).toUpperCase()}.`
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function Top10Prode() {
  const [board, setBoard] = useState(null)
  const [me, setMe] = useState(null)

  useEffect(() => {
    getLeaderboardPublic().then(setBoard).catch(() => setBoard([]))
    try {
      const stored = JSON.parse(localStorage.getItem('prode_player'))
      if (stored?.id) setMe(stored)
    } catch {}
  }, [])

  // Wrapper SIEMPRE renderizado con ref para que el IntersectionObserver
  // del hook se setupee al mount. Cuando llega el fetch y aparecen los hijos
  // .reveal, hasData cambia y el hook re-bindea el observer (ver useScrollReveal).
  const ranked = board ? board.filter(p => (p.played || 0) > 0) : []
  const hasData = ranked.length >= 5
  const ref = useScrollRevealParent(0.05, hasData)
  if (!hasData) return <section id="top10-prode" className="top10 top10--hidden" ref={ref} aria-hidden="true" />

  const top = ranked.slice(0, 10)
  const myIndex = me ? ranked.findIndex(p => p.id === me.id) : -1
  const meIsInTop = myIndex >= 0 && myIndex < 10
  const myEntry = myIndex >= 0 ? ranked[myIndex] : null

  return (
    <section id="top10-prode" className="top10" ref={ref}>
      <div className="container">
        <div className="reveal top10__head">
          <span className="eyebrow">El podio del Prode</span>
          <h2 className="section-title">Quiénes <em>van ganando</em></h2>
          <div className="gold-line center" />
          <p className="top10__intro">
            Top 10 del ranking en vivo del Prode Mundial. Si jugás bien podés terminar acá — y llevarte hasta $525.000 en tickets.
          </p>
        </div>

        <div className="reveal top10__list">
          {top.map((p, i) => {
            const mas = mascotImg(p.mascota)
            const medal = MEDALS[i] || null
            const isMe = me?.id === p.id
            return (
              <div key={p.id} className={`top10__row ${i < 3 ? 'top10__row--podium top10__row--p' + (i+1) : ''} ${isMe ? 'top10__row--me' : ''}`}>
                <div className="top10__pos">{i + 1}</div>
                <div className="top10__avatar">
                  <img src={mas.src} alt={mas.label} loading="lazy" />
                  {medal && <span className="top10__medal" aria-hidden="true">{medal}</span>}
                </div>
                <div className="top10__name">
                  <div className="top10__name-text">{anonName(p.name)}</div>
                  <div className="top10__name-sub">{p.played} jugados · {p.exact || 0} exactos</div>
                </div>
                <div className="top10__pts">
                  {(p.total ?? 0).toLocaleString('es-AR')}
                  <span>pts</span>
                </div>
              </div>
            )
          })}

          {me && !meIsInTop && myEntry && (
            <div className="top10__row top10__row--me top10__row--mine">
              <div className="top10__pos">{myIndex + 1}</div>
              <div className="top10__avatar">
                <img src={mascotImg(myEntry.mascota).src} alt="Vos" loading="lazy" />
              </div>
              <div className="top10__name">
                <div className="top10__name-text">Vos</div>
                <div className="top10__name-sub">{myEntry.played} jugados · {myEntry.exact || 0} exactos</div>
              </div>
              <div className="top10__pts">
                {(myEntry.total ?? 0).toLocaleString('es-AR')}
                <span>pts</span>
              </div>
            </div>
          )}
        </div>

        <div className="reveal top10__cta">
          <Link to="/prode" className="btn-gold">Ver ranking completo →</Link>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
