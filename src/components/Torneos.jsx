import { useEffect, useState } from 'react'
import { useScrollRevealParent } from '../hooks/useScrollReveal'
import { getContent } from '../api/client'
import { IconTrophy } from './Icons'
import './Torneos.css'

export default function Torneos() {
  const ref = useScrollRevealParent()
  const [content, setContent] = useState({})

  useEffect(() => {
    getContent().then(setContent).catch(() => {})
  }, [])

  const fechaTorneo  = content?.torneos?.fecha_torneo  || '26 de Marzo · 21:30 hs'
  const linkTorneo   = content?.torneos?.link_torneo   || 'https://docs.google.com/forms/d/1sOfBSy8FXm-ncMuQGU6GqbP60zP08DADbb0DrqGBG8g/edit'
  const bannerActivo = content?.torneos?.banner_activo !== 'false'

  return (
    <section id="torneos" className="torneos" ref={ref}>
      <div className="torneos__bg">
        <div className="torneos__bg-glow" />
      </div>

      <div className="container">
        <div className="torneos__inner">

          {/* Banner editable del próximo torneo */}
          {bannerActivo && (
            <a
              href={linkTorneo}
              target="_blank"
              rel="noopener noreferrer"
              className="reveal torneos__banner"
            >
              <div className="torneos__banner-pulse" />
              <span className="torneos__banner-label">PRÓXIMO TORNEO</span>
              <span className="torneos__banner-fecha">
                <svg className="torneos__calendar-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="16" height="15" rx="2"/>
                  <line x1="2" y1="8" x2="18" y2="8"/>
                  <line x1="6" y1="1" x2="6" y2="5"/>
                  <line x1="14" y1="1" x2="14" y2="5"/>
                </svg>
                {fechaTorneo}
              </span>
              <span className="torneos__banner-cta">
                Inscribite acá
                <svg className="torneos__arrow-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="2" y1="8" x2="13" y2="8"/>
                  <polyline points="9,4 13,8 9,12"/>
                </svg>
              </span>
            </a>
          )}

          <div className="reveal torneos__header">
            <span className="eyebrow">Torneos de slots</span>
            <div className="torneos__prize">
              <span className="torneos__prize-amount">$200.000</span>
              <span className="torneos__prize-label">en premios por torneo</span>
            </div>
            <h2 className="section-title torneos__title">
              ¿Ganar $200 mil?<br /><em>¿Te lo imaginás?</em>
            </h2>
            <div className="gold-line center" />
          </div>

          <div className="torneos__cards">
            <div className="reveal reveal-d1 card torneos__card">
              <div className="torneos__card-icon"><IconTrophy size={36} /></div>
              <h3>Torneo Mensual</h3>
              <p>Cada mes organizamos torneos gratuitos de slots. Inscripción libre para todos los clientes de la sala.</p>
            </div>
            <div className="reveal reveal-d2 card torneos__card torneos__card--highlight">
              <div className="torneos__card-icon">👑</div>
              <h3>$200.000 en premios</h3>
              <p>Primero, segundo y tercer puesto con premios en efectivo. El mejor jugador del mes se lleva el gran premio.</p>
              <div className="torneos__card-tag">¡Gratis para todos!</div>
            </div>
            <div className="reveal reveal-d3 card torneos__card">
              <div className="torneos__card-icon">🎁</div>
              <h3>A&amp;B de Cortesía</h3>
              <p>En todos los torneos: comida, bebidas y dulces sin costo para todos los participantes.</p>
            </div>
          </div>

          <div className="reveal reveal-d4 torneos__cta">
            <p className="torneos__sub">Seguinos en Instagram para enterarte de la próxima fecha</p>
            <a
              href="https://www.instagram.com/salajuegoscrespo/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{marginRight:'8px',verticalAlign:'middle',flexShrink:0}}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              @salajuegoscrespo
            </a>
          </div>

        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
