import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getPromoRegistrationsToday,
  promoLookupDni,
  promoInscribeProde,
  promoInscribeTournament,
  promoUpdateContact,
  getShows,
} from '../api/client'
import { trackProdeRegistration, trackTournamentRegistration, trackLead } from '../lib/metaPixel'
import './PromoMode.css'

// ─── Constantes comerciales (visibles para la promotora) ─────────────────────
const PRODE_INFO = {
  totalPrize: '$525.000',
  phases: [
    { name: 'Fase de grupos', prizes: '$75k · $50k · $25k' },
    { name: '16avos de final', prizes: '$75k · $50k · $25k' },
    { name: 'Acumulado del Mundial', prizes: '$100k · $75k · $50k' },
  ],
}
const TOURNAMENT_INFO = {
  totalPrize: '$200.000',
  prizes: [
    { place: '1°', amount: '$100.000' },
    { place: '2°', amount: '$60.000' },
    { place: '3°', amount: '$40.000' },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TZ = 'America/Argentina/Buenos_Aires'
const fmtTournamentDate = iso => {
  if (!iso) return ''
  const d = new Date(iso)
  const day = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })
  return `${day.charAt(0).toUpperCase() + day.slice(1)} · ${time} hs`
}

const INSTAGRAM_URL = 'https://www.instagram.com/salajuegoscrespo/'

