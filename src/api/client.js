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
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`)
    err.status = res.status
    err.body = data
    throw err
  }
  return data
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

// ─── Jugadores ────────────────────────────────────────────────────────────────
export const registerPlayer = (name, dni, tel, pin, mascota = 'toro', email = null, staffSignupCode = null) =>
  api('/api/register', { method: 'POST', body: JSON.stringify({ name, dni, tel, pin, mascota, email, staffSignupCode }) })

export const loginPlayer = (dni, pin) =>
  api('/api/login', { method: 'POST', body: JSON.stringify({ dni, pin }) })

export const forgotPin = (dni, email) =>
  api('/api/forgot-pin', { method: 'POST', body: JSON.stringify({ dni, email }) })

// ─── Partidos y pronósticos ───────────────────────────────────────────────────
export const getMatches = () => api('/api/matches')

// Resumen de votos de los próximos partidos — feed para VozDelBarrio en la landing
export const getUpcomingVote = (limit = 4) => api(`/api/prode/upcoming-vote?limit=${limit}`)

// Stats por partido — totales, votos, cuántos acertaron exacto/ganador si hay resultado
export const getMatchStats = (matchId) => api(`/api/prode/match/${matchId}/stats`)

// Marcador en vivo de los partidos del Mundial que ESPN reporta como in_progress.
// Cache server-side de 30s — múltiples polls del cliente NO spammean ESPN.
export const getLiveMatches = () => api('/api/prode/live')

// ─── Notificaciones in-app (campanita) ────────────────────────────────────────
export const getMyNotifications = (token) =>
  api('/api/me/notifications', { headers: authHeaders(token) })
export const markNotificationsRead = (token) =>
  api('/api/me/notifications/read', { method: 'POST', headers: authHeaders(token) })

// ─── Push notifications admin ────────────────────────────────────────────────
export const adminPushStats = (token) =>
  api('/api/admin/push/stats', { headers: authHeaders(token) })
export const adminPushBroadcast = (token, { title, body, url }) =>
  api('/api/admin/push/broadcast', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title, body, url }),
  })

// Leaderboard público — feed para Top10Prode en la landing
export const getLeaderboardPublic = () => api('/api/leaderboard?phase=all&audience=public')

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

// Medallas pendientes de mostrar (pop-up al abrir) + marcarlas vistas
export const getUnseenAchievements = (token) =>
  api('/api/me/achievements/unseen', { headers: authHeaders(token) })
export const markAchievementsSeen = (token, slugs) =>
  api('/api/me/achievements/seen', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ slugs }) })

// ─── Portal de staff — sugerencias ────────────────────────────────────────────
export const submitStaffSuggestion = (name, email, text, kind = 'otro', attachments = []) =>
  api('/api/staff/suggestion', {
    method: 'POST',
    body: JSON.stringify({ name, email, text, kind, attachments }),
  })

// ─── Contacto público (dudas / sugerencias / reclamos) ───────────────────────
export const submitContact = (name, email, kind, text) =>
  api('/api/contact', {
    method: 'POST',
    body: JSON.stringify({ name, email, kind, text }),
  })

// ─── Profeta — elección del campeón pre-Mundial ──────────────────────────────
export const getChampionPick = (token) =>
  api('/api/me/champion-pick', { headers: authHeaders(token) })

export const setChampionPick = (token, teamCode, teamName) =>
  api('/api/me/champion-pick', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ teamCode, teamName }),
  })

// ─── Mini-ligas privadas ─────────────────────────────────────────────────────
export const getMyLeagues = (token) =>
  api('/api/me/leagues', { headers: authHeaders(token) })

export const createLeague = (token, payload) =>
  api('/api/leagues', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })

export const uploadLeagueImage = (token, imageBase64) =>
  api('/api/leagues/upload-image', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ imageBase64 }),
  })

export const joinLeague = (token, code) =>
  api('/api/leagues/join', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ code }),
  })

export const getLeagueLeaderboard = (token, code) =>
  api(`/api/leagues/${encodeURIComponent(code)}/leaderboard`, { headers: authHeaders(token) })

export const leaveLeague = (token, code) =>
  api(`/api/leagues/${encodeURIComponent(code)}/leave`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })

export const deleteLeague = (token, code) =>
  api(`/api/leagues/${encodeURIComponent(code)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })

