import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { getLoyaltyMe, getLoyaltyCatalog, redeemLoyaltyReward } from '../api/client'
import './ClubView.css'

// Sala Crespo Club — vista miembro (versión "diseño completo")
// Diseño 1:1 con mockup-club-v2.html.
// - Hero con video de fondo (/club-reveal.mp4) y carnet de socio (tilt 3D al hover).
// - Pending de canjes para retirar en barra.
// - Sorteo mensual (datos calculados del propio historial — socios participantes
//   queda pendiente de endpoint).
// - Featured: el canje más valioso que el cliente puede pagar hoy.
// - Catálogo separado en "disponible hoy" vs "próximas recompensas".
// - Bloque "cómo se suman puntos" (educativo).
// - Historial de movimientos.

// ─── Iconos SVG por categoría (los mismos del mockup) ─────────────
function CategoryIcon({ category }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (category) {
    case 'sin_alcohol':
      return (
        <svg {...common}>
          <path d="M12 2 c-3 5 -6 9 -6 13 a6 6 0 0 0 12 0 c0 -4 -3 -8 -6 -13 z" />
          <path d="M9 16 c1 2 3 3 5 2" opacity=".6" />
        </svg>
      )
    case 'cerveza':
      return (
        <svg {...common}>
          <path d="M6 7 h10 v13 a2 2 0 0 1 -2 2 h-6 a2 2 0 0 1 -2 -2 z" />
          <path d="M16 9 h2 a2 2 0 0 1 0 4 h-2" />
          <path d="M6 11 v9" opacity=".5" />
          <path d="M10 4 c0 1 -1 2 -1 3 m3 -3 c0 1 -1 2 -1 3 m3 -3 c0 1 -1 2 -1 3" opacity=".7" />
        </svg>
      )
    case 'trago':
      return (
        <svg {...common}>
          <path d="M5 5 h14 l-2 7 a4 4 0 0 1 -8 0 z" />
          <line x1="12" y1="12" x2="12" y2="20" />
          <line x1="8" y1="20" x2="16" y2="20" />
          <circle cx="17" cy="6" r="1.5" />
        </svg>
      )
    case 'comida':
      return (
        <svg {...common}>
          <path d="M3 6 L21 6 L12 22 z" />
          <circle cx="12" cy="11" r="1.5" />
          <circle cx="8.5" cy="14" r="1" />
          <circle cx="14" cy="16" r="1" />
          <line x1="3" y1="6" x2="21" y2="6" />
        </svg>
      )
    case 'ticket':
      return (
        <svg {...common}>
          <path d="M2 8 c1 0 2 -1 2 -2 h16 c0 1 1 2 2 2 v8 c-1 0 -2 1 -2 2 H4 c0 -1 -1 -2 -2 -2 z" />
          <line x1="9" y1="6" x2="9" y2="18" strokeDasharray="2,2" />
          <path d="M13 9 v6 m-1.5 -3 h3" />
        </svg>
      )
    default:
      return null
  }
}

const CAT_LABELS = {
  sin_alcohol: 'Sin alcohol',
  cerveza:     'Cerveza',
  trago:       'Tragos',
  comida:      'Comidas',
  ticket:      'Tickets',
}

// ─── Iconos de tipo de transacción ────────────────────────────────
function txMeta(kind) {
  switch (kind) {
    case 'earn_checkin':      return { icon: 'I',   label: 'Check-in en sala' }
    case 'earn_ayb':          return { icon: 'II',  label: 'Consumo en barra' }
    case 'earn_birthday':     return { icon: 'III', label: 'Cortesía de cumpleaños' }
    case 'earn_signup_bonus': return { icon: '✦',   label: 'Bienvenida al Club' }
    case 'earn_manual':       return { icon: '+',   label: 'Ajuste de puntos' }
    case 'redeem':            return { icon: '★',   label: 'Canje' }
    case 'refund':            return { icon: '↻',   label: 'Reintegro' }
    case 'expire':            return { icon: '⌛',   label: 'Vencimiento' }
    default:                  return { icon: '·',   label: kind }
  }
}

function formatTxDate(iso) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).replace(',', ' ·')
}

