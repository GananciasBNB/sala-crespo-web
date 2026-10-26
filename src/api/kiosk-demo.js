// Demo mode of the Club kiosk (/kiosk?demo=1): same function signatures as the
// real API client, but everything lives in this browser tab (sessionStorage).
// Nothing is written to the database, nothing is printed, no mail is sent.
// Only the public read-only endpoints (catalog, active tournament) hit the server
// so the tester sees the real prizes and the real tournament.
import { getLoyaltyCatalog as realCatalog, getActiveTournament as realTournament } from './client'
import { PREGUNTAS, PUNTOS_POR_RESPUESTA } from './encuesta-preguntas'

const STORE_KEY = 'kiosk_demo_v1'
const SPINS_PER_WINDOW = 3
const WINDOW_MS = 3 * 60 * 60 * 1000
const DEMO_GIFT = 100000 // demo-only points so testers can try every redemption
// Demo: no daily limit on coupons or packs, so testers can repeat them
const PACK = { size: 5, points: 150, perDay: 999 }
const TICKETS_PER_DAY = 999

export const isKioskDemo = () => {
  try { return new URLSearchParams(window.location.search).get('demo') === '1' } catch { return false }
}

function load() {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {} } catch { return {} }
}
function save(db) {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(db)) } catch (e) { console.warn('kiosk demo: no storage', e) }
}
const wait = (ms = 350) => new Promise(r => setTimeout(r, ms))
const today = () => new Date().toISOString().slice(0, 10)
const dniFromToken = (token) => String(token || '').replace(/^demo-/, '')

function getPlayer(db, token) {
  const p = db[dniFromToken(token)]
  if (!p) throw new Error('Sesión de prueba vencida. Volvé a empezar.')
  return p
}
function addTx(p, kind, points, reason) {
  p.tx.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, points, reason, created_at: new Date().toISOString() })
  p.balance += points
}
function publicPlayer(p) {
  return { token: `demo-${p.dni}`, dni: p.dni, name: p.name, tel: p.tel, email: p.email, termsAccepted: true, created_at: p.created_at }
}
function spinState(p) {
  if (p.spinWindowStart && Date.now() - p.spinWindowStart >= WINDOW_MS) { p.spinsUsed = 0; p.spinWindowStart = null }
  const left = SPINS_PER_WINDOW - (p.spinsUsed || 0)
  return { left, porVentana: SPINS_PER_WINDOW, nextAt: left <= 0 ? new Date(p.spinWindowStart + WINDOW_MS).toISOString() : null }
}

export async function kioskLookupDni(dni) {
  await wait()
  const p = load()[dni]
  if (!p) return { exists: false }
  return { exists: true, player: { name: p.name, tel: p.tel, email: p.email, needsPin: false }, tournament: { registered: !!p.tourneyNo, registrationNo: p.tourneyNo } }
}

export async function kioskLogin(dni, pin) {
  await wait()
  const p = load()[dni]
  if (!p || p.pin !== pin) throw new Error('PIN incorrecto')
  // accounts created before the gift went up get the difference once
  const given = p.giftTotal ?? 5000
  if (given < DEMO_GIFT) {
    const db = load(); const q = db[dni]
    addTx(q, 'earn_manual', DEMO_GIFT - given, 'Puntos de regalo (solo en la prueba)')
    q.giftTotal = DEMO_GIFT
    save(db)
  }
  return publicPlayer(p)
}

export async function kioskSignup({ dni, name, tel, email, pin }) {
  await wait()
  const db = load()
  if (db[dni]) throw new Error('Ese DNI ya está registrado en esta prueba.')
  const p = { dni, name, tel, email, pin, balance: 0, tx: [], created_at: new Date().toISOString() }
  addTx(p, 'earn_signup_bonus', 100, 'Bienvenida al Club')
  addTx(p, 'earn_manual', DEMO_GIFT, 'Puntos de regalo (solo en la prueba)')
  p.giftTotal = DEMO_GIFT
  db[dni] = p
  save(db)
  return { player: publicPlayer(p), balance: p.balance }
}

export async function kioskAcceptTerms() { await wait(150); return { ok: true } }
export async function clubCreatePin() { await wait(150); return { ok: true } }