export const updateLeagueSettings = (token, code, settings) =>
  api(`/api/leagues/${encodeURIComponent(code)}/settings`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(settings),
  })

export const getLeaguePending = (token, code) =>
  api(`/api/leagues/${encodeURIComponent(code)}/pending`, { headers: authHeaders(token) })

export const approveLeagueMember = (token, code, playerId) =>
  api(`/api/leagues/${encodeURIComponent(code)}/pending/${encodeURIComponent(playerId)}/approve`, {
    method: 'POST',
    headers: authHeaders(token),
  })

export const rejectLeagueMember = (token, code, playerId) =>
  api(`/api/leagues/${encodeURIComponent(code)}/pending/${encodeURIComponent(playerId)}/reject`, {
    method: 'POST',
    headers: authHeaders(token),
  })

export const removeLeagueMember = (token, code, playerId) =>
  api(`/api/leagues/${encodeURIComponent(code)}/members/${encodeURIComponent(playerId)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })

export const adminGetPlayers = (token, include = 'prode') =>
  api(`/api/admin/players?include=${encodeURIComponent(include)}`, { headers: authHeaders(token) })

export const adminSearchPlayers = (token, q) =>
  api(`/api/admin/players/search?q=${encodeURIComponent(q)}`, { headers: authHeaders(token) })

export const getPromoRegistrationsToday = () =>
  api('/api/promo/registrations-today')

// ─── Torneo de Slots ──────────────────────────────────────────────────────────
export const getActiveTournament = () =>
  api('/api/tournament/active')

export const tournamentLookupDni = (dni) =>
  api('/api/tournament/lookup-dni', { method: 'POST', body: JSON.stringify({ dni }) })

export const tournamentRegister = (data) =>
  api('/api/tournament/register', { method: 'POST', body: JSON.stringify(data) })

// Admin
export const adminGetTournaments = (token) =>
  api('/api/admin/tournaments', { headers: authHeaders(token) })

export const adminCreateTournament = (token, data) =>
  api('/api/admin/tournaments', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(data) })

export const adminUpdateTournament = (token, id, data) =>
  api(`/api/admin/tournaments/${id}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data) })

export const adminDeleteTournament = (token, id) =>
  api(`/api/admin/tournaments/${id}`, { method: 'DELETE', headers: authHeaders(token) })

export const adminGetTournamentRegistrations = (token, id) =>
  api(`/api/admin/tournaments/${id}/registrations`, { headers: authHeaders(token) })

export const adminSetRegistrationAttended = (token, regId, attended) =>
  api(`/api/admin/tournaments/registration/${regId}/attended`, {
    method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ attended })
  })

export const adminSetRegistrationPosition = (token, regId, position) =>
  api(`/api/admin/tournaments/registration/${regId}/position`, {
    method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ position })
  })

export const adminDeleteTournamentRegistration = (token, regId) =>
  api(`/api/admin/tournaments/registration/${regId}`, {
    method: 'DELETE', headers: authHeaders(token)
  })

export const adminGetLeagues = (token) =>
  api('/api/admin/leagues', { headers: authHeaders(token) })

export const adminGetLeagueDetail = (token, id) =>
  api(`/api/admin/leagues/${id}`, { headers: authHeaders(token) })

export const adminDeleteLeague = (token, id) =>
  api(`/api/admin/leagues/${id}`, { method: 'DELETE', headers: authHeaders(token) })

// ESPN test matches (sandbox del sync automático)
// Analytics snapshots — medir efectividad de campañas
export const adminSaveAnalyticsSnapshot = (token, label, opts = {}) =>
  api('/api/admin/analytics/snapshots', {
    method: 'POST', headers: authHeaders(token),
    body: JSON.stringify({ label, range: opts.range, from: opts.from, to: opts.to }),
  })

export const adminListAnalyticsSnapshots = (token) =>
  api('/api/admin/analytics/snapshots', { headers: authHeaders(token) })

