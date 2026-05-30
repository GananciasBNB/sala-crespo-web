import { useState } from 'react'
import { useScrollRevealParent } from '../hooks/useScrollReveal'
import { subscribeLead } from '../api/client'
import './LeadCapture.css'

export default function LeadCapture() {
  const ref = useScrollRevealParent()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')   // anti-bot, invisible
  const [status, setStatus] = useState('idle')   // idle | sending | ok | err
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (status === 'sending') return
    const nameStr = name.trim()
    const emailStr = email.trim()
    if (nameStr.length < 2) { setErrorMsg('Ingresá tu nombre.'); setStatus('err'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) { setErrorMsg('Email inválido.'); setStatus('err'); return }
    setStatus('sending'); setErrorMsg('')
    try {
      const r = await subscribeLead({ name: nameStr, email: emailStr, honeypot })
      if (r.ok) {
        setStatus('ok')
        setName(''); setEmail('')
      } else {
        setStatus('err'); setErrorMsg(r.error || 'No pudimos registrar tu suscripción.')
      }
    } catch (err) {
      setStatus('err'); setErrorMsg(err.message || 'Hubo un problema. Probá de nuevo en un rato.')
    }
  }

  return (
    <section id="suscripcion" className="lead" ref={ref}>
      <div className="container">
        <div className="lead__card reveal">
          <span className="eyebrow">Comunidad Sala Crespo</span>
          <h2 className="section-title">Enterate <em>primero</em><br />de todo lo bueno</h2>
          <div className="gold-line" />
          <p className="lead__desc">
            Dejanos tu nombre y email y te mandamos directo a tu casilla las
            <strong> promociones especiales</strong> de la sala — tickets promocionales para jugar,
            cortesías, invitaciones a shows y torneos. Sin spam, solo lo bueno.
          </p>

          <ul className="lead__benefits">
            <li><span>🎁</span> Tickets promocionales</li>
            <li><span>🍻</span> Bebidas y comida de cortesía</li>
            <li><span>🎤</span> Invitaciones a shows</li>
            <li><span>🎰</span> Acceso prioritario a torneos</li>
          </ul>

          {status === 'ok' ? (
            <div className="lead__success">
              <div className="lead__success-icon">✓</div>
              <div>
                <strong>¡Listo!</strong>
                <p>Te vamos a avisar cada vez que tengamos algo bueno para contarte.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="lead__form" noValidate>
              {/* Honeypot: invisible, bots lo llenan, humanos no */}
              <input
                type="text" name="company_website" tabIndex={-1} autoComplete="off"
                value={honeypot} onChange={e => setHoneypot(e.target.value)}
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              />
              <div className="lead__fields">
                <input
                  type="text" placeholder="Tu nombre"
                  value={name} onChange={e => setName(e.target.value)}
                  disabled={status === 'sending'} required maxLength={80}
                  className="lead__input"
                />
                <input
                  type="email" placeholder="Tu email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  disabled={status === 'sending'} required maxLength={120}
                  className="lead__input"
                />
              </div>
              <button type="submit" disabled={status === 'sending'} className="lead__btn">
                {status === 'sending' ? 'Enviando…' : 'Quiero enterarme →'}
              </button>
              {status === 'err' && errorMsg && (
                <div className="lead__error">{errorMsg}</div>
              )}
            </form>
          )}

          <p className="lead__legal">
            Tus datos quedan solo en Sala Crespo. Te podés dar de baja en cualquier momento desde el link al pie de cada mail.
          </p>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
