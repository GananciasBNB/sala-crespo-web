import { useState, useEffect } from 'react'
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

function ClubLogin({ onLogin }) {
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setErr('')
    if (!/^\d{7,8}$/.test(dni)) { setErr('DNI inválido (7 u 8 dígitos)'); return }
    if (!/^\d{4}$/.test(pin)) { setErr('El PIN son 4 dígitos (tu año de nacimiento)'); return }
    setBusy(true)
    try {
      const p = await loginPlayer(dni, pin)
      onLogin(p)
    } catch (err) {
      setErr(err.message || 'No pudimos verificar tus datos')
    } finally { setBusy(false) }
  }

  return (
    <div className="club-login">
      <div className="club-login__card">
        <div className="club-login__kicker">★ Acceso miembros</div>
        <h1 className="club-login__title">Hola de nuevo</h1>
        <p className="club-login__sub">Ingresá con tu DNI y PIN para ver tus puntos, canjes y el sorteo del mes.</p>

        <form onSubmit={handleSubmit} className="club-login__form">
          <label>
            <span>DNI</span>
            <input type="tel" inputMode="numeric" value={dni}
              onChange={e => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Sin puntos, ej. 12345678"
              disabled={busy} maxLength={8} />
          </label>
          <label>
            <span>PIN (4 dígitos)</span>
            <input type="tel" inputMode="numeric" value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Tu año de nacimiento"
              disabled={busy} maxLength={4} />
          </label>
          {err && <div className="club-login__err">{err}</div>}
          <button type="submit" disabled={busy} className="club-login__btn">
            {busy ? 'Verificando…' : 'Entrar →'}
          </button>
        </form>

        <p className="club-login__help">
          Si todavía no estás registrado, acercate a la sala — el staff te suma al Club al toque.
        </p>
      </div>
    </div>
  )
}
