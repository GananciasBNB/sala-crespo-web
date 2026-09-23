// Panel propio del Sala Crespo Club. Vive aparte del admin general porque se
// opera distinto: desde el celular, mirando cómo viene el día y tocando una
// cosa puntual. Usa el mismo login de admin.
import { useState, useEffect } from 'react'
import { adminLogin, adminClubOverview, adminClubSetNw, adminSpinSettings } from '../api/client'
import {
  FortunaAdmin, ClubCatalog, ClubAccountLookup, ClubDeliver, ClubManualOps,
} from '../components/club/panels'
import './ClubAdmin.css'

const TOKEN_KEY = 'sc_admin_token'

const SECCIONES = [
  { id: 'hoy',      icon: '📊', label: 'Hoy',      sub: 'Cómo viene el día' },
  { id: 'fortuna',  icon: '🎰', label: 'Fortuna',  sub: 'Premios y reglas' },
  { id: 'canjes',   icon: '🛍',  label: 'Canjes',   sub: 'Catálogo y promos' },
  { id: 'sorteo',   icon: '🎟',  label: 'Sorteo',   sub: 'El sorteo del mes' },
  { id: 'socios',   icon: '👤', label: 'Socios',   sub: 'Buscar y ajustar' },
  { id: 'barra',    icon: '💁', label: 'Barra',    sub: 'Entregar canjes' },
  { id: 'puntos',   icon: '⚡', label: 'Puntos',   sub: 'Sumar a mano' },
]

export default function ClubAdmin() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [seccion, setSeccion] = useState('hoy')
  const [toastMsg, setToastMsg] = useState(null)

  const toast = {
    show: (msg, tipo = 'ok') => {
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
        {seccion === 'socios'  && <ClubAccountLookup token={token} toast={toast} />}
        {seccion === 'barra'   && <ClubDeliver token={token} toast={toast} />}
        {seccion === 'puntos'  && <ClubManualOps token={token} toast={toast} />}
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
          <Kpi valor={d.hoy.giros} label="giros" detalle={`${d.hoy.personas} ${d.hoy.personas === 1 ? 'socio' : 'socios'}`} />
          <Kpi valor={d.hoy.girosPremiados} label="premiados"
            detalle={d.hoy.giros ? `${Math.round(d.hoy.girosPremiados / d.hoy.giros * 100)}% de los giros` : '—'} />
          <Kpi valor={d.hoy.checkins} label="visitas" detalle="check-in del día" />
          <Kpi valor={pts(d.hoy.puntosEmitidos)} label="puntos dados" detalle={d.hoy.puntosCanjeados ? `${pts(d.hoy.puntosCanjeados)} canjeados` : 'sin canjes aún'} />
        </div>
      </Bloque>

      {d.canjesPendientes > 0 && (
        <button className="ca__alerta" onClick={() => onIr('barra')}>
          <strong>{d.canjesPendientes} {d.canjesPendientes === 1 ? 'canje pendiente' : 'canjes pendientes'}</strong>
          <span>de retirar en la barra — tocá para entregarlos</span>
        </button>
      )}

      <Bloque titulo="Lo que va del mes">
        <div className="ca__kpis">
          <Kpi valor={pts(d.mes.puntosEmitidos)} label="puntos emitidos" detalle={`${d.mes.checkins} visitas`} />
          <Kpi valor={pts(d.mes.puntosCanjeados)} label="puntos canjeados" detalle={`${d.mes.canjesEntregados} entregados`} />
          <Kpi valor={pesos(d.mes.ticketsPesos)} label="en tickets" detalle={`${d.mes.ticketsCantidad} de la ruleta`} />
          <Kpi valor={pesos(d.mes.entregado)} label="entregado total" detalle="canjes + tickets" destacado />
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
                    ? 'Por encima del 0,50% previsto — mirá los premios de la ruleta.'
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
          <Kpi valor={d.socios.total} label="con cuenta" />
          <Kpi valor={d.socios.activos7d} label="vinieron" detalle="últimos 7 días" />
          <Kpi valor={pts(d.socios.puntosEnCirculacion)} label="puntos sin canjear"
            detalle={`${pesos(d.socios.puntosEnCirculacion)} de deuda`} />
        </div>
      </Bloque>

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

function Kpi({ valor, label, detalle, destacado }) {
  return (
    <div className={`ca__kpi ${destacado ? 'ca__kpi--top' : ''}`}>
      <div className="ca__kpi-valor">{valor}</div>
      <div className="ca__kpi-label">{label}</div>
      {detalle && <div className="ca__kpi-det">{detalle}</div>}
    </div>
  )
}

function Login({ onToken }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const r = await adminLogin(email.trim(), pass)
      onToken(r.token)
    } catch (e2) { setErr(e2.message || 'No pudimos entrar') }
    finally { setBusy(false) }
  }

  return (
    <div className="ca ca--login">
      <form className="ca__login" onSubmit={entrar}>
        <div className="ca__star ca__star--big">★</div>
        <h1 className="ca__login-tit">Sala Crespo Club</h1>
        <p className="ca__login-sub">Panel de operación</p>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
        <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" />
        {err && <div className="ca__login-err">{err}</div>}
        <button className="ca__btn ca__btn--ok ca__btn--full" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
