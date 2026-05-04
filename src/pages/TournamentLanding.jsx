import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getActiveTournament, tournamentLookupDni, tournamentRegister } from '../api/client'
import './TournamentLanding.css'

const fmtDateTime = iso => {
  if (!iso) return ''
  const d = new Date(iso)
  const day = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return `${day.charAt(0).toUpperCase() + day.slice(1)} · ${time} hs`
}

const PRIZES = [
  { medal: '🥇', place: '1° puesto', amount: '$100.000', cls: 'trn-prize--gold' },
  { medal: '🥈', place: '2° puesto', amount: '$60.000',  cls: 'trn-prize--silver' },
  { medal: '🥉', place: '3° puesto', amount: '$40.000',  cls: 'trn-prize--bronze' },
]

const BASES_CARDS = [
  { icon: '🎰', title: 'Modalidad', body: 'Rondas eliminatorias en máquinas configuradas para el evento. Avanzás según los créditos finales obtenidos.' },
  { icon: '🎟️', title: 'Premio en vouchers', body: 'Cada premio se entrega en 4 vouchers, uno por semana. El primero se entrega al finalizar el torneo.' },
  { icon: '⏰', title: 'Asistencia obligatoria', body: 'Llegá con 30 minutos de anticipación. Quien no se presente en horario queda fuera del torneo.' },
  { icon: '🔞', title: 'Mayores de 18', body: 'Inscripción gratuita y abierta al público mayor de 18 años. Necesitás presentar DNI el día del evento.' },
]

