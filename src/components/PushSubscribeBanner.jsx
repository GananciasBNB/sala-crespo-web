import { useEffect, useState } from 'react'
import {
  isPushSupported, getPermission, getCurrentSubscription,
  subscribeToPush, unsubscribeFromPush, needsIOSInstall,
} from '../lib/push'
import './PushSubscribeBanner.css'

// Banner que aparece en el tab Inicio del Prode invitando a activar las
// notificaciones push. Se oculta si:
//   - El browser no soporta push (Safari < 16.4, navegadores muy viejos)
//   - El usuario ya está suscrito (en este device)
//   - El usuario lo dismisseó en esta sesión (localStorage flag)
//   - El permiso está 'denied' (después de un primer rechazo)
//
// Si el permiso está 'denied' mostramos un sub-mensaje con instrucciones
// rápidas para reactivar desde el browser.

const DISMISS_KEY = 'push_banner_dismissed_at'
const DISMISS_HOURS = 24 * 7  // re-aparece después de 1 semana de dismiss

export default function PushSubscribeBanner({ player }) {
  const [state, setState] = useState('loading')  // loading | hidden | invite | denied | subscribed
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!player?.token) { setState('hidden'); return }

      // iPhone sin la PWA instalada: push no funciona en Safari, mostramos
      // instrucciones de "Agregar a inicio" en vez de ocultar el banner.
      if (needsIOSInstall()) { setState('ios-install'); return }

      if (!isPushSupported()) { setState('hidden'); return }

      const perm = getPermission()

      // Si ya está suscrito, SIEMPRE mostramos el estado verde "activadas"
      // (informativo, con botón Desactivar). No lo ocultamos por dismiss —
      // el usuario quiere ver que tiene las notificaciones encendidas.
      const sub = await getCurrentSubscription()
      if (cancelled) return
      if (sub && perm === 'granted') { setState('subscribed'); return }

      // No suscrito + permiso bloqueado → instrucciones para desbloquear
      if (perm === 'denied') { setState('denied'); return }

      // No suscrito y no bloqueado: invitación a activar. Acá SÍ respetamos
      // el dismiss (si lo cerró, no insistimos por una semana).
      try {
        const v = localStorage.getItem(DISMISS_KEY)
        if (v) {
          const ageH = (Date.now() - parseInt(v, 10)) / 36e5
          if (ageH < DISMISS_HOURS) { setState('hidden'); return }
        }
      } catch {}

      setState('invite')
    }
    check()
    return () => { cancelled = true }
  }, [player?.token])

  async function handleSubscribe() {
    if (busy) return
    setErr('')
    setBusy(true)
    try {
      await subscribeToPush(player.token)
      setState('subscribed')
    } catch (e) {
      setErr(e?.message || 'No se pudo activar.')
      if (getPermission() === 'denied') setState('denied')
    } finally {
      setBusy(false)
    }
  }

  async function handleUnsubscribe() {
    if (busy) return
    setBusy(true)
    try {
      await unsubscribeFromPush(player.token)
      setState('invite')
    } finally {
      setBusy(false)
    }
  }

  function handleDismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    setState('hidden')
  }

  if (state === 'loading' || state === 'hidden') return null

  if (state === 'ios-install') {
    return (
      <div className="push-banner push-banner--ios">
        <div className="push-banner__icon">📲</div>
        <div className="push-banner__body">
          <div className="push-banner__title">Activá las notificaciones en tu iPhone</div>
          <div className="push-banner__sub">
            Para recibir avisos de los partidos en iPhone, agregá Sala Crespo a tu pantalla de inicio:
          </div>
          <ol className="push-banner__ios-steps">
            <li>Tocá el botón <strong>Compartir</strong> <span className="push-banner__ios-share">􀈂</span> (abajo, en el centro)</li>
            <li>Bajá y elegí <strong>«Agregar a inicio»</strong></li>
            <li>Abrí Sala Crespo desde el ícono nuevo</li>
            <li>Volvé acá y activá las notificaciones</li>
          </ol>
        </div>
        <button className="push-banner__dismiss" onClick={handleDismiss} aria-label="Ahora no">×</button>
      </div>
    )
  }

  if (state === 'subscribed') {
    return (
      <div className="push-banner push-banner--ok">
        <div className="push-banner__icon">🔔</div>
        <div className="push-banner__body">
          <div className="push-banner__title">Notificaciones activadas</div>
          <div className="push-banner__sub">Te vamos a avisar 30 min antes de cada partido y de las promos especiales.</div>
        </div>
        <button className="push-banner__off" onClick={handleUnsubscribe} disabled={busy}>
          {busy ? '…' : 'Desactivar'}
        </button>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="push-banner push-banner--denied">
        <div className="push-banner__icon">🔕</div>
        <div className="push-banner__body">
          <div className="push-banner__title">Notificaciones bloqueadas</div>
          <div className="push-banner__sub">
            Tocá el candado en la barra del navegador → permisos de notificaciones → permitir, y recargá.
          </div>
        </div>
        <button className="push-banner__dismiss" onClick={handleDismiss} aria-label="Ocultar">×</button>
      </div>
    )
  }

  // state === 'invite'
  return (
    <div className="push-banner">
      <div className="push-banner__icon">🔔</div>
      <div className="push-banner__body">
        <div className="push-banner__title">Activá las notificaciones</div>
        <div className="push-banner__sub">
          Te avisamos 30 min antes de cada partido para que no te pierdas de cargar tu pronóstico.
          También recibís promos especiales de la Sala.
        </div>
        {err && <div className="push-banner__err">{err}</div>}
      </div>
      <div className="push-banner__actions">
        <button className="push-banner__cta" onClick={handleSubscribe} disabled={busy}>
          {busy ? 'Activando…' : 'Activar →'}
        </button>
        <button className="push-banner__dismiss" onClick={handleDismiss} aria-label="Ahora no">×</button>
      </div>
    </div>
  )
}
