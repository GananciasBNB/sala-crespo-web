// Pantallas del Sala Crespo Club, compartidas entre el panel propio del Club
// (/club-admin) y el admin general. Viven aca para no tener dos copias.
import { useState, useEffect } from 'react'
import {
  adminLoyaltyRewards, adminLoyaltyCreateReward, adminLoyaltyUpdateReward, adminLoyaltyDeleteReward,
  adminSpinConfig, adminSpinCreatePrize, adminSpinUpdatePrize, adminSpinDeletePrize,
  adminSpinSettings, adminSpinLog,
  adminLoyaltyAccount, adminLoyaltyAdjust, adminLoyaltyCheckin, adminLoyaltyAyb,
  adminLoyaltyPending, adminLoyaltyDeliver, adminLoyaltyCancel,
  getMenu,
} from '../../api/client'

// ─── Fortuna Dorada: tabla de premios, reglas y log de giros ─────────────────
const SPIN_SYMS = [
  ['lingote', 'Lingote (top)'], ['fenix', 'Fénix'], ['gato', 'Gato'],
  ['koi', 'Koi'], ['rana', 'Rana'], ['arbol', 'Árbol'],
]

const CLUB_CATEGORIES = [
  { id: 'sin_alcohol', label: 'Sin alcohol' },
  { id: 'cerveza',     label: 'Cervezas' },
  { id: 'trago',       label: 'Tragos' },
  { id: 'comida',      label: 'Comidas' },
  { id: 'ticket',      label: 'Tickets de juego' },
]


