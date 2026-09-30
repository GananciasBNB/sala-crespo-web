import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import './Jackpoints.css'

// Landing de Jackpoints: la página completa a la que manda el bloque de la
// home. Sale como "Próximamente" sin fecha; los números vienen de las bases.
const NUMEROS = [
  { n: '100', t: 'puntos de bienvenida' },
  { n: '+50', t: 'puntos por cada visita' },
  { n: '3', t: 'giros de Fortuna Dorada cada 3 horas' },
  { n: '$150.000', t: 'en tickets, todos los meses' },
]

const PASOS = [
  { t: 'Registrate', d: 'Colocá tu DNI en la máquina Jackpoints y elegí un PIN de 4 números. ¡Listo! Sumás 100 puntos de regalo.' },
  { t: 'Sumá con tu visita', d: 'Cada día que visitás la sala, pasás por la máquina Jackpoints y sumás 50 puntos.' },
  { t: 'Canjeá', d: 'Elegís tus canjes habilitados, imprimís tu cupón y lo retirás en la caja. ¡Ya podés disfrutar de tus puntos acumulados!' },
]

const BENEFICIOS = [
  { i: 'star', t: 'Puntos por visita', d: '50 puntos cada día que venís, hagas lo que hagas. Constancia que se convierte en consumo.', k: 'Todos los días' },
  { i: 'slot', t: 'Fortuna Dorada', d: 'El slot de la máquina. 3 giros cada 3 horas, con premios de hasta 500 puntos y tickets promocionales de $5.000.', k: 'Cada visita' },
  { i: 'ticket', t: 'Sorteo del mes', d: 'Un cupón por visita para el sorteo mensual de $150.000 en tickets. ¿Querés más chances? Canjeá un pack de 10 cupones por 150 puntos.', k: '$150.000 por mes' },
  { i: 'bag', t: 'Bebidas, comidas y tickets', d: 'Canjeá tus puntos por lo que quieras de la carta o por tickets promocionales para jugar. Cupón en mano, retirás en caja.', k: '1 punto = $1' },
  { i: 'trophy', t: 'Torneos de slots', d: 'Anotate a los torneos directamente desde la máquina. Serie 2026: satélites mensuales y una Gran Final por $2.000.000 en tickets.', k: 'Gran Final en diciembre' },
  { i: 'mail', t: 'Bebida de cortesía', d: 'Dejanos tu email al sumarte y te llega una bebida de cortesía para tu próxima visita. Además te avisamos de shows, torneos y promos.', k: 'Al registrarte' },
]

const ICONOS = {
  star: <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.8 5.8 20.3l1.6-6.8L2.2 8.9l6.9-.6z" />,
  slot: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M8 6v12M16 6v12M21 9h1v3h-1" /></>,
  ticket: <><path d="M4 7h16v4a2 2 0 000 4v4H4v-4a2 2 0 000-4z" /><path d="M12 7v12" /></>,
  bag: <><path d="M5 8h14l-1.5 12h-11z" /><path d="M8 8V6a4 4 0 018 0v2" /></>,
  trophy: <><path d="M8 21h8M12 17v4M6 3h12v5a6 6 0 01-12 0z" /><path d="M6 5H3v2a3 3 0 003 3M18 5h3v2a3 3 0 01-3 3" /></>,
  mail: <><path d="M3 7l9 6 9-6" /><rect x="3" y="5" width="18" height="14" rx="2" /></>,
}

const IG = 'https://instagram.com/salajuegoscrespo'