// ═════════════════════════════════════════════════════════════════════════════
// PromoMode — Modo Promotora con flow DNI-first
// ═════════════════════════════════════════════════════════════════════════════
export default function PromoMode({ onExit, onGoHome }) {
  // Default: ir al landing del sitio
  const goHome = onGoHome || (() => { window.location.href = '/' })
  // ─── State ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState('dni') // 'dni' | 'newPlayer' | 'status' | 'success'
  const [dni, setDni] = useState('')
  const [lookup, setLookup] = useState(null) // { exists, player, prode, tournament }
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showIgQr, setShowIgQr] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [lastSuccess, setLastSuccess] = useState(null) // { name, pin?, registrationNo? }
  const [upcomingShows, setUpcomingShows] = useState([])

  // Form para clientes nuevos
  const [formName, setFormName] = useState('')
  const [formTel, setFormTel] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formYear, setFormYear] = useState('')

  const dniInputRef = useRef(null)

  // Contador de inscripciones del día
  const refreshCount = useCallback(() => {
    getPromoRegistrationsToday().then(r => setCount(r.count || 0)).catch(() => {})
  }, [])
  useEffect(() => { refreshCount() }, [refreshCount])

  // Cargar próximos shows (para mostrar como info)
  useEffect(() => {
    getShows()
      .then(list => {
        const upcoming = (list || [])
          .filter(s => s.type === 'upcoming')
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .slice(0, 4)
        setUpcomingShows(upcoming)
      })
      .catch(() => {})
  }, [])

  // Auto-focus en el input de DNI cuando volvemos a esa pantalla
  useEffect(() => {
    if (step === 'dni' && dniInputRef.current) dniInputRef.current.focus()
  }, [step])

  // ─── Handlers ──────────────────────────────────────────────────────────────
  function reset() {
    setStep('dni'); setDni(''); setLookup(null); setError('')
    setFormName(''); setFormTel(''); setFormEmail(''); setFormYear('')
    setLastSuccess(null)
  }

  async function handleLookup(e) {
    e?.preventDefault?.()
    setError('')
    if (!/^\d{7,8}$/.test(dni.trim())) return setError('El DNI debe tener 7 u 8 dígitos.')
    setBusy(true)
    try {
      const r = await promoLookupDni(dni.trim())
      setLookup(r)
      if (!r.exists) {
        // Cliente nuevo → form
        setStep('newPlayer')
      } else {
        // Pre-cargar form con datos existentes (para el caso de Tournament-only)
        setFormName(r.player.name || '')
        setFormTel(r.player.tel || '')
        setFormEmail(r.player.email || '')
        setStep('status')
      }
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  async function handleNewPlayerProde() {
    setError('')
    if (!formName.trim() || formName.trim().length < 3) return setError('Nombre obligatorio.')
    if (!/^\d{4}$/.test(formYear)) return setError('Año de nacimiento (PIN) debe ser 4 dígitos.')
    setBusy(true)
    try {
      await promoInscribeProde({
        dni: dni.trim(), name: formName.trim(), tel: formTel.trim(),
        email: formEmail.trim() || null, pin: formYear,
      })
      trackProdeRegistration({ source: 'promo' })
      if (formEmail.trim()) trackLead({ source: 'promo' })
      setLastSuccess({ name: formName.trim(), pin: formYear, action: 'prode' })
      refreshCount()
      setStep('success')
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  async function handleNewPlayerTournament() {
    setError('')
    if (!formName.trim() || formName.trim().length < 3) return setError('Nombre obligatorio.')
    if (!formTel.trim() || formTel.trim().length < 6) return setError('Teléfono obligatorio para el torneo.')
    setBusy(true)
    try {
      const r = await promoInscribeTournament({
        dni: dni.trim(), name: formName.trim(), tel: formTel.trim(),
        email: formEmail.trim() || null, city: 'Crespo',
      })
      trackTournamentRegistration({ registrationNo: r.registrationNo })
      if (formEmail.trim()) trackLead({ source: 'promo-tournament' })
      setLastSuccess({ name: formName.trim(), registrationNo: r.registrationNo, action: 'tournament' })
      refreshCount()
      setStep('success')
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  async function handleNewPlayerBoth() {
    setError('')
    if (!formName.trim() || formName.trim().length < 3) return setError('Nombre obligatorio.')
    if (!/^\d{4}$/.test(formYear)) return setError('Año de nacimiento (PIN) obligatorio para Prode.')
    if (!formTel.trim() || formTel.trim().length < 6) return setError('Teléfono obligatorio para el torneo.')
    setBusy(true)
    try {
      await promoInscribeProde({
        dni: dni.trim(), name: formName.trim(), tel: formTel.trim(),
        email: formEmail.trim() || null, pin: formYear,
      })
      const r = await promoInscribeTournament({
        dni: dni.trim(), name: formName.trim(), tel: formTel.trim(),
        email: formEmail.trim() || null, city: 'Crespo',
      })
      trackProdeRegistration({ source: 'promo' })
      trackTournamentRegistration({ registrationNo: r.registrationNo })
      if (formEmail.trim()) trackLead({ source: 'promo-both' })
      setLastSuccess({ name: formName.trim(), pin: formYear, registrationNo: r.registrationNo, action: 'both' })
      refreshCount()
      setStep('success')
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  async function handleStatusInscribeProde() {
    setError('')
    if (!/^\d{4}$/.test(formYear)) return setError('Pedile el año de nacimiento (4 dígitos) para usar como PIN.')
    setBusy(true)
    try {
      await promoInscribeProde({
        dni: dni.trim(), name: lookup.player.name, tel: lookup.player.tel || formTel.trim(),
        email: lookup.player.email || formEmail.trim() || null, pin: formYear,
      })
      trackProdeRegistration({ source: 'promo-status' })
      setLastSuccess({ name: lookup.player.name, pin: formYear, action: 'prode' })
      refreshCount()
      setStep('success')
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  async function handleStatusInscribeTournament() {
    setError('')
    if (!lookup.player.tel && !formTel.trim()) return setError('Pedile el teléfono para el torneo.')
    setBusy(true)
    try {
      const r = await promoInscribeTournament({
        dni: dni.trim(), name: lookup.player.name, tel: lookup.player.tel || formTel.trim(),
        email: lookup.player.email || null, city: 'Crespo',
      })
      trackTournamentRegistration({ registrationNo: r.registrationNo })
      setLastSuccess({ name: lookup.player.name, registrationNo: r.registrationNo, action: 'tournament' })
      refreshCount()
      setStep('success')
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pm">
      {/* HEADER */}
      <header className="pm__header">
        <div className="pm__brand">
          <img src="/logo-sin-fondo.png" alt="Sala Crespo" className="pm__logo" />
          <div>
            <div className="pm__title">Modo Promotora</div>
            <div className="pm__counter">Inscripciones hoy: <strong>{count}</strong></div>
          </div>
        </div>
        <button
          className="pm__exit"
          onClick={() => { if (confirm('¿Salir del modo promotora?')) onExit(); }}
          title="Salir del modo promotora"
        >✕</button>
      </header>

      {/* CONTENT */}
      <main className="pm__main">
        {step === 'dni' && (
          <DniStep
            dni={dni} setDni={setDni}
            onSubmit={handleLookup} busy={busy} error={error}
            inputRef={dniInputRef}
            onInstall={() => setShowInstall(true)}
            onShowIg={() => setShowIgQr(true)}
            upcomingShows={upcomingShows}
          />
        )}
        {step === 'newPlayer' && (
          <NewPlayerStep
            dni={dni} formName={formName} setFormName={setFormName}
            formTel={formTel} setFormTel={setFormTel}
            formEmail={formEmail} setFormEmail={setFormEmail}
            formYear={formYear} setFormYear={setFormYear}
            tournament={lookup?.tournament}
            onProde={handleNewPlayerProde}
            onTournament={handleNewPlayerTournament}
            onBoth={handleNewPlayerBoth}
            onBack={reset} busy={busy} error={error}
          />
        )}
        {step === 'status' && lookup?.exists && (
          <StatusStep
            dni={dni} player={lookup.player}
            prodeRegistered={lookup.prode.registered}
            tournament={lookup.tournament}
            formYear={formYear} setFormYear={setFormYear}
            formTel={formTel} setFormTel={setFormTel}
            onInscribeProde={handleStatusInscribeProde}
            onInscribeTournament={handleStatusInscribeTournament}
            onAlreadyDone={() => { setLastSuccess({ name: lookup.player.name, action: 'already' }); setStep('success') }}
            onBack={reset} busy={busy} error={error}
          />
        )}
        {step === 'success' && lastSuccess && (
          <SuccessStep
            success={lastSuccess}
            onReset={reset}
            onGoHome={goHome}
            onInstall={() => setShowInstall(true)}
            onShowIg={() => setShowIgQr(true)}
          />
        )}
      </main>

      {/* MODAL: QR Instagram */}
      {showIgQr && <IgQrModal onClose={() => setShowIgQr(false)} />}

      {/* MODAL: Instructivo de instalación */}
      {showInstall && <InstallModal onClose={() => setShowInstall(false)} />}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PASO 1 — DNI input + Cards comerciales (siempre visibles)
// ═════════════════════════════════════════════════════════════════════════════
function DniStep({ dni, setDni, onSubmit, busy, error, inputRef, onInstall, onShowIg, upcomingShows }) {
  return (
    <div className="pm-step pm-step--dni">
      {/* DNI FORM */}
      <form className="pm-dni-form" onSubmit={onSubmit}>
        <h1 className="pm-dni__title">Ingresá el DNI del cliente</h1>
        <p className="pm-dni__sub">Si ya está cargado, te muestro qué le falta. Si no, lo creamos.</p>
        <input
          ref={inputRef}
          className="pm-dni__input"
          type="tel"
          inputMode="numeric"
          maxLength={8}
          value={dni}
          onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
          placeholder="12345678"
          disabled={busy}
        />
        {error && <div className="pm-error">{error}</div>}
        <button type="submit" className="pm-btn pm-btn--primary pm-btn--xl" disabled={busy || !dni}>
          {busy ? 'Buscando…' : 'Buscar →'}
        </button>
      </form>

      {/* QUICK ACTIONS — ARRIBA Y LLAMATIVAS */}
      <section className="pm-quick">
        <button className="pm-quick__btn pm-quick__btn--ig" onClick={onShowIg}>
          <div className="pm-quick__icon-wrap">
            <span className="pm-quick__icon">📸</span>
          </div>
          <div className="pm-quick__txt">
            <strong>Seguinos en redes</strong>
            <small>QR de Instagram y Facebook · 1 toque</small>
          </div>
          <span className="pm-quick__arrow">→</span>
        </button>
        <button className="pm-quick__btn pm-quick__btn--install" onClick={onInstall}>
          <div className="pm-quick__icon-wrap">
            <span className="pm-quick__icon">📱</span>
          </div>
          <div className="pm-quick__txt">
            <strong>Instalá la app</strong>
            <small>Mostrale cómo dejarla en su pantalla</small>
          </div>
          <span className="pm-quick__arrow">→</span>
        </button>
      </section>

      {/* PRÓXIMOS SHOWS (informativo, in-line) */}
      {upcomingShows && upcomingShows.length > 0 && (
        <div className="pm-next-show">
          <div className="pm-next-show__badge">🎤 Próximos shows · Bailamos hasta las 03:30 am</div>
          <div className="pm-next-show__list">
            {upcomingShows.map(s => (
              <div key={s.id} className="pm-next-show__row">
                {s.imageUrl && (
                  <img
                    src={s.imageUrl}
                    alt={s.name}
                    className="pm-next-show__img"
                    style={{ objectPosition: s.imagePosition || 'center center' }}
                  />
                )}
                <div className="pm-next-show__info">
                  <div className="pm-next-show__name">{s.name}</div>
                  {s.dateLabel && <div className="pm-next-show__date">📅 {s.dateLabel}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="pm-next-show__hint">Recordáselo al cliente · Entrada libre</div>
        </div>
      )}

      {/* CARDS COMERCIALES */}
      <section className="pm-products">
        <h2 className="pm-products__title">Lo que ofrecemos</h2>
        <p className="pm-products__sub">Mostrá estas cards al cliente cuando le expliques.</p>

        <div className="pm-product pm-product--prode">
          <div className="pm-product__head">
            <span className="pm-product__icon">⚽</span>
            <div>
              <div className="pm-product__eyebrow">PRODE MUNDIAL 2026</div>
              <div className="pm-product__name">Premios <strong>{PRODE_INFO.totalPrize}</strong> en tickets</div>
            </div>
          </div>
          <ul className="pm-product__bullets">
            {PRODE_INFO.phases.map(p => (
              <li key={p.name}><span>{p.name}</span><strong>{p.prizes}</strong></li>
            ))}
          </ul>
          <p className="pm-product__note">Inscripción gratuita · Pronostican los partidos del Mundial</p>
        </div>

        <div className="pm-product pm-product--tournament">
          <div className="pm-product__head">
            <span className="pm-product__icon">🎰</span>
            <div>
              <div className="pm-product__eyebrow">TORNEO DE SLOTS</div>
              <div className="pm-product__name">Premios <strong>{TOURNAMENT_INFO.totalPrize}</strong> en vouchers</div>
            </div>
          </div>
          <ul className="pm-product__bullets">
            {TOURNAMENT_INFO.prizes.map(p => (
              <li key={p.place}><span>{p.place} puesto</span><strong>{p.amount}</strong></li>
            ))}
          </ul>
          <p className="pm-product__note">Llegar 30 min antes · Vouchers en 4 entregas semanales</p>
        </div>
      </section>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PASO 2A — Cliente nuevo (form)
// ═════════════════════════════════════════════════════════════════════════════
function NewPlayerStep({
  dni, formName, setFormName, formTel, setFormTel, formEmail, setFormEmail,
  formYear, setFormYear, tournament, onProde, onTournament, onBoth, onBack, busy, error,
}) {
  return (
    <div className="pm-step pm-step--form">
      <button className="pm-back" onClick={onBack}>← Volver</button>
      <div className="pm-pill pm-pill--new">✨ Cliente nuevo · DNI {dni}</div>
      <h1 className="pm-step__title">Completá los datos</h1>
      <p className="pm-step__sub">Cargá lo básico y elegí dónde inscribirlo.</p>

      <div className="pm-form">
        <label>Nombre y apellido *</label>
        <input className="pm-input" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Juan Pérez" disabled={busy} />

        <label>Año de nacimiento (será el PIN del Prode) *</label>
        <input
          className="pm-input pm-input--pin"
          type="tel" inputMode="numeric" maxLength={4}
          value={formYear}
          onChange={e => setFormYear(e.target.value.replace(/\D/g, ''))}
          placeholder="1985" disabled={busy}
        />

        <label>Teléfono <span className="pm-form__opt">(obligatorio para torneo)</span></label>
        <input className="pm-input" type="tel" value={formTel} onChange={e => setFormTel(e.target.value)} placeholder="343 4XX XXXX" disabled={busy} />

        <label>Email <span className="pm-form__opt">(opcional, recibe confirmación)</span></label>
        <input className="pm-input" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="cliente@email.com" disabled={busy} />
      </div>

      {error && <div className="pm-error">{error}</div>}

      <h2 className="pm-actions__title">¿Dónde lo inscribimos?</h2>
      <div className="pm-actions">
        <button className="pm-action pm-action--prode" onClick={onProde} disabled={busy}>
          <span className="pm-action__icon">⚽</span>
          <div>
            <div className="pm-action__title">Solo Prode</div>
            <div className="pm-action__desc">Premios {PRODE_INFO.totalPrize}</div>
          </div>
        </button>
        {tournament && (
          <button className="pm-action pm-action--tournament" onClick={onTournament} disabled={busy}>
            <span className="pm-action__icon">🎰</span>
            <div>
              <div className="pm-action__title">Solo Torneo</div>
              <div className="pm-action__desc">{tournament.name} · {TOURNAMENT_INFO.totalPrize}</div>
            </div>
          </button>
        )}
        {tournament && (
          <button className="pm-action pm-action--both" onClick={onBoth} disabled={busy}>
            <span className="pm-action__icon">🌟</span>
            <div>
              <div className="pm-action__title">Prode + Torneo</div>
              <div className="pm-action__desc">Lo mejor de los dos</div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PASO 2B — Cliente existente (status + acciones contextuales)
// ═════════════════════════════════════════════════════════════════════════════
function StatusStep({
  dni, player, prodeRegistered, tournament,
  formYear, setFormYear, formTel, setFormTel,
  onInscribeProde, onInscribeTournament, onAlreadyDone, onBack, busy, error,
}) {
  const tournamentRegistered = tournament?.registered
  const allDone = prodeRegistered && (tournament ? tournamentRegistered : true)
  const prodeBlockRef = useRef(null)
  const tournamentBlockRef = useRef(null)
  const [pulseId, setPulseId] = useState(null)

  // Editor de contacto inline
  const [editTel, setEditTel] = useState(player.tel || '')
  const [editEmail, setEditEmail] = useState(player.email || '')
  const [savingContact, setSavingContact] = useState(false)
  const [contactMsg, setContactMsg] = useState('')
  const dirty = editTel.trim() !== (player.tel || '').trim() || editEmail.trim() !== (player.email || '').trim()

  async function saveContact() {
    setContactMsg('')
    setSavingContact(true)
    try {
      const r = await promoUpdateContact({ dni, tel: editTel.trim(), email: editEmail.trim() })
      // Mutamos el player en lugar para reflejar el cambio (lookup queda en el padre)
      player.tel = r.player.tel
      player.email = r.player.email
      setContactMsg('✓ Datos guardados')
      setTimeout(() => setContactMsg(''), 2500)
    } catch (err) {
      setContactMsg('✗ ' + err.message)
    }
    setSavingContact(false)
  }

  function jumpTo(which) {
    const node = which === 'prode' ? prodeBlockRef.current : tournamentBlockRef.current
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setPulseId(which)
    setTimeout(() => setPulseId(null), 1200)
  }

  return (
    <div className="pm-step pm-step--status">
      <button className="pm-back" onClick={onBack}>← Volver</button>
      <div className="pm-pill pm-pill--known">👤 Cliente conocido · DNI {dni}</div>
      <h1 className="pm-step__title">Hola, <em>{player.name}</em></h1>
      <p className="pm-step__sub">Estado actual de inscripciones:</p>

      {/* STATUS CARDS — pending son clickeables */}
      <div className="pm-status-grid">
        <button
          type="button"
          className={`pm-status-card ${prodeRegistered ? 'pm-status-card--done' : 'pm-status-card--pending pm-status-card--clickable'}`}
          onClick={prodeRegistered ? undefined : () => jumpTo('prode')}
          disabled={prodeRegistered}
        >
          <div className="pm-status-card__icon">⚽</div>
          <div className="pm-status-card__label">PRODE MUNDIAL</div>
          <div className="pm-status-card__value">
            {prodeRegistered ? '✓ Inscripto' : '✗ No inscripto'}
          </div>
          {!prodeRegistered && <div className="pm-status-card__cta">Tocá para inscribir →</div>}
        </button>
        {tournament && (
          <button
            type="button"
            className={`pm-status-card ${tournamentRegistered ? 'pm-status-card--done' : 'pm-status-card--pending pm-status-card--clickable'}`}
            onClick={tournamentRegistered ? undefined : () => jumpTo('tournament')}
            disabled={tournamentRegistered}
          >
            <div className="pm-status-card__icon">🎰</div>
            <div className="pm-status-card__label">TORNEO DE SLOTS</div>
            <div className="pm-status-card__value">
              {tournamentRegistered ? `✓ N° ${tournament.registrationNo}` : '✗ No inscripto'}
            </div>
            {!tournamentRegistered && <div className="pm-status-card__cta">Tocá para inscribir →</div>}
          </button>
        )}
      </div>

      {/* CONTACTO — validar/editar inline */}
      <div className="pm-contact">
        <div className="pm-contact__head">
          <span>📋 Validá los datos con el cliente</span>
          {contactMsg && <span className={`pm-contact__msg ${contactMsg.startsWith('✓') ? 'pm-contact__msg--ok' : 'pm-contact__msg--err'}`}>{contactMsg}</span>}
        </div>
        <div className="pm-contact__row">
          <label>📱 Teléfono</label>
          <input
            className="pm-input"
            type="tel"
            value={editTel}
            onChange={e => setEditTel(e.target.value)}
            placeholder="343 4XX XXXX"
            disabled={savingContact}
          />
        </div>
        <div className="pm-contact__row">
          <label>✉️ Email</label>
          <input
            className="pm-input"
            type="email"
            value={editEmail}
            onChange={e => setEditEmail(e.target.value)}
            placeholder="cliente@email.com"
            disabled={savingContact}
          />
        </div>
        <button
          className="pm-btn pm-btn--primary pm-contact__save"
          onClick={saveContact}
          disabled={savingContact || !dirty}
        >
          {savingContact ? 'Guardando…' : (dirty ? '💾 Guardar cambios' : 'Sin cambios para guardar')}
        </button>
      </div>

      {error && <div className="pm-error">{error}</div>}

      {allDone ? (
        <div className="pm-all-done">
          <div className="pm-all-done__icon">🌟</div>
          <h2>¡Ya está en todo!</h2>
          <p>{player.name} está inscripto al Prode {tournament ? 'y al torneo' : ''}. Pasá a los recomendados.</p>
          <button className="pm-btn pm-btn--primary pm-btn--xl" onClick={onAlreadyDone}>
            Ir a recomendados →
          </button>
        </div>
      ) : (
        <>
          <h2 className="pm-actions__title">¿Qué hacemos?</h2>
          <div className="pm-actions">
            {!prodeRegistered && (
              <div ref={prodeBlockRef} className={`pm-action-block ${pulseId === 'prode' ? 'pm-action-block--pulse' : ''}`}>
                <div className="pm-action-block__head">
                  <span className="pm-action-block__icon">⚽</span>
                  <div>
                    <div className="pm-action-block__title">Inscribir al Prode</div>
                    <div className="pm-action-block__desc">{PRODE_INFO.totalPrize} en premios · gratis</div>
                  </div>
                </div>
                <p className="pm-action-block__hint">Pedile el año de nacimiento (4 dígitos). Será su PIN.</p>
                <input
                  className="pm-input pm-input--pin"
                  type="tel" inputMode="numeric" maxLength={4}
                  value={formYear}
                  onChange={e => setFormYear(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 1985" disabled={busy}
                />
                <button className="pm-btn pm-btn--prode" onClick={onInscribeProde} disabled={busy || !formYear}>
                  {busy ? 'Inscribiendo…' : '⚽ Inscribir al Prode'}
                </button>
              </div>
            )}
            {tournament && !tournamentRegistered && (
              <div ref={tournamentBlockRef} className={`pm-action-block ${pulseId === 'tournament' ? 'pm-action-block--pulse' : ''}`}>
                <div className="pm-action-block__head">
                  <span className="pm-action-block__icon">🎰</span>
                  <div>
                    <div className="pm-action-block__title">Inscribir al Torneo</div>
                    <div className="pm-action-block__desc">{tournament.name} · {TOURNAMENT_INFO.totalPrize}</div>
                  </div>
                </div>
                <p className="pm-action-block__date">📅 {fmtTournamentDate(tournament.date)}</p>
                {!player.tel && (
                  <>
                    <p className="pm-action-block__hint">Falta teléfono. Pedíselo.</p>
                    <input
                      className="pm-input"
                      type="tel"
                      value={formTel}
                      onChange={e => setFormTel(e.target.value)}
                      placeholder="343 4XX XXXX"
                      disabled={busy}
                    />
                  </>
                )}
                <button className="pm-btn pm-btn--tournament" onClick={onInscribeTournament} disabled={busy}>
                  {busy ? 'Inscribiendo…' : '🎰 Inscribir al Torneo'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PASO 3 — Recomendados antes de despedirte
// ═════════════════════════════════════════════════════════════════════════════
function SuccessStep({ success, onReset, onGoHome, onInstall, onShowIg }) {
  const firstName = success.name.split(' ')[0]
  return (
    <div className="pm-step pm-step--success">
      <div className="pm-success__check">✓</div>
      <h1 className="pm-success__title">¡Listo, <em>{firstName}</em>!</h1>

      {/* Mostrar PIN o Nº de inscripción según corresponda */}
      {success.pin && (
        <div className="pm-success__box pm-success__box--pin">
          <div className="pm-success__label">Tu PIN para entrar al Prode</div>
          <div className="pm-success__big">{success.pin}</div>
          <div className="pm-success__hint">Anotalo o sacá foto antes de cerrar</div>
        </div>
      )}
      {success.registrationNo && (
        <div className="pm-success__box pm-success__box--reg">
          <div className="pm-success__label">Tu número de inscripción al torneo</div>
          <div className="pm-success__big">N° {success.registrationNo}</div>
          <div className="pm-success__hint">Llegá 30 min antes con tu DNI</div>
        </div>
      )}

      {/* Recomendados */}
      <h2 className="pm-recommend__title">Recomendados antes de despedirte</h2>
      <div className="pm-recommend">
        <button className="pm-recommend__card" onClick={onInstall}>
          <span className="pm-recommend__icon">📱</span>
          <strong>Mostrale cómo instalar la app</strong>
          <small>Para que abra el Prode con un toque</small>
        </button>
        <button className="pm-recommend__card" onClick={onShowIg}>
          <span className="pm-recommend__icon">📸</span>
          <strong>Que nos siga en redes</strong>
          <small>QR Instagram y Facebook · 1 toque</small>
        </button>
        <a className="pm-recommend__card" href="https://www.saladejuegoscrespo.ar" target="_blank" rel="noopener noreferrer">
          <span className="pm-recommend__icon">🌐</span>
          <strong>Mostrale la web</strong>
          <small>Toda la info de la sala</small>
        </a>
      </div>

      <div className="pm-success__cta-row">
        <button className="pm-btn pm-btn--primary pm-btn--xl" onClick={onReset}>
          ➕ Inscribir a otra persona
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MODALES
// ═════════════════════════════════════════════════════════════════════════════
function IgQrModal({ onClose }) {
  const [network, setNetwork] = useState('ig') // 'ig' | 'fb'
  return (
    <div className="pm-modal" onClick={onClose}>
      <div className="pm-modal__inner" onClick={e => e.stopPropagation()}>
        <button className="pm-modal__close" onClick={onClose}>✕</button>
        <h2>Seguinos en redes</h2>
        <p className="pm-modal__sub">Mostrale el QR — escanea con la cámara y lo lleva al perfil</p>

        <div className="pm-install-tabs" style={{ marginBottom: 16 }}>
          <button
            className={network === 'ig' ? 'pm-install-tab pm-install-tab--on' : 'pm-install-tab'}
            onClick={() => setNetwork('ig')}
          >
            📸 Instagram
          </button>
          <button
            className={network === 'fb' ? 'pm-install-tab pm-install-tab--on' : 'pm-install-tab'}
            onClick={() => setNetwork('fb')}
          >
            📘 Facebook
          </button>
        </div>

        {network === 'ig' ? (
          <>
            <img src="/qr-instagram.jpg" alt="QR Instagram" className="pm-qr" />
            <p className="pm-modal__handle">@salajuegoscrespo</p>
          </>
        ) : (
          <>
            <img src="/qr-facebook.jpg" alt="QR Facebook" className="pm-qr" />
            <p className="pm-modal__handle">Sala de Juegos Crespo</p>
          </>
        )}
      </div>
    </div>
  )
}

function InstallModal({ onClose }) {
  const [device, setDevice] = useState('android')
  return (
    <div className="pm-modal" onClick={onClose}>
      <div className="pm-modal__inner pm-modal__inner--install" onClick={e => e.stopPropagation()}>
        <button className="pm-modal__close" onClick={onClose}>✕</button>
        <h2>📱 Instalar como app</h2>
        <p className="pm-modal__sub">Mostrale al cliente cómo dejarlo en su pantalla principal.</p>

        <div className="pm-install-tabs">
          <button className={device === 'android' ? 'pm-install-tab pm-install-tab--on' : 'pm-install-tab'} onClick={() => setDevice('android')}>Android</button>
          <button className={device === 'ios' ? 'pm-install-tab pm-install-tab--on' : 'pm-install-tab'} onClick={() => setDevice('ios')}>iPhone</button>
        </div>

        {device === 'android' ? (
          <ol className="pm-install-steps">
            <li>Abrí <strong>Chrome</strong> y entrá a <code>saladejuegoscrespo.ar/prode</code></li>
            <li>Tocá los <strong>3 puntitos arriba a la derecha</strong> (⋮)</li>
            <li>Elegí <strong>"Agregar a la pantalla principal"</strong></li>
            <li>Confirmá <strong>"Instalar"</strong></li>
            <li>Listo: te queda un ícono de Sala Crespo en el escritorio</li>
          </ol>
        ) : (
          <ol className="pm-install-steps">
            <li>Abrí <strong>Safari</strong> (no Chrome) y entrá a <code>saladejuegoscrespo.ar/prode</code></li>
            <li>Tocá el botón <strong>compartir</strong> abajo (cuadrado con flecha ⬆️)</li>
            <li>Bajá hasta <strong>"Agregar a pantalla de inicio"</strong></li>
            <li>Confirmá <strong>"Agregar"</strong></li>
            <li>Listo: te queda un ícono de Sala Crespo en el escritorio</li>
          </ol>
        )}
      </div>
    </div>
  )
}