function FortunaAdmin({ token, toast }) {
  const [cfg, setCfg] = useState(null)
  const [log, setLog] = useState([])
  const [verLog, setVerLog] = useState(false)
  const [settings, setSettings] = useState({ cooldownHours: 3, spinsPerWindow: 2, sorteoMonto: 100000, checkinPoints: 50 })
  const [rows, setRows] = useState([])
  // la proyección arranca de cuánta gente viene, no de un número de giros suelto
  const [clientesDia, setClientesDia] = useState(60)
  const [pctJuega, setPctJuega] = useState(80)
  const [rondas, setRondas] = useState(1.5)
  const [nuevo, setNuevo] = useState({ label: '', sym: 'arbol', kind: 'points', points: '', valuePesos: '', pct: '', dailyStock: '' })
  const inputStyle = { padding: '7px 9px', borderRadius: 6, border: '1px solid #2a3142', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: 13, width: '100%' }
  const numStyle = { ...inputStyle, width: 74, textAlign: 'right' }

  async function load() {
    try {
      const c = await adminSpinConfig(token)
      setCfg(c); setSettings(c.settings); setRows(c.prizes.map(p => ({ ...p })))
    } catch (err) { toast.show(err.message, 'err') }
  }
  useEffect(() => { load() }, [])

  async function guardarSettings() {
    try { await adminSpinSettings(token, settings); toast.show('Reglas guardadas', 'ok'); await load() }
    catch (err) { toast.show(err.message, 'err') }
  }
  async function guardarFila(r) {
    try {
      await adminSpinUpdatePrize(token, r.id, {
        label: r.label, sym: r.sym, kind: r.kind, points: Number(r.points) || 0,
        valuePesos: r.value_pesos ? Number(r.value_pesos) : null, pct: Number(r.pct) || 0,
        dailyStock: Number(r.daily_stock) || 0, active: !!r.active, sortOrder: Number(r.sort_order) || 0,
        dropsPerDay: Number(r.drops_per_day) || 0,
      })
      toast.show(`"${r.label}" guardado`, 'ok'); await load()
    } catch (err) { toast.show(err.message, 'err') }
  }
  async function borrarFila(r) {
    if (!confirm(`¿Eliminar el premio "${r.label}"? (el log histórico se conserva)`)) return
    try { await adminSpinDeletePrize(token, r.id); toast.show('Eliminado', 'ok'); await load() }
    catch (err) { toast.show(err.message, 'err') }
  }
  async function crear(e) {
    e.preventDefault()
    if (!nuevo.label.trim()) return toast.show('Poné un nombre al premio', 'err')
    try {
      await adminSpinCreatePrize(token, {
        label: nuevo.label.trim(), sym: nuevo.sym, kind: nuevo.kind,
        points: Number(nuevo.points) || 0, valuePesos: nuevo.valuePesos ? Number(nuevo.valuePesos) : null,
        pct: Number(nuevo.pct) || 0, dailyStock: Number(nuevo.dailyStock) || 0, active: true,
        sortOrder: (rows.length + 1) * 10,
      })
      toast.show('Premio creado', 'ok')
      setNuevo({ label: '', sym: 'arbol', kind: 'points', points: '', valuePesos: '', pct: '', dailyStock: '' })
      await load()
    } catch (err) { toast.show(err.message, 'err') }
  }
  async function cargarLog() {
    try { const r = await adminSpinLog(token, 300); setLog(r.log || []); setVerLog(true) }
    catch (err) { toast.show(err.message, 'err') }
  }
  const setRow = (id, k, v) => setRows(rs => rs.map(r => r.id === id ? { ...r, [k]: v } : r))

  if (!cfg) return <p style={{ color: '#8B9BB4' }}>Cargando…</p>
  const activos = rows.filter(r => r.active)
  const sumPct = activos.reduce((a, r) => a + (Number(r.pct) || 0), 0)
  const hoy = cfg.todayCounts || {}
  // Proyección: de cuánta gente viene salen los giros, y de ahí los premios.
  // El stock corta las salidas, así que un premio con stock chico entrega menos
  // de lo que dice su porcentaje.
  const socios = Math.round(clientesDia * pctJuega / 100)
  const girosDia = Math.round(socios * settings.spinsPerWindow * rondas)
  const proy = activos.map(r => {
    const drops = Number(r.drops_per_day) || 0
    // por momento sorteado salen exactamente N por jornada, sin depender del %
    if (drops > 0) {
      return { r, salidas: drops, porMomento: true, topeado: false,
        pts: drops * (Number(r.points) || 0), pesos: drops * (Number(r.value_pesos) || 0) }
    }
    const esperadas = girosDia * (Number(r.pct) || 0) / 100
    const stock = Number(r.daily_stock) || 0
    const salidas = stock > 0 ? Math.min(esperadas, stock) : esperadas
    return {
      r, salidas, porMomento: false, topeado: stock > 0 && esperadas > stock,
      pts: salidas * (Number(r.points) || 0), pesos: salidas * (Number(r.value_pesos) || 0),
    }
  })
  const totalPts = proy.reduce((a, p) => a + p.pts, 0)
  const totalPesos = proy.reduce((a, p) => a + p.pesos, 0)
  const totalSalidas = proy.reduce((a, p) => a + p.salidas, 0)
  // el programa no es solo la ruleta: cada visita suma puntos aunque no gire
  const ptsVisita = clientesDia * (Number(settings.checkinPoints) || 0)
  // 1 punto = 1 peso en la tabla de canjes, así que los puntos se cuentan a peso
  const mesPuntos = (totalPts + ptsVisita) * 30
  const mesTickets = totalPesos * 30
  const mesTotal = mesPuntos + mesTickets
  const fmt = n => '$' + Math.round(n).toLocaleString('es-AR')
  const card = { background: 'rgba(255,255,255,.03)', border: '1px solid #2a3142', borderRadius: 10, padding: 16, marginBottom: 18 }
  const h4 = { margin: '0 0 12px', fontSize: 14, color: '#F0D275' }

  return (
    <div>
      <div style={card}>
        <h4 style={h4}>Reglas del juego</h4>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'end' }}>
          <label style={{ fontSize: 12, color: '#8B9BB4' }}>Giros por ronda<br />
            <input type="number" min="1" value={settings.spinsPerWindow} onChange={e => setSettings({ ...settings, spinsPerWindow: Number(e.target.value) })} style={numStyle} /></label>
          <label style={{ fontSize: 12, color: '#8B9BB4' }}>Horas entre rondas<br />
            <input type="number" min="1" step="0.5" value={settings.cooldownHours} onChange={e => setSettings({ ...settings, cooldownHours: Number(e.target.value) })} style={numStyle} /></label>
          <label style={{ fontSize: 12, color: '#8B9BB4' }}>Puntos por visita<br />
            <input type="number" min="0" step="10" value={settings.checkinPoints} onChange={e => setSettings({ ...settings, checkinPoints: Number(e.target.value) })} style={numStyle} /></label>
          <button onClick={guardarSettings} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#C41E3A', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Guardar reglas</button>
        </div>
        <p style={{ fontSize: 12, color: '#8B9BB4', margin: '10px 0 0', lineHeight: 1.5 }}>
          Cada socio tiene <b style={{ color: '#fff' }}>{settings.spinsPerWindow} giros</b> por ventana rodante de <b style={{ color: '#fff' }}>{settings.cooldownHours} hs</b>, y suma <b style={{ color: '#fff' }}>{settings.checkinPoints} puntos</b> por venir, gire o no. El resultado lo decide el servidor con azar criptográfico; el stock diario corta a las 00:00 (hora argentina).
        </p>
        {settings.spinsPerWindow > 5 && (
          <p style={{ fontSize: 12.5, color: '#fcd34d', margin: '10px 0 0', background: 'rgba(252,211,77,.1)', border: '1px solid rgba(252,211,77,.35)', borderRadius: 8, padding: '9px 12px', lineHeight: 1.5 }}>
            ⚠ {settings.spinsPerWindow} giros por ronda es un valor de prueba. Con la sala abierta esto multiplica lo que entregás: acordate de volverlo a 2 antes de abrir.
          </p>
        )}
      </div>

      <div style={card}>
        <h4 style={h4}>Tabla de premios · suma de %: <b style={{ color: sumPct > 100 ? '#f87171' : '#7ee2a0' }}>{sumPct.toFixed(1)}%</b> → "seguí participando" {Math.max(0, 100 - sumPct).toFixed(1)}%</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#8B9BB4', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                {['Premio', 'Símbolo', 'Tipo', 'Puntos', 'Ticket $', '% giro', 'Stock/día', 'Momentos/día', 'Hoy', 'Activo', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 6px', borderBottom: '1px solid #2a3142' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ opacity: r.active ? 1 : .5 }}>
                  <td style={{ padding: 4, minWidth: 180 }}><input value={r.label} onChange={e => setRow(r.id, 'label', e.target.value)} style={inputStyle} /></td>
                  <td style={{ padding: 4 }}>
                    <select value={r.sym} onChange={e => setRow(r.id, 'sym', e.target.value)} style={inputStyle}>
                      {SPIN_SYMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: 4 }}>
                    <select value={r.kind} onChange={e => setRow(r.id, 'kind', e.target.value)} style={inputStyle}>
                      <option value="points">Puntos</option>
                      <option value="promo_ticket">Promo ticket</option>
                    </select>
                  </td>
                  <td style={{ padding: 4 }}><input type="number" value={r.points} onChange={e => setRow(r.id, 'points', e.target.value)} style={numStyle} /></td>
                  <td style={{ padding: 4 }}><input type="number" value={r.value_pesos ?? ''} onChange={e => setRow(r.id, 'value_pesos', e.target.value)} style={numStyle} /></td>
                  <td style={{ padding: 4 }}>
                    <input type="number" step="0.5" value={r.pct} disabled={Number(r.drops_per_day) > 0}
                      onChange={e => setRow(r.id, 'pct', e.target.value)}
                      title={Number(r.drops_per_day) > 0 ? 'Este premio sale por momento sorteado: el % no se usa' : ''}
                      style={{ ...numStyle, opacity: Number(r.drops_per_day) > 0 ? .35 : 1 }} />
                  </td>
                  <td style={{ padding: 4 }}>
                    <input type="number" value={r.daily_stock} disabled={Number(r.drops_per_day) > 0}
                      onChange={e => setRow(r.id, 'daily_stock', e.target.value)}
                      style={{ ...numStyle, opacity: Number(r.drops_per_day) > 0 ? .35 : 1 }} />
                  </td>
                  <td style={{ padding: 4 }}>
                    <input type="number" min="0" value={r.drops_per_day ?? 0}
                      onChange={e => setRow(r.id, 'drops_per_day', e.target.value)}
                      title="0 = sale por porcentaje. Más de 0 = se sortean N momentos en la jornada."
                      style={{ ...numStyle, borderColor: Number(r.drops_per_day) > 0 ? '#C9A84C' : '#2a3142' }} />
                  </td>
                  <td style={{ padding: 4, textAlign: 'center', color: (hoy[r.id] || 0) >= (Number(r.daily_stock) || Infinity) ? '#f87171' : '#7ee2a0', fontWeight: 700 }}>{hoy[r.id] || 0}/{r.daily_stock || '∞'}</td>
                  <td style={{ padding: 4, textAlign: 'center' }}><input type="checkbox" checked={!!r.active} onChange={e => setRow(r.id, 'active', e.target.checked)} /></td>
                  <td style={{ padding: 4, whiteSpace: 'nowrap' }}>
                    <button onClick={() => guardarFila(r)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #C9A84C', background: 'rgba(201,168,76,.12)', color: '#F0D275', cursor: 'pointer', fontSize: 12, marginRight: 6 }}>Guardar</button>
                    <button onClick={() => borrarFila(r)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #2a3142', background: 'transparent', color: '#8B9BB4', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={crear} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr auto', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <input placeholder="Nuevo premio (ej: +75 puntos)" value={nuevo.label} onChange={e => setNuevo({ ...nuevo, label: e.target.value })} style={inputStyle} />
          <select value={nuevo.sym} onChange={e => setNuevo({ ...nuevo, sym: e.target.value })} style={inputStyle}>{SPIN_SYMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select value={nuevo.kind} onChange={e => setNuevo({ ...nuevo, kind: e.target.value })} style={inputStyle}><option value="points">Puntos</option><option value="promo_ticket">Promo ticket</option></select>
          <input type="number" placeholder="Pts" value={nuevo.points} onChange={e => setNuevo({ ...nuevo, points: e.target.value })} style={inputStyle} />
          <input type="number" placeholder="Ticket $" value={nuevo.valuePesos} onChange={e => setNuevo({ ...nuevo, valuePesos: e.target.value })} style={inputStyle} />
          <input type="number" step="0.5" placeholder="%" value={nuevo.pct} onChange={e => setNuevo({ ...nuevo, pct: e.target.value })} style={inputStyle} />
          <input type="number" placeholder="Stock" value={nuevo.dailyStock} onChange={e => setNuevo({ ...nuevo, dailyStock: e.target.value })} style={inputStyle} />
          <button type="submit" style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: '#C41E3A', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>+ Agregar</button>
        </form>
      </div>

      {(cfg.drops || []).length > 0 && (
        <div style={card}>
          <h4 style={h4}>Momentos de hoy</h4>
          <p style={{ fontSize: 12.5, color: '#8B9BB4', margin: '0 0 12px', lineHeight: 1.6 }}>
            Estos premios no salen por porcentaje: se sortean momentos al azar dentro de la jornada
            y se los lleva el primer giro posterior a cada uno. Así quedan repartidos toda la noche
            en vez de agotarse temprano. Si un momento pasa sin que nadie gire, no se pierde: lo gana
            el próximo que gire.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {cfg.drops.map(d => {
              const hora = new Date(d.drop_at).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' })
              const salio = !!d.claimed_at
              const vencido = !salio && new Date(d.drop_at) <= new Date()
              return (
                <div key={d.id} style={{
                  flex: '1 1 160px', padding: '12px 14px', borderRadius: 10,
                  border: `1px solid ${salio ? '#2a3142' : vencido ? '#7ee2a0' : 'rgba(201,168,76,.45)'}`,
                  background: salio ? 'rgba(0,0,0,.25)' : 'rgba(201,168,76,.07)',
                  opacity: salio ? .6 : 1,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: salio ? '#8B9BB4' : '#F0D275' }}>{hora}</div>
                  <div style={{ fontSize: 11.5, color: '#8B9BB4', marginTop: 3 }}>
                    {salio ? `entregado${d.ganador ? ' · ' + d.ganador : ''}` : vencido ? 'lo gana el próximo giro' : 'todavía no'}
                  </div>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize: 11.5, color: '#64748b', margin: '10px 0 0' }}>
            Jornada {cfg.jornada}. Los momentos se sortean solos al abrir y no se pueden adivinar.
          </p>
        </div>
      )}

      <div style={card}>
        <h4 style={h4}>Cuánto entrega la ruleta</h4>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'end', marginBottom: 6 }}>
          <label style={{ fontSize: 12, color: '#8B9BB4' }}>Clientes por día<br />
            <input type="number" min="0" value={clientesDia} onChange={e => setClientesDia(Number(e.target.value) || 0)} style={numStyle} /></label>
          <label style={{ fontSize: 12, color: '#8B9BB4' }}>% que usa la máquina<br />
            <input type="number" min="0" max="100" value={pctJuega} onChange={e => setPctJuega(Number(e.target.value) || 0)} style={numStyle} /></label>
          <label style={{ fontSize: 12, color: '#8B9BB4' }}>Rondas por noche<br />
            <input type="number" min="0" step="0.5" value={rondas} onChange={e => setRondas(Number(e.target.value) || 0)} style={numStyle} /></label>
          <p style={{ fontSize: 12.5, color: '#8B9BB4', margin: 0, lineHeight: 1.5 }}>
            {socios} socios × {settings.spinsPerWindow} giros × {rondas} rondas =<br />
            <b style={{ color: '#F0D275', fontSize: 15 }}>{girosDia.toLocaleString('es-AR')} giros por día</b>
          </p>
        </div>
        <p style={{ fontSize: 11.5, color: '#64748b', margin: '0 0 10px', lineHeight: 1.5 }}>
          Una ronda es cada {settings.cooldownHours} hs. Alguien que se queda {(settings.cooldownHours * 2)} hs hace 2 rondas.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 10 }}>
          <thead><tr style={{ color: '#8B9BB4', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
            <th style={{ textAlign: 'left', padding: 6 }}>Premio</th><th style={{ textAlign: 'right', padding: 6 }}>Sale 1 cada</th><th style={{ textAlign: 'right', padding: 6 }}>Salidas/día</th><th style={{ textAlign: 'right', padding: 6 }}>Puntos/día</th><th style={{ textAlign: 'right', padding: 6 }}>$ tickets/día</th>
          </tr></thead>
          <tbody>
            {proy.map(({ r, salidas, pts, pesos }) => (
              <tr key={r.id} style={{ borderTop: '1px solid #1c2230' }}>
                <td style={{ padding: 6 }}>{r.label}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>
                  {porMomento
                    ? <span style={{ color: '#F0D275' }}>por momento</span>
                    : Number(r.pct) > 0 ? Math.round(100 / Number(r.pct)) + ' giros' : '—'}
                </td>
                <td style={{ padding: 6, textAlign: 'right' }}>
                  {salidas.toFixed(1)}
                  {topeado && <span title="El stock corta antes de lo que dice el %" style={{ color: '#fcd34d' }}> (tope)</span>}
                </td>
                <td style={{ padding: 6, textAlign: 'right' }}>{Math.round(pts).toLocaleString('es-AR')}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{fmt(pesos)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid #C9A84C', fontWeight: 700 }}>
              <td style={{ padding: 6 }}>Total</td>
              <td style={{ padding: 6, textAlign: 'right' }}>{girosDia > 0 ? Math.round(totalSalidas / girosDia * 100) + '% gana' : '—'}</td>
              <td style={{ padding: 6, textAlign: 'right' }}>{totalSalidas.toFixed(1)}</td>
              <td style={{ padding: 6, textAlign: 'right', color: '#F0D275' }}>{Math.round(totalPts).toLocaleString('es-AR')}</td>
              <td style={{ padding: 6, textAlign: 'right', color: '#F0D275' }}>{fmt(totalPesos)}</td>
            </tr>
          </tbody>
        </table>
        {proy.some(p => p.topeado) && (
          <p style={{ fontSize: 12, color: '#fcd34d', margin: '10px 0 0', lineHeight: 1.5 }}>
            Los premios marcados <b>(tope)</b> se agotan antes de terminar el día: con estos giros su
            probabilidad real es menor a la configurada, y el que juega de noche no los ve.
          </p>
        )}

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #2a3142' }}>
          <h4 style={{ ...h4, marginBottom: 10 }}>Lo que cuesta el programa por mes</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr><td style={{ padding: 5, color: '#C8D2E0' }}>Puntos de la ruleta</td>
                <td style={{ padding: 5, textAlign: 'right', color: '#8B9BB4' }}>{Math.round(totalPts).toLocaleString('es-AR')} pts/día</td>
                <td style={{ padding: 5, textAlign: 'right' }}>{fmt(totalPts * 30)}</td></tr>
              <tr><td style={{ padding: 5, color: '#C8D2E0' }}>Puntos por visita ({settings.checkinPoints} × {clientesDia})</td>
                <td style={{ padding: 5, textAlign: 'right', color: '#8B9BB4' }}>{ptsVisita.toLocaleString('es-AR')} pts/día</td>
                <td style={{ padding: 5, textAlign: 'right' }}>{fmt(ptsVisita * 30)}</td></tr>
              <tr><td style={{ padding: 5, color: '#C8D2E0' }}>Tickets promocionales</td>
                <td style={{ padding: 5, textAlign: 'right', color: '#8B9BB4' }}>{fmt(totalPesos)}/día</td>
                <td style={{ padding: 5, textAlign: 'right' }}>{fmt(mesTickets)}</td></tr>
              <tr style={{ borderTop: '1px solid #C9A84C', fontWeight: 700 }}>
                <td style={{ padding: '8px 5px' }}>Total del mes</td><td />
                <td style={{ padding: '8px 5px', textAlign: 'right', color: '#F0D275', fontSize: 16 }}>{fmt(mesTotal)}</td></tr>
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: '#8B9BB4', margin: '10px 0 0', lineHeight: 1.6 }}>
            Los puntos se cuentan a peso porque la tabla de canjes está en 1 punto = 1 peso.
            Es el valor nominal: una parte nunca se canjea.
            {' '}Para ver cuánto pesa sobre la producción, cargá el net win en <b style={{ color: '#C8D2E0' }}>Hoy</b> —
            y acordate de que el techo del 4% es <b style={{ color: '#C8D2E0' }}>con los promotickets incluidos</b>, que corren aparte de esto.
          </p>
        </div>
      </div>

      <div style={card}>
        <h4 style={h4}>Log de giros {verLog && <span style={{ color: '#8B9BB4', fontWeight: 400 }}>· últimos {log.length}</span>}</h4>
        {!verLog ? (
          <button onClick={cargarLog} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #2a3142', background: 'transparent', color: '#C8D2E0', cursor: 'pointer', fontSize: 13 }}>Ver últimos giros</button>
        ) : (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ color: '#8B9BB4', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
                <th style={{ textAlign: 'left', padding: 6 }}>Cuándo</th><th style={{ textAlign: 'left', padding: 6 }}>Socio</th><th style={{ textAlign: 'left', padding: 6 }}>DNI</th><th style={{ textAlign: 'left', padding: 6 }}>Resultado</th>
              </tr></thead>
              <tbody>
                {log.map(l => (
                  <tr key={l.id} style={{ borderTop: '1px solid #1c2230' }}>
                    <td style={{ padding: 6, whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: 6 }}>{l.player_name || '—'}</td>
                    <td style={{ padding: 6 }}>{l.dni || '—'}</td>
                    <td style={{ padding: 6, color: l.prize_label ? '#7ee2a0' : '#8B9BB4' }}>{l.prize_label || 'seguí participando'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ClubCatalog({ token, toast }) {
  const [rewards, setRewards] = useState([])
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [newForm, setNewForm] = useState({ name: '', category: 'sin_alcohol', kind: 'product', points: '', valuePesos: '', sortOrder: 0 })

  async function load() {
    setLoading(true)
    try {
      const [r, m] = await Promise.all([adminLoyaltyRewards(token), getMenu()])
      setRewards(r.rewards || [])
      // lista plana de productos de la carta para el selector de vinculación
      setMenu((m.menu || []).flatMap(c => (c.items || []).map(i => ({ ...i, cat: c.name }))))
    }
    catch (err) { toast.show(err.message, 'err') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newForm.name.trim() || !newForm.points) return toast.show('Nombre y puntos requeridos', 'err')
    try {
      await adminLoyaltyCreateReward(token, { ...newForm, points: Number(newForm.points), valuePesos: newForm.valuePesos ? Number(newForm.valuePesos) : null })
      toast.show('Producto creado', 'ok')
      setNewForm({ name: '', category: 'sin_alcohol', kind: 'product', points: '', valuePesos: '', sortOrder: 0 })
      await load()
    } catch (err) { toast.show(err.message, 'err') }
  }
  async function handleUpdate(reward) {
    try {
      await adminLoyaltyUpdateReward(token, reward.id, {
        name: reward.name, category: reward.category, kind: reward.kind,
        points: Number(reward.points), valuePesos: reward.value_pesos ? Number(reward.value_pesos) : null,
        sortOrder: Number(reward.sort_order || 0), active: reward.active,
        menuItemId: reward.menu_item_id || null,
        discountPct: Number(reward.discount_pct) || 0,
      })
      toast.show('Actualizado', 'ok'); setEditing(null); await load()
    } catch (err) { toast.show(err.message, 'err') }
  }
  async function handleToggle(reward) {
    // active puede venir apagado porque el producto salió de la carta; el
    // interruptor del operador es active_manual
    const manual = reward.active_manual ?? reward.active
    try { await adminLoyaltyUpdateReward(token, reward.id, { active: !manual }); await load() }
    catch (err) { toast.show(err.message, 'err') }
  }
  async function handleDelete(reward) {
    if (!confirm(`Eliminar "${reward.name}" del catálogo?`)) return
    try { await adminLoyaltyDeleteReward(token, reward.id); toast.show('Eliminado', 'ok'); await load() }
    catch (err) { toast.show(err.message, 'err') }
  }

  const inputStyle = { padding: '8px 10px', borderRadius: 6, border: '1px solid #2a3142', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: 13 }

  return (
    <div>
      {/* Form crear */}
      <form onSubmit={handleCreate} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid #2a3142', borderRadius: 10, padding: 16, marginBottom: 18 }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#F0D275' }}>Agregar producto al catálogo</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <input placeholder="Nombre" value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} style={inputStyle} />
          <select value={newForm.category} onChange={e => setNewForm({ ...newForm, category: e.target.value })} style={inputStyle}>
            {CLUB_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={newForm.kind} onChange={e => setNewForm({ ...newForm, kind: e.target.value })} style={inputStyle}>
            <option value="product">Producto físico</option>
            <option value="promo_ticket">Promo ticket</option>
          </select>
          <input type="number" placeholder="Pts" value={newForm.points} onChange={e => setNewForm({ ...newForm, points: e.target.value })} style={inputStyle} />
          <input type="number" placeholder="Valor $" value={newForm.valuePesos} onChange={e => setNewForm({ ...newForm, valuePesos: e.target.value })} style={inputStyle} />
        </div>
        <button type="submit" style={{ marginTop: 10, padding: '8px 18px', borderRadius: 6, border: 'none', background: '#C41E3A', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>+ Crear</button>
      </form>

      {loading ? <p style={{ color: '#8B9BB4' }}>Cargando…</p> : (
        <div>
          {CLUB_CATEGORIES.map(cat => {
            const items = rewards.filter(r => r.category === cat.id)
            if (items.length === 0) return null
            return (
              <div key={cat.id} style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 8px' }}>{cat.label}</h4>
                {items.map(r => editing === r.id ? (
                  <EditableRewardRow key={r.id} initial={r} menu={menu} onCancel={() => setEditing(null)} onSave={handleUpdate} categories={CLUB_CATEGORIES} />
                ) : (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 10, alignItems: 'center', padding: '10px 14px', background: r.active ? 'rgba(255,255,255,.02)' : 'rgba(0,0,0,.3)', border: `1px solid ${r.discount_pct > 0 ? 'rgba(240,210,117,.45)' : '#2a3142'}`, borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                    <div>
                      <strong style={{ color: r.active ? '#fff' : '#5d6b80' }}>{r.name}</strong>
                      {r.menu_name ? (
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#64748b' }}>
                          · sigue a <span style={{ color: '#8ca0bd' }}>{r.menu_name}</span> (${Number(r.menu_price || 0).toLocaleString('es-AR')})
                        </span>
                      ) : (
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#64748b' }}>· puntos a mano</span>
                      )}
                      {r.menu_item_id && r.menu_active === false &&
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#fb6e8a' }}>⚠ fuera de carta</span>}
                    </div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, textAlign: 'right' }}>
                      {r.discount_pct > 0 && (
                        <span style={{ color: '#64748b', textDecoration: 'line-through', fontWeight: 400, marginRight: 6 }}>
                          {Number(r.points_full || 0).toLocaleString('es-AR')}
                        </span>
                      )}
                      <span style={{ color: '#F0D275' }}>{r.points.toLocaleString('es-AR')} pts</span>
                      {r.discount_pct > 0 && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: '#06240f', background: '#F0D275', borderRadius: 4, padding: '2px 6px', fontWeight: 700 }}>
                          −{r.discount_pct}%
                        </span>
                      )}
                    </span>
                    <button onClick={() => handleToggle(r)} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid #2a3142', background: 'transparent', color: r.active ? '#86efac' : '#8B9BB4', cursor: 'pointer', fontSize: 11 }}>{r.active ? 'Activo' : 'Oculto'}</button>
                    <button onClick={() => setEditing(r.id)} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid #2a3142', background: 'transparent', color: '#C8D2E0', cursor: 'pointer', fontSize: 11 }}>Editar</button>
                    <button onClick={() => handleDelete(r)} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid #C41E3A', background: 'transparent', color: '#fb6e8a', cursor: 'pointer', fontSize: 11 }}>×</button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EditableRewardRow({ initial, menu = [], onCancel, onSave, categories }) {
  const [r, setR] = useState({ ...initial })
  const s = { padding: '6px 8px', borderRadius: 6, border: '1px solid #2a3142', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: 13 }
  const atado = !!r.menu_item_id
  const prod = menu.find(m => String(m.id) === String(r.menu_item_id))
  const desc = Math.min(100, Math.max(0, Number(r.discount_pct) || 0))
  // mientras editás, los puntos se recalculan en vivo con el precio de la carta
  const aPuntos = pesos => Math.max(100, Math.round(pesos / 100) * 100)
  const puntosCalc = prod ? aPuntos(Number(prod.price) * (100 - desc) / 100) : null
  const puntosLista = prod ? aPuntos(Number(prod.price)) : null

  return (
    <div style={{ padding: '10px 12px', background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.4)', borderRadius: 8, marginBottom: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <input value={r.name} onChange={e => setR({ ...r, name: e.target.value })} style={s} />
        <select value={r.category} onChange={e => setR({ ...r, category: e.target.value })} style={s}>
          {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button onClick={() => onSave(r)} style={{ padding: '6px 12px', borderRadius: 5, border: 'none', background: '#22c55e', color: '#06240f', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>✓ Guardar</button>
        <button onClick={onCancel} style={{ padding: '6px 12px', borderRadius: 5, border: '1px solid #2a3142', background: 'transparent', color: '#8B9BB4', cursor: 'pointer', fontSize: 12 }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.3fr', gap: 8, alignItems: 'center' }}>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#8B9BB4', display: 'block', marginBottom: 3 }}>Producto de la carta</span>
          <select value={r.menu_item_id || ''} onChange={e => setR({ ...r, menu_item_id: e.target.value || null })} style={{ ...s, width: '100%' }}>
            <option value="">— puntos a mano —</option>
            {menu.map(m => (
              <option key={m.id} value={m.id}>{m.cat} · {m.name} (${Number(m.price).toLocaleString('es-AR')})</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#8B9BB4', display: 'block', marginBottom: 3 }}>Descuento socio</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="number" min={0} max={100} disabled={!atado} value={r.discount_pct ?? 0}
              onChange={e => setR({ ...r, discount_pct: e.target.value })}
              style={{ ...s, width: '100%', opacity: atado ? 1 : .4 }} />
            <span style={{ color: '#8B9BB4', fontSize: 13 }}>%</span>
          </div>
        </label>

        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#8B9BB4', display: 'block', marginBottom: 3 }}>
            {atado ? 'Puntos (los pone el precio)' : 'Puntos'}
          </span>
          {atado ? (
            <div style={{ ...s, fontFamily: 'monospace', fontWeight: 700 }}>
              {desc > 0 && <span style={{ color: '#64748b', textDecoration: 'line-through', fontWeight: 400, marginRight: 6 }}>{puntosLista?.toLocaleString('es-AR')}</span>}
              <span style={{ color: '#F0D275' }}>{puntosCalc?.toLocaleString('es-AR')}</span>
            </div>
          ) : (
            <input type="number" value={r.points} onChange={e => setR({ ...r, points: e.target.value })} style={{ ...s, width: '100%' }} />
          )}
        </label>
      </div>

      {atado && (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#8B9BB4' }}>
          {desc > 0
            ? `Promo activa: el socio paga ${puntosCalc?.toLocaleString('es-AR')} puntos por algo que vale $${Number(prod?.price || 0).toLocaleString('es-AR')}. Resignás $${(Number(prod?.price || 0) - puntosCalc).toLocaleString('es-AR')} por canje.`
            : '1 punto = 1 peso. Si cambiás el precio en la carta, este canje se ajusta solo.'}
        </p>
      )}
    </div>
  )
}

function ClubAccountLookup({ token, toast }) {
  const [dni, setDni] = useState('')
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  async function search() {
    if (!dni.trim()) return
    setBusy(true)
    try { setData(await adminLoyaltyAccount(token, dni.trim())) }
    catch (err) { toast.show(err.message, 'err'); setData(null) }
    finally { setBusy(false) }
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder="DNI del cliente" value={dni} onChange={e => setDni(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
          style={{ flex: 1, maxWidth: 240, padding: '10px 14px', borderRadius: 8, border: '1px solid #2a3142', background: 'rgba(0,0,0,.3)', color: '#fff' }} />
        <button onClick={search} disabled={busy} style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#C41E3A', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Buscar</button>
      </div>
      {data && (
        <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid #2a3142', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, color: '#fff', fontWeight: 700 }}>{data.player.name}</div>
              <div style={{ fontSize: 12, color: '#8B9BB4' }}>DNI {data.player.dni} · {data.player.email || 'sin email'}</div>
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, color: '#F0D275', lineHeight: 1 }}>
              {data.balance.toLocaleString('es-AR')}<span style={{ fontSize: 14, color: '#C9A84C', marginLeft: 6, fontFamily: 'inherit' }}>pts</span>
            </div>
          </div>
          {data.pending.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#fcd34d', margin: '0 0 8px' }}>📦 Canjes pendientes ({data.pending.length})</h4>
              {data.pending.map(p => (
                <div key={p.id} style={{ padding: '8px 12px', background: 'rgba(245,158,11,.05)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 8, marginBottom: 5, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>{p.reward_name}</strong></span><span style={{ color: '#fcd34d' }}>{p.points_used.toLocaleString('es-AR')} pts</span>
                </div>
              ))}
            </div>
          )}
          <h4 style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 8px' }}>Últimos movimientos</h4>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {data.transactions.slice(0, 25).map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,.02)', borderBottom: '1px solid #1a2130', fontSize: 13 }}>
                <div>
                  <div style={{ color: '#fff' }}>{t.kind}</div>
                  {t.reason && <div style={{ fontSize: 11, color: '#8B9BB4' }}>{t.reason}</div>}
                </div>
                <div style={{ color: t.points >= 0 ? '#86efac' : '#fcd34d', fontFamily: 'monospace', fontWeight: 700 }}>
                  {t.points >= 0 ? '+' : ''}{t.points.toLocaleString('es-AR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ClubDeliver({ token, toast }) {
  const [dni, setDni] = useState('')
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  async function search() {
    if (!dni.trim()) return
    setBusy(true)
    try { const r = await adminLoyaltyPending(token, dni.trim()); setItems(r.items || []) }
    catch (err) { toast.show(err.message, 'err'); setItems([]) }
    finally { setBusy(false) }
  }
  async function deliver(redemptionId) {
    if (!confirm('Marcar como entregado?')) return
    try { await adminLoyaltyDeliver(token, redemptionId, null); toast.show('Entregado ✓', 'ok'); await search() }
    catch (err) { toast.show(err.message, 'err') }
  }
  async function cancel(redemptionId) {
    const reason = prompt('Motivo de la cancelación (opcional):')
    if (reason === null) return
    try { await adminLoyaltyCancel(token, redemptionId, reason); toast.show('Cancelado · pts devueltos', 'ok'); await search() }
    catch (err) { toast.show(err.message, 'err') }
  }
  return (
    <div>
      <p style={{ color: '#8B9BB4', fontSize: 13, marginBottom: 12 }}>El cliente te dice su DNI → busco sus canjes pendientes → entregás producto y marcás aquí.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder="DNI" value={dni} onChange={e => setDni(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
          style={{ flex: 1, maxWidth: 240, padding: '10px 14px', borderRadius: 8, border: '1px solid #2a3142', background: 'rgba(0,0,0,.3)', color: '#fff' }} />
        <button onClick={search} disabled={busy} style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#C41E3A', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Buscar pendientes</button>
      </div>
      {items.length === 0 ? <p style={{ color: '#8B9BB4', fontSize: 13 }}>{busy ? 'Buscando…' : 'No hay canjes pendientes para ese DNI.'}</p> : (
        <div>
          {items.map(it => (
            <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', padding: 14, background: 'rgba(245,158,11,.05)', border: '1px solid rgba(245,158,11,.35)', borderRadius: 10, marginBottom: 8 }}>
              <div>
                <strong style={{ color: '#fff' }}>{it.reward_name}</strong>
                <div style={{ fontSize: 12, color: '#8B9BB4', marginTop: 2 }}>{it.player_name} · {it.points_used.toLocaleString('es-AR')} pts · {new Date(it.created_at).toLocaleString('es-AR')}</div>
              </div>
              <button onClick={() => deliver(it.id)} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#06240f', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>✓ Entregar</button>
              <button onClick={() => cancel(it.id)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #C41E3A', background: 'transparent', color: '#fb6e8a', cursor: 'pointer', fontSize: 12 }}>Cancelar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ClubManualOps({ token, toast }) {
  const [dni, setDni] = useState('')
  const [aybAmount, setAybAmount] = useState('')
  const [adjustPts, setAdjustPts] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  async function doCheckin() {
    if (!dni.trim()) return toast.show('DNI requerido', 'err')
    try { const r = await adminLoyaltyCheckin(token, dni.trim()); toast.show(r.granted ? '+50 pts check-in ✓' : 'Ya hizo check-in hoy', r.granted ? 'ok' : 'err') }
    catch (err) { toast.show(err.message, 'err') }
  }
  async function doAyb() {
    const amt = Number(aybAmount)
    if (!dni.trim() || !amt) return toast.show('DNI y monto requeridos', 'err')
    try { const r = await adminLoyaltyAyb(token, { dni: dni.trim(), amountPesos: amt, paidWithPoints: false }); toast.show(`+${r.granted} pts AyB ($${amt.toLocaleString('es-AR')}) ✓`, 'ok'); setAybAmount('') }
    catch (err) { toast.show(err.message, 'err') }
  }
  async function doAdjust() {
    const pts = Number(adjustPts)
    if (!dni.trim() || !pts) return toast.show('DNI y puntos requeridos', 'err')
    if (!adjustReason.trim()) return toast.show('Motivo obligatorio para ajuste', 'err')
    try { const r = await adminLoyaltyAdjust(token, { dni: dni.trim(), points: pts, reason: adjustReason }); toast.show(`Ajuste ${pts > 0 ? '+' : ''}${pts} pts ✓ Balance: ${r.balance}`, 'ok'); setAdjustPts(''); setAdjustReason('') }
    catch (err) { toast.show(err.message, 'err') }
  }
  const inp = { padding: '10px 14px', borderRadius: 8, border: '1px solid #2a3142', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: 14 }
  return (
    <div>
      <p style={{ color: '#8B9BB4', fontSize: 13, marginBottom: 16 }}>Operaciones manuales antes de tener tótem (check-in) e integración con Centro (AyB). Todo queda en audit log.</p>
      <input placeholder="DNI del cliente" value={dni} onChange={e => setDni(e.target.value)} style={{ ...inp, marginBottom: 18, maxWidth: 280 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid #2a3142', borderRadius: 10, padding: 16 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#F0D275' }}>🏠 Check-in (+50 pts)</h4>
          <p style={{ fontSize: 12, color: '#8B9BB4', marginBottom: 12 }}>Suma 50 pts una vez por día.</p>
          <button onClick={doCheckin} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#06240f', fontWeight: 700, cursor: 'pointer' }}>Marcar check-in</button>
        </div>
        <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid #2a3142', borderRadius: 10, padding: 16 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#F0D275' }}>🍺 Consumo AyB (+5%)</h4>
          <input type="number" placeholder="Monto $ (no incluye lo pagado con pts)" value={aybAmount} onChange={e => setAybAmount(e.target.value)} style={{ ...inp, width: '100%', marginBottom: 10 }} />
          <button onClick={doAyb} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none', background: '#C9A84C', color: '#08060e', fontWeight: 700, cursor: 'pointer' }}>Cargar consumo</button>
        </div>
        <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid #2a3142', borderRadius: 10, padding: 16 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#F0D275' }}>🛠 Ajuste manual</h4>
          <input type="number" placeholder="Puntos (+/-)" value={adjustPts} onChange={e => setAdjustPts(e.target.value)} style={{ ...inp, width: '100%', marginBottom: 8 }} />
          <input placeholder="Motivo (obligatorio)" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} style={{ ...inp, width: '100%', marginBottom: 10 }} />
          <button onClick={doAdjust} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Aplicar ajuste</button>
        </div>
      </div>
    </div>
  )
}

// ─── Email Blast Admin ────────────────────────────────────────────────────────
const PROMO_DEFAULT_SUBJECT = '🎁 Tenés un regalo esperándote en Sala de Juegos Crespo'

export { CLUB_CATEGORIES, FortunaAdmin, ClubCatalog, ClubAccountLookup, ClubDeliver, ClubManualOps }
