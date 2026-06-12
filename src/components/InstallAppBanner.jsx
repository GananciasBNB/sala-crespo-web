import { useEffect, useState } from 'react'
import {
  isIOS, isStandalone, isPushSupported, getPermission,
  getCurrentSubscription, subscribeToPush, needsIOSInstall,
} from '../lib/push'
import './InstallAppBanner.css'

// Banner global "Sumate" — aparece en TODAS las páginas para captar suscriptores
// a notificaciones (promos exclusivas + novedades del Mundial). Device-aware:
//   - Android / desktop / iPhone-instalado: un toque activa las notificaciones
//     directo (anónimo si no está logueado, asociado si lo está).
//   - iPhone sin la PWA instalada: Apple exige instalar primero → modal con
//     instrucciones de "Agregar a inicio".
//
// Se oculta solo cuando ya está suscrito o si lo cierra (reaparece a la semana).

const DISMISS_KEY = 'sub_prompt_dismissed_at'
const DISMISS_DAYS = 7

function readToken() {
  try { return JSON.parse(localStorage.getItem('prode_player'))?.token || null } catch { return null }
}

export default function InstallAppBanner() {
  const [state, setState] = useState('hidden') // hidden | invite | busy | success
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null) // beforeinstallprompt (Android)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!isPushSupported() && !isIOS()) { setState('hidden'); return }

      // ¿Ya está suscrito? → no mostramos nada
      if (isPushSupported() && getPermission() === 'granted') {
        const sub = await getCurrentSubscription()
        if (!cancelled && sub) { setState('hidden'); return }
      }

      // Dismiss reciente
      try {
        const v = localStorage.getItem(DISMISS_KEY)
        if (v && (Date.now() - parseInt(v, 10)) / 864e5 < DISMISS_DAYS) { setState('hidden'); return }
      } catch {}

      if (!cancelled) setState('invite')
    }
    check()

    // Capturar el evento de instalación (Android / desktop Chrome) para poder
    // ofrecer instalar la PWA además de las notificaciones.
    function onBeforeInstall(e) { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => { cancelled = true; window.removeEventListener('beforeinstallprompt', onBeforeInstall) }
  }, [])

  async function handleActivate() {
    setErr('')
    // iPhone sin la PWA instalada → no se puede activar en Safari, mostrar pasos
    if (needsIOSInstall()) { setShowIOSModal(true); return }
    if (!isPushSupported()) { setShowIOSModal(true); return }

    setState('busy')
    try {
      // En Android/desktop, si se puede instalar la PWA, la instalamos primero
      // (acceso directo desde el inicio) y después activamos notificaciones.
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt()
          await deferredPrompt.userChoice
        } catch {}
        setDeferredPrompt(null)
      }
      await subscribeToPush(readToken()) // token opcional → anónimo si no hay
      setState('success')
      setTimeout(() => setState('hidden'), 4000)
    } catch (e) {
      setErr(e?.message || 'No se pudo activar')
      setState('invite')
    }
  }

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    setState('hidden')
    setShowIOSModal(false)
  }

  if (state === 'hidden') return null

  // iPhone sin la app instalada: copy específico que anticipa "instalar"
  const iphone = needsIOSInstall()

  if (state === 'success') {
    return (
      <div className="sub-banner sub-banner--success">
        <div className="sub-banner__icon">✅</div>
        <div className="sub-banner__text">
          <strong>¡Listo! Notificaciones activadas</strong>
          <span>Vas a recibir promos exclusivas y novedades del Mundial.</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="sub-banner">
        <div className="sub-banner__icon">{iphone ? '📲' : '🔔'}</div>
        <div className="sub-banner__text">
          {iphone ? (
            <>
              <strong>Instalá Sala Crespo en tu iPhone</strong>
              <span>Agregala a tu inicio y recibí promos exclusivas, shows y resultados. Te enseñamos cómo.</span>
            </>
          ) : (
            <>
              <strong>Sumate y no te pierdas nada</strong>
              <span>Instalá la app y activá notificaciones: promos exclusivas, shows y resultados del Mundial.</span>
            </>
          )}
          {err && <span className="sub-banner__err">{err}</span>}
        </div>
        <button className="sub-banner__cta" onClick={handleActivate} disabled={state === 'busy'}>
          {state === 'busy' ? 'Activando…' : iphone ? 'Cómo instalar →' : (deferredPrompt ? 'Sumarme →' : 'Activar 🔔')}
        </button>
        <button className="sub-banner__close" onClick={dismiss} aria-label="Cerrar">×</button>
      </div>

      {showIOSModal && (
        <div className="install-modal install-modal--top" onClick={() => setShowIOSModal(false)}>
          <div className="install-modal__card" onClick={e => e.stopPropagation()}>
            <button className="install-modal__close" onClick={() => setShowIOSModal(false)} aria-label="Cerrar">×</button>
            <div className="install-modal__icon">📲</div>
            <h3 className="install-modal__title">Instalá Sala Crespo en tu iPhone</h3>
            <p className="install-modal__sub">Seguí los pasos sin cerrar esta ventana 👇</p>

            <ol className="install-modal__steps">
              <li>
                <span className="install-modal__num">1</span>
                <div className="install-modal__step-body">
                  <span>Tocá los <strong>3 puntos</strong> abajo a la derecha de Safari</span>
                  <div className="install-modal__demo">
                    <div className="install-modal__share-btn install-modal__share-btn--dots">
                      <span /><span /><span />
                    </div>
                    <span className="install-modal__demo-label">abajo a la derecha ↘</span>
                  </div>
                </div>
              </li>
              <li>
                <span className="install-modal__num">2</span>
                <div className="install-modal__step-body">
                  <span>En el menú, tocá <strong>Compartir</strong></span>
                  <div className="install-modal__menu-row">
                    <span className="install-modal__menu-text">Compartir</span>
                    <div className="install-modal__menu-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                        <path d="M12 16V4" /><path d="M8 8l4-4 4 4" />
                        <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </li>
              <li>
                <span className="install-modal__num">3</span>
                <div className="install-modal__step-body">
                  <span>Bajá, tocá <strong>«Ver más»</strong> si hace falta, y elegí <strong>«Agregar a inicio»</strong></span>
                  <div className="install-modal__menu-row">
                    <span className="install-modal__menu-text">Agregar a inicio</span>
                    <div className="install-modal__menu-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#E8DFCA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                        <rect x="3" y="3" width="18" height="18" rx="4" />
                        <path d="M12 8v8M8 12h8" />
                      </svg>
                    </div>
                  </div>
                </div>
              </li>
              <li>
                <span className="install-modal__num">4</span>
                <div className="install-modal__step-body">
                  <span>Abrí <strong>Sala Crespo</strong> desde el ícono nuevo y activá las notificaciones 🔔</span>
                </div>
              </li>
            </ol>

            <button className="install-modal__ok" onClick={() => setShowIOSModal(false)}>Entendido</button>
          </div>
        </div>
      )}
    </>
  )
}
