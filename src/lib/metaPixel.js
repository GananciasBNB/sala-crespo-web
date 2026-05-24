// Meta Pixel event helpers. The base pixel + PageView are initialized from
// index.html so they fire as early as possible (before React mounts). These
// helpers just push additional events from inside the app.
//
// All functions are defensive: if `fbq` is missing (script blocked by adblocker,
// failed to load, dev environment without the script, etc.) they no-op silently.

function fbq(...args) {
  if (typeof window === 'undefined') return
  if (typeof window.fbq !== 'function') return
  try {
    window.fbq(...args)
  } catch (err) {
    // Best-effort; never break the app for tracking.
    console.warn('[meta-pixel] track failed:', err?.message)
  }
}

/**
 * Fires when a user finishes signing up for the Prode. This is THE conversion
 * event for the registration funnel — Meta Ads campaigns should optimize for it.
 */
export function trackProdeRegistration({ playerId, source = 'web' } = {}) {
  fbq('track', 'CompleteRegistration', {
    content_name: 'Prode Mundial 2026',
    status: true,
    ...(playerId ? { external_id: playerId } : {}),
    source,
  })
}

/**
 * Fires when we collect an email but the user hasn't completed registration
 * (typical in promo-mode where the promotora captures contact data first).
 */
export function trackLead({ source = 'promo' } = {}) {
  fbq('track', 'Lead', {
    content_name: 'Email capture',
    source,
  })
}

/**
 * Custom event: someone registered to the slots tournament. Useful for
 * tournament-specific campaigns ("inscribite al próximo torneo de slots").
 */
export function trackTournamentRegistration({ tournamentName, registrationNo } = {}) {
  fbq('trackCustom', 'TournamentRegistration', {
    tournament_name: tournamentName || null,
    registration_no: registrationNo || null,
  })
}

/**
 * Manual PageView — only call this when you specifically want to fire one
 * (the base PageView already fires automatically on every full page load).
 * Useful for SPA route changes if you want to differentiate sections.
 */
export function trackPageView(path) {
  fbq('track', 'PageView', path ? { page_path: path } : undefined)
}
