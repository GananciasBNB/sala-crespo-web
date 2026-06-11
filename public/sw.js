// Service Worker para PWA + Push Notifications
// Sala Crespo Prode Mundial 2026

const SW_VERSION = 'v1.0.0-2026-06-11';

self.addEventListener('install', (event) => {
  // Activación inmediata sin esperar a que se cierren las pestañas viejas
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Tomar control de todas las pestañas abiertas inmediatamente
  event.waitUntil(self.clients.claim());
});

// ─── Push event ─────────────────────────────────────────────────────────────
// El backend envía un payload JSON con: { title, body, url?, tag?, icon?, badge? }
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // Si el payload no es JSON, lo tratamos como texto
    data = { title: 'Sala Crespo', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Sala Crespo';
  const options = {
    body: data.body || '',
    icon: data.icon || '/android-chrome-192x192.png',
    badge: data.badge || '/favicon-32x32.png',
    tag: data.tag || 'sala-crespo-' + Date.now(),
    renotify: true,
    data: { url: data.url || '/' },
    // Vibración + sonido nativos (Android)
    vibrate: [120, 60, 120],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Click en notificación ──────────────────────────────────────────────────
// Si hay una pestaña abierta, la enfocamos; si no, abrimos una nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si hay una pestaña del sitio abierta, la enfocamos y la navegamos
      for (const client of windowClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            client.focus();
            if ('navigate' in client) client.navigate(targetUrl).catch(() => {});
            return;
          }
        } catch {}
      }
      // Si no hay ninguna, abrimos nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Push subscription change (auto-renewal de credenciales) ────────────────
// El browser puede rotar las credenciales de push periódicamente. Cuando lo
// hace, dispara este evento — re-suscribimos al server con las nuevas keys.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: event.oldSubscription?.options?.applicationServerKey })
      .then((newSub) => {
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // No tenemos token JWT acá, el server lo va a rechazar — el usuario
          // tiene que re-suscribirse desde la UI. Por ahora solo loggeamos.
          body: JSON.stringify(newSub),
        }).catch(() => {});
      })
  );
});
