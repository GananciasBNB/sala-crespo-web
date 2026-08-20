import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { loginPlayer } from '../api/client'
import ClubView from '../components/ClubView'
import './Club.css'

// Página standalone /club — Sala Crespo Club.
// NO público todavía: bloqueado en robots.txt y sin link en el navbar.
// Pacha lo prueba con URL directa. Cuando se lance, agregamos link.
// SSO con /prode: ambos comparten localStorage('prode_player').
export default function Club() {
  const [player, setPlayer] = useState(() => {
    try { return JSON.parse(localStorage.getItem('prode_player')) } catch { return null }
  })

  function handleLogin(p) {
    localStorage.setItem('prode_player', JSON.stringify(p))
    setPlayer(p)
  }
  function handleLogout() {
    localStorage.removeItem('prode_player')
    setPlayer(null)
  }

  return (
    <div className="club-page">
      <header className="club-page__header">
        <Link to="/" className="club-page__home">← Inicio</Link>
        <div className="club-page__brand">
          Sala Crespo Club
          <span>Programa de socios</span>
        </div>
        {player ? (
          <button className="club-page__logout" onClick={handleLogout}>Salir</button>
        ) : (
          <div className="club-page__logout-ghost" />
        )}
      </header>

      <main className="club-page__main">
        {player ? (
          <ClubView player={player} />
        ) : (
          <ClubLogin onLogin={handleLogin} />
        )}
      </main>

      <footer className="club-page__footer">
        <strong>Sala de Juegos Crespo</strong>
        San Martín 1053 · Crespo, Entre Ríos<br />
        Sala Crespo Club · Programa de socios
      </footer>
    </div>
  )
}

// Login en 2 pasos: DNI → PIN. El PIN auto-envía al completar 4 dígitos.
function ClubLogin({ onLogin }) {
  const [step, setStep] = useState(1)
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(false)
  const dniRef = useRef(null)
  const pinRef = useRef(null)

  useEffect(() => {
    const el = step === 1 ? dniRef.current : pinRef.current
    el?.focus()
  }, [step])

  function fail(text) {
    setErr(text)
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  function goPin(e) {
    e?.preventDefault()
    if (!/^\d{7,8}$/.test(dni)) { fail('DNI inválido (7 u 8 dígitos, sin puntos)'); return }
    setErr('')
    setStep(2)
  }

  function backToDni() {
    setPin('')
    setErr('')
    setStep(1)
  }

  async function submitLogin(pinValue) {
    if (busy) return
    if (!/^\d{4}$/.test(pinValue)) { fail('El PIN son 4 dígitos (tu año de nacimiento)'); return }
    setErr('')
    setBusy(true)
    try {
      const p = await loginPlayer(dni, pinValue)
      onLogin(p)
    } catch (err) {
      fail(err.message || 'No pudimos verificar tus datos')
      setPin('')
      pinRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  function handlePinChange(e) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(v)
    if (v.length === 4) submitLogin(v)
  }

  return (
    <div className="club-login">
      <div className="club-login__bg" aria-hidden="true">
        <video autoPlay loop muted playsInline preload="auto">
          <source src="/club-reveal.mp4" type="video/mp4" />
        </video>
      </div>

      <div className={`club-login__card ${shake ? 'club-login__card--shake' : ''}`}>
        <div className="club-login__logo">
          <img src="/club-logo.png" alt="Sala Crespo Club" />
        </div>
        <div className="club-login__kicker">★ Acceso socios</div>

        <div className="club-login__steps" aria-hidden="true">
          <span className={`club-login__step-dot ${step === 1 ? 'club-login__step-dot--on' : 'club-login__step-dot--done'}`} />
          <span className="club-login__step-line" />
          <span className={`club-login__step-dot ${step === 2 ? 'club-login__step-dot--on' : ''}`} />
        </div>

        {step === 1 ? (
          <>
            <h1 className="club-login__title">Bienvenido al Club</h1>
            <p className="club-login__sub">Ingresá tu DNI para ver tus puntos, canjes y el sorteo del mes.</p>
            <form onSubmit={goPin} className="club-login__form">
              <label className="club-login__field">
                <span>Tu DNI</span>
                <input ref={dniRef} type="tel" inputMode="numeric" value={dni}
                  onChange={e => { setDni(e.target.value.replace(/\D/g, '').slice(0, 8)); setErr('') }}
                  placeholder="12345678"
                  className="club-login__input"
                  disabled={busy} maxLength={8} autoComplete="off" />
              </label>
              {err && <div className="club-login__err">{err}</div>}
              <button type="submit" className="club-login__btn" disabled={dni.length < 7}>
                Continuar →
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="club-login__title">Tu PIN</h1>
            <p className="club-login__sub">Son 4 dígitos: tu año de nacimiento.</p>
            <button type="button" className="club-login__dni-chip" onClick={backToDni} disabled={busy}>
              DNI {dni} <span>· cambiar</span>
            </button>
            <form onSubmit={e => { e.preventDefault(); submitLogin(pin) }} className="club-login__form">
              <label className="club-login__field">
                <span>PIN (4 dígitos)</span>
                <input ref={pinRef} type="tel" inputMode="numeric" value={pin}
                  onChange={handlePinChange}
                  placeholder="••••"
                  className="club-login__input club-login__input--pin"
                  disabled={busy} maxLength={4} autoComplete="off" />
              </label>
              {err && <div className="club-login__err">{err}</div>}
              <button type="submit" className="club-login__btn" disabled={busy || pin.length < 4}>
                {busy ? 'Verificando…' : 'Entrar →'}
              </button>
            </form>
          </>
        )}

        <p className="club-login__help">
          Si todavía no estás registrado, acercate a la sala — el staff te suma al Club al toque.
        </p>
      </div>
    </div>
  )
}
