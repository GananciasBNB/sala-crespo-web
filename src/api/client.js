// Base URL: vacío en dev (el proxy de Vite redirige /api → :8080)
// En producción Vercel usa VITE_API_URL
const BASE = import.meta.env.VITE_API_URL || ''

async function api(endpoint, options = {}) {
  const { headers: extraHeaders, ...restOptions } = options
  const res = await fetch(BASE + endpoint, {
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    ...restOptions,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

// ─── Jugadores ────────────────────────────────────────────────────────────────
export const registerPlayer = (name, dni, tel, pin, mascota = 'toro', email = null) =>
  api('/api/register', { method: 'POST', body: JSON.stringify({ name, dni, tel, pin, mascota, email }) })

export const loginPlayer = (dni, pin) =>
  api('/api/login', { method: 'POST', body: JSON.stringify({ dni, pin }) })

export const forgotPin = (dni, email) =>
  api('/api/forgot-pin', { method: 'POST', body: JSON.stringify({ dni, email }) })

// ─── Partidos y pronósticos ───────────────────────────────────────────────────
export const getMatches = () => api('/api/matches')

export const getMyPredictions = (playerId, token) =>
  api(`/api/predictions/${playerId}`, { headers: authHeaders(token) })

export const savePrediction = (token, matchId, home, away) =>
  api('/api/predictions', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ matchId, home, away }),
  })

// Guarda múltiples pronósticos de una vez (un request por partido en paralelo)
export const savePredictionsBatch = (token, preds) =>
  Promise.all(
    preds.map(({ matchId, home, away }) =>
      api('/api/predictions', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ matchId, home, away }),
      })
    )
  )

// ─── Leaderboard y datos públicos ─────────────────────────────────────────────
export const getLeaderboard = (phase = 'all') => api(`/api/leaderboard?phase=${phase}`)
export const getEmployeesLeaderboard = (phase = 'all', token) =>
  api(`/api/leaderboard?phase=${phase}&audience=employees`, { headers: authHeaders(token) })
export const getRegistrationStatus = () => api('/api/registration-status')
export const getShows       = () => api('/api/shows')
export const getContent     = () => api('/api/content')

// ─── Admin: autenticación ─────────────────────────────────────────────────────
export const adminLogin  = (email, password) =>
  api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) })

export const adminVerify = (token) =>
  api('/api/admin/me', { headers: authHeaders(token) })

// ─── Admin: prode ─────────────────────────────────────────────────────────────
export const adminSetResult = (token, matchId, home, away) =>
  api('/api/admin/result', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ matchId, home, away }),
  })

export const adminDeleteResult = (token, matchId) =>
  api(`/api/admin/result/${matchId}`, { method: 'DELETE', headers: authHeaders(token) })

export const adminSetTeams = (token, matchId, homeName, homeFlag, awayName, awayFlag) =>
  api('/api/admin/teams', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ matchId, homeName, homeFlag, awayName, awayFlag }),
  })

export const adminSyncTeamsFromFixture = (token) =>
  api('/api/admin/teams/sync-from-fixture', {
    method: 'POST',
    headers: authHeaders(token),
  })

// ─── Premios ──────────────────────────────────────────────────────────────────
export const adminGetPrizes = (token, filters = {}) => {
  const qs = new URLSearchParams()
  if (filters.status) qs.set('status', filters.status)
  if (filters.phase)  qs.set('phase',  filters.phase)
  const suffix = qs.toString() ? `?${qs}` : ''
  return api(`/api/admin/prizes${suffix}`, { headers: authHeaders(token) })
}
export const adminGetPrizesSummary = (token) =>
  api('/api/admin/prizes/summary', { headers: authHeaders(token) })
export const adminGeneratePrizes = (token, phase) =>
  api(`/api/admin/prizes/generate/${phase}`, { method: 'POST', headers: authHeaders(token) })
export const adminRedeemPrize = (token, id, ticketCode, notes) =>
  api(`/api/admin/prizes/${id}/redeem`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ ticketCode, notes }),
  })
export const adminRevokePrize = (token, id) =>
  api(`/api/admin/prizes/${id}/revoke`, { method: 'POST', headers: authHeaders(token) })

// ─── Medallero / Achievements ─────────────────────────────────────────────────
export const getMyAchievements = (token) =>
  api('/api/me/achievements', { headers: authHeaders(token) })

export const dailyCheckin = (token) =>
  api('/api/me/checkin', { method: 'POST', headers: authHeaders(token) })

// ─── Profeta — elección del campeón pre-Mundial ──────────────────────────────
export const getChampionPick = (token) =>
  api('/api/me/champion-pick', { headers: authHeaders(token) })

export const setChampionPick = (token, teamCode, teamName) =>
  api('/api/me/champion-pick', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ teamCode, teamName }),
  })

export const adminGetPlayers = (token) =>
  api('/api/admin/players', { headers: authHeaders(token) })

export const adminDeletePlayer = (token, id) =>
  api(`/api/admin/player/${id}`, { method: 'DELETE', headers: authHeaders(token) })

export const adminEditPlayer = (token, id, data) =>
  api(`/api/admin/player/${id}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data) })

export const adminResetPin = (token, id) =>
  api(`/api/admin/player/${id}/reset-pin`, { method: 'POST', headers: authHeaders(token) })

export const adminInvitePlayer = (token, data) =>
  api('/api/admin/invite-player', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(data) })

// ─── Admin: shows ─────────────────────────────────────────────────────────────
export const adminCreateShow = (token, show) =>
  api('/api/admin/shows', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(show),
  })

export const adminUpdateShow = (token, id, show) =>
  api(`/api/admin/shows/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(show),
  })

export const adminDeleteShow = (token, id) =>
  api(`/api/admin/shows/${id}`, { method: 'DELETE', headers: authHeaders(token) })

// ─── Admin: contenido web ─────────────────────────────────────────────────────
export const adminUpdateContent = (token, section, key, value) =>
  api('/api/admin/content', {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ section, key, value }),
  })

// ─── Admin: imágenes ──────────────────────────────────────────────────────────
export const adminUploadImage = (token, imageBase64, folder) =>
  api('/api/admin/upload', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ imageBase64, folder }),
  })

// ─── Admin: gestión de admins ─────────────────────────────────────────────────
export const adminGetAdmins = (token) =>
  api('/api/admin/admins', { headers: authHeaders(token) })

export const adminCreateAdmin = (token, data) =>
  api('/api/admin/admins', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })

export const adminDeleteAdmin = (token, id) =>
  api(`/api/admin/admins/${id}`, { method: 'DELETE', headers: authHeaders(token) })