export default function TournamentLanding() {
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('dni')
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

  // Scroll suave al form cuando se cambia de step
  useEffect(() => {
    if (step !== 'dni') {
      document.querySelector('.trn-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [step])

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
        setName(r.name || ''); setTel(r.tel || ''); setEmail(r.email || '')
        setStep('confirm')
      } else {
        setStep('newPlayer')
      }
    } catch (err) { setError(err.message) }
    setSubmitting(false)
  }

  async function handleConfirmExisting() {
    setError(''); setSubmitting(true)
    try {
      const r = await tournamentRegister({
        dni: dni.trim(), name: lookupResult.name, tel: lookupResult.tel,
        email: lookupResult.email, city, acceptedTerms,
      })
      setResult(r); setStep('success')
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
        dni: dni.trim(), name: name.trim(), tel: tel.trim(),
        email: email.trim() || null, city, acceptedTerms,
      })
      setResult(r); setStep('success')
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

  if (loading) return <div className="trn-page"><div className="trn-loading">Cargando torneo…</div></div>

  if (!tournament) {
    return (
      <div className="trn-page">
        <header className="trn-header">
          <Link to="/" className="trn-header__back" aria-label="Volver">←</Link>
          <img src="/logo-sin-fondo.png" alt="Sala Crespo" className="trn-header__logo" />
        </header>
        <div className="trn-empty">
          <img src="/logo-sin-fondo.png" alt="Sala Crespo" className="trn-empty__logo" />
          <h1>No hay torneo activo</h1>
          <p>Pronto vamos a anunciar el próximo torneo de slots. Seguinos en redes para enterarte primero.</p>
          <Link to="/" className="trn-btn trn-btn--ghost">← Volver al inicio</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="trn-page">
      <header className="trn-header">
        <Link to="/" className="trn-header__back" aria-label="Volver al inicio">←</Link>
        <img src="/logo-sin-fondo.png" alt="Sala Crespo" className="trn-header__logo" />
      </header>

      <section className="trn-hero">
        <div className="trn-hero__eyebrow">🎰 Torneo de Slots</div>
        <h1 className="trn-hero__title">{tournament.name}</h1>
        <div className="trn-hero__meta">
          <div className="trn-hero__meta-item">📅 {fmtDateTime(tournament.tournament_date)}</div>
          {tournament.location && <div className="trn-hero__meta-item">📍 {tournament.location}</div>}
        </div>
      </section>

      {/* Premios siempre visibles */}
      <div className="trn-prizes">
        {PRIZES.map(p => (
          <div key={p.place} className={`trn-prize ${p.cls}`}>
            <div className="trn-prize__medal">{p.medal}</div>
            <div className="trn-prize__place">{p.place}</div>
            <div className="trn-prize__amount">{p.amount}</div>
          </div>
        ))}
      </div>
      <div className="trn-prizes__total">
        💰 Total en premios: <strong>$200.000</strong> en tickets promocionales
      </div>

      <div className="trn-cta-bar">
        ✨ Inscripción gratuita · +18 años · Cupos limitados
      </div>

      <main className="trn-main">
        {step === 'dni' && (
          <form className="trn-card" onSubmit={handleDniSubmit}>
            <h2 className="trn-card__title">Inscribite gratis</h2>
            <p className="trn-card__sub">Es rápido. Si ya jugaste antes, te reconocemos al instante con tu DNI.</p>
            <label className="trn-label">Tu DNI (sin puntos)</label>
            <input
              className="trn-input trn-input--dni"
              type="tel" inputMode="numeric" maxLength={8} autoFocus
              value={dni}
              onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
              placeholder="12345678" disabled={submitting}
            />
            <label className="trn-checkbox">
              <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} disabled={submitting} />
              <span>Acepto las <a href="/legal/bases-torneo-slots.html" target="_blank" rel="noopener noreferrer">bases y condiciones</a> del torneo y autorizo el uso de mi imagen con fines promocionales.</span>
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
            <p className="trn-card__sub">Ya tenemos tus datos. Confirmá tu inscripción al torneo:</p>
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
              Te esperamos el <strong>{fmtDateTime(tournament.tournament_date)}</strong>{tournament.location ? <> en <strong>{tournament.location}</strong></> : null}.
            </p>
            <p className="trn-success__tip">💡 Llegá <strong>30 minutos antes</strong> para asegurar tu lugar. Es obligatorio presentarse en horario.</p>
            <div className="trn-success__share">
              📲 <strong>Compartí con un amigo:</strong> {window.location.origin}/torneo
            </div>
            <Link to="/" className="trn-btn trn-btn--ghost">Volver al inicio</Link>
            <button className="trn-link" onClick={reset}>Inscribir a otra persona</button>
          </div>
        )}

        {step === 'alreadyRegistered' && (
          <div className="trn-card trn-card--success">
            <div className="trn-success__check">✅</div>
            <h2 className="trn-card__title">Ya estás inscripto</h2>
            <p className="trn-card__sub">
              Te esperamos el <strong>{fmtDateTime(tournament.tournament_date)}</strong>.
            </p>
            <p className="trn-success__tip">💡 Llegá <strong>30 minutos antes</strong>. Es obligatorio presentarse en horario.</p>
            <Link to="/" className="trn-btn trn-btn--ghost">Volver al inicio</Link>
            <button className="trn-link" onClick={reset}>Inscribir a otra persona</button>
          </div>
        )}
      </main>

      {/* Cómo funciona — siempre visible */}
      {(step === 'dni' || step === 'success') && (
        <section className="trn-bases">
          <div className="trn-bases__title">Cómo funciona</div>
          <div className="trn-bases__grid">
            {BASES_CARDS.map(b => (
              <div key={b.title} className="trn-base-card">
                <div className="trn-base-card__icon">{b.icon}</div>
                <div>
                  <div className="trn-base-card__title">{b.title}</div>
                  <div className="trn-base-card__body">{b.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Info adicional cargada por admin (HTML libre) */}
      {tournament.info_html && (step === 'dni' || step === 'success') && (
        <details className="trn-info">
          <summary>📋 Más información del torneo</summary>
          <div className="trn-info__body" dangerouslySetInnerHTML={{ __html: tournament.info_html }} />
        </details>
      )}

      {/* Link a bases completas */}
      {(step === 'dni' || step === 'success') && (
        <div style={{ textAlign: 'center', padding: '24px 20px 0' }}>
          <a
            href="/legal/bases-torneo-slots.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#C9A84C',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 700,
              padding: '10px 18px',
              border: '1px solid rgba(201,168,76,0.4)',
              borderRadius: 999,
              display: 'inline-block',
            }}
          >
            📜 Leer bases y condiciones completas
          </a>
        </div>
      )}

      <footer className="trn-footer">
        <div className="trn-footer__responsible">
          <span className="trn-footer__18">+18</span>
          <div>
            <strong>Solo mayores de 18 años.</strong> Si sentís que el juego dejó de ser un entretenimiento, pedí ayuda.<br />
            <a href="https://www.iafas.gob.ar/juego-responsable" target="_blank" rel="noopener noreferrer">IAFAS — Juego Responsable</a> · <a href="tel:0800-444-4000">0800-444-4000</a>
          </div>
        </div>
        <div className="trn-footer__legal">
          © Sala de Juegos Crespo · San Martín 1053, Crespo, Entre Ríos<br />
          Operado bajo <strong>Casinos de Entre Ríos</strong> · Habilitación IAFAS · <a href="/">Volver al sitio principal</a>
        </div>
      </footer>
    </div>
  )
}
