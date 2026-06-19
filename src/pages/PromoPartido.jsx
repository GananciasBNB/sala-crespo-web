import { useEffect, useState, useCallback } from 'react'
import {
  promoActive, promoCreateMatch, promoSetStatus, promoGoal, promoUndoGoal,
  promoCheckin, promoAttendance, promoClose, promoPending, promoDeliver, getMatches,
} from '../api/client'
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

// Pantalla operativa de la promo "Viví Argentina en Sala". Acceso con ?k=CODE.
//  - Operativo (promotora): partido, check-in por DNI, botón GOL, cierre.
//  - Entregar (validador): busca DNI y entrega los tickets.
export default function PromoPartido() {
  const k = new URLSearchParams(window.location.search).get('k') || ''
  const [tab, setTab] = useState('op')
  if (!k) return <div className="pp"><p className="pp__err">Falta el código de acceso en el link.</p></div>
  return (
    <div className="pp">
      <header className="pp__head">
        <img src="/logo-mundial-2026.png" alt="" className="pp__logo" />
        <h1>Promo · Viví Argentina en Sala</h1>
      </header>
      <div className="pp__tabs">
        <button className={tab === 'op' ? 'is-on' : ''} onClick={() => setTab('op')}>⚽ Operativo</button>
        <button className={tab === 'deliver' ? 'is-on' : ''} onClick={() => setTab('deliver')}>🎟️ Entregar</button>
      </div>
      {tab === 'op' ? <Operativo k={k} /> : <Entregar k={k} />}
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
      const d = await promoActive(k)
      setMatch(d.match || null)
      if (d.match) loadAtt(d.match.id)
    } catch (e) { setMsg(e.message || 'Error') }
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
    try { const d = await promoCreateMatch(k, label.trim()); setMatch(d.match); setAtt([]) }
    catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  // Arranca el operativo directo desde un partido del fixture (sin tipear)
  const startFromFixture = async (m) => {
    const rival = m.homeName === 'Argentina' ? m.awayName : m.homeName
    setBusy(true)
    try { const d = await promoCreateMatch(k, `Argentina vs ${rival}`, m.date); setMatch(d.match); setAtt([]) }
    catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  const goal = async () => {
    setBusy(true)
    try { const d = await promoGoal(k, match.id); setMatch({ ...match }); loadAtt(match.id); flash(`⚽ GOL ${d.goals}`) }
    catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  const undoGoal = async () => {
    setBusy(true)
    try { await promoUndoGoal(k, match.id); loadAtt(match.id); flash('Gol deshecho') }
    catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  const checkin = async () => {
    if (!/^\d{7,8}$/.test(dni.trim())) return flash('DNI: 7 u 8 dígitos')
    setBusy(true)
    try {
      await promoCheckin(k, match.id, dni.trim(), null, match.status === 'post')
      setDni(''); loadAtt(match.id); flash('✓ Anotado')
    } catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }
  const setStatus = async (status) => {
    if (status === 'closed' && !window.confirm('¿Cerrar la promo y calcular los tickets de todos?')) return
    setBusy(true)
    try {
      if (status === 'closed') { await promoClose(k, match.id) }
      else { await promoSetStatus(k, match.id, status) }
      await load(); flash(status === 'post' ? 'Modo post-partido' : status === 'closed' ? 'Promo cerrada' : 'Reabierto')
    } catch (e) { flash(e.message || 'Error') } finally { setBusy(false) }
  }

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
        {msg && <p className="pp__msg">{msg}</p>}
      </div>
    )
  }

  // Goles registrados ≈ el máximo de goles presenciados entre los presentes (el que llegó primero los vio todos)
  const totalGoals = att.length ? Math.max(...att.filter(a => !a.is_post).map(a => a.goalsSeen), 0) : 0
  const present = att.filter(a => !a.is_post)
  const postPeople = att.filter(a => a.is_post)
  const totalTickets = att.reduce((s, a) => s + (a.ticketsCalc || 0), 0)
  const isClosed = match.status === 'closed'
  const isPost = match.status === 'post'

  return (
    <div className="pp__panel">
      <div className="pp__matchbar">
        <div>
          <div className="pp__matchname">{match.label}</div>
          <div className={`pp__status pp__status--${match.status}`}>{match.status === 'open' ? 'En vivo' : match.status === 'post' ? 'Post-partido' : 'Cerrado'}</div>
        </div>
        <div className="pp__goalsbox"><span>Goles</span><b>{totalGoals}</b></div>
      </div>

      {match.status === 'open' && (
        <>
          <button className="pp__goalbtn" onClick={goal} disabled={busy}>⚽ GOL DE ARGENTINA</button>
          {totalGoals > 0 && <button className="pp__undo" onClick={undoGoal} disabled={busy}>↩ Deshacer último gol</button>}
        </>
      )}

      {!isClosed && (
        <div className="pp__checkin">
          <div className="pp__checkin-lbl">{isPost ? 'Anotar ingreso post-partido (DNI)' : 'Anotar presente (DNI)'}</div>
          <div className="pp__checkin-row">
            <input className="pp__input" inputMode="numeric" maxLength={8} value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} placeholder="35123456"
              onKeyDown={(e) => e.key === 'Enter' && checkin()} />
            <button className="pp__btn pp__btn--gold" onClick={checkin} disabled={busy}>✓ Anotar</button>
          </div>
        </div>
      )}

      {/* Control de fase */}
      {!isClosed && (
        <div className="pp__phase">
          {match.status === 'open' && <button className="pp__btn pp__btn--ghost" onClick={() => setStatus('post')} disabled={busy}>Terminó el partido → abrir post</button>}
          {isPost && <button className="pp__btn pp__btn--ghost" onClick={() => setStatus('open')} disabled={busy}>↩ Volver a en vivo</button>}
          <button className="pp__btn pp__btn--close" onClick={() => setStatus('closed')} disabled={busy}>🔒 Cerrar promo (calcular)</button>
        </div>
      )}

      <div className="pp__summary">
        <span>{present.length} presentes</span>
        {postPeople.length > 0 && <span>{postPeople.length} post</span>}
        <span className="pp__summary-total">Total: {money(totalTickets)}</span>
      </div>

      <ul className="pp__list">
        {att.map((a) => (
          <li key={a.id} className={`pp__person ${a.is_post ? 'is-post' : ''} ${a.overCap ? 'is-over' : ''}`}>
            <div className="pp__person-info">
              <span className="pp__person-name">{a.name || `DNI ${a.dni}`}</span>
              <span className="pp__person-sub">
                {a.is_post ? 'Post-partido' : `${a.goalsSeen} gol${a.goalsSeen !== 1 ? 'es' : ''}`}
                {a.overCap && ' · fuera de cupo'}
              </span>
            </div>
            <span className="pp__person-tickets">{money(isClosed ? a.tickets : a.ticketsCalc)}</span>
          </li>
        ))}
        {att.length === 0 && <li className="pp__empty">Todavía no hay nadie anotado.</li>}
      </ul>

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
                <span className="pp__person-sub">{t.label}{t.is_post ? ' · post-partido' : ''}</span>
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
