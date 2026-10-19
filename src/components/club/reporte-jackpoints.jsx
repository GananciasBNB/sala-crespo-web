import { useState, useEffect, useCallback } from 'react'
import { adminClubReporte } from '../../api/client'
import './reporte-jackpoints.css'

// Live Jackpoints report (same layout as the KPI report Pacha approved): numbers computed by the
// server at load time for any period; cards open the lists behind them.
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const n = v => (Number(v) || 0).toLocaleString('es-AR')
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '–')
const etiqueta = f => { const d = new Date(f + 'T12:00:00Z'); return DIAS[d.getUTCDay()].replace(/^./, c => c.toUpperCase()) + ' ' + f.slice(8, 10) }
const fechaLarga = f => `${etiqueta(f)}/${f.slice(5, 7)}/${f.slice(0, 4)}`
const plata = v => '$' + n(v)
const guion = v => (v ? n(v) : '–')
const guionPlata = v => (v ? plata(v) : '–')

// automatic notes from simple rules (the hand-written "anda bien / a mirar" of the static report)
function notas(r, f) {
  const bien = [], mirar = []
  const act = f.map(d => r.porDia[d]?.activos || 0), mejor = Math.max(0, ...act)
  if (mejor) bien.push(`Mejor jornada del período: ${etiqueta(f[act.indexOf(mejor)])} con ${mejor} socios activos.`)
  const vuelven = (r.recurrencia?.dos || 0) + (r.recurrencia?.tres || 0)
  if (vuelven) bien.push(`${vuelven} socios vinieron más de un día; ${r.recurrencia.tres} vinieron 3 días o más.`)
  if (r.pesca?.partidas) bien.push(`La Gran Pesca: ${n(r.pesca.partidas)} partidas de ${n(r.pesca.socios)} socios.`)
  if (r.detalle.madres.length) bien.push(`Día de la Madre: ${r.detalle.madres.length} madres aceptaron el regalo.`)
  const esp = Object.values(r.pescaEsp).reduce((a, e) => ({ ts: a.ts + e.ticketSalio, ta: a.ta + e.ticketAtrapado }), { ts: 0, ta: 0 })
  if (esp.ts >= 5 && esp.ta / esp.ts < 0.2) mirar.push(`El pez Jackpoints casi no se atrapa (${esp.ta} de ${esp.ts}, ${pct(esp.ta, esp.ts)}).`)
  if (r.nuevos.total >= 5 && r.nuevos.conEmail / r.nuevos.total < 0.4) mirar.push(`Solo ${r.nuevos.conEmail} de ${r.nuevos.total} clientes nuevos dejaron email.`)
  if (r.saldoPuntosVivos > 20000) mirar.push(`Hay ${n(r.saldoPuntosVivos)} puntos sin canjear (unos $${n(r.saldoPuntosVivos)} de pasivo a 1 punto = $1).`)
  if (r.recurrencia?.socios && r.recurrencia.un_dia / r.recurrencia.socios > 0.5) mirar.push(`${pct(r.recurrencia.un_dia, r.recurrencia.socios)} de los socios vino un solo día.`)
  return { bien, mirar }
}

