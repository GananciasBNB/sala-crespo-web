import { IconTrophy } from './Icons'
import HorarioEspecial from './HorarioEspecial'
import './Hero.css'

export default function Hero() {
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

        <HorarioEspecial />
      </div>


      <div className="hero__scroll-hint" aria-hidden="true">
        <span className="hero__scroll-dot" />
      </div>
    </section>
  )
}
