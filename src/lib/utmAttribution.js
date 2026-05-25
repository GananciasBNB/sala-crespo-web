// Captures UTM params + ad click IDs from the landing URL and persists them to
// localStorage so that when the user finally registers (which might be minutes
// or days later, possibly after a refresh) we still know what campaign brought
// them in. Strategy: "last paid touch" — every time a request lands with UTMs
// present, we overwrite the stored attribution, so the most recent ad gets
// credit. Pure UTM-less navigation does NOT clear the stored attribution.
//
// Storage key has a version suffix so we can evolve the shape later without
// poisoning old visitors.

const STORAGE_KEY = 'attribution_v1'
const TTL_DAYS = 90

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
const CLICK_ID_KEYS = ['fbclid', 'gclid']

function safeGetStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Reads UTMs + click IDs from the current URL. If any are present, persists
 * them to localStorage (overwriting previous attribution). Call this once at
 * app boot — it's a no-op when no UTMs are in the URL.
 */
export function captureUtmsFromUrl() {
  if (typeof window === 'undefined') return
  let params
  try {
    params = new URLSearchParams(window.location.search)
  } catch {
    return
  }

  const captured = {}
  let hasAny = false
  for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) {
    const value = params.get(key)
    if (value) {
      captured[key] = value.slice(0, 200)
      hasAny = true
    }
  }
  if (!hasAny) return

  const storage = safeGetStorage()
  if (!storage) return

  const payload = {
    ...captured,
    landing_path: window.location.pathname || '/',
    referrer: (document.referrer || '').slice(0, 200) || null,
    captured_at: Date.now(),
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // localStorage full / disabled — best-effort only.
  }
}

/**
 * Returns the stored attribution payload, or null if none/expired.
 */
export function getStoredAttribution() {
  const storage = safeGetStorage()
  if (!storage) return null
  let raw
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null

  const ageMs = Date.now() - (parsed.captured_at || 0)
  const maxAgeMs = TTL_DAYS * 24 * 60 * 60 * 1000
  if (ageMs > maxAgeMs) {
    try { storage.removeItem(STORAGE_KEY) } catch {}
    return null
  }
  return parsed
}

/**
 * Returns a flat object of the attribution data, suitable to spread into a
 * Meta Pixel custom params object or a GA event. Returns {} if no attribution.
 */
export function getAttributionParams() {
  const stored = getStoredAttribution()
  if (!stored) return {}
  const out = {}
  for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) {
    if (stored[key]) out[key] = stored[key]
  }
  if (stored.landing_path) out.landing_path = stored.landing_path
  return out
}