export default function Jackpoints() {
  return (
    <div className="jp">
      <header className="jp__top">
        <Link to="/" className="jp__back">← Sala de Juegos Crespo</Link>
        <a href={IG} target="_blank" rel="noopener noreferrer" className="jp__top-ig">Instagram</a>
      </header>

      {/* Hero */}
      <section className="jp__hero">
        <div className="jp__wrap">
          <span className="jp__badge"><i /> Próximamente en Sala de Juegos Crespo</span>
          <img className="jp__logo" src="/jackpoints/logo.webp" alt="Jackpoints, programa de beneficios, Crespo" />
          <h1 className="jp__h1">Venís, jugás, <em>sumás</em>.</h1>
          <p className="jp__lead">
            Presentamos <strong>Jackpoints</strong>, el club de beneficios de Sala de Juegos Crespo. Cada visita suma puntos.
            Los puntos se canjean por bebidas, comidas y tickets promocionales. Y de paso girás la Fortuna Dorada.
          </p>
          <div className="jp__cta">
            <a className="btn-gold" href="#como">Quiero saber más</a>
            <a className="jp__btn-ghost" href={IG} target="_blank" rel="noopener noreferrer">Seguinos en Instagram</a>
          </div>
          <small className="jp__small">Gratis · Te sumás en la sala con tu DNI en menos de un minuto · Solo mayores de 18 años</small>
          <div className="jp__strip">
            {NUMEROS.map(x => <div key={x.t}><b>{x.n}</b><span>{x.t}</span></div>)}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como" className="jp__sec">
        <div className="jp__wrap">
          <h2 className="jp__h2">Así de <span>simple</span></h2>
          <p className="jp__sub">Sin tarjetas, sin formularios, sin app que bajar.</p>
          <div className="jp__steps">
            {PASOS.map((p, i) => (
              <div key={p.t} className="jp__step"><span className="jp__n">{i + 1}</span><div><h3>{p.t}</h3><p>{p.d}</p></div></div>
            ))}
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="jp__sec jp__sec--alt">
        <div className="jp__wrap">
          <h2 className="jp__h2">Todo lo que te da <span>Jackpoints</span></h2>
          <p className="jp__sub">Un solo club, cinco formas de ganar. Y ninguna te cuesta nada.</p>
          <div className="jp__grid">
            {BENEFICIOS.map(b => (
              <div key={b.t} className="jp__card">
                <div className="jp__ico"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONOS[b.i]}</svg></div>
                <h3>{b.t}</h3><p>{b.d}</p><span className="jp__k">{b.k}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fortuna Dorada */}
      <section className="jp__sec">
        <div className="jp__wrap jp__feat">
          <div>
            <h2 className="jp__h2 jp__h2--left">Fortuna <span>Dorada</span></h2>
            <p className="jp__sub jp__sub--left">El slot de la máquina Jackpoints. Tirás, mirás, y si sale, sale.</p>
            <ul className="jp__list">
              <li>3 giros cada 3 horas, en cada visita.</li>
              <li>Premios de 50 a 500 puntos, directo a tu cuenta.</li>
              <li>Tickets promocionales de $5.000 para jugar.</li>
              <li>Momentos dorados: premios que caen a horas sorpresa a lo largo del día.</li>
              <li>Todo se acredita al instante y lo ves en tu cuenta.</li>
            </ul>
          </div>
          <div className="jp__shot"><img src="/jackpoints/fortuna-dorada.webp" alt="Fortuna Dorada, el slot de la máquina Jackpoints" loading="lazy" /></div>
        </div>
      </section>

      {/* Sorteo */}
      <section className="jp__sec jp__sec--alt jp__sec--tight">
        <div className="jp__wrap">
          <div className="jp__sorteo">
            <div className="jp__eyebrow">Sorteo del mes</div>
            <div className="jp__big">$150.000</div>
            <p>en tickets, todos los meses, entre los cupones de la urna. Cada visita te da un cupón. Y con 150 puntos te llevás un pack de 10 cupones más.</p>
            <div className="jp__pills">
              <span><b>1</b> cupón por visita, gratis</span>
              <span><b>+10</b> cupones por 150 puntos</span>
              <span><b>1</b> pack por día</span>
            </div>
          </div>
        </div>
      </section>

      {/* Canjes */}
      <section className="jp__sec">
        <div className="jp__wrap">
          <h2 className="jp__h2">¿En qué los <span>canjeás</span>?</h2>
          <p className="jp__sub">Los puntos valen lo mismo que la carta: 1 punto = $1. Sin letra chica.</p>
          <div className="jp__canjes">
            <div><b>Bebidas</b><span>Gaseosas, aguas, cervezas y tragos de la barra.</span></div>
            <div><b>Comidas</b><span>Picadas, sándwiches y lo que salga de la cocina.</span></div>
            <div><b>Tickets promocionales</b><span>Para jugar en la sala, en distintos valores.</span></div>
            <div><b>Cupones del sorteo</b><span>Pack de 10 por 150 puntos. Más chances al mes.</span></div>
          </div>
          <p className="jp__note">Elegís en la máquina, se imprime tu cupón y lo retirás en caja o en la barra. Los canjes no vencen: cuando quieras, lo pasás a buscar.</p>
        </div>
      </section>

      {/* Cierre */}
      <section className="jp__final">
        <div className="jp__wrap">
          <span className="jp__badge"><i /> Muy pronto</span>
          <h2 className="jp__h2">Tu próxima visita ya <span>suma</span></h2>
          <p className="jp__sub">Jackpoints se activa en la sala. Cuando vengas, buscá la máquina Jackpoints, poné tu DNI y empezá a sumar. Es gratis y tarda menos de un minuto.</p>
          <div className="jp__cta">
            <a className="btn-gold" href={IG} target="_blank" rel="noopener noreferrer">Enterate primero en Instagram</a>
          </div>
          <p className="jp__legal">
            <a href="/legal/bases-jackpoints.html" target="_blank" rel="noopener noreferrer">Bases y condiciones del programa</a> · <a href="/legal/bases-sorteo-jackpoints.html" target="_blank" rel="noopener noreferrer">Bases del sorteo mensual</a> · Solo para mayores de 18 años · Jugá con responsabilidad
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
