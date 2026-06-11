import { useEffect, useState } from 'react'
import { isIOS, isStandalone } from '../lib/push'
import './InstallAppBanner.css'

// Banner inferior global que invita a instalar la PWA. Aparece en TODAS las
// páginas mientras la app no esté instalada. Diferencia automática:
//   - Android / Chrome desktop: captura beforeinstallprompt → botón "Instalar"
//     que dispara el instalador nativo del navegador (un toque).
//   - iPhone / iPad: Apple no permite ese evento, mostramos botón "Cómo" que
//     abre un modal con instrucciones de "Compartir → Agregar a inicio".
//
// Dismissable: se guarda timestamp en localStorage y reaparece a la semana.
// Si la app ya está instalada (standalone), no muestra nada.

const DISMISS_KEY = 'install_banner_dismissed_at'
const DISMISS_DAYS = 7

export default function InstallAppBanner() {
  const [state, setState] = useState('hidden') // hidden | android | ios
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showIOSModal, setShowIOSModal] = useState(false)

  useEffect(() => {
    // Ya instalada → nada
    if (isStandalone()) return

    // Dismiss reciente → nada
    try {
      const v = localStorage.getItem(DISMISS_KEY)
      if (v && (Date.now() - parseInt(v, 10)) / 864e5 < DISMISS_DAYS) return
    } catch {}

    if (isIOS()) {
      setState('ios')
      return
    }

    // Android / desktop Chrome: esperar el evento de instalación
    function onBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
      setState('android')
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // Si se instala, ocultar
    function onInstalled() { setState('hidden') }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    try {
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setState('hidden')
    } catch {}
    setDeferredPrompt(null)
  }

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    setState('hidden')
    setShowIOSModal(false)
  }

  if (state === 'hidden') return null

  return (
    <>
      <div className="install-banner">
        <div className="install-banner__icon">📲</div>
        <div className="install-banner__text">
          <strong>Instalá Sala Crespo en tu celular</strong>
          <span>Notificaciones de partidos, promos y shows. Acceso directo desde tu pantalla.</span>
        </div>
        {state === 'android' ? (
          <button className="install-banner__cta" onClick={handleAndroidInstall}>Instalar</button>
        ) : (
          <button className="install-banner__cta" onClick={() => setShowIOSModal(true)}>Cómo</button>
        )}
        <button className="install-banner__close" onClick={dismiss} aria-label="Cerrar">×</button>
      </div>

      {showIOSModal && (
        <div className="install-modal" onClick={() => setShowIOSModal(false)}>
          <div className="install-modal__card" onClick={e => e.stopPropagation()}>
            <button className="install-modal__close" onClick={() => setShowIOSModal(false)} aria-label="Cerrar">×</button>
            <div className="install-modal__icon">📲</div>
            <h3 className="install-modal__title">Instalá la app en tu iPhone</h3>
            <p className="install-modal__sub">Es rápido y te permite recibir notificaciones:</p>
            <ol className="install-modal__steps">
              <li>
                <span className="install-modal__num">1</span>
                <span>Tocá el botón <strong>Compartir</strong> <span className="install-modal__share">􀈂</span> (abajo, en el centro de Safari)</span>
              </li>
              <li>
                <span className="install-modal__num">2</span>
                <span>Bajá y elegí <strong>«Agregar a inicio»</strong></span>
              </li>
              <li>
                <span className="install-modal__num">3</span>
                <span>Abrí <strong>Sala Crespo</strong> desde el ícono nuevo</span>
              </li>
              <li>
                <span className="install-modal__num">4</span>
                <span>Activá las notificaciones cuando te lo pida 🔔</span>
              </li>
            </ol>
            <button className="install-modal__ok" onClick={() => setShowIOSModal(false)}>Entendido</button>
          </div>
        </div>
      )}
    </>
  )
}