export const adminDeleteAnalyticsSnapshot = (token, id) =>
  api(`/api/admin/analytics/snapshots/${id}`, { method: 'DELETE', headers: authHeaders(token) })

export const adminCompareAnalyticsSnapshots = (token, idA, idB) =>
  api(`/api/admin/analytics/snapshots/compare?a=${idA}&b=${idB}`, { headers: authHeaders(token) })

export const adminEspnTestDiscover = (token, leagueSlug, dateYYYYMMDD) =>
  api(`/api/admin/espn-test/discover?league=${encodeURIComponent(leagueSlug)}&date=${encodeURIComponent(dateYYYYMMDD)}`,
    { headers: authHeaders(token) })

export const adminEspnTestAdd = (token, leagueSlug, events) =>
  api('/api/admin/espn-test/add', {
    method: 'POST', headers: authHeaders(token),
    body: JSON.stringify({ leagueSlug, events }),
  })

export const adminEspnTestList = (token) =>
  api('/api/admin/espn-test', { headers: authHeaders(token) })

export const adminEspnTestSync = (token) =>
  api('/api/admin/espn-test/sync', { method: 'POST', headers: authHeaders(token) })

export const adminEspnTestDelete = (token, id) =>
  api(`/api/admin/espn-test/${id}`, { method: 'DELETE', headers: authHeaders(token) })

export const adminDeletePlayer = (token, id) =>
  api(`/api/admin/player/${id}`, { method: 'DELETE', headers: authHeaders(token) })

export const adminEditPlayer = (token, id, data) =>
  api(`/api/admin/player/${id}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data) })

export const adminTogglePlayerEmployee = (token, id, isEmployee) =>
  api(`/api/admin/player/${id}/employee`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ isEmployee }),
  })

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

// ─── Email blast (admin) ──────────────────────────────────────────────────────
export const adminEmailBlast = (token, body) =>
  api('/api/admin/email/blast', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })
export const adminSegmentCounts = (token) =>
  api('/api/admin/segments/counts', { headers: authHeaders(token) })

export const adminEmailPreview = (token, body) =>
  api('/api/admin/email/preview', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })

export const adminEmailDefaults = (token) =>
  api('/api/admin/email/defaults', { headers: authHeaders(token) })

export const adminEmailCampaigns = (token, limit = 50) =>
  api(`/api/admin/email/campaigns?limit=${limit}`, { headers: authHeaders(token) })

export const adminEmailCampaignDetail = (token, id) =>
  api(`/api/admin/email/campaigns/${id}`, { headers: authHeaders(token) })

export const adminPlayerEmailHistory = (token, playerId) =>
  api(`/api/admin/email/player-history/${encodeURIComponent(playerId)}`, { headers: authHeaders(token) })

// ─── Promo Tickets (campañas) ─────────────────────────────────────────────────
export const adminPromoCampaigns = (token) =>
  api('/api/admin/promo-campaigns', { headers: authHeaders(token) })

export const adminCreatePromoCampaign = (token, body) =>
  api('/api/admin/promo-campaigns', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })

export const adminPromoCampaignBlast = (token, id, body) =>
  api(`/api/admin/promo-campaigns/${id}/blast`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })

export const adminPromoPreview = (token, body) =>
  api('/api/admin/promo-campaigns/preview', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })

export const adminPromoCandidates = (token, scope = 'all') =>
  api(`/api/admin/promo-campaigns/candidates?scope=${scope}`, { headers: authHeaders(token) })

export const adminMarketingOptouts = (token) =>
  api('/api/admin/marketing-optouts', { headers: authHeaders(token) })

export const adminReinstateMarketing = (token, playerId) =>
  api(`/api/admin/players/${encodeURIComponent(playerId)}/reinstate-marketing`, { method: 'POST', headers: authHeaders(token) })

// ─── Sala Crespo Club (loyalty) ─────────────────────────────────────────────
// Cliente
export const getLoyaltyCatalog = () =>
  api('/api/loyalty/catalog')

export const getLoyaltyMe = (token) =>
  api('/api/loyalty/me', { headers: authHeaders(token) })

export const redeemLoyaltyReward = (token, rewardId) =>
  api('/api/loyalty/redeem', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ rewardId }) })

// Admin
export const adminLoyaltyRewards = (token) =>
  api('/api/admin/loyalty/rewards', { headers: authHeaders(token) })
export const adminLoyaltyCreateReward = (token, body) =>
  api('/api/admin/loyalty/rewards', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })
export const adminLoyaltyUpdateReward = (token, id, body) =>
  api(`/api/admin/loyalty/rewards/${id}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) })
