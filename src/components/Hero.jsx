import { useEffect, useRef } from 'react'
import { IconTrophy } from './Icons'
import './Hero.css'

const STATS = [
  { value: '160',   label: 'Máquinas' },
  { value: '+$5M',  label: 'Premios progresivos' },
  { value: 'Shows', label: 'Todos los meses' },
]


export default function Hero() {
  const statsRef = useRef(null)

  useEffect(() => {
    const items = statsRef.current?.querySelectorAll('.hero__stat')
    if (!items) return
    items.forEach((el, i) => {
      setTimeout(() => el.classList.add('hero__stat--visible'), 900 + i * 120)
    })
  }, [])

  return (
    <section id="inicio" className="hero">
      {/* Foto de fondo con overlay cinematográfico */}
      <div className="hero__photo-bg" />
      <div className="hero__overlay" />

      {/* Grid sutil encima */}
      <div className="hero__grid-overlay" />


      <div className="hero__content container">
        <div className="hero__logo-wrap">
          <img
            src="/logo-sin-fondo.png"
            alt="Sala de Juegos Crespo"
            className="hero__logo"
          />
        </div>

        <div className="hero__text">
          <p className="hero__eyebrow">Crespo, Entre Ríos</p>
          <h1 className="hero__title">
            Tu lugar<br />
            <em>favorito</em>
          </h1>
          <p className="hero__subtitle">
            Slots · Shows en Vivo · Torneos · Buffet de Calidad
          </p>
        </div>

        <div className="hero__ctas">
          <a href="/prode" className="btn-primary hero__cta-main">
            <IconTrophy size={18} color="#fff" style={{marginRight:8,verticalAlign:'middle'}} /> Jugá el Prode Mundial 2026
          </a>
          <a href="#sala" className="btn-gold hero__cta-secondary">
            Conocé la sala →
          </a>
        </div>

        <div className="hero__stats" ref={statsRef}>
          {STATS.map(s => (
            <div key={s.label} className="hero__stat">
              <span className="hero__stat-value">{s.value}</span>
              <span className="hero__stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>


      <div className="hero__scroll-hint" aria-hidden="true">
        <span className="hero__scroll-dot" />
      </div>
    </section>
  )
}
