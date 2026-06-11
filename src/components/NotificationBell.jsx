import { useEffect, useState, useRef, useCallback } from 'react'
import { getMyNotifications, markNotificationsRead } from '../api/client'
import './NotificationBell.css'

// Campanita con centro de notificaciones in-app. Muestra el badge de no leídas
// y un panel desplegable con el historial. Pollea cada 60s para refrescar el
// contador (y al abrir/cerrar la pestaña).

const TYPE_ICON = {
  result: '🎯',
  aviso: '📣',
  recordatorio: '⏰',
  general: '🔔',
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'recién'
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `hace ${d} día${d > 1 ? 's' : ''}`
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export default function NotificationBell({ player }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)
  const btnRef = useRef(null)

  const load = useCallback(async () => {
    if (!player?.token) return
    try {
      const r = await getMyNotifications(player.token)
      setItems(r.notifications || [])
      setUnread(r.unread || 0)
    } catch {}
  }, [player?.token])

  // Carga inicial + polling cada 60s
  useEffect(() => {
    if (!player?.token) return
    load()
    const id = setInterval(load, 60000)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [player?.token, load])

  // Cerrar al click afuera
  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      setLoading(true)
      await load()
      setLoading(false)
      // Marcar leídas al abrir (con pequeño delay para que el usuario vea el resaltado)
      if (unread > 0) {
        setTimeout(async () => {
          try { await markNotificationsRead(player.token) } catch {}
          setUnread(0)
        }, 1200)
      }
    }
  }

  if (!player?.token) return null

  return (
    <div className="notif-bell">
      <button
        ref={btnRef}
        className={`notif-bell__btn ${open ? 'notif-bell__btn--open' : ''}`}
        onClick={toggle}
        aria-label="Notificaciones"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="notif-bell__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-bell__panel" ref={panelRef}>
          <div className="notif-bell__head">
            <span className="notif-bell__title">Notificaciones</span>
            {unread > 0 && <span className="notif-bell__count">{unread} sin leer</span>}
          </div>

          <div className="notif-bell__list">
            {loading && items.length === 0 ? (
              <div className="notif-bell__empty">Cargando…</div>
            ) : items.length === 0 ? (
              <div className="notif-bell__empty">
                <div className="notif-bell__empty-icon">🔔</div>
                Todavía no tenés notificaciones.<br />
                Te vamos a avisar de resultados, promos y partidos.
              </div>
            ) : (
              items.map(n => (
                <a
                  key={n.id}
                  href={n.url || '/prode'}
                  className={`notif-bell__item ${!n.read ? 'notif-bell__item--unread' : ''}`}
                >
                  <span className="notif-bell__item-icon">{TYPE_ICON[n.type] || '🔔'}</span>
                  <span className="notif-bell__item-body">
                    <span className="notif-bell__item-title">{n.title}</span>
                    {n.body && <span className="notif-bell__item-text">{n.body}</span>}
                    <span className="notif-bell__item-time">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.read && <span className="notif-bell__item-dot" />}
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