// Same birthday rules as the backend: exact day, once a year, not if saved today
function demoBirthday(p) {
  if (!p.birthDate) return { set: false, granted: false }
  const t = today()
  const year = t.slice(0, 4)
  const isDay = p.birthDate.slice(5) === t.slice(5)
  if (!isDay || p.birthDateSetOn === t || p.birthdayGiftYear === year) return { set: true, granted: false }
  p.birthdayGiftYear = year
  addTx(p, 'earn_birthday', 500, 'Regalo de cumpleaños')
  return { set: true, granted: true, points: 500 }
}

export async function loyaltyCheckin(token) {
  await wait()
  const db = load(); const p = getPlayer(db, token)
  if (p.lastCheckin === today()) {
    const birthday = demoBirthday(p); save(db)
    return { granted: false, alreadyToday: true, balance: p.balance, birthday }
  }
  p.lastCheckin = today()
  addTx(p, 'earn_checkin', 50, 'Check-in en sala')
  const birthday = demoBirthday(p)
  save(db)
  return { granted: true, alreadyToday: false, balance: p.balance, birthday }
}

export async function kioskSetBirthday(token, { day, month, year }) {
  await wait(250)
  const db = load(); const p = getPlayer(db, token)
  if (p.birthDate) throw new Error('Tu cumpleaños ya está cargado. Si hay que corregirlo, consultá en la barra.')
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) throw new Error('Esa fecha no existe. Revisala.')
  const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)
  if (age < 18) throw new Error('Jackpoints es para mayores de 18 años.')
  if (age > 110) throw new Error('Revisá el año de nacimiento.')
  p.birthDate = d.toISOString().slice(0, 10)
  p.birthDateSetOn = today()
  save(db)
  return { ok: true }
}

export async function getLoyaltyMe(token) {
  const p = getPlayer(load(), token)
  return { balance: p.balance, transactions: p.tx, pending: [], history: [] }
}

let catalogCache = null
export async function getLoyaltyCatalog() {
  if (!catalogCache) catalogCache = await realCatalog()
  return catalogCache
}
export const getActiveTournament = () => realTournament()

export async function redeemLoyaltyReward(token, rewardId) {
  await wait()
  const db = load(); const p = getPlayer(db, token)
  const reward = (await getLoyaltyCatalog()).rewards.find(r => String(r.id) === String(rewardId))
  if (!reward) throw new Error('Premio no encontrado')
  if (p.balance < reward.points) throw new Error('insufficient_balance')
  addTx(p, 'redeem', -reward.points, `Canje: ${reward.name}`)
  save(db)
  return { ok: true, balance: p.balance }
}

export async function getSpinStatus(token) {
  const db = load(); const p = getPlayer(db, token)
  const s = spinState(p); save(db)
  return s
}

// Called by the kiosk when the demo slot reports a spin (and its prize label)
export function registerDemoSpin(token, prizeLabel) {
  const db = load(); const p = db[dniFromToken(token)]
  if (!p) return
  spinState(p)
  if (!p.spinWindowStart) p.spinWindowStart = Date.now()
  p.spinsUsed = (p.spinsUsed || 0) + 1
  const pts = /\+?([\d.]+)\s*PUNTOS/i.exec(prizeLabel || '')
  if (pts) addTx(p, 'earn_manual', Number(pts[1].replace(/\./g, '')), 'Premio Fortuna Dorada')
  save(db)
}

export async function kioskInscribeTournament({ dni }) {
  await wait()
  const db = load(); const p = db[dni]
  if (p) { p.tourneyNo = p.tourneyNo || 100 + Math.floor(Math.random() * 50); save(db) }
  return { ok: true, registrationNo: p?.tourneyNo || 99 }
}

export async function promoUpdateContact({ dni, tel, email }) {
  await wait()
  const db = load(); const p = db[dni]
  if (p) { p.tel = tel; p.email = email; save(db) }
  return { ok: true }
}

