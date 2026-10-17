// Panel propio del Sala Crespo Club. Vive aparte del admin general porque se
// opera distinto: desde el celular, mirando cómo viene el día y tocando una
// cosa puntual. Usa el mismo login de admin.
import { useState, useEffect } from 'react'
import { adminPesca, adminPescaEspeciales, adminLogin, adminForgotPassword, adminResetPassword, adminClubOverview, adminClubSetNw, adminSpinSettings } from '../api/client'
import {
  FortunaAdmin, ClubCatalog, ClubDeliver, ClubManualOps,
} from '../components/club/panels'
import { DetalleHoja, FeedHoy, SociosLista, Tabla } from '../components/club/club-detail'
import WhatsAppAdmin from '../components/club/whatsapp'
import './ClubAdmin.css'

const TOKEN_KEY = 'sc_admin_token'

const SECCIONES = [
  { id: 'hoy',      icon: '📊', label: 'Hoy',      sub: 'Cómo viene el día' },
  { id: 'fortuna',  icon: '🎰', label: 'Fortuna',  sub: 'Premios y reglas' },
  { id: 'canjes',   icon: '🛍',  label: 'Canjes',   sub: 'Catálogo y promos' },
  { id: 'sorteo',   icon: '🎟',  label: 'Sorteo',   sub: 'El sorteo del mes' },
  { id: 'whatsapp', icon: '💬', label: 'WhatsApp', sub: 'El bot de atención' },
  { id: 'socios',   icon: '👤', label: 'Socios',   sub: 'Lista, filtros e historial' },
  { id: 'barra',    icon: '💁', label: 'Barra',    sub: 'Entregar canjes' },
  { id: 'puntos',   icon: '⚡', label: 'Puntos',   sub: 'Sumar a mano' },
  { id: 'pesca',    icon: '🎣', label: 'Pesca',    sub: 'La Gran Pesca · ranking y ganadores' },
]

export default function ClubAdmin() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [seccion, setSeccion] = useState('hoy')
  const [toastMsg, setToastMsg] = useState(null)

  const toast = {
    show: (msg, tipo = 'ok') => {
      // expired session (7 days): back to the login instead of an empty panel
      if (/token inv[aá]lido|expirad/i.test(String(msg))) { salir(); return }
      setToastMsg({ msg, tipo })
      setTimeout(() => setToastMsg(null), 3200)
    },
  }

  function salir() {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
  }

  if (!token) return <Login onToken={t => { localStorage.setItem(TOKEN_KEY, t); setToken(t) }} />

  const actual = SECCIONES.find(s => s.id === seccion)

  return (
    <div className="ca">
      <header className="ca__top">
        <div className="ca__brand">
          <span className="ca__star">★</span>
          <div>
            <div className="ca__brand-name">Sala Crespo Club</div>
            <div className="ca__brand-sub">{actual?.sub}</div>
          </div>
        </div>
        <button className="ca__salir" onClick={salir}>Salir</button>
      </header>

      <nav className="ca__nav">
        {SECCIONES.map(s => (
          <button key={s.id}
            className={`ca__nav-btn ${seccion === s.id ? 'ca__nav-btn--on' : ''}`}
            onClick={() => setSeccion(s.id)}>
            <span className="ca__nav-ico">{s.icon}</span>
            <span className="ca__nav-txt">{s.label}</span>
          </button>
        ))}
      </nav>

      <main className="ca__main">
        {seccion === 'hoy'     && <Hoy token={token} toast={toast} onIr={setSeccion} />}
        {seccion === 'fortuna' && <FortunaAdmin token={token} toast={toast} />}
        {seccion === 'canjes'  && <ClubCatalog token={token} toast={toast} />}
        {seccion === 'sorteo'  && <Sorteo token={token} toast={toast} />}
        {seccion === 'whatsapp' && <WhatsAppAdmin token={token} toast={toast} />}
        {seccion === 'socios'  && <SociosLista token={token} toast={toast} />}
        {seccion === 'barra'   && <ClubDeliver token={token} toast={toast} />}
        {seccion === 'puntos'  && <ClubManualOps token={token} toast={toast} />}
        {seccion === 'pesca'   && <PescaAdmin token={token} toast={toast} />}
      </main>

      {toastMsg && <div className={`ca__toast ca__toast--${toastMsg.tipo}`}>{toastMsg.msg}</div>}
    </div>
  )
}

