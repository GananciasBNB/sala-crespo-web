import { useEffect, useState, useCallback } from 'react'
import {
  promoActive, promoCreateMatch, promoSetStatus, promoGoal, promoUndoGoal,
  promoCheckin, promoLead, promoAttendance, promoClose, promoPending, promoDeliver, promoRemoveCheckin, promoPayout, promoDiscardMatch, getMatches,
  promoMatches, promoRaffleWinners, promoDraw, promoDrawUndo,
} from '../api/client'

const TICKET_GOAL = 2500 // para mostrar el desglose en la entrega (debe coincidir con el backend)
import './PromoPartido.css'

const fmt = new Intl.NumberFormat('es-AR')
const money = (n) => `$${fmt.format(Math.round(Number(n) || 0))}`
const fmtMatch = (iso) => {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    })
  } catch { return '' }
}
const fmtHora = (iso) => {
  try { return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) }
  catch { return '' }
}
const fmtDni = (d) => String(d || '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

// Pantalla operativa de la promo "Viví Argentina en Sala". Acceso con ?k=CODE.
//  - Operativo (promotora): partido, check-in por DNI, botón GOL, cierre.
//  - Entregar (validador): busca DNI y entrega los tickets.
export default function PromoPartido() {
  const k = new URLSearchParams(window.location.search).get('k') || ''
  const [tab, setTab] = useState('op')
  const [showInfo, setShowInfo] = useState(false)
  if (!k) return <div className="pp"><p className="pp__err">Falta el código de acceso en el link.</p></div>
  return (
    <div className="pp">
      <header className="pp__head">
        <img src="/logo-mundial-2026.png" alt="" className="pp__logo" />
        <h1>Promo · Viví Argentina en Sala</h1>
        <button type="button" className="pp__info-btn" onClick={() => setShowInfo(true)}>ℹ️ La promo</button>
      </header>
      {showInfo && <PromoInfo onClose={() => setShowInfo(false)} />}
      <div className="pp__tabs">
        <button className={tab === 'op' ? 'is-on' : ''} onClick={() => setTab('op')}>
          <span className="pp__tab-t">⚽ Anotar</span>
          <span className="pp__tab-s">Gente y goles del partido</span>
        </button>
        <button className={tab === 'deliver' ? 'is-on' : ''} onClick={() => setTab('deliver')}>
          <span className="pp__tab-t">🎟️ Entregar</span>
          <span className="pp__tab-s">Dar los tickets por DNI</span>
        </button>
        <button className={tab === 'sorteo' ? 'is-on' : ''} onClick={() => setTab('sorteo')}>
          <span className="pp__tab-t">🎁 Sorteo</span>
          <span className="pp__tab-s">Camiseta y pelota en vivo</span>
        </button>
      </div>
      {tab === 'op' ? <Operativo k={k} /> : tab === 'deliver' ? <Entregar k={k} /> : <Sorteo k={k} />}
    </div>
  )
}

// Panel con las reglas de la promo, para que la promotora las tenga a mano.
function PromoInfo({ onClose }) {
  return (
    <div className="pp__modal" onClick={onClose}>
      <div className="pp__modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="pp__modal-head">
          <h2>¿Cómo es la promo?</h2>
          <button type="button" className="pp__modal-x" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <p className="pp__modal-lead">
          Cuando juega <b>Argentina</b>, los clientes que están en la sala ganan <b>tickets para jugar en las máquinas</b>.
        </p>

        <div className="pp__modal-block pp__modal-block--gold">
          <div className="pp__modal-amt">⚽ $2.500 por cada gol</div>
          <div className="pp__modal-txt">A cada persona anotada, por cada gol de Argentina. Hasta <b>4 goles</b> por partido. <b>Sin límite de personas.</b></div>
        </div>

        <div className="pp__modal-block pp__modal-block--blue">
          <div className="pp__modal-amt">🎉 $5.000 de bono por venir</div>
          <div className="pp__modal-txt">A los <b>primeros 30</b> que llegan a la sala en la <b>hora siguiente</b> a que termina el partido.</div>
        </div>

        <div className="pp__modal-rules">
          <div className="pp__modal-rules-t">Reglas</div>
          <ul>
            <li>Se anota a cada persona por su <b>DNI</b>.</li>
            <li>Cada persona cobra <b>por una sola cosa</b>: o por los goles que vio, o el bono por venir. No las dos.</li>
            <li>Para <b>mayores de 18</b>.</li>
            <li>Los tickets se entregan en el momento y se juegan en las máquinas (no es dinero en efectivo).</li>
          </ul>
        </div>

        <button type="button" className="pp__btn pp__btn--gold pp__modal-ok" onClick={onClose}>Entendido</button>
      </div>
    </div>
  )
}

// Le dice a la promotora QUÉ hacer AHORA (una sola instrucción), con el detalle colapsable.
function PhaseGuide({ status }) {
  const [open, setOpen] = useState(false)
  const map = {
    open: { now: 'Anotá a cada persona con su DNI. Cuando Argentina meta un gol, tocá el botón celeste.', steps: ['Anotá con su DNI a cada persona que ingrese o ya esté en la sala.', 'Durante el partido: tocá ⚽ el botón celeste cada vez que Argentina mete un gol.', 'Si alguien avisa que se va antes de que termine el partido, tocá 💵 para entregarle lo que ganó hasta ese momento.', 'Cuando el partido termina, pasá a la pestaña “🎉 Después del partido” para anotar a los que llegan (esos ganan el bono).'] },
    post: { now: 'El partido terminó. A cada persona que llega, anotala con su DNI y entregale el bono en el momento.', steps: ['Anotá con el DNI a cada persona que llega ahora (después del partido).', 'Al tocar “Anotar y dar bono”, te digo cuánto entregarle (o si el cupo de 30 ya se llenó).', 'El bono se entrega ACÁ, al momento. Los tickets por goles (de los que estuvieron en vivo) se entregan al cerrar, desde la pestaña Entregar.', 'Cuando no llega más nadie, tocá “Terminar y calcular tickets”.'] },
    closed: { now: 'Listo. Pasá a la pestaña 🎟️ Entregar para dar los tickets por DNI.', steps: ['Los montos quedaron calculados y fijos.', 'Pasá a la pestaña 🎟️ Entregar para dar los tickets buscando por DNI.'] },
  }
  const h = map[status]
  if (!h) return null
  return (
    <div className={`pp__guide pp__guide--${status}`}>
      <div className="pp__guide-now"><b>Ahora:</b> {h.now}</div>
      <button type="button" className="pp__guide-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'Ocultar pasos ▴' : '¿Cómo funciona? Ver pasos ▾'}
      </button>
      {open && <ol className="pp__guide-steps">{h.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
    </div>
  )
}

function Operativo({ k }) {
  const [match, setMatch] = useState(undefined) // undefined=cargando, null=no hay, obj=partido
  const [att, setAtt] = useState([])
  const [dni, setDni] = useState('')
  const [label, setLabel] = useState('Argentina')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [argMatches, setArgMatches] = useState([])
  const [manual, setManual] = useState(false)
  const [err, setErr] = useState('')
  const [goalLock, setGoalLock] = useState(false) // cooldown anti-doble-tap del botón GOL
  const [justAdded, setJustAdded] = useState('') // último DNI anotado, para confirmación grande
  const [showList, setShowList] = useState(false) // lista de presentes colapsable durante el partido
  const [showMore, setShowMore] = useState(false) // acciones peligrosas (descartar) escondidas
  const [lead, setLead] = useState(null) // {dni} cuando el DNI anotado NO está en la base → pedir datos
  const [leadForm, setLeadForm] = useState({ name: '', tel: '', email: '' })

  // Cuando no hay partido activo, traigo del fixture los próximos de Argentina
  useEffect(() => {
    if (match !== null) return
    getMatches().then((d) => {
      const list = d?.matches || d || []
      const since = Date.now() - 3 * 3600 * 1000 // incluye el que arrancó hace poco
      const arg = list
        .filter((m) => (m.homeName === 'Argentina' || m.awayName === 'Argentina') && new Date(m.date).getTime() >= since)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
      setArgMatches(arg)
    }).catch(() => {})
  }, [match])

  const loadAtt = useCallback(async (id) => {
    try { const d = await promoAttendance(k, id); setAtt(d.attendance || []) } catch {}
  }, [k])

  const load = useCallback(async () => {
    try {
      setErr('')
      const d = await promoActive(k)
      setMatch(d.match || null)
      if (d.match) loadAtt(d.match.id)
    } catch (e) { setErr(e.message || 'Error de conexión') }
  }, [k, loadAtt])

  useEffect(() => { load() }, [load])
  // Refresca presentes cada 15s (por si entra gente o se anota desde otro lado)
  useEffect(() => {
    if (!match?.id) return
    const t = setInterval(() => loadAtt(match.id), 15000)
    return () => clearInterval(t)
  }, [match?.id, loadAtt])

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const createMatch = async () => {
    if (!label.trim()) return
    setBusy(true)
    try { const d = await promoCreateMatch(k, label.trim()); setMatch(d.match); setAtt([]); loadAtt(d.match.id); if (d.reused) flash('Ya había un partido activo — te llevé a ese') }
    catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  // Arranca el operativo directo desde un partido del fixture (sin tipear)
  const startFromFixture = async (m) => {
    const rival = m.homeName === 'Argentina' ? m.awayName : m.homeName
    setBusy(true)
    try { const d = await promoCreateMatch(k, `Argentina vs ${rival}`, m.date); setMatch(d.match); setAtt([]); loadAtt(d.match.id); if (d.reused) flash('Ya había un partido activo — te llevé a ese') }
    catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  // Partido de PRUEBA: para practicar el flujo cuantas veces quieras, después se descarta.
  const startTest = async () => {
    setBusy(true)
    try { const d = await promoCreateMatch(k, 'PRUEBA — practicá tranquila', null, true); setMatch(d.match); setAtt([]) }
    catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  // Descarta el partido actual y vuelve a la pantalla de elegir.
  const discardMatch = async () => {
    const wasTest = match.is_test
    // Prueba: salida directa, sin confirmar (no hay nada que proteger).
    // Real: confirmar, porque borra un partido de verdad.
    if (!wasTest && !window.confirm('¿DESCARTAR este partido? Se borra todo lo cargado (no se puede si ya entregaste tickets).')) return
    setBusy(true)
    try { await promoDiscardMatch(k, match.id); setMatch(null); setAtt([]); flash(wasTest ? 'Saliste de la prueba' : 'Partido descartado') }
    catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  const goal = async () => {
    setBusy(true)
    try {
      const d = await promoGoal(k, match.id); setMatch({ ...match }); loadAtt(match.id)
      flash(`⚽ Gol ${d.goals} de Argentina anotado`)
      setGoalLock(true); setTimeout(() => setGoalLock(false), 2500) // evita el doble-tap del grito
    } catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  const undoGoal = async () => {
    if (!window.confirm('¿Borrar el último gol registrado?')) return
    setBusy(true)
    try { await promoUndoGoal(k, match.id); loadAtt(match.id); flash('Gol deshecho') }
    catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  const removeCheckin = async (a) => {
    if (!window.confirm(`¿Quitar a ${a.name || 'DNI ' + a.dni}? No va a recibir tickets.`)) return
    setBusy(true)
    try { await promoRemoveCheckin(k, a.id); loadAtt(match.id); flash('Presente quitado') }
    catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  // Liquida a alguien que se va antes del cierre: cobra los goles vistos hasta ahora.
  const payout = async (a) => {
    const who = a.name || `DNI ${a.dni}`
    if (!window.confirm(`¿Liquidar a ${who}? Cobra los goles que vio hasta ahora y queda cerrado (se va).`)) return
    setBusy(true)
    try {
      const r = await promoPayout(k, a.id)
      loadAtt(match.id)
      window.alert(`Entregale ${money(r.tickets)} en tickets a ${who}.`)
    } catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  const checkin = async () => {
    const v = dni.trim()
    if (!/^\d{7,8}$/.test(v)) return flash('DNI: 7 u 8 dígitos')
    setBusy(true)
    try {
      const r = await promoCheckin(k, match.id, v, null, match.status === 'post')
      setDni('')
      // Post-partido: el bono se entrega EN EL MOMENTO. Anotar + liquidar el bono.
      if (match.status === 'post' && r?.attendance?.id) {
        const pay = await promoPayout(k, r.attendance.id)
        if (pay.tickets > 0) {
          window.alert(`✅ Entregale ${money(pay.tickets)} en tickets a DNI ${fmtDni(v)}.\n(Bono por venir después del partido.)`)
        } else {
          window.alert(`DNI ${fmtDni(v)} quedó anotado, pero el cupo de 30 del bono ya se llenó: no le corresponde el bono.`)
        }
      } else {
        setJustAdded(v); setTimeout(() => setJustAdded(''), 3500) // confirmación grande en vivo
      }
      loadAtt(match.id)
      // DNI nuevo: ya quedó anotado, ahora pedimos sus datos para sumarlo a la base.
      if (r?.isNew) { setLeadForm({ name: '', tel: '', email: '' }); setLead({ dni: v }) }
    } catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  // Guarda al cliente nuevo en la base (nombre obligatorio; tel/email opcionales).
  const saveLead = async () => {
    const name = leadForm.name.trim()
    if (name.length < 3) return flash('Poné nombre y apellido')
    setBusy(true)
    try {
      await promoLead(k, { dni: lead.dni, name, tel: leadForm.tel.trim() || null, email: leadForm.email.trim() || null, matchId: match.id })
      setLead(null); loadAtt(match.id); flash('✓ Cliente nuevo sumado a la base 🎉')
    } catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  const setStatus = async (status) => {
    if (status === 'closed' && !window.confirm('¿Terminar la promo y calcular los tickets? Hacelo solo cuando ya no entra más nadie. Una vez que empezás a entregar tickets, no se puede reabrir.')) return
    setBusy(true)
    try {
      if (status === 'closed') { await promoClose(k, match.id) }
      else { await promoSetStatus(k, match.id, status) }
      await load(); flash(status === 'post' ? 'Ahora anotá a los que llegan' : status === 'closed' ? 'Promo cerrada' : 'Volviste a “en vivo”')
    } catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  // Sub-espacios "Durante el partido" / "Después del partido" = cambiar la fase.
  const goLive = () => { if (match.status !== 'open') setStatus('open') }
  const goPost = () => {
    if (match.status === 'post') return
    if (!window.confirm('¿El partido terminó? Pasás a anotar los INGRESOS POSTERIORES (bono por venir). Si te equivocás, podés volver a “Durante el partido”.')) return
    setStatus('post')
  }

  if (err && match === undefined) return (
    <div className="pp__panel">
      <p className="pp__err">
        {err === 'Código inválido.'
          ? 'El código de acceso del link no es válido. Revisá la URL (o falta setear PROMO_KEY en el servidor).'
          : `No se pudo conectar: ${err}`}
      </p>
      <button className="pp__btn pp__btn--ghost" onClick={load}>Reintentar</button>
    </div>
  )
  if (match === undefined) return <p className="pp__loading">Cargando…</p>

  // No hay partido activo → arrancar desde el fixture (o manual)
  if (!match) {
    return (
      <div className="pp__panel">
        {argMatches.length > 0 ? (
          <>
            <p className="pp__intro">Próximos partidos de Argentina. Tocá uno para arrancar el operativo.</p>
            <ul className="pp__fixture">
              {argMatches.map((m) => {
                const rival = m.homeName === 'Argentina' ? m.awayName : m.homeName
                return (
                  <li key={m.id}>
                    <button className="pp__fixbtn" onClick={() => startFromFixture(m)} disabled={busy}>
                      <span className="pp__fixteams">Argentina vs {rival}</span>
                      <span className="pp__fixdate">{fmtMatch(m.date)} hs</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <p className="pp__intro">No hay próximos partidos de Argentina en el fixture. Podés crear uno manual.</p>
        )}

        <button className="pp__linkbtn" onClick={() => setManual((v) => !v)}>
          {manual ? '← Volver' : 'Otro partido (cargar a mano)'}
        </button>
        {manual && (
          <div className="pp__create">
            <input className="pp__input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej: Argentina vs Austria" />
            <button className="pp__btn pp__btn--gold" onClick={createMatch} disabled={busy}>Crear partido</button>
          </div>
        )}

        <div className="pp__testzone">
          <p className="pp__testzone-lbl">¿Primera vez? Practicá sin miedo 👇</p>
          <button className="pp__btn pp__btn--test" onClick={startTest} disabled={busy}>🧪 Probar el flujo (partido de prueba)</button>
        </div>
        {msg && <p className="pp__msg">{msg}</p>}
      </div>
    )
  }

  // Goles registrados ≈ el máximo de goles presenciados entre los presentes (el que llegó primero los vio todos)
  const totalGoals = att.length ? Math.max(...att.filter(a => !a.is_post).map(a => a.goalsSeen), 0) : 0
  const present = att.filter(a => !a.is_post)
  const postPeople = att.filter(a => a.is_post)
  const isClosed = match.status === 'closed'
  const isPost = match.status === 'post'

  const capN = isPost ? postPeople.length : present.length
  const capCls = capN >= 30 ? 'pp__cap--full' : capN >= 25 ? 'pp__cap--near' : ''
  // Cada espacio muestra SU propia lista: en vivo los de goles, en post los del bono.
  const listToShow = isClosed ? att : (isPost ? postPeople : present)
  const listTotal = listToShow.reduce((s, a) => s + (a.delivered ? a.tickets : a.ticketsCalc || 0), 0)

  return (
    <div className={`pp__panel ${match.is_test ? 'pp__panel--test' : ''}`}>
      {/* Indicador de prueba como overlay fijo: NO ocupa espacio, así la pantalla
          se ve igual en prueba y en real (los controles no se mueven). */}
      {match.is_test && <div className="pp__testribbon" aria-hidden="true">🧪 PRUEBA</div>}

      {/* Salir de la prueba: SIEMPRE a la vista, es práctica y tiene que ser fácil volver. */}
      {match.is_test && (
        <button className="pp__exittest" onClick={discardMatch} disabled={busy}>← Salir de la prueba y volver al inicio</button>
      )}

      {/* DOS ESPACIOS separados: durante el partido (goles) y después (bono).
          Cambiar de espacio = cambiar la fase (el server decide goles vs bono). */}
      {!isClosed && (
        <div className="pp__subtabs">
          <button type="button" className={`pp__subtab ${match.status === 'open' ? 'is-on' : ''}`} onClick={goLive} disabled={busy}>
            <span className="pp__subtab-t">⚽ Durante el partido</span>
            <span className="pp__subtab-s">Anotar gente y goles</span>
          </button>
          <button type="button" className={`pp__subtab pp__subtab--post ${isPost ? 'is-on' : ''}`} onClick={goPost} disabled={busy}>
            <span className="pp__subtab-t">🎉 Después del partido</span>
            <span className="pp__subtab-s">Anotar ingresos y dar bono</span>
          </button>
        </div>
      )}

      {/* Estado del partido en una sola línea (no roba pantalla) */}
      <div className={`pp__statusbar pp__statusbar--${match.status}`}>
        <span className="pp__statusbar-name">{match.label}</span>
        <span className="pp__statusbar-meta">
          <span className="pp__statusbar-state">{isClosed ? '✅ Cerrada' : isPost ? '🏁 Post-partido' : '🔴 En vivo'}</span>
          {!isClosed && <span>⚽ {totalGoals}</span>}
          {/* Goles: sin cupo (solo contador). Bono post: cupo de 30. */}
          {isPost
            ? <span className={capCls}>{postPeople.length}/30 bono</span>
            : <span>👥 {present.length}</span>}
        </span>
      </div>

      <PhaseGuide status={match.status} />

      {/* PROTAGONISTA: anotar por DNI — es el 90% del trabajo, va primero y grande */}
      {!isClosed && (
        <div className="pp__checkin pp__checkin--hero">
          {lead ? (
            /* DNI nuevo: ya quedó anotado, sumamos sus datos a la base de clientes */
            <div className="pp__lead">
              <div className="pp__lead-title">🆕 Cliente nuevo · DNI {fmtDni(lead.dni)}</div>
              <div className="pp__lead-sub">Ya quedó anotado ✓. Sumalo a la base — tarda nada:</div>
              <input className="pp__input" placeholder="Nombre y apellido" value={leadForm.name} autoFocus
                onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))} />
              <div style={{ fontSize: '0.92rem', color: '#F0D275', fontWeight: 700, margin: '6px 0 2px', textAlign: 'center', lineHeight: 1.3 }}>
                🥤 Pedile el mail → le regalamos una bebida de cortesía
              </div>
              <input className="pp__input" inputMode="email" type="email" placeholder="Email del cliente" value={leadForm.email}
                style={{ borderColor: 'rgba(240,210,117,0.65)', boxShadow: '0 0 0 1px rgba(240,210,117,0.3)' }}
                onChange={(e) => setLeadForm((f) => ({ ...f, email: e.target.value }))} />
              <input className="pp__input" inputMode="tel" placeholder="Teléfono (opcional)" value={leadForm.tel}
                onChange={(e) => setLeadForm((f) => ({ ...f, tel: e.target.value.replace(/[^\d+\s-]/g, '') }))} />
              <div className="pp__lead-actions">
                <button className="pp__btn pp__btn--gold" onClick={saveLead} disabled={busy}>✓ Guardar en la base</button>
                <button className="pp__btn pp__btn--ghost" onClick={() => setLead(null)} disabled={busy}>Omitir</button>
              </div>
            </div>
          ) : (
            <>
              <div className="pp__checkin-lbl">{isPost ? '🎉 Anotá y entregá el bono por venir' : '📋 Anotá a cada persona en la sala'}</div>
              <div className="pp__checkin-row">
                <input className="pp__input pp__input--big" inputMode="numeric" maxLength={8} value={dni} autoFocus
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} placeholder="DNI"
                  onKeyDown={(e) => e.key === 'Enter' && checkin()} />
                <button className="pp__btn pp__btn--gold pp__btn--anotar" onClick={checkin} disabled={busy}>{isPost ? '✓ Anotar y dar bono' : '✓ Anotar'}</button>
              </div>
              {isPost
                ? <div className="pp__added pp__added--idle">Al anotar, te digo cuánto bono entregarle.</div>
                : justAdded
                  ? <div className="pp__added">✓ Anotado: {fmtDni(justAdded)} · van {capN}</div>
                  : <div className="pp__added pp__added--idle">Tipeá el DNI y tocá Anotar</div>}
            </>
          )}
        </div>
      )}

      {/* GOL — secundario: se usa poco (2-3 por partido) pero tiene que ser inconfundible */}
      {match.status === 'open' && (
        <div className="pp__golzone">
          <div className="pp__golzone-lbl">Cuando Argentina meta un gol, tocá acá al momento 👇</div>
          <button className={`pp__goalbtn ${goalLock ? 'is-locked' : ''}`} onClick={goal} disabled={busy || goalLock}>
            {goalLock ? '✓ ¡Gol contado!' : '⚽ Gol de Argentina'}
          </button>
          {totalGoals > 0 && <button className="pp__undo" onClick={undoGoal} disabled={busy}>↩ Deshacer último gol</button>}
        </div>
      )}

      {isClosed && (
        <div className="pp__closednote">La promo está cerrada y los montos quedaron fijos. Para entregar los tickets, pasá a la pestaña <b>🎟️ Entregar</b> (arriba) y buscá por DNI.</div>
      )}

      {/* Lista de presentes — colapsada en el partido (es ruido), abierta al cerrar */}
      <div className="pp__listwrap">
        <button type="button" className="pp__listtoggle" onClick={() => setShowList((v) => !v)}>
          <span>{showList ? 'Ocultar lista ▴' : `${isPost ? 'Ver ingresos post' : 'Ver anotados'} (${listToShow.length}) ▾`}</span>
          <span className="pp__listtoggle-total">Total: {money(listTotal)}</span>
        </button>
        {(showList || isClosed) && (
          <ul className="pp__list">
            {listToShow.map((a) => (
              <li key={a.id} className={`pp__person ${a.is_post ? 'is-post' : ''} ${a.overCap && !a.delivered ? 'is-over' : ''} ${a.delivered ? 'is-paid' : ''}`}>
                <div className="pp__person-info">
                  <span className="pp__person-name">{a.name || `DNI ${fmtDni(a.dni)}`}</span>
                  <span className="pp__person-sub">
                    {a.delivered
                      ? '✓ cobró y se fue'
                      : a.is_post ? 'Post-partido' : `${a.goalsSeen} gol${a.goalsSeen !== 1 ? 'es' : ''}`}
                    {!a.delivered && a.overCap && ' · fuera de cupo'}
                  </span>
                </div>
                <span className="pp__person-tickets">{money(a.delivered ? a.tickets : isClosed ? a.tickets : a.ticketsCalc)}</span>
                {!isClosed && !a.delivered && (
                  <>
                    <button className="pp__pay" onClick={() => payout(a)} disabled={busy} title="Liquidar (se va)">💵</button>
                    <button className="pp__remove" onClick={() => removeCheckin(a)} disabled={busy} title="Quitar">✕</button>
                  </>
                )}
              </li>
            ))}
            {listToShow.length === 0 && <li className="pp__empty">Todavía no hay nadie acá.</li>}
          </ul>
        )}
      </div>

      {/* En vivo: acceso claro para pasar al bono cuando termina el partido
          (así la promotora no tiene que buscar la pestaña de arriba). */}
      {match.status === 'open' && (
        <div className="pp__phase">
          <button className="pp__btn pp__btn--gold pp__btn--topost" onClick={goPost} disabled={busy}>🏁 El partido terminó → pasar a anotar el bono</button>
        </div>
      )}

      {/* Cerrar la promo — solo desde "Después del partido", al final de todo */}
      {isPost && (
        <div className="pp__phase">
          <p className="pp__phase-hint">
            <b>Tocá esto recién al final</b>, cuando ya no entra ni queda nadie. Liquida de una a los que estuvieron
            todo el partido y todavía no cobraron — después se entregan por DNI en la pestaña <b>🎟️ Entregar</b>.
          </p>
          <button className="pp__btn pp__btn--close" onClick={() => setStatus('closed')} disabled={busy}>🔒 Terminar la promo y calcular tickets</button>
        </div>
      )}

      {/* Descartar un partido REAL: escondido detrás de "Más" para no borrarlo sin querer.
          (En prueba no aplica: ya tiene el botón "Salir de la prueba" a la vista arriba.) */}
      {!match.is_test && (
        <div className="pp__more">
          <button type="button" className="pp__more-toggle" onClick={() => setShowMore((v) => !v)}>{showMore ? 'Cerrar ▴' : '⋯ Más opciones'}</button>
          {showMore && (
            <button className="pp__discard" onClick={discardMatch} disabled={busy}>🗑️ Descartar partido (empezar de nuevo)</button>
          )}
        </div>
      )}

      {msg && <p className="pp__msg">{msg}</p>}
    </div>
  )
}

function Entregar({ k }) {
  const [dni, setDni] = useState('')
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const search = async () => {
    if (!/^\d{7,8}$/.test(dni.trim())) return flash('DNI: 7 u 8 dígitos')
    setBusy(true)
    try { const d = await promoPending(k, dni.trim()); setPending(d.pending || []) }
    catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  const deliver = async (id) => {
    setBusy(true)
    try { await promoDeliver(k, id); setPending((p) => p.filter((x) => x.id !== id)); flash('✓ Entregado') }
    catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }

  return (
    <div className="pp__panel">
      <p className="pp__intro">Buscá por DNI los tickets pendientes de la promo y entregalos.</p>
      <div className="pp__checkin-row">
        <input className="pp__input" inputMode="numeric" maxLength={8} value={dni}
          onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} placeholder="DNI del cliente"
          onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="pp__btn pp__btn--gold" onClick={search} disabled={busy}>🔍 Buscar</button>
      </div>

      {pending && pending.length === 0 && <p className="pp__msg">Sin tickets pendientes para ese DNI.</p>}
      {pending && pending.length > 0 && (
        <ul className="pp__list">
          {pending.map((t) => (
            <li key={t.id} className="pp__person">
              <div className="pp__person-info">
                <span className="pp__person-name">{t.name || `DNI ${dni}`}</span>
                <span className="pp__person-sub">
                  {t.label} ·{' '}
                  {t.is_post
                    ? 'llegó después del partido'
                    : (() => { const g = Math.round(t.tickets / TICKET_GOAL); return `se anotó ${fmtHora(t.checkin_at)} · vio ${g} gol${g !== 1 ? 'es' : ''}` })()}
                </span>
              </div>
              <span className="pp__person-tickets">{money(t.tickets)}</span>
              <button className="pp__deliver" onClick={() => deliver(t.id)} disabled={busy}>✓ Entregar</button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="pp__msg">{msg}</p>}
    </div>
  )
}

// ─── Sorteo de premios en vivo ────────────────────────────────────────────────
const PRIZES = [
  { id: 'camiseta', label: 'Camiseta Argentina', emoji: '👕' },
  { id: 'pelota',   label: 'Pelota',             emoji: '⚽' },
]

// Anima una "ruleta" de nombres: parpadea rápido y desacelera hasta frenar en el
// ganador. El ganador YA viene decidido por el server; esto es solo el show.
// Devuelve una promesa que resuelve cuando la animación terminó.
function spinReel(pool, winner, setReel) {
  return new Promise((resolve) => {
    const labels = pool.map(p => p.name || `DNI ${fmtDni(p.dni)}`)
    const winnerLabel = winner.name || `DNI ${fmtDni(winner.dni)}`
    if (labels.length <= 1) { setReel(winnerLabel); setTimeout(resolve, 400); return }
    const total = 2900 // ms de giro
    let elapsed = 0
    const step = () => {
      if (elapsed >= total) { setReel(winnerLabel); resolve(); return }
      setReel(labels[Math.floor(Math.random() * labels.length)])
      const p = elapsed / total
      const delay = 45 + p * p * 340 // rápido al inicio, lento al final (easeOut)
      elapsed += delay
      setTimeout(step, delay)
    }
    step()
  })
}

function Sorteo({ k }) {
  const [match, setMatch] = useState(undefined) // undefined=cargando, null=no hay, obj
  const [winners, setWinners] = useState([])
  const [available, setAvailable] = useState(0)
  const [prize, setPrize] = useState(PRIZES[0].label)
  const [reel, setReel] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      // Partido activo (open/post) primero — permite sortear en el entretiempo y
      // también probar con el partido de PRUEBA. Si no hay activo, el último real.
      const a = await promoActive(k)
      let m = a.match || null
      if (!m) {
        const d = await promoMatches(k)
        m = (d.matches || []).find(x => !x.is_test) || null
      }
      setMatch(m)
      if (!m) return
      const [w, att] = await Promise.all([promoRaffleWinners(k, m.id), promoAttendance(k, m.id)])
      const won = new Set((w.winners || []).map(x => x.dni))
      setWinners(w.winners || [])
      setAvailable((att.attendance || []).filter(a => !a.is_post && !won.has(a.dni)).length)
    } catch { setMatch(null) }
  }, [k])
  useEffect(() => { load() }, [load])

  async function draw() {
    if (spinning || busy || !match) return
    setErr(''); setResult(null); setBusy(true)
    try {
      const r = await promoDraw(k, match.id, prize)
      setBusy(false); setSpinning(true)
      await spinReel(r.pool || [], r.winner, setReel)
      setResult(r.winner)
      setSpinning(false)
      load()
    } catch (e) {
      setBusy(false); setSpinning(false)
      setErr(e.message || 'No se pudo sortear.')
    }
  }

  async function undo() {
    if (busy || spinning || !match) return
    if (!window.confirm('¿Deshacer el último sorteo? El ganador vuelve al bolillero.')) return
    setBusy(true); setErr('')
    try { await promoDrawUndo(k, match.id); setResult(null); await load() }
    catch (e) { setErr(e.message || 'No se pudo deshacer.') }
    finally { setBusy(false) }
  }

  if (match === undefined) return <div className="sorteo"><p className="sorteo__note">Cargando…</p></div>
  if (match === null) return (
    <div className="sorteo">
      <p className="sorteo__note">Todavía no hay ningún partido. Creá uno en la pestaña ⚽ Anotar para poder sortear.</p>
    </div>
  )

  return (
    <div className="sorteo">
      <div className="sorteo__match">{match.label}{match.status === 'closed' ? ' · cerrado' : ''}</div>

      {/* Escenario */}
      <div className={`sorteo__stage ${spinning ? 'is-spin' : ''} ${result ? 'is-win' : ''}`}>
        {result ? (
          <>
            <div className="sorteo__confetti" aria-hidden="true">
              {Array.from({ length: 40 }).map((_, i) => <span key={i} style={{ '--i': i }} />)}
            </div>
            <div className="sorteo__win-emoji">🎉</div>
            <div className="sorteo__win-name">{result.name || `DNI ${fmtDni(result.dni)}`}</div>
            <div className="sorteo__win-dni">DNI {fmtDni(result.dni)}</div>
            <div className="sorteo__win-prize">🏆 Ganó: {result.prize}</div>
          </>
        ) : spinning ? (
          <div className="sorteo__reel">{reel || '…'}</div>
        ) : (
          <div className="sorteo__idle">
            <div className="sorteo__idle-emoji">🎁</div>
            <div className="sorteo__idle-txt">
              {available > 0
                ? <>Listos para sortear · <b>{available}</b> participante{available !== 1 ? 's' : ''}</>
                : 'No hay participantes disponibles todavía.'}
            </div>
          </div>
        )}
      </div>

      {/* Premio a sortear */}
      <div className="sorteo__prizes">
        {PRIZES.map(p => (
          <button
            key={p.id}
            type="button"
            className={`sorteo__prize ${prize === p.label ? 'is-on' : ''}`}
            onClick={() => setPrize(p.label)}
            disabled={spinning}
          >
            <span className="sorteo__prize-emoji">{p.emoji}</span>
            <span className="sorteo__prize-label">{p.label}</span>
          </button>
        ))}
      </div>

      <button
        className="pp__btn pp__btn--gold sorteo__go"
        onClick={draw}
        disabled={spinning || busy || available === 0}
      >
        {spinning ? 'Sorteando…' : busy ? '…' : `🎲 Sortear ${prize}`}
      </button>
      {result && !spinning && (
        <button className="pp__btn pp__btn--ghost sorteo__again" onClick={() => setResult(null)}>
          Sortear otro premio
        </button>
      )}
      {err && <p className="pp__err">{err}</p>}

      {/* Historial de ganadores */}
      {winners.length > 0 && (
        <div className="sorteo__history">
          <div className="sorteo__history-t">Ganadores de hoy</div>
          <ul>
            {winners.map(w => (
              <li key={w.id}>
                <span className="sorteo__hist-prize">{w.prize}</span>
                <span className="sorteo__hist-name">{w.name || `DNI ${fmtDni(w.dni)}`}</span>
                <span className="sorteo__hist-dni">DNI {fmtDni(w.dni)}</span>
              </li>
            ))}
          </ul>
          <button className="pp__linkbtn sorteo__undo" onClick={undo} disabled={busy || spinning}>
            Deshacer último sorteo
          </button>
        </div>
      )}
    </div>
  )
}
