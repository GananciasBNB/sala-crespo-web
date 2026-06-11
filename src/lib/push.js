// Helper para suscribirse a push notifications desde el navegador.
// Encapsula: register SW + permission flow + PushManager subscribe + POST al backend.

const SW_PATH = '/sw.js'

// Convierte la VAPID public key (base64url) a Uint8Array, que es lo que pide
// el navegador. Sin esta conversión PushManager.subscribe falla con un error
// confuso "applicationServerKey is not a valid type".
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getPermission() {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

// Registra (o devuelve la existente) la registration del service worker.
export async function registerSW() {
  if (!isPushSupported()) throw new Error('Tu navegador no soporta notificaciones push.')
  const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
  // Esperamos a que esté activo antes de devolverlo
  if (reg.installing) await new Promise(resolve => {
    reg.installing.addEventListener('statechange', e => {
      if (e.target.state === 'activated') resolve()
    })
  })
  await navigator.serviceWorker.ready
  return reg
}

// Devuelve la subscription actual del navegador si existe (sin re-suscribir).
export async function getCurrentSubscription() {
  if (!isPushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return null
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

// Pide la VAPID public key al backend (alternativa: usar VITE_VAPID_PUBLIC_KEY).
async function fetchVapidPublicKey() {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (envKey) return envKey
  const r = await fetch('/api/push/public-key')
  if (!r.ok) throw new Error('No se pudo obtener la VAPID public key.')
  const j = await r.json()
  return j.publicKey
}

// Flujo completo: pedir permiso → registrar SW → suscribirse → enviar al backend.
// Retorna { ok: true, subscription } o tira error con mensaje legible.
export async function subscribeToPush(token) {
  if (!isPushSupported()) throw new Error('Tu navegador no soporta notificaciones.')
  if (!token) throw new Error('Tenés que estar logueado para activar notificaciones.')

  // 1. Permiso
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') {
    throw new Error(perm === 'denied'
      ? 'Bloqueaste las notificaciones. Activalas desde el candado/configuración del browser.'
      : 'Activación cancelada.')
  }

  // 2. SW
  const reg = await registerSW()

  // 3. VAPID + subscribe
  const publicKey = await fetchVapidPublicKey()
  const applicationServerKey = urlBase64ToUint8Array(publicKey)

  // Si ya hay una subscription, primero la cancelamos para regenerar las keys
  // (evita problemas si el browser rotó internamente).
  let subscription = await reg.pushManager.getSubscription()
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
  }

  // 4. POST al backend
  const subJson = subscription.toJSON()
  const r = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    throw new Error(j.error || 'No se pudo guardar la suscripción en el servidor.')
  }
  return { ok: true, subscription }
}

// Cancela la suscripción local y avisa al backend.
export async function unsubscribeFromPush(token) {
  if (!isPushSupported()) return { ok: true }
  const sub = await getCurrentSubscription()
  if (!sub) return { ok: true }
  try {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
  } catch {
    // Fallar el server-side no debe impedir cancelar local
  }
  await sub.unsubscribe().catch(() => {})
  return { ok: true }
}
