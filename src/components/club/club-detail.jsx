// Club panel: what's behind each number. A generic detail sheet (any card of
// "Hoy"), the live feed, and the member list with filters + member history.
import { useState, useEffect, useMemo } from 'react'
import { adminClubDetail, adminClubSocios, adminClubSocio } from '../../api/client'

const pts = n => (Number(n) || 0).toLocaleString('es-AR')
const fechaCorta = iso => iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

// Bottom sheet on phones, centered panel on desktop. Esc / backdrop closes.
export function Hoja({ titulo, onClose, children }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="cd__fondo" onClick={onClose}>
      <div className="cd__hoja" role="dialog" aria-label={titulo} onClick={e => e.stopPropagation()}>
        <div className="cd__cab">
          <h3 className="cd__tit">{titulo}</h3>
          <button className="cd__cerrar" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="cd__cuerpo">{children}</div>
      </div>
    </div>
  )
}

export function Tabla({ columnas, filas, onFila, vacio = 'No hay nada para mostrar.' }) {
  if (!filas.length) return <p className="cd__vacio">{vacio}</p>
  return (
    <div className="cd__tabla-wrap">
      <table className="cd__tabla">
        <thead><tr>{columnas.map(c => <th key={c.key} className={c.align === 'right' ? 'cd__der' : ''}>{c.label}</th>)}</tr></thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.id || i} className={onFila ? 'cd__fila-click' : ''} onClick={onFila ? () => onFila(f) : undefined}>
              {columnas.map(c => <td key={c.key} className={c.align === 'right' ? 'cd__der' : ''}>{f[c.key] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Resumen({ items }) {
  return (
    <div className="cd__resumen">
      {items.map(r => (
        <div key={r.label} className="cd__res">
          <div className="cd__res-v">{r.valor}</div>
          <div className="cd__res-l">{r.label}</div>
        </div>
      ))}
    </div>
  )
}

// Detail of one card: the backend answers { titulo, resumen, secciones, nota }
export function DetalleHoja({ token, tipo, onClose, toast, pie }) {
  const [d, setD] = useState(null)
  useEffect(() => {
    let vivo = true
    adminClubDetail(token, tipo).then(r => { if (vivo) setD(r) })
      .catch(err => { toast.show(err.message, 'err'); onClose() })
    return () => { vivo = false }
  }, [token, tipo]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Hoja titulo={d?.titulo || 'Cargando…'} onClose={onClose}>
      {!d ? <p className="cd__vacio">Cargando…</p> : (
        <>
          <Resumen items={d.resumen} />
          {d.nota && <p className="cd__nota">{d.nota}</p>}
          {d.secciones.map(s => (
            <section key={s.titulo} className="cd__sec">
              <h4 className="cd__sec-tit">{s.titulo} <span>{s.filas.length}</span></h4>
              <Tabla columnas={s.columnas} filas={s.filas} />
            </section>
          ))}
          {pie}
        </>
      )}
    </Hoja>
  )
}

// ── Live feed of today ──────────────────────────────────────────────────────
const ICONO_EVENTO = { giro: '🎰', visita: '👋', canje: '🛍', barra: '💁', cupon: '🎟' }
export function FeedHoy({ token }) {
  const [ev, setEv] = useState(null)
  const [todo, setTodo] = useState(false)
  useEffect(() => {
    let vivo = true
    const cargar = () => adminClubDetail(token, 'feed').then(r => { if (vivo) setEv(r.eventos) }).catch(err => console.warn('feed:', err.message))
    cargar()
    const iv = setInterval(cargar, 60000)   // refresh every minute while open
    return () => { vivo = false; clearInterval(iv) }
  }, [token])
  if (!ev) return <p className="cd__vacio">Cargando…</p>
  if (!ev.length) return <p className="cd__vacio">Todavía no pasó nada hoy.</p>
  const lista = todo ? ev : ev.slice(0, 10)
  return (
    <div className="cd__feed">
      {lista.map((e, i) => (
        <div key={i} className={`cd__ev cd__ev--${e.tipo}`}>
          <span className="cd__ev-hora">{e.hora}</span>
          <span className="cd__ev-ico">{ICONO_EVENTO[e.tipo] || '•'}</span>
          <span className="cd__ev-txt"><strong>{e.socio}</strong> · {e.texto}</span>
        </div>
      ))}
      {ev.length > 10 && (
        <button className="cd__mas" onClick={() => setTodo(t => !t)}>{todo ? 'Ver menos' : `Ver los últimos ${ev.length}`}</button>
      )}
    </div>
  )
}

// ── Members: list, filters, sort, history ───────────────────────────────────
const COLS_SOCIOS = [
  { key: 'nombre', label: 'Socio' },
  { key: 'saldo', label: 'Saldo', num: true },
  { key: 'ganados', label: 'Ganó', num: true },
  { key: 'canjeados', label: 'Canjeó', num: true },
  { key: 'visitas', label: 'Visitas', num: true },
  { key: 'giros', label: 'Giros', num: true },
  { key: 'tickets', label: 'Tickets', num: true },
  { key: 'ultima', label: 'Última visita', fecha: true },
  { key: 'alta', label: 'Alta', fecha: true },
]

export function SociosLista({ token, toast }) {
  const [socios, setSocios] = useState(null)
  const [q, setQ] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [actividad, setActividad] = useState('')
  const [segmento, setSegmento] = useState('')
  const [contacto, setContacto] = useState('')
  const [orden, setOrden] = useState({ key: 'saldo', dir: -1 })
  const [abierto, setAbierto] = useState(null)

  useEffect(() => {
    adminClubSocios(token).then(r => setSocios(r.socios)).catch(err => toast.show(err.message, 'err'))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const localidades = useMemo(() => [...new Set((socios || []).map(s => s.localidad).filter(Boolean))].sort(), [socios])
  const segmentos = useMemo(() => [...new Set((socios || []).map(s => s.segmento).filter(Boolean))].sort(), [socios])

  const filtrados = useMemo(() => {
    if (!socios) return []
    const t = q.trim().toLowerCase()
    const dig = t.replace(/\D/g, '')
    let l = socios.filter(s =>
      (!t || s.nombre.toLowerCase().includes(t) || (dig && (s.dni.includes(dig) || s.tel.replace(/\D/g, '').includes(dig))) || s.email.toLowerCase().includes(t)) &&
      (!localidad || (localidad === '_sin' ? !s.localidad : s.localidad === localidad)) &&
      (!segmento || (segmento === '_sin' ? !s.segmento : s.segmento === segmento)) &&
      (!actividad ||
        (actividad === '7' && s.visitas7 > 0) || (actividad === '30' && s.visitas30 > 0) ||
        (actividad === 'inactivo' && s.visitas30 === 0) || (actividad === 'una' && s.visitas <= 1) ||
        (actividad === 'saldo' && s.saldo > 0) || (actividad === 'canjeo' && s.canjeados > 0)) &&
      (!contacto || (contacto === 'email' ? s.email : contacto === 'tel' ? s.tel : contacto === 'sinemail' ? !s.email : true)))
    const col = COLS_SOCIOS.find(c => c.key === orden.key)
    l = [...l].sort((a, b) => {
      const va = a[orden.key], vb = b[orden.key]
      if (col?.fecha) return ((va ? new Date(va) : 0) - (vb ? new Date(vb) : 0)) * orden.dir
      if (col?.num) return ((va || 0) - (vb || 0)) * orden.dir
      return String(va || '').localeCompare(String(vb || ''), 'es') * orden.dir
    })
    return l
  }, [socios, q, localidad, segmento, actividad, contacto, orden])

  function ordenarPor(key) {
    setOrden(o => o.key === key ? { key, dir: -o.dir } : { key, dir: key === 'nombre' ? 1 : -1 })
  }

  if (!socios) return <p className="ca__cargando">Cargando socios…</p>
  const totSaldo = filtrados.reduce((a, s) => a + s.saldo, 0)

  return (
    <div className="cd__socios">
      <div className="cd__filtros">
        <input className="cd__buscar" placeholder="Buscar nombre, DNI, celular o email" value={q} onChange={e => setQ(e.target.value)} />
        <select value={actividad} onChange={e => setActividad(e.target.value)}>
          <option value="">Todos</option>
          <option value="7">Vinieron en 7 días</option>
          <option value="30">Vinieron en 30 días</option>
          <option value="inactivo">No vienen hace +30 días</option>
          <option value="una">Vinieron 1 sola vez</option>
          <option value="saldo">Con puntos</option>
          <option value="canjeo">Ya canjearon</option>
        </select>
        <select value={localidad} onChange={e => setLocalidad(e.target.value)}>
          <option value="">Toda localidad</option>
          {localidades.map(l => <option key={l} value={l}>{l}</option>)}
          <option value="_sin">Sin dato de localidad</option>
        </select>
        {segmentos.length > 0 && (
          <select value={segmento} onChange={e => setSegmento(e.target.value)}>
            <option value="">Todo segmento</option>
            {segmentos.map(s => <option key={s} value={s}>Segmento {s}</option>)}
            <option value="_sin">Sin segmento</option>
          </select>
        )}
        <select value={contacto} onChange={e => setContacto(e.target.value)}>
          <option value="">Cualquier contacto</option>
          <option value="email">Con email</option>
          <option value="sinemail">Sin email</option>
          <option value="tel">Con celular</option>
        </select>
      </div>
      <div className="cd__conteo">
        <strong>{filtrados.length}</strong> de {socios.length} socios · {pts(totSaldo)} puntos sin canjear
        <span className="cd__conteo-nota">La localidad sale de las inscripciones a torneos. El sexo no se pide en el alta.</span>
      </div>
      <div className="cd__tabla-wrap">
        <table className="cd__tabla cd__tabla--socios">
          <thead>
            <tr>
              {COLS_SOCIOS.map(c => (
                <th key={c.key} className={`cd__th-orden ${c.num ? 'cd__der' : ''}`} onClick={() => ordenarPor(c.key)}>
                  {c.label}{orden.key === c.key ? (orden.dir < 0 ? ' ▼' : ' ▲') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(s => (
              <tr key={s.id} className="cd__fila-click" onClick={() => setAbierto(s.id)}>
                <td>
                  <div className="cd__socio-nom">{s.nombre}</div>
                  <div className="cd__socio-sub">DNI {s.dni}{s.localidad ? ` · ${s.localidad}` : ''}{s.edad != null ? ` · ${s.edad} años` : ''}</div>
                </td>
                <td className="cd__der cd__oro">{pts(s.saldo)}</td>
                <td className="cd__der">{pts(s.ganados)}</td>
                <td className="cd__der">{pts(s.canjeados)}</td>
                <td className="cd__der">{s.visitas}</td>
                <td className="cd__der">{s.giros}</td>
                <td className="cd__der">{s.tickets || '—'}</td>
                <td>{fechaCorta(s.ultima)}</td>
                <td>{fechaCorta(s.alta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtrados.length && <p className="cd__vacio">Ningún socio con esos filtros.</p>}
      {abierto && <FichaSocio token={token} id={abierto} toast={toast} onClose={() => setAbierto(null)} />}
    </div>
  )
}

export function FichaSocio({ token, id, toast, onClose }) {
  const [h, setH] = useState(null)
  const [tab, setTab] = useState('puntos')
  useEffect(() => {
    adminClubSocio(token, id).then(setH).catch(err => { toast.show(err.message, 'err'); onClose() })
  }, [token, id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!h) return <Hoja titulo="Cargando…" onClose={onClose}><p className="cd__vacio">Cargando…</p></Hoja>
  const s = h.socio
  return (
    <Hoja titulo={s.nombre} onClose={onClose}>
      <div className="cd__ficha-datos">
        <span>DNI {s.dni}</span>
        {s.tel && <span>📱 {s.tel}</span>}
        {s.email && <span>✉ {s.email}</span>}
        {s.cumple && <span>🎂 {s.cumple}</span>}
        {s.alta && <span>Socio desde {s.alta}</span>}
        {s.segmento && <span>Segmento {s.segmento}</span>}
      </div>
      {s.nota && <p className="cd__nota">📝 {s.nota}</p>}
      <Resumen items={[
        { label: 'saldo', valor: pts(s.saldo) },
        { label: 'puntos ganados', valor: pts(h.totales.ganados) },
        { label: 'puntos canjeados', valor: pts(h.totales.canjeados) },
        { label: 'visitas', valor: h.totales.visitas },
        { label: 'giros', valor: h.totales.giros },
        { label: 'cupones del mes', valor: h.totales.cuponesMes },
      ]} />
      <div className="cd__tabs">
        {[['puntos', `Puntos (${h.movimientos.length})`], ['canjes', `Canjes (${h.canjes.length})`], ['giros', 'Fortuna Dorada'], ['torneos', `Torneos (${h.torneos.length})`]].map(([k, l]) => (
          <button key={k} className={`cd__tab ${tab === k ? 'cd__tab--on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'puntos' && (
        <Tabla columnas={[{ key: 'fecha', label: 'Fecha' }, { key: 'concepto', label: 'Concepto' }, { key: 'pts', label: 'Puntos', align: 'right' }]}
          filas={h.movimientos.map(m => ({ ...m, pts: (m.puntos > 0 ? '+' : '') + pts(m.puntos) }))} vacio="Sin movimientos de puntos." />
      )}
      {tab === 'canjes' && (
        <Tabla columnas={[{ key: 'fecha', label: 'Fecha' }, { key: 'reward_name', label: 'Qué' }, { key: 'code', label: 'Código' }, { key: 'estado', label: 'Estado' }, { key: 'entrego', label: 'Entregó' }]}
          filas={h.canjes.map(c => ({ ...c, entrego: c.delivered_by ? `${c.delivered_by} · ${c.entregado}` : '—' }))} vacio="Nunca canjeó." />
      )}
      {tab === 'giros' && (
        <Tabla columnas={[{ key: 'resultado', label: 'Resultado' }, { key: 'veces', label: 'Veces', align: 'right' }]} filas={h.giros} vacio="Nunca jugó Fortuna Dorada." />
      )}
      {tab === 'torneos' && (
        <Tabla columnas={[{ key: 'name', label: 'Torneo' }, { key: 'fecha', label: 'Fecha' }, { key: 'city', label: 'Localidad' }, { key: 'pos', label: 'Puesto', align: 'right' }]}
          filas={h.torneos.map(t => ({ ...t, pos: t.final_position || (t.attended ? 'jugó' : '—') }))} vacio="No se inscribió a torneos." />
      )}
    </Hoja>
  )
}
