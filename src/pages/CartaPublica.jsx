import { useEffect, useState, useRef } from 'react'
import { getMenu, subscribeLead } from '../api/client'
import { isStandalone, needsIOSInstall, isPushSupported, subscribeToPush } from '../lib/push'
import './CartaPublica.css'

const fmt = new Intl.NumberFormat('es-AR')
const money = (n) => `$${fmt.format(Math.round(n))}`

const LOGO = '/logo-mundial-2026.png'

// Video de acento por sección (match por nombre de categoría, normalizado).
// Generados con Flow, fondo verde #1e4034 para fundirse con la carta.
const SECTION_VIDEOS = {
  'minutas': '/hamburguesa.mp4',
  'papas': '/papas.mp4',
  'pizza': '/pizza.mp4',
  'cervezas individuales': '/cerveza.mp4',
  'tragos': '/trago.mp4',
  // Pendientes de generar en Flow → descomentar al subir el .mp4:
  // 'espumantes': '/espumante.mp4',
  // 'casino' / cierre → casino.mp4
}
const sectionVideo = (name) => SECTION_VIDEOS[(name || '').toLowerCase().trim()] || null

// Badges destacados (mismo set que el panel admin)
const BADGE_COLORS = {
  'promo': '#c1272d', 'ticket promocional de regalo': '#0e7490', 'nuevo': '#16a34a',
  'tiempo limitado': '#d97706', 'recomendado': '#caa14e', 'más pedido': '#7c3aed',
}
const badgeColor = (label) => BADGE_COLORS[(label || '').toLowerCase()] || '#caa14e'
const itemBadges = (it) => {
  const b = Array.isArray(it.badges) ? it.badges : []
  if (b.length) return b
  return it.is_promo ? ['Promo'] : []
}

// Etiqueta grande de grupo (MENÚ / BEBIDAS) según food_group
const GROUP_LABEL = { menu: 'MENÚ', bebidas: 'BEBIDAS' }

/* ── Line-art dorado (decoración de fondo, estilo Canva) ── */
const Art = {
  beer: (
    <svg viewBox="0 0 64 64" className="art"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 22h22v32a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z" />
      <path d="M42 28h6a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-6" />
      <path d="M20 22c0-5 4-8 11-8s11 3 11 8" />
      <path d="M22 14c-1-4 2-6 5-5M31 11c0-4 4-5 6-3M38 12c2-3 6-2 6 1" />
    </g></svg>
  ),
  cocktail: (
    <svg viewBox="0 0 64 64" className="art"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 16h36L32 38z" /><path d="M32 38v12" /><path d="M22 54h20" />
      <path d="M44 12l-6 7" /><circle cx="44" cy="12" r="2.4" />
    </g></svg>
  ),
  wine: (
    <svg viewBox="0 0 64 64" className="art"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 10h16v14a8 8 0 0 1-16 0z" /><path d="M32 32v18" /><path d="M22 54h20" />
      <path d="M24 22h16" />
    </g></svg>
  ),
  burger: (
    <svg viewBox="0 0 64 64" className="art"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 26c0-7 8-12 18-12s18 5 18 12z" /><path d="M14 34h36" />
      <path d="M16 42c2 2 4 2 6 0s4-2 6 0 4 2 6 0 4-2 6 0 4 2 6 0" />
      <path d="M16 42v2a8 8 0 0 0 8 8h16a8 8 0 0 0 8-8v-2" />
    </g></svg>
  ),
  cutlery: (
    <svg viewBox="0 0 64 64" className="art"><g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 10v20M20 10v10a4 4 0 0 0 8 0V10M24 30v24" />
      <path d="M40 10c-4 2-6 6-6 12s2 8 6 8M40 10v44" />
    </g></svg>
  ),
}
const ARTS = [Art.beer, Art.cocktail, Art.wine, Art.burger, Art.cutlery]

