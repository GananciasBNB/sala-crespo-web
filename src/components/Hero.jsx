import { useEffect, useState } from 'react'
import HorarioEspecial from './HorarioEspecial'
import { getContent } from '../api/client'
import './Hero.css'

export default function Hero() {
  // Logo condicional: si content.logo_mundial.activo === 'true', usamos la
  // versión Edición Mundial 2026; si no, el institucional. Pacha lo toggea
  // desde el admin (Contenido → 🏆 Logo Mundial).
  const [useMundial, setUseMundial] = useState(false)
  useEffect(() => {
    let cancelled = false
    getContent()
      .then(c => { if (!cancelled) setUseMundial(c?.logo_mundial?.activo === 'true') })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const logoSrc = useMundial ? '/logo-mundial-2026.png' : '/logo-sin-fondo.png'
  const logoClass = useMundial ? 'hero__logo hero__logo--mundial' : 'hero__logo'

  return (
    <section id="inicio" className="hero">
      {/* Foto de fondo con overlay cinematográfico (vuelta al look pre-Mundial,
          sep 2026 — el video de la pelota se retiró junto con el universo Prode) */}
      <div className="hero__photo-bg" />
      <div className="hero__overlay" />

      {/* Grid sutil encima */}
      <div className="hero__grid-overlay" />


      <div className="hero__content container">
        <div className="hero__logo-wrap">
          <img
            src={logoSrc}
            alt="Sala de Juegos Crespo"
            className={logoClass}
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
          <a href="#futbol-en-sala" className="btn-primary hero__cta-main">
            ⚽ Mirá el fútbol en Sala
          </a>
          <a href="#sala" className="btn-gold hero__cta-secondary">
            Conocé la sala →
          </a>
        </div>

        <HorarioEspecial />
      </div>


      <div className="hero__scroll-hint" aria-hidden="true">
        <span className="hero__scroll-dot" />
      </div>
    </section>
  )
}
