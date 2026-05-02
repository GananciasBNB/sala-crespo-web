import { useState } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import { submitContact } from '../api/client'
import './Contacto.css'

export default function Contacto() {
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [kind, setKind]   = useState('duda')
  const [text, setText]   = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]     = useState('')
  const [sent, setSent]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!name.trim()) return setErr('Tu nombre, por favor.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr('Email inválido.')
    if (text.trim().length < 8) return setErr('Contanos al menos 8 caracteres.')
    setLoading(true)
    try {
      await submitContact(name.trim(), email.trim(), kind, text.trim())
      setSent(true)
      setName(''); setEmail(''); setText(''); setKind('duda')
    } catch (e2) {
      setErr(e2.message || 'No pudimos enviar el mensaje.')
    }
    setLoading(false)
  }

  return (
    <div className="contacto-page">
      <header className="contacto-hero">
        <div className="contacto-hero__inner">
          <Link to="/" className="contacto-back">← Volver al inicio</Link>
          <h1 className="contacto-title">Estamos para ayudarte</h1>
          <p className="contacto-sub">Dudas, sugerencias o reclamos. Te respondemos a la brevedad.</p>
        </div>
      </header>

      <main className="contacto-main">
        <div className="contacto-grid">

          {/* Izquierda: datos de contacto directo */}
          <aside className="contacto-side">
            <div className="contacto-card">
              <h3>Sala de Juegos Crespo</h3>
              <p className="contacto-card__addr">San Martín 1053 · Crespo, Entre Ríos</p>

              <a href="https://wa.me/5493434259136" target="_blank" rel="noopener noreferrer" className="contacto-link contacto-link--wa">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
                <div>
                  <strong>WhatsApp</strong>
                  <span>+54 9 343 425-9136</span>
                </div>
              </a>

              <a href="mailto:info@saladejuegoscrespo.ar" className="contacto-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
                <div>
                  <strong>Email</strong>
                  <span>info@saladejuegoscrespo.ar</span>
                </div>
              </a>

              <a href="https://www.instagram.com/salajuegoscrespo/" target="_blank" rel="noopener noreferrer" className="contacto-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4z"/></svg>
                <div>
                  <strong>Instagram</strong>
                  <span>@salajuegoscrespo</span>
                </div>
              </a>

              <a href="https://www.facebook.com/profile.php?id=61583318054058" target="_blank" rel="noopener noreferrer" className="contacto-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <div>
                  <strong>Facebook</strong>
                  <span>Sala de Juegos Crespo</span>
                </div>
              </a>
            </div>
          </aside>

          {/* Derecha: formulario */}
          <section className="contacto-form-wrap">
            <h2 className="contacto-form-title">Mandanos un mensaje</h2>
            {sent ? (
              <div className="contacto-ok">
                <strong>✓ Mensaje recibido.</strong>
                <p>Gracias por escribirnos. Te respondemos a la brevedad al email que dejaste.</p>
                <button className="contacto-btn-secondary" onClick={() => setSent(false)}>Enviar otro mensaje</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contacto-form">
                <div className="contacto-row">
                  <label>
                    <span>Tu nombre *</span>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="Juan Pérez" />
                  </label>
                  <label>
                    <span>Tu email *</span>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} placeholder="vos@email.com" />
                  </label>
                </div>

                <span className="contacto-label">¿Qué nos querés contar? *</span>
                <div className="contacto-kinds">
                  {[
                    { id: 'duda',       label: 'Una duda' },
                    { id: 'sugerencia', label: 'Una sugerencia' },
                    { id: 'reclamo',    label: 'Un reclamo' },
                    { id: 'otro',       label: 'Otra cosa' },
                  ].map(k => (
                    <button
                      key={k.id} type="button"
                      onClick={() => setKind(k.id)}
                      className={`contacto-kind ${kind === k.id ? 'contacto-kind--on' : ''}`}
                    >{k.label}</button>
                  ))}
                </div>

                <label>
                  <span>Mensaje *</span>
                  <textarea
                    value={text} onChange={e => setText(e.target.value)}
                    rows={6} maxLength={4000}
                    placeholder={
                      kind === 'duda'       ? '¿Qué te gustaría saber?' :
                      kind === 'sugerencia' ? '¿Qué nos sugerís?' :
                      kind === 'reclamo'    ? 'Contanos qué pasó.' :
                      'Contanos lo que sea.'
                    }
                  />
                </label>

                {err && <div className="contacto-err">⚠️ {err}</div>}

                <button type="submit" className="contacto-btn" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar mensaje →'}
                </button>

                <p className="contacto-fineprint">* Campos obligatorios.</p>
              </form>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