function Tabla({ cols, filas }) {
  return (
    <div className="rep__scroll"><table><thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{filas.map((f, i) => <tr key={i}>{f.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table></div>
  )
}

// one table per topic, one row per sala day + total
function TablaJornadas({ dias, enCurso, titulo, ayuda, cols, fila, total }) {
  return (
    <section className="rep__caja">
      <h2>{titulo}</h2>
      <p className="rep__nota">{ayuda}</p>
      <div className="rep__scroll"><table className="rep__num">
        <thead><tr><th>Jornada</th>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {dias.map(([d, x]) => <tr key={d}><td>{etiqueta(d)}{d === enCurso ? ' · en curso' : ''}</td>{fila(x, d).map((v, i) => <td key={i}>{v}</td>)}</tr>)}
          <tr className="rep__tot"><td>Total</td>{total.map((v, i) => <td key={i}>{v}</td>)}</tr>
        </tbody>
      </table></div>
    </section>
  )
}

export default function ReporteJackpoints({ token, toast }) {
  const [desde, setDesde] = useState('2026-10-11')
  const [hasta, setHasta] = useState('')
  const [r, setR] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [abierto, setAbierto] = useState(null)
  const cargar = useCallback(() => {
    setCargando(true)
    adminClubReporte(token, desde, hasta || undefined)
      .then(d => { setR(d); if (!hasta) setHasta(d.hasta) })
      .catch(err => toast.show(err.message, 'err'))
      .finally(() => setCargando(false))
  }, [token, desde, hasta]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!r) return <p className="ca__cargando">Cargando…</p>
  const f = Object.keys(r.porDia).sort()
  const sum = c => f.reduce((a, d) => a + (r.porDia[d]?.[c] || 0), 0)
  const dias = f.map(d => [d, r.porDia[d] || {}])
  const sumPts = o => f.reduce((a, d) => a + (r.porDia[d]?.pts?.[o] || 0), 0)
  const maxAct = Math.max(1, ...f.map(d => r.porDia[d]?.activos || 0))
  const esp = Object.values(r.pescaEsp).reduce((a, e) => ({ ts: a.ts + e.ticketSalio, ta: a.ta + e.ticketAtrapado, ps: a.ps + e.ptsSalio, pa: a.pa + e.ptsAtrapado }), { ts: 0, ta: 0, ps: 0, pa: 0 })
  const dm = r.detalle.madres, dmOk = dm.filter(m => m.cortesia === 'delivered').length
  const { bien, mirar } = notas(r, f)
  const vuelven = (r.recurrencia?.dos || 0) + (r.recurrencia?.tres || 0)
  const PANELES = {
    nuevos: ['Clientes nuevos', <Tabla cols={['Socio', 'DNI', 'Alta', 'Email', 'Cumple']} filas={r.detalle.nuevos.map(x => [x.name, x.dni, x.cuando, x.email ? 'sí' : '—', x.cumple ? 'sí' : '—'])} />],
    vuelven: ['Volvieron otro día', <Tabla cols={['Socio', 'DNI', 'Días', 'Jornadas']} filas={r.detalle.vuelven.map(x => [x.name, x.dni, x.dias, x.fechas])} />],
    tickets: ['Tickets entregados', <>
      <p className="rep__nota">Total {plata(r.plata?.total)} · Fortuna Dorada {plata(r.plata?.fortuna)} · La Gran Pesca {plata(r.plata?.pesca)} · cobrado en caja {plata(r.plata?.cobrado)}{r.plata?.sinCobrar ? ` · sin cobrar todavía ${plata(r.plata.sinCobrar)}` : ''}</p>
      <Tabla cols={['Cuándo', 'Socio', 'DNI', 'Juego', 'Cómo salió', 'Monto', 'En caja']} filas={r.detalle.tickets.map(x => [
        x.cuando, x.name, x.dni, x.juego, x.via, plata(x.monto),
        x.status === 'delivered' ? `Cobrado ${x.cobrado || ''}${x.cajero ? ` · ${x.cajero}` : ''}` : x.status === 'cancelled' ? 'Anulado' : 'Sin cobrar'])} />
    </>],
    madres: ['Día de la Madre', <Tabla cols={['Cuándo', 'Socio', 'DNI', 'Cortesía']} filas={dm.map(x => [x.cuando, x.name, x.dni, x.cortesia === 'delivered' ? 'canjeada' : x.cortesia === 'pending' ? 'por canjear' : 'sin imprimir'])} />],
  }
  const Tarjeta = ({ id, valor, label, det, dest }) => {
    const click = id && PANELES[id]
    const cont = <><b>{valor}</b><span>{label}</span><small>{det}</small>{click && <em className="rep__ver">Ver lista ›</em>}</>
    return click
      ? <button type="button" className={`rep__kpi rep__kpi--click${dest ? ' rep__kpi--dest' : ''}`} aria-expanded={abierto === id} onClick={() => setAbierto(abierto === id ? null : id)}>{cont}</button>
      : <div className={`rep__kpi${dest ? ' rep__kpi--dest' : ''}`}>{cont}</div>
  }

  return (
    <div className="rep">
      <div className="rep__barra">
        <label>Desde <input type="date" id="rep-desde" value={desde} onChange={e => setDesde(e.target.value)} /></label>
        <label>Hasta <input type="date" id="rep-hasta" value={hasta} onChange={e => setHasta(e.target.value)} /></label>
        <button type="button" className="rep__actualizar" onClick={cargar} disabled={cargando}>{cargando ? 'Actualizando…' : '↻ Actualizar'}</button>
      </div>
      <h1>Jackpoints · reporte {r.desde.slice(8, 10)}/{r.desde.slice(5, 7)} al {r.hasta.slice(8, 10)}/{r.hasta.slice(5, 7)}</h1>
      <div className="rep__periodo">
        <div><span>DESDE</span><b>{fechaLarga(r.desde)}</b></div>
        <div><span>HASTA</span><b>{fechaLarga(r.hasta)}{r.enCurso ? ' · en curso' : ''}</b></div>
        <div><span>DATOS EN VIVO</span><b>{r.ahora}</b></div>
        <div><span>JORNADAS</span><b>{f.length}</b></div>
      </div>
      <p className="rep__sub">Jornada de 04:00 a 04:00: la noche cuenta para el día en que empezó. Sin probadores, empleados ni la cuenta PRUEBA. Tocá las tarjetas con "Ver lista" para ver el detalle.</p>

      <div className="rep__kpis">
        <Tarjeta valor={n(r.recurrencia?.socios)} label="Socios que usaron la máquina" det="al menos una visita" />
        <Tarjeta id="nuevos" valor={n(r.nuevos.total)} label="Clientes nuevos" det={`${n(r.nuevos.conTel)} con celular · ${n(r.nuevos.conEmail)} con email`} />
        <Tarjeta id="vuelven" valor={pct(vuelven, r.recurrencia?.socios)} label="Volvieron otro día" det={`${n(vuelven)} de ${n(r.recurrencia?.socios)} · ${n(r.recurrencia?.tres)} vinieron 3 días o más`} />
        <Tarjeta valor={n(sum('visitas'))} label="Visitas registradas" det={`${String(r.recurrencia?.promedio || 0).replace('.', ',')} días por socio`} />
        <Tarjeta valor={n(sum('giros'))} label="Giros de Fortuna" det="en el período" />
        <Tarjeta id="tickets" valor={plata(r.plata?.total)} label={`${n(r.detalle.tickets.length)} tickets entregados`} det={`Fortuna ${plata(r.plata?.fortuna)} · Pesca ${plata(r.plata?.pesca)} · cobrado ${plata(r.plata?.cobrado)}`} />
        <Tarjeta valor={n(r.pesca?.partidas)} label="Partidas de La Gran Pesca" det={`${n(r.pesca?.socios)} socios distintos`} />
        {dm.length > 0
          ? <Tarjeta id="madres" dest valor={n(dm.length)} label="Madres con su regalo" det={`${dmOk} cortesías ya canjeadas · ${dm.length - dmOk} por canjear`} />
          : <Tarjeta valor={n(r.saldoPuntosVivos)} label="Puntos sin canjear" det="saldo actual de los socios" />}
      </div>
      {abierto && PANELES[abierto] && (
        <section className="rep__caja rep__panel">
          <div className="rep__panel-cab"><h2>{PANELES[abierto][0]}</h2><button type="button" className="rep__cerrar" onClick={() => setAbierto(null)}>Cerrar ✕</button></div>
          {PANELES[abierto][1]}
        </section>
      )}

      <section className="rep__caja">
        <h2>Socios activos por jornada</h2>
        <div className="rep__barras" style={{ gridTemplateColumns: `repeat(${Math.max(1, f.length)}, 1fr)` }}>
          {f.map(d => { const a = r.porDia[d]?.activos || 0; return (
            <div key={d} className="rep__b"><b>{a}</b><i className={d === r.enCurso ? 'rep__b-curso' : ''} style={{ height: `${Math.round((a / maxAct) * 100)}%` }} /><span>{etiqueta(d)}{d === r.enCurso && <><br />(en curso)</>}</span></div>
          ) })}
        </div>
      </section>

      <TablaJornadas dias={dias} enCurso={r.enCurso} titulo="Resumen por jornada" ayuda="Cuánta gente usó la máquina y qué se le entregó en total ese día."
        cols={['Socios activos', 'Nuevos', 'Plata en tickets', 'Cobrado en caja', 'Puntos entregados', 'Cupones del sorteo']}
        fila={x => [n(x.activos), guion(x.nuevos), guionPlata(x.pesos), guionPlata(x.cobrado), guion(x.ptsEmitidos), guion(x.cupones)]}
        total={[`${n(r.recurrencia?.socios)} únicos`, n(sum('nuevos')), plata(r.plata?.total), plata(r.plata?.cobrado), n(sum('ptsEmitidos')), n(sum('cupones'))]} />

      <TablaJornadas dias={dias} enCurso={r.enCurso} titulo="Fortuna Dorada por jornada" ayuda="Giros de la ruleta: tickets (por giro o por bonus) y puntos que ganaron."
        cols={['Giros', 'Socios que giraron', 'Tickets', 'Plata en tickets', 'Puntos ganados']}
        fila={x => [guion(x.giros), guion(x.giradores), guion(x.fortunaTickets), guionPlata(x.fortunaPesos), guion(x.pts?.fortuna)]}
        total={[n(sum('giros')), '', n(sum('fortunaTickets')), plata(r.plata?.fortuna), n(sumPts('fortuna'))]} />

      <TablaJornadas dias={dias} enCurso={r.enCurso} titulo="La Gran Pesca por jornada" ayuda="Juego del día: el pez Jackpoints da un ticket de $5.000; los puntos son de los peces de puntos y de los premios a los 3 mejores."
        cols={['Partidas', 'Socios que jugaron', 'Pez ticket: salió', 'Pez ticket: atrapado', 'Plata en tickets', 'Puntos ganados']}
        fila={(x, d) => [guion(x.pescaPartidas), guion(x.pescadores), guion(r.pescaEsp[d]?.ticketSalio), guion(r.pescaEsp[d]?.ticketAtrapado), guionPlata(x.pescaPesos), guion(x.pts?.pesca)]}
        total={[n(sum('pescaPartidas')), `${n(r.pesca?.socios)} únicos`, n(esp.ts), `${n(esp.ta)} (${pct(esp.ta, esp.ts)})`, plata(r.plata?.pesca), n(sumPts('pesca'))]} />

      <TablaJornadas dias={dias} enCurso={r.enCurso} titulo="De dónde salieron los puntos" ayuda="Puntos acreditados a los socios cada día, según el motivo. Regalos = Día de la Madre, cumpleaños y cargas a mano."
        cols={['Por visita', 'Bienvenida', 'Fortuna Dorada', 'La Gran Pesca', 'Regalos', 'Total']}
        fila={x => [guion(x.pts?.visitas), guion(x.pts?.bienvenida), guion(x.pts?.fortuna), guion(x.pts?.pesca), guion(x.pts?.otros), n(x.ptsEmitidos)]}
        total={[n(sumPts('visitas')), n(sumPts('bienvenida')), n(sumPts('fortuna')), n(sumPts('pesca')), n(sumPts('otros')), n(sum('ptsEmitidos'))]} />

      <div className="rep__dos">
        <section className="rep__caja">
          <h2>La Gran Pesca</h2>
          <ul>
            <li>{n(r.pesca?.partidas)} partidas de {n(r.pesca?.socios)} socios. Puntaje promedio {n(r.pesca?.prom)}, récord {n(r.pesca?.maximo)}.</li>
            {r.ganadores.slice(0, 3).map(g => <li key={g.fecha}>Ganadores del {g.fecha.slice(8, 10)}/{g.fecha.slice(5, 7)}: {g.ganadores.map(x => `${x.nombre} ${n(x.puntaje)} (+${x.puntos})`).join(', ') || 'sin ganadores'}.</li>)}
            {r.liderHoy.length > 0 && <li>Líderes de hoy: {r.liderHoy.map(x => `${x.nombre} ${n(x.puntaje)}`).join(', ')}.</li>}
          </ul>
        </section>
        <section className="rep__caja">
          <h2>Peces especiales</h2>
          <Tabla cols={['Pez', 'Salieron', 'Atrapados', '%']} filas={[
            ['Pez Jackpoints (ticket)', esp.ts, esp.ta, pct(esp.ta, esp.ts)],
            ['Peces de puntos', esp.ps, esp.pa, pct(esp.pa, esp.ps)],
          ]} />
        </section>
      </div>

      <div className="rep__dos">
        <section className="rep__caja"><h2>Lo que anda bien</h2><ul>{bien.map(t => <li key={t} className="rep__ok">{t}</li>)}</ul></section>
        <section className="rep__caja rep__alerta"><h2>A mirar</h2><ul>{mirar.length ? mirar.map(t => <li key={t} className="rep__mal">{t}</li>) : <li>Nada fuera de lo normal.</li>}</ul></section>
      </div>

      <section className="rep__caja">
        <h2>Socios más fieles</h2>
        <Tabla cols={['Socio', 'Días']} filas={r.top.map(x => [x.name, x.dias])} />
      </section>
    </div>
  )
}