// ─── Hoy: la pantalla que se mira de reojo ──────────────────────────────────
function Hoy({ token, toast, onIr }) {
  const [d, setD] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [editandoNw, setEditandoNw] = useState(false)
  const [nw, setNw] = useState('')
  const [detalle, setDetalle] = useState(null)   // which card's detail is open

  async function cargar() {
    try { const r = await adminClubOverview(token); setD(r); setNw(String(r.nwMensual || '')) }
    catch (err) { toast.show(err.message, 'err') }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])

  async function guardarNw() {
    try {
      await adminClubSetNw(token, Number(nw) || 0)
      setEditandoNw(false); await cargar()
      toast.show('Net win actualizado')
    } catch (err) { toast.show(err.message, 'err') }
  }

  if (cargando) return <p className="ca__cargando">Cargando…</p>
  if (!d) return null

  const pesos = n => '$' + Math.round(n || 0).toLocaleString('es-AR')
  const pts = n => (n || 0).toLocaleString('es-AR')

  // el techo del 4% es sobre todos los conceptos comerciales; el kiosco es una parte
  const pct = d.pctNw
  const semaforo = pct == null ? 'nd' : pct <= 0.5 ? 'ok' : pct <= 0.8 ? 'ojo' : 'mal'

  return (
    <>
      <Bloque titulo="Hoy en la sala">
        <div className="ca__kpis">
          <Kpi valor={d.hoy.giros} label="giros" detalle={`${d.hoy.personas} ${d.hoy.personas === 1 ? 'socio' : 'socios'}`} onClick={() => setDetalle('giros')} />
          <Kpi valor={d.hoy.girosPremiados} label="premiados"
            detalle={d.hoy.giros ? `${Math.round(d.hoy.girosPremiados / d.hoy.giros * 100)}% de los giros` : '—'} onClick={() => setDetalle('premiados')} />
          <Kpi valor={d.hoy.checkins} label="visitas" detalle="check-in del día" onClick={() => setDetalle('visitas')} />
          <Kpi valor={pts(d.hoy.puntosEmitidos)} label="puntos dados" detalle={d.hoy.puntosCanjeados ? `${pts(d.hoy.puntosCanjeados)} canjeados` : 'sin canjes aún'} onClick={() => setDetalle('puntos-hoy')} />
        </div>
      </Bloque>

      <button className={`ca__alerta ${d.canjesPendientes ? '' : 'ca__alerta--calma'}`} onClick={() => setDetalle('pendientes')}>
        <strong>{d.canjesPendientes ? `${d.canjesPendientes} ${d.canjesPendientes === 1 ? 'canje pendiente' : 'canjes pendientes'}` : 'Sin canjes por retirar'}</strong>
        <span>{d.canjesPendientes ? 'de retirar en la barra — tocá para ver quiénes' : 'tocá para ver la lista de la barra'}</span>
      </button>

      <Bloque titulo="Lo último en el kiosco">
        <FeedHoy token={token} />
      </Bloque>

      <Bloque titulo="Lo que va del mes">
        <div className="ca__kpis">
          <Kpi valor={pts(d.mes.puntosEmitidos)} label="puntos emitidos" detalle={`${d.mes.checkins} visitas`} onClick={() => setDetalle('puntos-mes')} />
          <Kpi valor={pts(d.mes.puntosCanjeados)} label="puntos canjeados" detalle={`${d.mes.canjesEntregados} entregados`} onClick={() => setDetalle('canjes-mes')} />
          <Kpi valor={pesos(d.mes.ticketsPesos)} label="en tickets" detalle={`${d.mes.ticketsCantidad} de Fortuna Dorada`} onClick={() => setDetalle('tickets-mes')} />
          <Kpi valor={pesos(d.mes.entregado)} label="entregado total" detalle="canjes + tickets" destacado onClick={() => setDetalle('entregado-mes')} />
        </div>
      </Bloque>

      <Bloque titulo="Cuánto pesa el Club">
        <div className={`ca__nw ca__nw--${semaforo}`}>
          {pct == null ? (
            <p className="ca__nw-vacio">
              Cargá el net win del mes y te calculo cuánto representa el Club sobre la producción.
            </p>
          ) : (
            <>
              <div className="ca__nw-pct">{pct.toFixed(2)}%</div>
              <div className="ca__nw-txt">
                del net win. {semaforo === 'ok'
                  ? 'Dentro de lo previsto para el kiosco (0,50%).'
                  : semaforo === 'ojo'
                    ? 'Por encima del 0,50% previsto — mirá los premios de Fortuna Dorada.'
                    : 'Muy por encima de lo previsto. Revisá stock de tickets y descuentos.'}
              </div>
              <div className="ca__nw-nota">
                Ojo: el techo del 4% es con los promotickets incluidos, que corren aparte.
              </div>
            </>
          )}
          <div className="ca__nw-edit">
            {editandoNw ? (
              <>
                <input type="number" value={nw} onChange={e => setNw(e.target.value)}
                  placeholder="Net win del mes" autoFocus />
                <button className="ca__btn ca__btn--ok" onClick={guardarNw}>Guardar</button>
                <button className="ca__btn" onClick={() => setEditandoNw(false)}>Cancelar</button>
              </>
            ) : (
              <button className="ca__btn" onClick={() => setEditandoNw(true)}>
                {d.nwMensual ? `Net win: ${pesos(d.nwMensual)} · cambiar` : 'Cargar net win del mes'}
              </button>
            )}
          </div>
        </div>
      </Bloque>

      <Bloque titulo="Socios">
        <div className="ca__kpis">
          <Kpi valor={d.socios.total} label="con cuenta" detalle="ver la lista" onClick={() => onIr('socios')} />
          <Kpi valor={d.socios.activos7d} label="vinieron" detalle="últimos 7 días" onClick={() => setDetalle('activos')} />
          <Kpi valor={pts(d.socios.puntosEnCirculacion)} label="puntos sin canjear"
            detalle={`${pesos(d.socios.puntosEnCirculacion)} de deuda`} onClick={() => setDetalle('saldo')} />
        </div>
      </Bloque>

      <Bloque titulo="Sorteo del mes">
        <div className="ca__kpis">
          <Kpi valor={d.sorteo.cuponesHoy} label="cupones hoy" onClick={() => setDetalle('cupones')} />
          <Kpi valor={d.sorteo.cuponesMes} label="cupones del mes" detalle={`${d.sorteo.personas} socios`} onClick={() => setDetalle('cupones')} />
          <Kpi valor={pesos(d.sorteo.monto)} label="premio" detalle="se edita en Sorteo" onClick={() => onIr('sorteo')} />
        </div>
      </Bloque>

      {detalle && (
        <DetalleHoja token={token} tipo={detalle} toast={toast} onClose={() => setDetalle(null)}
          pie={detalle === 'pendientes' ? (
            <button className="ca__btn ca__btn--ok ca__btn--full" onClick={() => { setDetalle(null); onIr('barra') }}>Ir a la Barra a entregar</button>
          ) : null} />
      )}

      {d.topCanjes.length > 0 && (
        <Bloque titulo="Lo más canjeado del mes">
          <div className="ca__lista">
            {d.topCanjes.map(c => (
              <div key={c.reward_name} className="ca__fila">
                <span className="ca__fila-nom">{c.reward_name}</span>
                <span className="ca__fila-n">{c.veces}×</span>
                <span className="ca__fila-pts">{pts(c.puntos)} pts</span>
              </div>
            ))}
          </div>
        </Bloque>
      )}
    </>
  )
}