function raffleDay(p) {
  if (p.raffleDay !== today()) { p.raffleDay = today(); p.ticketsToday = 0; p.packsToday = 0 }
}
export async function loyaltyRaffleStatus(token) {
  const db = load(); const p = getPlayer(db, token)
  raffleDay(p); save(db)
  return {
    hoy: p.ticketsToday, limite: TICKETS_PER_DAY, puede: p.ticketsToday < TICKETS_PER_DAY, monto: 150000,
    sorteo: { fecha: demoSorteo(), cupones: p.cupones || 0 },
    pack: { ...PACK, hoy: p.packsToday, disponible: true, puede: p.packsToday < PACK.perDay, alcanza: p.balance >= PACK.points },
  }
}
export async function loyaltyRaffleTicket(token) {
  await wait()
  const db = load(); const p = getPlayer(db, token)
  raffleDay(p)
  if (p.ticketsToday >= TICKETS_PER_DAY) throw new Error('Ya imprimiste tu cupón de hoy.')
  p.ticketsToday += 1; p.cupones = (p.cupones || 0) + 1; save(db)
  return { ok: true, codigo: 'DEMO', hoy: p.ticketsToday, limite: TICKETS_PER_DAY, puede: true }
}
export async function loyaltyRafflePack(token) {
  await wait()
  const db = load(); const p = getPlayer(db, token)
  raffleDay(p)
  if (p.packsToday >= PACK.perDay) throw new Error('Ya canjeaste tu pack de hoy.')
  if (p.balance < PACK.points) throw new Error('insufficient_balance')
  p.packsToday += 1; p.cupones = (p.cupones || 0) + PACK.size
  addTx(p, 'redeem', -PACK.points, `Pack de ${PACK.size} cupones del sorteo`)
  save(db)
  return { ok: true, balance: p.balance }
}

// Sync read for the slot iframe URL (how many spins the standalone slot allows)
export function demoSpinsLeft(token) {
  const db = load(); const p = db[dniFromToken(token)]
  if (!p) return SPINS_PER_WINDOW
  const s = spinState(p); save(db)
  return Math.max(1, s.left)
}

// ── Día de la Madre (demo): shows on Sunday 18/10 or with ?madre=1, nothing real ──
export async function diaMadreEstado(token) {
  await wait(120)
  const db = load(), p = getPlayer(db, token)
  const ahora = new Date(), domingo = ahora >= new Date('2026-10-18T03:00:00Z') && ahora < new Date('2026-10-19T06:00:00Z')
  if (!domingo && !new URLSearchParams(location.search).get('madre')) return { elegible: false }
  const nombre = (p.name || '').split(' ')[0] || ''
  return { elegible: true, puntos: 2000, puntosRecibidos: !!p.diaMadrePts, cuponImpreso: !!p.diaMadreCupon, nombre, prueba: true }
}
export async function diaMadrePuntos(token) {
  await wait(200)
  const db = load(), p = getPlayer(db, token)
  if (!p.diaMadrePts) { p.diaMadrePts = true; p.balance = (p.balance || 0) + 2000; save(db) }
  return { ok: true, puntos: 2000, balance: p.balance }
}
export async function diaMadreCupon(token) {
  await wait(300)
  const db = load(), p = getPlayer(db, token); p.diaMadreCupon = true; save(db)
  return { ok: true, codigo: 'FD-DEMO' }
}