function formatMonthYear(iso) {
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const d = new Date(iso)
  return `${months[d.getMonth()]} de ${d.getFullYear()}`
}

function formatMonthShort() {
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const d = new Date()
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

function daysUntilEndOfMonth() {
  const now = new Date()
  const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  return Math.max(0, Math.ceil((eom - now) / (1000 * 60 * 60 * 24)))
}

function countCheckinsThisMonth(transactions) {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  return transactions.filter(t => {
    if (t.kind !== 'earn_checkin') return false
    const d = new Date(t.created_at)
    return d.getFullYear() === y && d.getMonth() === m
  }).length
}

// ─────────────────────────────────────────────────────────────────
export default function ClubView({ player }) {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [pending, setPending] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyReward, setBusyReward] = useState(null)
  const [msg, setMsg] = useState(null)

  const cardRef = useRef(null)
  const cardWrapRef = useRef(null)
  const balanceNumRef = useRef(null)
  const prevBalanceRef = useRef(0)

  const reload = useCallback(async () => {
    try {
      const [me, cat] = await Promise.all([
        getLoyaltyMe(player.token),
        getLoyaltyCatalog(),
      ])
      setBalance(me.balance || 0)
      setTransactions(me.transactions || [])
      setPending(me.pending || [])
      setCatalog(cat.rewards || [])
    } catch (err) {
      setMsg({ kind: 'err', text: err.message })
    } finally {
      setLoading(false)
    }
  }, [player.token])

  useEffect(() => { reload() }, [reload])

  // ─── Count-up del balance al cargar / al cambiar ────────────────
  useEffect(() => {
    const el = balanceNumRef.current
    if (!el) return
    const from = prevBalanceRef.current
    const to = balance
    if (from === to) {
      el.textContent = to.toLocaleString('es-AR')
      return
    }
    const duration = 1600
    const start = performance.now()
    const ease = (t) => 1 - Math.pow(1 - t, 3)
    let raf
    function step(now) {
      const t = Math.min(1, (now - start) / duration)
      const v = Math.round(from + (to - from) * ease(t))
      el.textContent = v.toLocaleString('es-AR')
      if (t < 1) raf = requestAnimationFrame(step)
      else prevBalanceRef.current = to
    }
    raf = requestAnimationFrame(step)
    return () => raf && cancelAnimationFrame(raf)
  }, [balance])

  // ─── Tilt 3D del carnet al pasar el mouse ────────────────────────
  useEffect(() => {
    const card = cardRef.current
    const wrap = cardWrapRef.current
    if (!card || !wrap) return
    const MAX_TILT = 8
    let rafId = null
    function onMove(e) {
      const r = wrap.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      const rotY = (x - 0.5) * 2 * MAX_TILT
      const rotX = (y - 0.5) * 2 * -MAX_TILT
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        card.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(8px)`
      })
    }
    function onLeave() {
      if (rafId) cancelAnimationFrame(rafId)
      card.style.transform = ''
    }
    wrap.addEventListener('mousemove', onMove)
    wrap.addEventListener('mouseleave', onLeave)
    return () => {
      wrap.removeEventListener('mousemove', onMove)
      wrap.removeEventListener('mouseleave', onLeave)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [loading])

  // ─── Reveal de cards en scroll ───────────────────────────────────
  useEffect(() => {
    const els = document.querySelectorAll('.club__reveal:not(.club__reveal--visible)')
    if (!els.length) return
    if (!('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('club__reveal--visible'))
      return
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('club__reveal--visible'), i * 90)
          io.unobserve(entry.target)
        }
      })
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [catalog, pending, transactions])

  // ─── Canje ───────────────────────────────────────────────────────
  async function handleRedeem(reward) {
    if (balance < reward.points) return
    if (!confirm(`Canjear "${reward.name}" por ${reward.points.toLocaleString('es-AR')} pts?\n\nVas a quedar con ${(balance - reward.points).toLocaleString('es-AR')} pts.`)) return
    setBusyReward(reward.id); setMsg(null)
    try {
      const r = await redeemLoyaltyReward(player.token, reward.id)
      setMsg({ kind: 'ok', text: `¡Canje listo! Acercate a la barra con tu DNI para retirar tu ${r.redemption.reward_name}.` })
      await reload()
    } catch (err) {
      setMsg({ kind: 'err', text: err.message })
    } finally {
      setBusyReward(null)
    }
  }

  // ─── Catálogo derivado ──────────────────────────────────────────
  const { available, upcoming, featured, nextReward } = useMemo(() => {
    if (!catalog.length) return { available: [], upcoming: [], featured: null, nextReward: null }
    const avail = catalog.filter(r => balance >= r.points).sort((a, b) => b.points - a.points)
    const upc = catalog.filter(r => balance < r.points).sort((a, b) => (a.points - balance) - (b.points - balance)).slice(0, 4)
    const feat = avail[0] || null
    const next = upc[0] || null
    return { available: avail, upcoming: upc, featured: feat, nextReward: next }
  }, [catalog, balance])

  const progressPct = nextReward ? Math.min(99, Math.round((balance / nextReward.points) * 100)) : 100

  // ─── Carnet data ────────────────────────────────────────────────
  const firstName = player.name?.split(' ')[0] || ''
  const memberNum = `N° ${String(player.id || 0).padStart(5, '0')}`
  const memberSince = player.created_at ? formatMonthYear(player.created_at) : 'Mayo 2026'
  const memberSinceShort = player.created_at
    ? new Date(player.created_at).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
    : 'May 2026'

  // ─── Raffle data ────────────────────────────────────────────────
  const myCoupons = countCheckinsThisMonth(transactions)
  const daysToRaffle = daysUntilEndOfMonth()

  if (loading) {
    return <div className="club__loading">Cargando su cuenta…</div>
  }

  return (
    <div className="club">
      {/* ───────── HERO ───────── */}
      <section className="club__hero">
        <div className="club__hero-bg">
          <video autoPlay loop muted playsInline preload="auto">
            <source src="/club-reveal.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="club__hero-inner">
          <div className="club__hero-kicker">★ Bienvenido al Club</div>
          <div className="club__hero-greeting">
            Hola de nuevo, <strong>{firstName}</strong>
          </div>

          {/* Carnet de socio */}
          <div className="card-member-wrap" ref={cardWrapRef}>
            <div className="card-member" ref={cardRef}>
              {/* Ornamentos art deco esquineros */}
              {['tl','tr','br','bl'].map(pos => (
                <div key={pos} className={`card-member__corner card-member__corner--${pos}`}>
                  <svg viewBox="0 0 38 38" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                    <path d="M2 14 L2 2 L14 2" opacity=".9" />
                    <path d="M2 8 L8 8 L8 2" opacity=".5" />
                    <circle cx="2" cy="2" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </div>
              ))}

              <div className="card-member__shimmer" />

              <div className="card-member__head">
                <div className="card-member__head-left">
                  <div className="card-member__logo">
                    <img src="/club-logo.png" alt="Sala Crespo Club" />
                  </div>
                  <div className="card-member__head-id">
                    <span className="card-member__head-id-num">{memberNum}</span>
                    <span className="card-member__head-id-since">Socio · {memberSinceShort}</span>
                  </div>
                </div>
                <div className="card-member__status">
                  <span className="card-member__status-dot" />
                  Miembro activo
                </div>
              </div>

              <div className="card-member__balance">
                <div className="card-member__balance-num" ref={balanceNumRef}>0</div>
                <div className="card-member__balance-lbl">Puntos disponibles</div>
              </div>

              <div className="card-member__name">
                <div className="card-member__name-text">{player.name}</div>
                <div className="card-member__name-lbl">Socio del Club</div>
              </div>

              <div className="card-member__foot">
                <span>Emitida · {memberSince}</span>
                <strong>Sala Crespo Club</strong>
              </div>
            </div>
          </div>

          {/* Progress al próximo canje */}
          {nextReward && (
            <div className="club-progress">
              <div className="club-progress__lbl">Su próxima recompensa</div>
              <div className="club-progress__track">
                <div className="club-progress__fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="club-progress__text">
                Le faltan <strong>{(nextReward.points - balance).toLocaleString('es-AR')} pts</strong> para {nextReward.name}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ───────── Toast ───────── */}
      {msg && (
        <div className={`club__msg club__msg--${msg.kind}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="club__msg-x" aria-label="Cerrar">×</button>
        </div>
      )}

      {/* ───────── Pending (canjes para retirar) ───────── */}
      {pending.length > 0 && (
        <section className="club__block">
          <div className="club__pending">
            <div className="club__pending-h">★ Para retirar en barra ({pending.length})</div>
            <p className="club__pending-help">
              Acercate al mostrador y decí tu DNI <strong>{player.dni}</strong>. El cajero te entrega:
            </p>
            {pending.map(p => (
              <div key={p.id} className="club__pending-item">
                <div>
                  <strong>{p.reward_name}</strong>
                  {p.promo_code && <span className="club__pending-code">{p.promo_code}</span>}
                </div>
                <span className="club__pending-pts">{p.points_used.toLocaleString('es-AR')} pts</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───────── Sorteo del mes ───────── */}
      <section className="club__block">
        <div className="club__block-head">
          <div className="club__block-eye">El sorteo del mes</div>
          <h2 className="club__block-title">Premio <em>extraordinario</em></h2>
        </div>
        <div className="club__raffle">
          <div className="club__raffle-eye">{formatMonthShort()}</div>
          <div className="club__raffle-prize">Sorteo de</div>
          <div className="club__raffle-amount">$100.000</div>
          <div className="club__raffle-sub">En tickets promocionales</div>

          <div className="club__raffle-hr" />

          <div className="club__raffle-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="club__raffle-stat">
              <div className="club__raffle-stat-num">{myCoupons}</div>
              <div className="club__raffle-stat-lbl">Sus<br />cupones</div>
            </div>
            <div className="club__raffle-stat">
              <div className="club__raffle-stat-num">{daysToRaffle}</div>
              <div className="club__raffle-stat-lbl">Días para<br />el sorteo</div>
            </div>
          </div>

          <div className="club__raffle-bases">
            Cada visita a la sala suma un cupón. <a href="#">Bases y condiciones</a>.
          </div>
        </div>
      </section>

      {/* ───────── Featured (recomendado para usted) ───────── */}
      {featured && (
        <section className="club__block">
          <div className="club__block-head">
            <div className="club__block-eye">Recomendado para usted</div>
            <h2 className="club__block-title">Puede canjear <em>ahora mismo</em></h2>
          </div>
          <div className="club__featured">
            <div>
              <div className="club__featured-eye">{CAT_LABELS[featured.category] || featured.category} · Disponible</div>
              <div className="club__featured-name">{featured.name}</div>
              <p className="club__featured-desc">
                Le quedan <strong>{balance.toLocaleString('es-AR')} pts</strong>: alcanza para canjearlo ahora.
                Aprovéchelo hoy en la barra.
              </p>
              <button
                className="club__featured-cta"
                onClick={() => handleRedeem(featured)}
                disabled={busyReward === featured.id}
              >
                {busyReward === featured.id ? 'Canjeando…' : 'Canjear ahora →'}
              </button>
            </div>
            <div className="club__featured-price">
              <div className="club__featured-price-num">{featured.points.toLocaleString('es-AR')}</div>
              <div className="club__featured-price-lbl">Puntos</div>
            </div>
          </div>
        </section>
      )}

      {/* ───────── Catálogo disponible ───────── */}
      {available.length > 0 && (
        <section className="club__block">
          <div className="club__block-head">
            <div className="club__block-eye">Su catálogo</div>
            <h2 className="club__block-title">Disponible para canjear <em>hoy</em></h2>
          </div>
          <div className="club__catalog">
            {available.map(r => (
              <article key={r.id} className={`club__item club__item--available club__item--${r.category} club__reveal`}>
                <div className="club__item-visual">
                  <CategoryIcon category={r.category} />
                </div>
                <div className="club__item-body">
                  <div className="club__item-cat">{CAT_LABELS[r.category] || r.category}</div>
                  <h3 className="club__item-name">{r.name}</h3>
                  <div className="club__item-hr" />
                  <div className="club__item-pts">
                    <span className="club__item-pts-num">{r.points.toLocaleString('es-AR')}</span>
                    <span className="club__item-pts-lbl">Puntos</span>
                  </div>
                  <button
                    className="club__item-cta"
                    onClick={() => handleRedeem(r)}
                    disabled={busyReward === r.id}
                  >
                    {busyReward === r.id ? 'Canjeando…' : <>Canjear <span className="club__item-cta-arrow">→</span></>}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ───────── Próximas recompensas (locked) ───────── */}
      {upcoming.length > 0 && (
        <section className="club__block">
          <div className="club__block-head">
            <div className="club__block-eye">Próximas recompensas</div>
            <h2 className="club__block-title" style={{ fontSize: '24px' }}>
              Cerca de su <em>siguiente canje</em>
            </h2>
          </div>
          <div className="club__catalog">
            {upcoming.map(r => (
              <article key={r.id} className={`club__item club__item--locked club__item--${r.category} club__reveal`}>
                <div className="club__item-visual">
                  <CategoryIcon category={r.category} />
                </div>
                <div className="club__item-body">
                  <div className="club__item-cat">{CAT_LABELS[r.category] || r.category}</div>
                  <h3 className="club__item-name">{r.name}</h3>
                  <div className="club__item-hr" />
                  <div className="club__item-pts">
                    <span className="club__item-pts-num">{r.points.toLocaleString('es-AR')}</span>
                    <span className="club__item-pts-lbl">Puntos</span>
                  </div>
                  <div className="club__item-missing">
                    Le faltan <strong>{(r.points - balance).toLocaleString('es-AR')}</strong> pts
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ───────── Cómo se suman puntos ───────── */}
      <section className="club__block">
        <div className="club__block-head">
          <div className="club__block-eye">El programa</div>
          <h2 className="club__block-title">Cómo se <em>suman puntos</em></h2>
        </div>
        <div className="club__how">
          <div className="club__how-card">
            <div className="club__how-icon">I</div>
            <div className="club__how-title">Por cada visita</div>
            <div className="club__how-desc">
              Identifíquese al entrar a la sala. Una vez por día, no se acumula entre visitas del mismo día.
            </div>
            <div className="club__how-pts">+50 puntos</div>
          </div>
          <div className="club__how-card">
            <div className="club__how-icon">II</div>
            <div className="club__how-title">Por su consumo</div>
            <div className="club__how-desc">
              Pida al cajero acreditarle puntos cada vez que paga su consumo en la barra. Bebida, comida, todo suma.
            </div>
            <div className="club__how-pts">+50 por cada $1.000</div>
          </div>
          <div className="club__how-card">
            <div className="club__how-icon">III</div>
            <div className="club__how-title">En su cumpleaños</div>
            <div className="club__how-desc">
              El mes de su cumpleaños recibe puntos automáticos de cortesía. Nuestro modo de saludar.
            </div>
            <div className="club__how-pts">+500 puntos</div>
          </div>
        </div>
      </section>

      {/* ───────── Movimientos recientes ───────── */}
      {transactions.length > 0 && (
        <section className="club__block">
          <div className="club__block-head">
            <div className="club__block-eye">Su historial</div>
            <h2 className="club__block-title">Movimientos <em>recientes</em></h2>
          </div>
          <div className="club__tx-list">
            {transactions.slice(0, 12).map(t => {
              const meta = txMeta(t.kind)
              const isRedeem = t.points < 0
              return (
                <div key={t.id} className={`club__tx ${isRedeem ? 'club__tx--redeem' : ''}`}>
                  <div className="club__tx-icon">{meta.icon}</div>
                  <div>
                    <div className="club__tx-label">{t.reason || meta.label}</div>
                    <div className="club__tx-sub">{formatTxDate(t.created_at)}</div>
                  </div>
                  <div className="club__tx-pts">
                    {t.points >= 0 ? '+' : ''}{t.points.toLocaleString('es-AR')}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ───────── Empty onboarding ───────── */}
      {transactions.length === 0 && (
        <section className="club__block">
          <div className="club__empty">
            <div className="club__empty-h">¡Bienvenido al Sala Crespo Club!</div>
            <p>
              Todavía no tiene movimientos. Acérquese a la sala — cada visita suma 50 pts,
              y por cada $1.000 que consuma en la barra suma 50 pts más.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