// ─── Sorteo del mes: vive aparte de la ruleta porque es otra mecánica ───────
function Sorteo({ token, toast }) {
  const [d, setD] = useState(null)
  const [monto, setMonto] = useState('')
  const [editando, setEditando] = useState(false)

  async function cargar() {
    try { const r = await adminClubOverview(token); setD(r); setMonto(String(r.sorteo?.monto || '')) }
    catch (err) { toast.show(err.message, 'err') }
  }
  useEffect(() => { cargar() }, [])

  async function guardar() {
    try {
      await adminSpinSettings(token, { sorteoMonto: Number(monto) || 0 })
      setEditando(false); await cargar()
      toast.show('Monto del sorteo actualizado')
    } catch (err) { toast.show(err.message, 'err') }
  }

  if (!d) return <p className="ca__cargando">Cargando…</p>
  const s = d.sorteo || {}
  const pesos = n => '$' + Math.round(n || 0).toLocaleString('es-AR')

  return (
    <>
      <Bloque titulo="Premio del mes">
        <div className="ca__nw">
          <div className="ca__nw-pct" style={{ color: 'var(--oro-luz)' }}>{pesos(s.monto)}</div>
          <div className="ca__nw-txt">
            Es el monto que se muestra en la máquina. El socio imprime un cupón por día y lo deja en la urna.
          </div>
          <div className="ca__nw-edit">
            {editando ? (
              <>
                <input type="number" step="1000" value={monto} onChange={e => setMonto(e.target.value)} autoFocus />
                <button className="ca__btn ca__btn--ok" onClick={guardar}>Guardar</button>
                <button className="ca__btn" onClick={() => setEditando(false)}>Cancelar</button>
              </>
            ) : (
              <button className="ca__btn" onClick={() => setEditando(true)}>Cambiar el monto</button>
            )}
          </div>
        </div>
      </Bloque>

      <Bloque titulo="Cupones en la urna">
        <div className="ca__kpis">
          <Kpi valor={s.cuponesMes || 0} label="este mes" detalle="van a la urna" />
          <Kpi valor={s.cuponesHoy || 0} label="hoy" />
          <Kpi valor={s.personas || 0} label="participantes" detalle="personas distintas" />
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--txt2)', marginTop: 12, lineHeight: 1.6 }}>
          Los cupones son físicos: el sistema cuenta cuántos se imprimieron, pero el sorteo se hace
          sacando uno de la urna. El conteo sirve para verificar que no falte ninguno.
        </p>
      </Bloque>
    </>
  )
}

