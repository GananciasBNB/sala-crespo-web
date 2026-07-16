import { useState, useEffect, useRef, useCallback } from 'react'
import { clubLookupDni, loginPlayer, clubSignup, loyaltyCheckin } from '../api/client'
import './Kiosk.css'

// Tótem de autogestión del Sala Crespo Club.
// Flujo DNI-first: DNI → si existe pide PIN (login + check-in), si no registro rápido.
// Pensado para pantalla touch en la sala. Auto-reset por inactividad.
// Ruta: /kiosk (bloqueada en robots, sin link público).

const IDLE_MS = 40000 // vuelve al inicio tras 40s sin tocar

function Numpad({ onDigit, onBack, onClear }) {
  return (
    <div className="kiosk-pad">
      {['1','2','3','4','5','6','7','8','9'].map(k => (
        <button key={k} className="kiosk-pad__key" onClick={() => onDigit(k)}>{k}</button>
      ))}
      <button className="kiosk-pad__key kiosk-pad__key--sec" onClick={onClear}>C</button>
      <button className="kiosk-pad__key" onClick={() => onDigit('0')}>0</button>
      <button className="kiosk-pad__key kiosk-pad__key--sec" onClick={onBack}>⌫</button>
    </div>
  )
}

function Dots({ value, len }) {
  return (
    <div className="kiosk-dots">
      {Array.from({ length: len }).map((_, i) => (
        <span key={i} className={`kiosk-dots__d ${i < value.length ? 'on' : ''}`} />
      ))}
    </div>
  )
}