/* Íconos vectoriales para la barra inferior (no emojis) */
const BarIcons = {
  home: (
    <svg viewBox="0 0 24 24" className="cartabar__svg"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9h4v-5.5h5V19h4v-9" />
    </g></svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" className="cartabar__svg"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10" />
      <path d="M16.5 3c-1.6 1-2.6 3.2-2.6 5.8s1.1 4.2 2.6 4.2M16.5 3v18" />
    </g></svg>
  ),
  drink: (
    <svg viewBox="0 0 24 24" className="cartabar__svg"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8.5h9V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
      <path d="M15 11h2.5a1.8 1.8 0 0 1 1.8 1.8v2.4a1.8 1.8 0 0 1-1.8 1.8H15" />
      <path d="M6 8.5C6 6.6 7.5 5 10.5 5S15 6.6 15 8.5" />
      <path d="M8.5 5c-.6-2 .8-3 2-2.4" />
    </g></svg>
  ),
}

/* ── Bloque APP + NOTIFICACIONES (prioridad, arriba) ── */
function AppBlock() {
  const [push, setPush] = useState(() => (isStandalone() ? 'installed' : 'idle')) // idle | busy | done | ios | installed
  const [deferred, setDeferred] = useState(null)
  useEffect(() => {
    const onBip = (e) => { e.preventDefault(); setDeferred(e) }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])
  const activate = async () => {
    if (needsIOSInstall()) { setPush('ios'); return }
    setPush('busy')
    try {
      if (deferred) { deferred.prompt(); await deferred.userChoice; setDeferred(null) }
      if (isPushSupported()) await subscribeToPush(null)
      setPush('done')
    } catch { setPush('idle') }
  }
  return (
    <section className="appcta">
      <div className="appcta__inner">
        <span className="appcta__icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" />
            <path d="M15.5 6.5a4 4 0 0 1 0 5M17.7 4.3a7 7 0 0 1 0 9.4" />
          </svg>
        </span>
        <div className="appcta__text">
          <h2 className="appcta__title">Llevate Sala Crespo en tu celu</h2>
          <p className="appcta__sub">Instalá la app y recibí <b>promos exclusivas</b> y avisos de sorteos, antes que nadie.</p>
        </div>
        <div className="appcta__action">
          {push === 'done' ? (
            <span className="appcta__ok">¡Listo! Te van a llegar las promos 🔔</span>
          ) : push === 'ios' ? (
            <p className="appcta__ios">En tu iPhone: tocá <b>···</b> (abajo a la derecha) → <b>Compartir</b> → <b>Ver más</b> → <b>Agregar a inicio</b>. Después abrila desde el ícono.</p>
          ) : (
            <button className="appcta__btn" onClick={activate} disabled={push === 'busy'}>
              {push === 'busy' ? 'Activando…' : push === 'installed' ? '🔔 Activar notificaciones' : '📲 Instalar app + notificaciones'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

/* ── Bloque PROMOS POR MAIL (en el cierre) ── */
function MailBlock() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [hp, setHp] = useState('')
  const [mail, setMail] = useState('idle') // idle | sending | done
  const [mailErr, setMailErr] = useState('')
  const [gotCortesia, setGotCortesia] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (hp) { setMail('done'); return }
    if (name.trim().length < 2) { setMailErr('Poné tu nombre'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMailErr('Email inválido'); return }
    setMail('sending'); setMailErr('')
    try { const r = await subscribeLead({ name: name.trim(), email: email.trim() }); setGotCortesia(!!r?.courtesy); setMail('done') }
    catch (err) { setMailErr(err.message || 'No se pudo, probá de nuevo'); setMail('idle') }
  }
  return (
    <div className="mailcta" id="sumate-mail">
      <span className="mailcta__badge">🍺 1ª bebida de cortesía</span>
      <h3 className="mailcta__title">Sumate y te invitamos una bebida</h3>
      <p className="mailcta__sub">Dejá tus datos: promos exclusivas + una <b>bebida de cortesía de bienvenida</b> 🍺</p>
      {mail === 'done' ? (
        <p className="mailcta__ok">{gotCortesia ? '¡Listo! Te mandamos una bebida de cortesía a tu mail 🎁🍺' : '¡Listo! Te vamos a avisar de las promos 🎉'}</p>
      ) : (
        <form onSubmit={submit} className="mailcta__form">
          <input className="mailcta__input" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="mailcta__input" type="email" inputMode="email" placeholder="Tu email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="mailcta__hp" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} aria-hidden />
          <button className="mailcta__btn" disabled={mail === 'sending'}>{mail === 'sending' ? 'Enviando…' : 'Suscribirme'}</button>
        </form>
      )}
      {mailErr && <span className="mailcta__err">{mailErr}</span>}
    </div>
  )
}

/* ── Slot de video (mascotas / cerveza). Si no hay src, placeholder elegante ── */
function VideoSlot({ src, className }) {
  if (!src) return <div className={`vslot vslot--empty ${className || ''}`} aria-hidden />
  return (
    <video className={`vslot ${className || ''}`} src={src} autoPlay muted loop playsInline preload="auto" />
  )
}

export default function CartaPublica() {
  const [menu, setMenu] = useState(null)
  const [error, setError] = useState('')
  const [activeCat, setActiveCat] = useState(null)
  const [navHint, setNavHint] = useState(false)
  const navRef = useRef(null)

  // ¿El nav de chips tiene más para deslizar a la derecha? → muestra el indicador
  const updateNavHint = () => {
    const t = navRef.current?.querySelector('.carta__nav-track')
    if (!t) return
    setNavHint(t.scrollWidth - t.clientWidth - t.scrollLeft > 8)
  }
  useEffect(() => { if (menu?.length) { const id = setTimeout(updateNavHint, 120); return () => clearTimeout(id) } }, [menu])

  useEffect(() => {
    let alive = true
    getMenu()
      .then((d) => { if (alive) setMenu(d.menu || []) })
      .catch(() => { if (alive) setError('No pudimos cargar la carta. Probá de nuevo en un momento.') })
    return () => { alive = false }
  }, [])

  // Scroll-spy + reveal on scroll
  useEffect(() => {
    if (!menu?.length) return
    const spy = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (vis) setActiveCat(vis.target.id)
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.4, 1] }
    )
    menu.forEach((c) => { const el = document.getElementById(`cat-${c.id}`); if (el) spy.observe(el) })

    const reveal = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target) } }),
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    )
    document.querySelectorAll('.reveal').forEach((el) => reveal.observe(el))
    return () => { spy.disconnect(); reveal.disconnect() }
  }, [menu])

  // Centra el chip activo (solo scroll horizontal del track)
  useEffect(() => {
    if (!activeCat || !navRef.current) return
    const chip = navRef.current.querySelector(`[data-chip="${activeCat}"]`)
    const track = navRef.current.querySelector('.carta__nav-track')
    if (chip && track) {
      const target = chip.offsetLeft - track.clientWidth / 2 + chip.clientWidth / 2
      track.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
    }
  }, [activeCat])

  const goTo = (id) => {
    const el = document.getElementById(`cat-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const goToMenu = () => menu?.[0] && goTo(menu[0].id)
  const goToGroup = (g) => {
    const el = document.getElementById(`group-${g}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const goToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const goToJoin = () => { const el = document.getElementById('sumate-mail'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }

  // Grupo activo (MENÚ / BEBIDAS) según la categoría visible — para la barra inferior
  const activeGroup = (() => {
    if (!activeCat || !menu) return null
    const c = menu.find((x) => `cat-${x.id}` === activeCat)
    return c ? (c.food_group || 'bebidas') : null
  })()
  const hasGroup = (g) => menu?.some((c) => (c.food_group || 'bebidas') === g)

  return (
    <div className="carta">
      <div className="carta__grain" aria-hidden />

      {/* ── PORTADA ── */}
      <section className="cover">
        <span className="cover__art cover__art--tl" aria-hidden>{Art.cutlery}</span>
        <span className="cover__art cover__art--tr" aria-hidden>{Art.cocktail}</span>
        <span className="cover__art cover__art--bl" aria-hidden>{Art.beer}</span>
        <span className="cover__art cover__art--br" aria-hidden>{Art.burger}</span>

        <div className="cover__inner">
          <VideoSlot src="/logo-chef.mp4" className="cover__logo-video" />
          <h1 className="cover__menu">MENÚ</h1>
          <VideoSlot src="/mascota-portada.mp4" className="cover__video" />
          <button className="cover__seal" onClick={goToJoin} aria-label="Bebida de cortesía, dejá tus datos">
            <span className="cover__seal-ico">🍺</span>
            <span className="cover__seal-main">Bebida<br/>de cortesía</span>
            <span className="cover__seal-sub">Dejá tus datos</span>
          </button>
          <p className="cover__ask">Preguntá por nuestras</p>
          <p className="cover__promos">PROMOCIONES</p>
          <span className="cover__rule" />
          <button className="cover__cta" onClick={goToMenu}>
            Ver la carta <span className="cover__cta-arrow">↓</span>
          </button>

          <div className="cover__pay">
            <svg className="cover__pay-art" viewBox="0 0 52 40" fill="none" aria-hidden>
              {/* tarjeta */}
              <rect x="3" y="9" width="36" height="23" rx="3.2" fill="rgba(216,178,90,0.16)" stroke="currentColor" strokeWidth="1.7" />
              <rect x="3" y="14" width="36" height="4.5" fill="currentColor" opacity="0.85" />
              {/* chip */}
              <rect x="8" y="23" width="7" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.85" />
              {/* ondas contactless saliendo de la tarjeta */}
              <g stroke="currentColor" strokeLinecap="round" fill="none" className="cover__pay-wave">
                <path d="M41 14 a7 7 0 0 1 0 12" strokeWidth="1.8" />
                <path d="M45 10 a13 13 0 0 1 0 20" strokeWidth="1.8" opacity="0.8" />
                <path d="M49 6 a19 19 0 0 1 0 28" strokeWidth="1.8" opacity="0.55" />
              </g>
            </svg>
            <span className="cover__pay-txt"><b>Aceptamos</b><br/>débito y crédito</span>
          </div>
        </div>
      </section>

      {/* ── NAV de categorías ── */}
      {menu?.length > 0 && (
        <nav className="carta__nav" ref={navRef}>
          <div className="carta__nav-track" onScroll={updateNavHint}>
            {menu.map((c) => (
              <button
                key={c.id}
                data-chip={`cat-${c.id}`}
                className={`carta__chip ${activeCat === `cat-${c.id}` ? 'is-active' : ''}`}
                onClick={() => goTo(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          {navHint && <div className="carta__nav-hint" aria-hidden>›</div>}
        </nav>
      )}

      {/* ── APP + NOTIFICACIONES (prioridad, arriba) ── */}
      {menu?.length > 0 && <AppBlock />}

      {/* ── SECCIONES ── */}
      <main className="carta__body">
        {error && <p className="carta__msg">{error}</p>}
        {!menu && !error && <p className="carta__msg">Cargando carta…</p>}

        {menu?.map((cat, i) => {
          const hasPhotos = cat.items.some((it) => it.photo_url)
          const vid = sectionVideo(cat.name)
          // Consistencia por sección: si alguna descripción es larga, TODAS van abajo
          const sectionHasLong = cat.items.some((it) => (it.description || '').length > 32)
          const group = cat.food_group || 'bebidas'
          const prevGroup = i > 0 ? (menu[i - 1].food_group || 'bebidas') : null
          const showDivider = group !== prevGroup
          return (
            <div key={cat.id}>
              {showDivider && (
                <div className="groupdiv reveal" id={`group-${group}`}>
                  <span className="groupdiv__art groupdiv__art--l" aria-hidden>{group === 'menu' ? Art.cutlery : Art.cocktail}</span>
                  <span className="groupdiv__art groupdiv__art--r" aria-hidden>{group === 'menu' ? Art.burger : Art.wine}</span>
                  <h2 className="groupdiv__title">{GROUP_LABEL[group] || group}</h2>
                  <p className="groupdiv__sub">SALA CRESPO BAR</p>
                </div>
              )}
              <section id={`cat-${cat.id}`} className="sect">
                <span className="sect__art" aria-hidden>{ARTS[i % ARTS.length]}</span>
                <div className="sect__label reveal">
                  <h2>{cat.name}</h2>
                </div>
                {vid && (
                  <div className="sect__video reveal">
                    <VideoSlot src={vid} className="sect__video-el" />
                  </div>
                )}

                {hasPhotos ? (
                  <div className="cards reveal">
                    {cat.items.map((it) => {
                      const badges = itemBadges(it)
                      return (
                        <article key={it.id} className="card">
                          <div className={`card__pic ${it.photo_url ? '' : 'card__pic--ph'}`}>
                            {it.photo_url && <img src={it.photo_url} alt={it.name} loading="lazy" />}
                            {badges.length > 0 && (
                              <div className="card__badges">
                                {badges.map((b) => <span key={b} className="card__badge" style={{ background: badgeColor(b) }}>{b}</span>)}
                              </div>
                            )}
                            <span className="card__price">{money(it.price)}</span>
                          </div>
                          <div className="card__name">{it.name}</div>
                          {(it.description || it.promo_note) && (
                            <div className="card__desc">{it.description}{it.promo_note ? ` · ${it.promo_note}` : ''}</div>
                          )}
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <ul className="rows reveal">
                    {cat.items.map((it) => {
                      const badges = itemBadges(it)
                      const longDesc = sectionHasLong
                      return (
                        <li key={it.id} className="row">
                          <div className="row__top">
                            <span className="row__name">
                              {it.name}
                              {badges.map((b) => <span key={b} className="row__badge" style={{ background: badgeColor(b) }}>{b}</span>)}
                              {it.description && !longDesc && <span className="row__desc-inline">{it.description}</span>}
                            </span>
                            <span className="row__dots" aria-hidden />
                            <span className="row__price">{money(it.price)}</span>
                          </div>
                          {it.description && longDesc && <p className="row__desc">{it.description}</p>}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          )
        })}
      </main>

      {/* ── CIERRE ── */}
      {menu?.length > 0 && (
        <section className="closing">
          <VideoSlot src="/casino.mp4" className="closing__video" />
          <p className="closing__top">ACÁ EL TIEMPO SE DETIENE…</p>
          <p className="closing__sub">AL MENOS HASTA QUE TRAEN LA CUENTA</p>
          <p className="closing__mid">No te apures a irte</p>
          <p className="closing__big">Disfrutá el momento.</p>
          <p className="closing__wait">NOSOTROS TE ESPERAMOS SIEMPRE</p>
          <VideoSlot src="/mascota-cierre.mp4" className="closing__video" />
          <MailBlock />
          <div className="closing__info">
            <p className="closing__name">Sala de Juegos Crespo</p>
            <p className="closing__addr">San Martín 1053 · Crespo, Entre Ríos · saladejuegoscrespo.ar</p>
          </div>
          <p className="closing__legal">Bebé con moderación. Prohibida la venta de alcohol a menores de 18 años.</p>
        </section>
      )}

      {/* ── Barra inferior fija (navegación mobile) ── */}
      {menu?.length > 0 && (
        <nav className="cartabar">
          <button className="cartabar__btn cartabar__btn--home" onClick={goToTop}>
            {BarIcons.home}<span className="cartabar__lbl">Inicio</span>
          </button>
          {hasGroup('menu') && (
            <button className={`cartabar__btn ${activeGroup === 'menu' ? 'is-on' : ''}`} onClick={() => goToGroup('menu')}>
              {BarIcons.menu}<span className="cartabar__lbl">Menú</span>
            </button>
          )}
          {hasGroup('bebidas') && (
            <button className={`cartabar__btn ${activeGroup === 'bebidas' ? 'is-on' : ''}`} onClick={() => goToGroup('bebidas')}>
              {BarIcons.drink}<span className="cartabar__lbl">Bebidas</span>
            </button>
          )}
        </nav>
      )}
    </div>
  )
}