function Bloque({ titulo, children }) {
  return (
    <section className="ca__bloque">
      <h2 className="ca__bloque-tit">{titulo}</h2>
      {children}
    </section>
  )
}

// La Gran Pesca: tonight's ranking (test games marked) and who got paid each night
function PescaAdmin({ token, toast }) {
  const [fecha, setFecha] = useState('')
  const [d, setD] = useState(null)
  useEffect(() => {
    adminPesca(token, fecha || undefined).then(setD).catch(err => toast.show(err.message, 'err'))
  }, [token, fecha]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <p className="ca__cargando">Cargando…</p>
  const pts = n => (Number(n) || 0).toLocaleString('es-AR')
  return (
    <>
      <Bloque titulo={`Ranking · jornada ${d.fecha.split('-').reverse().join('/')}`}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <input type="date" value={fecha || d.fecha} onChange={e => setFecha(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(201,168,76,.3)', background: 'rgba(0,0,0,.35)', color: '#E8DFD0', fontFamily: 'inherit' }} />
          <span style={{ color: '#9a8f82', fontSize: 14 }}>
            {d.resumen.jugadas} partidas · {d.resumen.socios} socios{d.resumen.rechazadas ? ` · ${d.resumen.rechazadas} rechazadas` : ''} · premios {d.reglas.premios.join(' / ')} · {d.reglas.intentos} intentos cada {d.reglas.horas} h
          </span>
        </div>
        <Tabla
          columnas={[{ key: 'pos', label: '#' }, { key: 'nombre', label: 'Socio' }, { key: 'hora', label: 'Hora' }, { key: 'pts', label: 'Puntaje', align: 'right' }, { key: 'nota', label: '' }]}
          filas={d.ranking.map(r => ({ pos: r.posicion + '.º', nombre: r.nombre, hora: r.hora, pts: pts(r.puntaje), nota: r.prueba ? 'prueba (no cobra)' : r.posicion <= 3 ? `gana ${d.reglas.premios[r.posicion - 1]}` : '' }))}
          vacio="Nadie jugó esa jornada." />
      </Bloque>
      <PescaEspeciales token={token} toast={toast} config={d.configEspeciales} especiales={d.especiales || []} />
      <Bloque titulo="Ganadores pagados">
        <Tabla
          columnas={[{ key: 'fecha', label: 'Jornada' }, { key: 'ganadores', label: 'Ganadores' }, { key: 'pagado', label: 'Pagado' }]}
          filas={d.premios.map(p => ({ fecha: p.fecha.split('-').reverse().join('/'), ganadores: (p.ganadores || []).map(g => `${g.posicion}.º ${g.nombre} (${pts(g.puntaje)}) +${g.puntos}`).join(' · ') || 'sin ganadores', pagado: new Date(p.pagado_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }))}
          vacio="Todavía no se pagó ninguna jornada." />
      </Bloque>
    </>
  )
}

// special fish: % per game and daily caps (the server draws them); shows the max it can cost
const CAMPOS_ESPECIALES = [
  ['ticketPct', 'Pez Jackpoints (ticket $5.000) · % por partida', 0.5],
  ['ticketMaxDia', 'Tope de tickets por día', 1],
  ['pts100Pct', 'Pez 100 puntos · % por partida', 0.5],
  ['pts50Pct', 'Pez 50 puntos · % por partida', 0.5],
  ['ptsMaxDia', 'Tope de peces de puntos por día (100 + 50)', 1],
]
const NOMBRE_ESPECIAL = { ticket: 'Pez Jackpoints · ticket $5.000', pts100: 'Pez 100 puntos', pts50: 'Pez 50 puntos' }
function PescaEspeciales({ token, toast, config, especiales }) {
  const [cfg, setCfg] = useState(config || {})
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (config) setCfg(config) }, [config])
  const num = k => Number(cfg[k]) || 0
  const suma = num('ticketPct') + num('pts100Pct') + num('pts50Pct')
  const maxDiaPesos = num('ticketMaxDia') * 5000, maxDiaPts = num('ptsMaxDia') * 100
  const pesos = n => '$' + n.toLocaleString('es-AR')
  async function guardar() {
    if (suma > 100) { toast.show('La suma de los % no puede pasar de 100.', 'err'); return }
    setBusy(true)
    try { const r = await adminPescaEspeciales(token, cfg); setCfg(r.config); toast.show('Peces especiales guardados') }
    catch (err) { toast.show(err.message, 'err') }
    finally { setBusy(false) }
  }
  const atrapados = especiales.filter(e => e.atrapado)
  const estilo = { padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(201,168,76,.3)', background: 'rgba(0,0,0,.35)', color: '#E8DFD0', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
  return (
    <Bloque titulo="Peces especiales">
      <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, color: '#E8DFD0', cursor: 'pointer' }}>
        <input type="checkbox" checked={!!cfg.activo} onChange={e => setCfg({ ...cfg, activo: e.target.checked })} style={{ width: 18, height: 18 }} />
        Activos (si los apagás, ninguna partida trae pez especial)
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {CAMPOS_ESPECIALES.map(([k, label, paso]) => (
          <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#9a8f82', fontSize: 13, minWidth: 0 }}>
            {label}
            <input type="number" min="0" step={paso} value={cfg[k] ?? ''} onChange={e => setCfg({ ...cfg, [k]: e.target.value })} style={estilo} />
          </label>
        ))}
      </div>
      <p style={{ color: suma > 100 ? '#ff8a7a' : '#9a8f82', fontSize: 14, margin: '12px 0' }}>
        Chance de que una partida traiga algún pez especial: {suma.toLocaleString('es-AR')} %.
        {' '}Máximo posible por día: <b style={{ color: '#F0D275' }}>{pesos(maxDiaPesos)}</b> en tickets + <b style={{ color: '#F0D275' }}>{maxDiaPts.toLocaleString('es-AR')}</b> puntos
        {' '}· por mes (30 días): {pesos(maxDiaPesos * 30)} + {(maxDiaPts * 30).toLocaleString('es-AR')} puntos.
        {' '}El ticket respeta 1 ticket por socio por día (contando Fortuna) y la lista negra.
      </p>
      <button className="ca__btn ca__btn--ok" disabled={busy} onClick={guardar}>{busy ? 'Guardando…' : 'Guardar'}</button>
      <h3 style={{ color: '#F0D275', fontSize: 15, margin: '22px 0 8px' }}>Esta jornada: {especiales.length} salieron · {atrapados.length} atrapados</h3>
      <Tabla
        columnas={[{ key: 'hora', label: 'Hora' }, { key: 'nombre', label: 'Socio' }, { key: 'tipo', label: 'Pez' }, { key: 'estado', label: 'Resultado' }]}
        filas={especiales.map(e => ({ hora: e.hora, nombre: e.nombre, tipo: NOMBRE_ESPECIAL[e.tipo] || e.tipo,
          estado: e.atrapado ? (e.tipo === 'ticket' ? `atrapado · cupón ${e.premio || ''}` : `atrapado · +${e.premio || ''} pts`) : 'no lo agarró' }))}
        vacio="Todavía no salió ningún pez especial en esta jornada." />
    </Bloque>
  )
}

function Kpi({ valor, label, detalle, destacado, onClick }) {
  const clase = `ca__kpi ${destacado ? 'ca__kpi--top' : ''} ${onClick ? 'ca__kpi--click' : ''}`
  const contenido = (
    <>
      <div className="ca__kpi-valor">{valor}</div>
      <div className="ca__kpi-label">{label}</div>
      {detalle && <div className="ca__kpi-det">{detalle}</div>}
      {onClick && <span className="ca__kpi-ver" aria-hidden="true">›</span>}
    </>
  )
  return onClick
    ? <button type="button" className={clase} onClick={onClick}>{contenido}</button>
    : <div className={clase}>{contenido}</div>
}

function Login({ onToken }) {
  // ?reset=<token> comes from the email link; ?olvide=1 from the /admin login
  const params = new URLSearchParams(window.location.search)
  const resetToken = params.get('reset') || ''
  const [modo, setModo] = useState(resetToken ? 'reset' : params.get('olvide') ? 'olvide' : 'login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  function ir(m) {
    setModo(m); setErr(''); setInfo(''); setPass(''); setPass2('')
    // drop the token from the address bar once it's not needed
    if (m === 'login') window.history.replaceState(null, '', window.location.pathname)
  }

  async function entrar(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const r = await adminLogin(email.trim(), pass)
      onToken(r.token)
    } catch (e2) { setErr(e2.message || 'No pudimos entrar') }
    finally { setBusy(false) }
  }

  async function pedirLink(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      await adminForgotPassword(email.trim())
      setInfo('Si ese email es de un usuario del panel, te llegó un mail con el link para elegir una contraseña nueva. Vence en 1 hora. Mirá también en Spam.')
    } catch (e2) { setErr(e2.message || 'No pudimos mandar el mail') }
    finally { setBusy(false) }
  }

  async function guardarNueva(e) {
    e.preventDefault()
    if (pass.length < 8) { setErr('La contraseña tiene que tener al menos 8 caracteres.'); return }
    if (pass !== pass2) { setErr('Las dos contraseñas no coinciden.'); return }
    setBusy(true); setErr('')
    try {
      const r = await adminResetPassword(resetToken, pass)
      ir('login'); setEmail(r.email || '')
      setInfo('Listo, contraseña cambiada. Entrá con la nueva.')
    } catch (e2) { setErr(e2.message || 'No pudimos cambiar la contraseña') }
    finally { setBusy(false) }
  }

  const cabecera = (
    <>
      <div className="ca__star ca__star--big">★</div>
      <h1 className="ca__login-tit">Sala Crespo Club</h1>
      <p className="ca__login-sub">{modo === 'login' ? 'Panel de operación' : modo === 'olvide' ? 'Recuperar contraseña' : 'Elegí tu contraseña nueva'}</p>
    </>
  )
  const avisos = (
    <>
      {err && <div className="ca__login-err">{err}</div>}
      {info && <div className="ca__login-info">{info}</div>}
    </>
  )

  return (
    <div className="ca ca--login">
      {modo === 'login' && (
        <form className="ca__login" onSubmit={entrar}>
          {cabecera}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
          <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" />
          {avisos}
          <button className="ca__btn ca__btn--ok ca__btn--full" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
          <button type="button" className="ca__login-link" onClick={() => ir('olvide')}>Olvidé mi contraseña</button>
        </form>
      )}
      {modo === 'olvide' && (
        <form className="ca__login" onSubmit={pedirLink}>
          {cabecera}
          <p className="ca__login-txt">Poné tu email del panel y te mandamos un link para elegir una contraseña nueva.</p>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
          {avisos}
          {!info && (
            <button className="ca__btn ca__btn--ok ca__btn--full" disabled={busy}>
              {busy ? 'Enviando…' : 'Mandarme el link'}
            </button>
          )}
          <button type="button" className="ca__login-link" onClick={() => ir('login')}>← Volver a entrar</button>
        </form>
      )}
      {modo === 'reset' && (
        <form className="ca__login" onSubmit={guardarNueva}>
          {cabecera}
          <input type="password" placeholder="Contraseña nueva (mínimo 8)" value={pass} onChange={e => setPass(e.target.value)} autoComplete="new-password" />
          <input type="password" placeholder="Repetila" value={pass2} onChange={e => setPass2(e.target.value)} autoComplete="new-password" />
          {avisos}
          <button className="ca__btn ca__btn--ok ca__btn--full" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar contraseña'}
          </button>
          <button type="button" className="ca__login-link" onClick={() => ir('olvide')}>Pedir otro link</button>
        </form>
      )}
    </div>
  )
}