export default function Kiosk() {
  const [screen, setScreen] = useState('idle') // idle | dni | pin | register | done
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const [player, setPlayer] = useState(null)
  const [balance, setBalance] = useState(0)
  const [checkin, setCheckin] = useState(null)
  const [reg, setReg] = useState({ name: '', tel: '', email: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const idleTimer = useRef(null)

  const reset = useCallback(() => {
    setScreen('idle'); setDni(''); setPin(''); setPlayer(null); setBalance(0)
    setCheckin(null); setReg({ name: '', tel: '', email: '' }); setErr(''); setBusy(false)
  }, [])

  // Auto-reset por inactividad (salvo en idle)
  useEffect(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (screen !== 'idle') idleTimer.current = setTimeout(reset, IDLE_MS)
    return () => idleTimer.current && clearTimeout(idleTimer.current)
  }, [screen, dni, pin, reg, reset])

  async function submitDni() {
    if (!/^\d{7,8}$/.test(dni)) { setErr('El DNI son 7 u 8 números'); return }
    setBusy(true); setErr('')
    try {
      const r = await clubLookupDni(dni)
      setScreen(r.exists ? 'pin' : 'register')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  async function submitPin() {
    if (!/^\d{4}$/.test(pin)) { setErr('El PIN son 4 números'); return }
    setBusy(true); setErr('')
    try {
      const p = await loginPlayer(dni, pin)
      const c = await loyaltyCheckin(p.token).catch(() => null)
      setPlayer(p); setCheckin(c); setBalance(c?.balance ?? 0); setScreen('done')
    } catch (e) { setErr('DNI o PIN incorrecto. Probá de nuevo.'); setPin('') } finally { setBusy(false) }
  }

  async function submitRegister() {
    if (reg.name.trim().length < 3) { setErr('Escribí tu nombre'); return }
    if (!/^\d{4}$/.test(pin)) { setErr('El PIN son 4 números (tu año de nacimiento)'); return }
    setBusy(true); setErr('')
    try {
      const r = await clubSignup({ dni, name: reg.name.trim(), tel: reg.tel.trim(), email: reg.email.trim(), pin })
      const c = await loyaltyCheckin(r.player.token).catch(() => null)
      setPlayer(r.player); setCheckin(c); setBalance(c?.balance ?? r.balance ?? 0); setScreen('done')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const firstName = player?.name?.split(' ')[0] || ''
  const isNew = checkin == null ? false : false // welcome message decides below

  return (
    <div className="kiosk" onClick={screen === 'idle' ? () => setScreen('dni') : undefined}>
      <div className="kiosk__bg" />

      {/* ───────── IDLE ───────── */}
      {screen === 'idle' && (
        <div className="kiosk__idle">
          <img className="kiosk__logo" src="/club-logo.png" alt="Sala Crespo Club" onError={e => { e.target.style.display = 'none' }} />
          <div className="kiosk__idle-kicker">★ Sala Crespo Club</div>
          <h1 className="kiosk__idle-title">Bienvenido</h1>
          <p className="kiosk__idle-sub">Sumá puntos por tu visita y canjealos por beneficios</p>
          <button className="kiosk__idle-btn">TOCÁ PARA EMPEZAR</button>
        </div>
      )}

      {/* ───────── DNI ───────── */}
      {screen === 'dni' && (
        <div className="kiosk__step">
          <button className="kiosk__back" onClick={reset}>← Cancelar</button>
          <h2 className="kiosk__h">Ingresá tu DNI</h2>
          <p className="kiosk__hint">Sin puntos. Si sos nuevo, te registramos al toque.</p>
          <div className="kiosk__display">{dni || <span className="kiosk__display-ph">00000000</span>}</div>
          {err && <div className="kiosk__err">{err}</div>}
          <Numpad
            onDigit={d => { if (dni.length < 8) { setDni(dni + d); setErr('') } }}
            onBack={() => setDni(dni.slice(0, -1))}
            onClear={() => setDni('')}
          />
          <button className="kiosk__cta" disabled={busy || dni.length < 7} onClick={submitDni}>
            {busy ? 'Buscando…' : 'Continuar →'}
          </button>
        </div>
      )}

      {/* ───────── PIN (socio existente) ───────── */}
      {screen === 'pin' && (
        <div className="kiosk__step">
          <button className="kiosk__back" onClick={reset}>← Cancelar</button>
          <h2 className="kiosk__h">Ingresá tu PIN</h2>
          <p className="kiosk__hint">Son 4 números — tu año de nacimiento.</p>
          <Dots value={pin} len={4} />
          {err && <div className="kiosk__err">{err}</div>}
          <Numpad
            onDigit={d => { if (pin.length < 4) { setPin(pin + d); setErr('') } }}
            onBack={() => setPin(pin.slice(0, -1))}
            onClear={() => setPin('')}
          />
          <button className="kiosk__cta" disabled={busy || pin.length < 4} onClick={submitPin}>
            {busy ? 'Entrando…' : 'Entrar →'}
          </button>
        </div>
      )}

      {/* ───────── REGISTRO (socio nuevo) ───────── */}
      {screen === 'register' && (
        <div className="kiosk__step kiosk__step--reg">
          <button className="kiosk__back" onClick={reset}>← Cancelar</button>
          <h2 className="kiosk__h">¡Sumate al Club!</h2>
          <p className="kiosk__hint">Con estos datos ya sos socio y empezás a sumar puntos.</p>
          <div className="kiosk__form">
            <label className="kiosk__field">
              <span>Tu nombre</span>
              <input type="text" value={reg.name} maxLength={40} autoComplete="off"
                onChange={e => { setReg({ ...reg, name: e.target.value }); setErr('') }}
                placeholder="Nombre y apellido" />
            </label>
            <label className="kiosk__field">
              <span>PIN (4 números · tu año de nacimiento)</span>
              <input type="tel" inputMode="numeric" value={pin} maxLength={4}
                onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErr('') }}
                placeholder="Ej. 1990" />
            </label>
            <label className="kiosk__field">
              <span>Teléfono</span>
              <input type="tel" inputMode="numeric" value={reg.tel} maxLength={15}
                onChange={e => setReg({ ...reg, tel: e.target.value })}
                placeholder="Ej. 3435 123456" />
            </label>
            <label className="kiosk__field">
              <span>Email <em>(opcional — recibís tus beneficios)</em></span>
              <input type="email" value={reg.email} maxLength={80} autoComplete="off"
                onChange={e => setReg({ ...reg, email: e.target.value })}
                placeholder="tu@email.com" />
            </label>
          </div>
          {err && <div className="kiosk__err">{err}</div>}
          <button className="kiosk__cta" disabled={busy} onClick={submitRegister}>
            {busy ? 'Creando tu cuenta…' : 'Crear mi cuenta →'}
          </button>
        </div>
      )}

      {/* ───────── DONE (bienvenida) ───────── */}
      {screen === 'done' && (
        <div className="kiosk__done">
          <div className="kiosk__done-check">✓</div>
          <div className="kiosk__done-kicker">{player?.created_at && Date.now() - new Date(player.created_at).getTime() < 60000 ? '¡Bienvenido al Club!' : '¡Hola de nuevo!'}</div>
          <h1 className="kiosk__done-name">{firstName}</h1>

          {checkin?.granted && <div className="kiosk__done-earned">+50 puntos por tu visita de hoy 🎉</div>}
          {checkin?.alreadyToday && <div className="kiosk__done-earned kiosk__done-earned--muted">Ya registraste tu visita de hoy 👍</div>}

          <div className="kiosk__done-balance">
            <div className="kiosk__done-balance-num">{balance.toLocaleString('es-AR')}</div>
            <div className="kiosk__done-balance-lbl">Puntos disponibles</div>
          </div>

          <p className="kiosk__done-help">Acercate a la barra con tu DNI para canjear beneficios,<br />o entrá a <strong>saladejuegoscrespo.ar/club</strong> desde tu celular.</p>

          <button className="kiosk__cta kiosk__cta--done" onClick={reset}>Listo, gracias ✓</button>
        </div>
      )}
    </div>
  )
}