export const adminLoyaltyDeleteReward = (token, id) =>
  api(`/api/admin/loyalty/rewards/${id}`, { method: 'DELETE', headers: authHeaders(token) })
export const adminLoyaltyAccount = (token, dni) =>
  api(`/api/admin/loyalty/account/${encodeURIComponent(dni)}`, { headers: authHeaders(token) })
export const adminLoyaltyAdjust = (token, body) =>
  api('/api/admin/loyalty/adjust', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })
export const adminLoyaltyCheckin = (token, dni) =>
  api('/api/admin/loyalty/checkin', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ dni }) })
export const adminLoyaltyAyb = (token, body) =>
  api('/api/admin/loyalty/ayb', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })
export const adminLoyaltyPending = (token, dni) =>
  api(`/api/admin/loyalty/pending/${encodeURIComponent(dni)}`, { headers: authHeaders(token) })
export const adminLoyaltyDeliver = (token, redemptionId, operator) =>
  api('/api/admin/loyalty/deliver', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ redemptionId, operator }) })
export const adminLoyaltyCancel = (token, redemptionId, reason) =>
  api('/api/admin/loyalty/cancel', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ redemptionId, reason }) })

// ─── Carta digital (menú del bar) ─────────────────────────────────────────
// Pública (la lee /carta y el QR)
export const getMenu = () => api('/api/menu')

// Admin
export const adminGetMenu = (token) =>
  api('/api/admin/menu', { headers: authHeaders(token) })

export const adminCreateMenuCategory = (token, body) =>
  api('/api/admin/menu/categories', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })
export const adminUpdateMenuCategory = (token, id, body) =>
  api(`/api/admin/menu/categories/${id}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) })
export const adminDeleteMenuCategory = (token, id) =>
  api(`/api/admin/menu/categories/${id}`, { method: 'DELETE', headers: authHeaders(token) })
export const adminReorderMenuCategories = (token, updates) =>
  api('/api/admin/menu/categories/reorder', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ updates }) })

export const adminCreateMenuItem = (token, body) =>
  api('/api/admin/menu/items', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })
export const adminUpdateMenuItem = (token, id, body) =>
  api(`/api/admin/menu/items/${id}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) })
export const adminDeleteMenuItem = (token, id) =>
  api(`/api/admin/menu/items/${id}`, { method: 'DELETE', headers: authHeaders(token) })
export const adminReorderMenuItems = (token, updates) =>
  api('/api/admin/menu/items/reorder', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ updates }) })
export const adminMoveMenuItem = (token, id, body) =>
  api(`/api/admin/menu/items/${id}/move`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })

export const adminMenuBulkPrice = (token, body) =>
  api('/api/admin/menu/bulk-price', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })
export const adminMenuBatchPrices = (token, updates) =>
  api('/api/admin/menu/prices/batch', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ updates }) })
export const adminMenuSetCost = (token, id, cost) =>
  api(`/api/admin/menu/items/${id}/cost`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ cost }) })
// Versiones de precios (snapshots)
export const adminMenuSnapshots = (token) =>
  api('/api/admin/menu/snapshots', { headers: authHeaders(token) })
export const adminMenuSnapshotCreate = (token, name) =>
  api('/api/admin/menu/snapshots', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ name }) })
export const adminMenuSnapshotRestore = (token, id) =>
  api(`/api/admin/menu/snapshots/${id}/restore`, { method: 'POST', headers: authHeaders(token) })