// ── La Gran Pesca (demo): unlimited attempts and a made-up leaderboard around the player ──
const PESCA_RIVALES = [['María G.', '21:43', 2340], ['Juan P.', '22:10', 2185], ['Carlos B.', '20:58', 1960], ['Rubén S.', '21:15', 1420], ['Silvia M.', '22:31', 1310], ['Diego H.', '20:12', 1180], ['Norma K.', '23:40', 990], ['Omar R.', '21:05', 860], ['Lucía F.', '22:48', 745]]
function pescaVista(p, top = 10) {
  const yoNombre = (p.name || 'Socio').split(' ').filter(Boolean).map((w, i) => i === 0 ? w : w[0] + '.').slice(0, 2).join(' ')
  const filas = PESCA_RIVALES.map(([nombre, hora, puntaje]) => ({ nombre, hora, puntaje, esYo: false }))
  if (p.pescaMejor) filas.push({ nombre: yoNombre, hora: p.pescaHora, puntaje: p.pescaMejor, esYo: true })
  filas.sort((a, b) => b.puntaje - a.puntaje)
  const conPos = filas.map((f, i) => ({ ...f, posicion: i + 1, premio: [500, 300, 200][i] || 0 }))
  return { total: conPos.length, filas: conPos.slice(0, top), yo: conPos.find(f => f.esYo) || null, lider: conPos[0] }
}
export async function pescaEstado(token) {
  await wait(150)
  const db = load(), p = getPlayer(db, token), v = pescaVista(p, 3)
  return { intentosQuedan: 999, proximoIntento: null, intentosPorVentana: 999, horas: 3, mejorHoy: p.pescaMejor || 0, puesto: v.yo?.posicion || null, total: v.total, lider: v.lider, top: v.filas, premios: [500, 300, 200], semilla: 20261016 }
}
// demo: special fish show up often so the demo can show them (in the sala the server draws them)
const demoEspeciales = {}
export async function pescaEmpezar(token) {
  await wait(150); getPlayer(load(), token)
  const t = 'demo-' + Date.now(), r = Math.random()
  const especial = r < .15 ? { tipo: 'ticket', t: 8 + Math.random() * 12 } : r < .32 ? { tipo: 'pts100', t: 8 + Math.random() * 12 } : r < .5 ? { tipo: 'pts50', t: 8 + Math.random() * 12 } : null
  if (especial) demoEspeciales[t] = especial.tipo
  return { ok: true, token: t, semilla: Number(new Date().toISOString().slice(0, 10).replace(/-/g, '')), segundos: 30, intentosQuedan: 999, especial }
}
export async function pescaTerminar(token, { puntaje, token: partida, especialAtrapado }) {
  await wait(200)
  const db = load(), p = getPlayer(db, token)
  if ((Number(puntaje) || 0) > (p.pescaMejor || 0)) { p.pescaMejor = Number(puntaje) || 0; p.pescaHora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) }
  save(db)
  const v = pescaVista(p, 3)
  const tipo = especialAtrapado ? demoEspeciales[partida] : null
  const premioEspecial = tipo ? { tipo, prueba: true, ...(tipo === 'ticket' ? { codigo: 'FD-DEMO' } : { puntos: tipo === 'pts100' ? 100 : 50 }) } : null
  return { ok: true, puntaje, mejorHoy: p.pescaMejor || 0, puesto: v.yo?.posicion || null, total: v.total, top: v.filas, yo: v.yo, intentosQuedan: 999, proximoIntento: null, premioEspecial }
}
export async function pescaRanking(token) {
  await wait(150)
  const ayer = new Date(Date.now() - 7 * 3600e3 - 86400e3).toISOString().slice(0, 10)
  return { ...pescaVista(getPlayer(load(), token), 10), premios: [500, 300, 200],
    anteriores: { fecha: ayer, ganadores: [{ posicion: 1, nombre: 'Roberto A.', puntaje: 2810, puntos: 500 }, { posicion: 2, nombre: 'Laura B.', puntaje: 2455, puntos: 300 }, { posicion: 3, nombre: 'Jorge D.', puntaje: 2120, puntos: 200 }] } }
}
export async function pescaLider() { await wait(100); return { lider: { nombre: 'María G.', puntaje: 2340 }, sorteo: { fecha: demoSorteo(), monto: 150000 } } }
// demo draw: next Thursday at 23:00 Argentina (the real date comes from the server)
function demoSorteo() {
  const ar = new Date(Date.now() - 3 * 3600e3), d = new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + ((4 - d.getUTCDay() + 7) % 7 || 7))
  return new Date(d.getTime() + 26 * 3600e3).toISOString()   // 23:00 AR = 02:00 UTC next day
}

// ── "Contanos de vos" (demo): answers live in the demo store, points are made up ──
function encuestaVista(p) {
  const r = p.encuesta || {}
  return {
    preguntas: PREGUNTAS.filter(q => !r[q.id]), respondidas: Object.keys(r).length, total: PREGUNTAS.length,
    puntos: PUNTOS_POR_RESPUESTA, tieneEmail: !!p.email, tieneTel: !!p.tel,
  }
}
export async function encuestaEstado(token) { await wait(150); return encuestaVista(getPlayer(load(), token)) }
export async function encuestaResponder(token, { id, valores, texto }) {
  await wait()
  const db = load(); const p = getPlayer(db, token)
  const q = PREGUNTAS.find(x => x.id === id)
  if (!q) throw new Error('Pregunta desconocida')
  if (!Array.isArray(valores) || !valores.length || valores.some(v => !q.opciones.includes(v))) throw new Error('Elegí una opción')
  p.encuesta ||= {}
  if (p.encuesta[id]) throw new Error('Esa pregunta ya la respondiste')
  p.encuesta[id] = { valores, texto: texto || null }
  // contact data typed in the survey fills what the member didn't have
  if (id === 'contacto' && texto) { if (texto.includes('@')) { if (!p.email) p.email = texto } else if (!p.tel) p.tel = texto }
  addTx(p, 'earn_survey', PUNTOS_POR_RESPUESTA, `Contanos de vos: ${q.titulo}`)
  save(db)
  return { ok: true, puntos: PUNTOS_POR_RESPUESTA, balance: p.balance, ...encuestaVista(p) }
}
