import { useState, useEffect, useCallback } from 'react'
import './Navbar.css'

const NAV_LINKS = [
  { label: 'La Sala', href: '#sala' },
  { label: 'A&B', href: '#ayb' },
  { label: 'Shows', href: '#shows' },
  { label: 'Torneos', href: '#torneos' },
  { label: 'Prode Mundial', href: '/prode', highlight: true },
  { label: 'Ubicación', href: '#ubicacion' },
]

export default function Navbar({ onAdminUnlock }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [holdTimer, setHoldTimer] = useState(null)
  const [holdProgress, setHoldProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // "Puerta secreta": mantener presionado el logo 3s para acceder al admin
  const startHold = useCallback(() => {
    let progress = 0
    const interval = setInterval(() => {
      progress += 100 / 30  // 30 ticks × 100ms = 3s
      setHoldProgress(Math.min(progress, 100))
      if (progress >= 100) {
        clearInterval(interval)
        setHoldProgress(0)
        onAdminUnlock?.()
      }
    }, 100)
    setHoldTimer(interval)
  }, [onAdminUnlock])

  const cancelHold = useCallback(() => {
    if (holdTimer) { clearInterval(holdTimer); setHoldTimer(null) }
    setHoldProgress(0)
  }, [holdTimer])

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container navbar__inner">
        {/* Logo — touch/click: ir a inicio | hold 3s: admin */}
        <a
          href="#inicio"
          className="navbar__logo"
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          title="Sala de Juegos Crespo"
        >
          <span className="navbar__wordmark">Crespo</span>
          {holdProgress > 0 && (
            <div
              className="navbar__hold-ring"
              style={{ '--p': `${holdProgress}%` }}
            />
          )}
        </a>

        {/* Desktop links */}
        <ul className="navbar__links">
          {NAV_LINKS.map(link => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`navbar__link ${link.highlight ? 'navbar__link--gold' : ''}`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Mobile burger */}
        <button
          className={`navbar__burger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menú"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar__mobile">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className={`navbar__mobile-link ${link.highlight ? 'navbar__link--gold' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  )
}
