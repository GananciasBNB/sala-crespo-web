// Meta Pixel event helpers. The base pixel + PageView are initialized from
// index.html so they fire as early as possible (before React mounts). These
// helpers just push additional events from inside the app.
//
// All functions are defensive: if `fbq` is missing (script blocked by adblocker,
// failed to load, dev environment without the script, etc.) they no-op silently.

import { getAttributionParams } from './utmAttribution'

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

// Also push the registration to GA4 (if loaded) so we get the conversion in
// both platforms with the same attribution payload. No-op if gtag isn't there.
function gaEvent(name, params) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  try {
    window.gtag('event', name, params || {})
  } catch (err) {
    console.warn('[ga4] event failed:', err?.message)
  }
}

/**
 * Fires when a user finishes signing up for the Prode. This is THE conversion
 * event for the registration funnel — Meta Ads campaigns should optimize for it.
 */
export function trackProdeRegistration({ playerId, source = 'web' } = {}) {
  const attribution = getAttributionParams()
  fbq('track', 'CompleteRegistration', {
    content_name: 'Prode Mundial 2026',
    status: true,
    ...(playerId ? { external_id: playerId } : {}),
    source,
    ...attribution,
  })
  gaEvent('sign_up', { method: source, ...attribution })
}

/**
 * Fires when we collect an email but the user hasn't completed registration
 * (typical in promo-mode where the promotora captures contact data first).
 */
export function trackLead({ source = 'promo' } = {}) {
  const attribution = getAttributionParams()
  fbq('track', 'Lead', {
    content_name: 'Email capture',
    source,
    ...attribution,
  })
  gaEvent('generate_lead', { method: source, ...attribution })
}

/**
 * Custom event: someone registered to the slots tournament. Useful for
 * tournament-specific campaigns ("inscribite al próximo torneo de slots").
 */
export function trackTournamentRegistration({ tournamentName, registrationNo } = {}) {
  const attribution = getAttributionParams()
  fbq('trackCustom', 'TournamentRegistration', {
    tournament_name: tournamentName || null,
    registration_no: registrationNo || null,
    ...attribution,
  })
  gaEvent('tournament_registration', {
    tournament_name: tournamentName || null,
    registration_no: registrationNo || null,
    ...attribution,
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

/**
 * Fires when an unregistered visitor lands on the Prode page. Required for
 * iOS 14+ Aggregated Event Measurement and gives Meta enough signal to build
 * lookalike / retargeting audiences of warm-but-not-converted traffic.
 */
export function trackViewContent({ contentName = 'Prode Mundial 2026', contentCategory = 'prode' } = {}) {
  fbq('track', 'ViewContent', {
    content_name: contentName,
    content_category: contentCategory,
  })
}
