import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getActiveTournament, tournamentLookupDni, tournamentRegister } from '../api/client'
import './TournamentLanding.css'

const fmtDateTime = iso => {
  if (!iso) return ''
  const d = new Date(iso)
  const day = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return `${day.charAt(0).toUpperCase() + day.slice(1)} · ${time} hs`
}

export default function TournamentLanding() {
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('dni') // dni → confirm | newPlayer → success
  const [dni, setDni] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [lookupResult, setLookupResult] = useState(null)
  const [name, setName] = useState('')
  const [tel, setTel] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('Crespo')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    getActiveTournament()
      .then(r => setTournament(r.active))
      .catch(() => setTournament(null))
      .finally(() => setLoading(false))
  }, [])

  async function handleDniSubmit(e) {
    e.preventDefault()
    setError('')
    if (!/^\d{7,8}$/.test(dni.trim())) return setError('El DNI debe tener 7 u 8 dígitos.')
    if (!acceptedTerms) return setError('Tenés que aceptar las bases del torneo.')
    setSubmitting(true)
    try {
      const r = await tournamentLookupDni(dni.trim())
      setLookupResult(r)
      if (r.alreadyRegistered) {
        setStep('alreadyRegistered')
      } else if (r.exists) {
        setName(r.name || '')
        setTel(r.tel || '')
        setEmail(r.email || '')
        setStep('confirm')
      } else {
        setStep('newPlayer')
      }
    } catch (err) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  async function handleConfirmExisting() {
    setError(''); setSubmitting(true)
    try {
      const r = await tournamentRegister({
        dni: dni.trim(),
        name: lookupResult.name,
        tel: lookupResult.tel,
        email: lookupResult.email,
        city,
        acceptedTerms,
      })
      setResult(r)
      setStep('success')
    } catch (err) {
      if (err.message?.includes('Ya estás inscripto')) setStep('alreadyRegistered')
      else setError(err.message)
    }
    setSubmitting(false)
  }

  async function handleNewPlayerSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim() || name.trim().length < 3) return setError('Nombre obligatorio.')
    if (!tel.trim() || tel.trim().length < 6) return setError('Teléfono obligatorio.')
    setSubmitting(true)
    try {
      const r = await tournamentRegister({
        dni: dni.trim(),
        name: name.trim(),
        tel: tel.trim(),
        email: email.trim() || null,
        city,
        acceptedTerms,
      })
      setResult(r)
      setStep('success')
    } catch (err) {
      if (err.message?.includes('Ya estás inscripto')) setStep('alreadyRegistered')
      else setError(err.message)
    }
    setSubmitting(false)
  }

  function reset() {
    setStep('dni'); setDni(''); setAcceptedTerms(false); setLookupResult(null)
    setName(''); setTel(''); setEmail(''); setError(''); setResult(null)
  }

  if (loading) return <div className="trn-page"><div className="trn-loading">Cargando…</div></div>
  if (!tournament) {
    return (
      <div className="trn-page">
        <div className="trn-empty">
          <img src="/logo-sin-fondo.png" alt="Sala Crespo" className="trn-empty__logo" />
          <h1>No hay torneo activo</h1>
          <p>Pronto vamos a anunciar el próximo torneo. Seguinos en redes para enterarte primero.</p>
          <Link to="/" className="trn-btn trn-btn--ghost">← Volver al inicio</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="trn-page">
      <header className="trn-header">
        <Link to="/" className="trn-header__back">←</Link>
        <img src="/logo-sin-fondo.png" alt="Sala Crespo" className="trn-header__logo" />
      </header>

      <section className="trn-hero">
        <div className="trn-hero__eyebrow">🎰 Torneo de Slots</div>
        <h1 className="trn-hero__title">{tournament.name}</h1>
        <div className="trn-hero__meta">
          <div className="trn-hero__meta-item">📅 {fmtDateTime(tournament.tournament_date)}</div>
          {tournament.location && <div className="trn-hero__meta-item">📍 {tournament.location}</div>}
        </div>
        {tournament.prize_pool && (
          <div className="trn-hero__prize">🏆 {tournament.prize_pool}</div>
        )}
      </section>

      <main className="trn-main">
        {step === 'dni' && (
          <form className="trn-card" onSubmit={handleDniSubmit}>
            <h2 className="trn-card__title">Inscribite gratis</h2>
            <p className="trn-card__sub">Es rápido. Si ya jugaste antes, te reconocemos al instante.</p>
            <label className="trn-label">Tu DNI (sin puntos)</label>
            <input
              className="trn-input trn-input--dni"
              type="tel"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              value={dni}
              onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
              placeholder="12345678"
              disabled={submitting}
            />
            <label className="trn-checkbox">
              <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} disabled={submitting} />
              <span>Acepto las <a href="/legal/05-bases-prode-publico.html" target="_blank" rel="noopener noreferrer">bases del torneo</a> y autorizo el uso de mi imagen con fines promocionales.</span>
            </label>
            {error && <div className="trn-error">⚠️ {error}</div>}
            <button type="submit" className="trn-btn trn-btn--primary" disabled={submitting || !dni || !acceptedTerms}>
              {submitting ? 'Verificando…' : 'Continuar →'}
            </button>
          </form>
        )}

        {step === 'confirm' && lookupResult && (
          <div className="trn-card">
            <h2 className="trn-card__title">¡Hola, {lookupResult.name}! 👋</h2>
            <p className="trn-card__sub">Tenemos tus datos. ¿Confirmás tu inscripción al torneo?</p>
            <div className="trn-summary">
              <div className="trn-summary__row"><span>Nombre</span><strong>{lookupResult.name}</strong></div>
              {lookupResult.tel && <div className="trn-summary__row"><span>Teléfono</span><strong>{lookupResult.tel}</strong></div>}
              {lookupResult.email && <div className="trn-summary__row"><span>Email</span><strong>{lookupResult.email}</strong></div>}
            </div>
            {error && <div className="trn-error">⚠️ {error}</div>}
            <button className="trn-btn trn-btn--primary" onClick={handleConfirmExisting} disabled={submitting}>
              {submitting ? 'Inscribiendo…' : '✓ Confirmar inscripción'}
            </button>
            <button className="trn-btn trn-btn--ghost" onClick={() => setStep('newPlayer')} disabled={submitting}>
              Mis datos cambiaron, actualizar
            </button>
          </div>
        )}

        {step === 'newPlayer' && (
          <form className="trn-card" onSubmit={handleNewPlayerSubmit}>
            <h2 className="trn-card__title">Completá tus datos</h2>
            <p className="trn-card__sub">DNI: <strong>{dni}</strong> · <button type="button" className="trn-link" onClick={reset}>cambiar</button></p>
            <label className="trn-label">Nombre y apellido *</label>
            <input className="trn-input" value={name} onChange={e => setName(e.target.value)} placeholder="Juan Pérez" disabled={submitting} />
            <label className="trn-label">Teléfono *</label>
            <input className="trn-input" type="tel" inputMode="tel" value={tel} onChange={e => setTel(e.target.value)} placeholder="343 4XX XXXX" disabled={submitting} />
            <label className="trn-label">Email <span className="trn-label__opt">(opcional, recibirás confirmación)</span></label>
            <input className="trn-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" disabled={submitting} />
            <label className="trn-label">Ciudad</label>
            <input className="trn-input" value={city} onChange={e => setCity(e.target.value)} disabled={submitting} />
            {error && <div className="trn-error">⚠️ {error}</div>}
            <button type="submit" className="trn-btn trn-btn--primary" disabled={submitting}>
              {submitting ? 'Inscribiendo…' : '✓ Confirmar inscripción'}
            </button>
          </form>
        )}

        {step === 'success' && result && (
          <div className="trn-card trn-card--success">
            <div className="trn-success__check">🎉</div>
            <h2 className="trn-card__title">¡Quedaste inscripto!</h2>
            <div className="trn-success__no">N° {result.registrationNo}</div>
            <p className="trn-card__sub">
              Te esperamos el <strong>{fmtDateTime(tournament.tournament_date)}</strong> en <strong>{tournament.location || 'San Martín 1053, Crespo'}</strong>.
            </p>
            <p className="trn-success__tip">💡 Llegá <strong>30 minutos antes</strong> para asegurar tu lugar. Es obligatorio presentarse en horario.</p>
            <Link to="/" className="trn-btn trn-btn--ghost">Volver al inicio</Link>
            <button className="trn-link" onClick={reset}>Inscribir a otra persona</button>
          </div>
        )}

        {step === 'alreadyRegistered' && (
          <div className="trn-card">
            <div className="trn-success__check">✅</div>
            <h2 className="trn-card__title">Ya estás inscripto</h2>
            <p className="trn-card__sub">
              Te esperamos el <strong>{fmtDateTime(tournament.tournament_date)}</strong>.
            </p>
            <Link to="/" className="trn-btn trn-btn--ghost">Volver al inicio</Link>
            <button className="trn-link" onClick={reset}>Inscribir a otra persona</button>
          </div>
        )}

        {tournament.info_html && (step === 'dni' || step === 'success') && (
          <details className="trn-info">
            <summary>📋 Bases y premios completos</summary>
            <div className="trn-info__body" dangerouslySetInnerHTML={{ __html: tournament.info_html }} />
          </details>
        )}
      </main>
    </div>
  )
}
