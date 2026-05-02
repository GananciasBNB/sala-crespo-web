import { useScrollRevealParent } from '../hooks/useScrollReveal'
import { IconPin } from './Icons'
import './Ubicacion.css'

const HORARIOS = [
  { dias: 'Domingo a Jueves', horas: '15:00 — 03:00 hs' },
  { dias: 'Viernes, Sábados y Vísperas de Feriados', horas: '15:00 — 04:00 hs', destacado: true },
]

export default function Ubicacion() {
  const ref = useScrollRevealParent()

  const mapsUrl =
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3415.0!2d-60.3233!3d-32.0285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzLCsDAxJzQyLjYiUyA2MMKwMTknMjMuOSJX!5e0!3m2!1ses!2sar!4v1234567890'

  return (
    <section id="ubicacion" className="ubicacion" ref={ref}>
      <div className="container">
        <div className="reveal ubicacion__header">
          <span className="eyebrow">Cómo llegarnos</span>
          <h2 className="section-title">Encontranos<br /><em>en el centro</em></h2>
          <div className="gold-line" />
        </div>

        <div className="ubicacion__grid">
          <div className="reveal reveal-d1 ubicacion__info">
            <div className="ubicacion__address">
              <IconPin size={22} />
              <div>
                <h3>San Martín 1053</h3>
                <p>Crespo, Entre Ríos</p>
              </div>
            </div>

            <div className="ubicacion__horarios">
              <h4 className="ubicacion__horarios-title">
                🕒 Horarios de atención
              </h4>
              {HORARIOS.map(h => (
                <div
                  key={h.dias}
                  className={`ubicacion__horario-row ${h.destacado ? 'ubicacion__horario-row--gold' : ''}`}
                >
                  <span className="ubicacion__horario-day">{h.dias}</span>
                  <span className="ubicacion__horario-time">{h.horas}</span>
                </div>
              ))}
            </div>

            <div className="ubicacion__redes">
              <h4 className="ubicacion__redes-title">Seguinos</h4>
              <a
                href="https://www.instagram.com/salajuegoscrespo/"
                target="_blank"
                rel="noopener noreferrer"
                className="ubicacion__red"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                <span>@salajuegoscrespo</span>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61583318054058"
                target="_blank"
                rel="noopener noreferrer"
                className="ubicacion__red"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <span>Facebook</span>
              </a>
            </div>
          </div>

          <div className="reveal reveal-d2 ubicacion__map-wrap">
            <iframe
              title="Sala de Juegos Crespo — San Martín 1053"
              src={`https://maps.google.com/maps?q=San+Martin+1053,+Crespo,+Entre+Rios,+Argentina&output=embed&z=16`}
              width="100%"
              height="380"
              style={{ border: 0, borderRadius: '10px', filter: 'grayscale(20%) invert(90%) hue-rotate(180deg)' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