export const adminMenuSnapshotDelete = (token, id) =>
  api(`/api/admin/menu/snapshots/${id}`, { method: 'DELETE', headers: authHeaders(token) })

// Recetas (insumos + composición → costo automático)
export const adminIngredients = (token) =>
  api('/api/admin/menu/ingredients', { headers: authHeaders(token) })
export const adminIngredientCreate = (token, body) =>
  api('/api/admin/menu/ingredients', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })
export const adminIngredientUpdate = (token, id, body) =>
  api(`/api/admin/menu/ingredients/${id}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(body) })
export const adminIngredientDelete = (token, id) =>
  api(`/api/admin/menu/ingredients/${id}`, { method: 'DELETE', headers: authHeaders(token) })
export const adminGetRecipe = (token, itemId) =>
  api(`/api/admin/menu/items/${itemId}/recipe`, { headers: authHeaders(token) })
export const adminSetRecipe = (token, itemId, lines) =>
  api(`/api/admin/menu/items/${itemId}/recipe`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ lines }) })

// Morphi (sincronización de precios con la caja) — acceso con código simple
export const morphiPending = (k) => api(`/api/morphi/pending?k=${encodeURIComponent(k)}`)
export const morphiMarkSynced = (k, itemId) =>
  api('/api/morphi/synced', { method: 'POST', body: JSON.stringify({ k, itemId }) })
export const morphiMarkSyncedMany = (k, itemIds) =>
  api('/api/morphi/synced-many', { method: 'POST', body: JSON.stringify({ k, itemIds }) })
export const morphiMarkUnsynced = (k, itemId) =>
  api('/api/morphi/unsynced', { method: 'POST', body: JSON.stringify({ k, itemId }) })
// Segmentación de clientes (Miriam clasifica X/Y/Z)
export const morphiClients = (k) => api(`/api/morphi/clients?k=${encodeURIComponent(k)}`)
export const morphiSetSegment = (k, playerId, segment) =>
  api('/api/morphi/segment', { method: 'POST', body: JSON.stringify({ k, playerId, segment }) })
export const morphiSetNote = (k, playerId, note) =>
  api('/api/morphi/note', { method: 'POST', body: JSON.stringify({ k, playerId, note }) })
export const morphiMarkAllSynced = (k) =>
  api('/api/morphi/synced-all', { method: 'POST', body: JSON.stringify({ k }) })

export const adminMenuPriceHistory = (token, { itemId, limit = 100 } = {}) => {
  const qs = new URLSearchParams()
  if (itemId) qs.set('itemId', itemId)
  if (limit) qs.set('limit', limit)
  return api(`/api/admin/menu/price-history?${qs}`, { headers: authHeaders(token) })
}

// ─── Lead capture (form público "Suscribite a las promos") ──────────────────
export const subscribeLead = (data) =>
  api('/api/leads/subscribe', { method: 'POST', body: JSON.stringify(data) })

// ─── Promo (modo promotora — público con rate-limit) ──────────────────────────
export const promoLookupDni = (dni) =>
  api('/api/promo/lookup-dni', { method: 'POST', body: JSON.stringify({ dni }) })

export const promoInscribeProde = (data) =>
  api('/api/promo/inscribe-prode', { method: 'POST', body: JSON.stringify(data) })

export const promoInscribeTournament = (data) =>
  api('/api/promo/inscribe-tournament', { method: 'POST', body: JSON.stringify(data) })

export const promoUpdateContact = (data) =>
  api('/api/promo/update-contact', { method: 'POST', body: JSON.stringify(data) })

// ─── Dashboard stats (admin) ──────────────────────────────────────────────────
export const adminDashboardStats = (token) =>
  api('/api/admin/dashboard/stats', { headers: authHeaders(token) })

export const adminAnalyticsSnapshot = (token, opts = {}) => {
  const params = new URLSearchParams()
  if (opts.range) params.set('range', opts.range)
  if (opts.from)  params.set('from',  opts.from)
  if (opts.to)    params.set('to',    opts.to)
  const qs = params.toString()
  return api(`/api/admin/analytics/snapshot${qs ? '?' + qs : ''}`, { headers: authHeaders(token) })
}
