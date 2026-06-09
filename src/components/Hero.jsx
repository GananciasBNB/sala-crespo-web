import { useEffect, useState } from 'react'
import { IconTrophy } from './Icons'
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
      {/* Fondo Mundial 2026 — video de pelota al atardecer (capa principal).
          La foto antigua de las máquinas se reemplazó por este video durante
          la temporada del Mundial. Si el video no carga, el overlay/grid
          mantienen el fondo legible con el linear-gradient de fallback. */}
      <div className="hero__mundial-video" aria-hidden="true">
        <video autoPlay loop muted playsInline preload="auto">
          <source src="/mundial-hero-pelota.mp4" type="video/mp4" />
        </video>
      </div>

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
          <a href="/prode" className="btn-primary hero__cta-main">
            <IconTrophy size={18} color="#fff" style={{marginRight:8,verticalAlign:'middle'}} /> Jugá el Prode Mundial 2026
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
