import { Link } from 'react-router-dom'
import { useScrollRevealParent } from '../hooks/useScrollReveal'
import './JackpointsTeaser.css'

// Bloque corto en la home: lo relevante de Jackpoints en 10 segundos y un
// botón a la página completa (/jackpoints). Sale como "Próximamente" sin fecha.
const NUMEROS = [
  { n: '100', t: 'puntos de bienvenida' },
  { n: '+50', t: 'puntos por cada visita' },
  { n: '3', t: 'giros de Fortuna Dorada cada 3 horas' },
  { n: '$150.000', t: 'en tickets, todos los meses' },
]

export default function JackpointsTeaser() {
  const ref = useScrollRevealParent()
  return (
    <section id="jackpoints" className="jpt" ref={ref}>
      <div className="container">
        <div className="reveal jpt__card">
          <div className="jpt__glow" aria-hidden="true" />
          <div className="jpt__inner">
            <span className="jpt__badge"><i /> Próximamente</span>
            <img className="jpt__logo" src="/jackpoints/logo.webp" alt="Jackpoints, programa de beneficios de Sala de Juegos Crespo" loading="lazy" />
            <h2 className="section-title jpt__title">Venís, jugás, <em>sumás</em>.</h2>
            <p className="jpt__desc">
              <strong>Jackpoints</strong> es el club de beneficios de Sala de Juegos Crespo. Cada visita suma puntos,
              los puntos se canjean por bebidas, comidas y tickets promocionales, y de paso girás la Fortuna Dorada.
              Gratis, con tu DNI, en la sala.
            </p>
            <div className="jpt__nums">
              {NUMEROS.map(x => (
                <div key={x.t} className="jpt__num"><b>{x.n}</b><span>{x.t}</span></div>
              ))}
            </div>
            <Link to="/jackpoints" className="btn-gold jpt__cta">Conocé Jackpoints</Link>
          </div>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
