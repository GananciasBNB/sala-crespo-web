// Demo mode of the Club kiosk (/kiosk?demo=1): same function signatures as the
// real API client, but everything lives in this browser tab (sessionStorage).
// Nothing is written to the database, nothing is printed, no mail is sent.
// Only the public read-only endpoints (catalog, active tournament) hit the server
// so the tester sees the real prizes and the real tournament.
import { getLoyaltyCatalog as realCatalog, getActiveTournament as realTournament } from './client'

const STORE_KEY = 'kiosk_demo_v1'
const SPINS_PER_WINDOW = 3
const WINDOW_MS = 3 * 60 * 60 * 1000
const DEMO_GIFT = 5000 // demo-only points so testers can try a redemption
// Demo: no daily limit on coupons or packs, so testers can repeat them
const PACK = { size: 10, points: 150, perDay: 999 }
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
  return publicPlayer(p)
}

export async function kioskSignup({ dni, name, tel, email, pin }) {
  await wait()
  const db = load()
  if (db[dni]) throw new Error('Ese DNI ya está registrado en esta prueba.')
  const p = { dni, name, tel, email, pin, balance: 0, tx: [], created_at: new Date().toISOString() }
  addTx(p, 'earn_signup_bonus', 100, 'Bienvenida al Club')
  addTx(p, 'earn_manual', DEMO_GIFT, 'Puntos de regalo (solo en la prueba)')
  db[dni] = p
  save(db)
  return { player: publicPlayer(p), balance: p.balance }
}

export async function kioskAcceptTerms() { await wait(150); return { ok: true } }
export async function clubCreatePin() { await wait(150); return { ok: true } }

export async function loyaltyCheckin(token) {
  await wait()
  const db = load(); const p = getPlayer(db, token)
  if (p.lastCheckin === today()) return { granted: false, alreadyToday: true, balance: p.balance }
  p.lastCheckin = today()
  addTx(p, 'earn_checkin', 50, 'Check-in en sala')
  save(db)
  return { granted: true, alreadyToday: false, balance: p.balance }
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
    pack: { ...PACK, hoy: p.packsToday, disponible: true, puede: p.packsToday < PACK.perDay, alcanza: p.balance >= PACK.points },
  }
}
export async function loyaltyRaffleTicket(token) {
  await wait()
  const db = load(); const p = getPlayer(db, token)
  raffleDay(p)
  if (p.ticketsToday >= TICKETS_PER_DAY) throw new Error('Ya imprimiste tu cupón de hoy.')
  p.ticketsToday += 1; save(db)
  return { ok: true, codigo: 'DEMO', hoy: p.ticketsToday, limite: TICKETS_PER_DAY, puede: true }
}
export async function loyaltyRafflePack(token) {
  await wait()
  const db = load(); const p = getPlayer(db, token)
  raffleDay(p)
  if (p.packsToday >= PACK.perDay) throw new Error('Ya canjeaste tu pack de hoy.')
  if (p.balance < PACK.points) throw new Error('insufficient_balance')
  p.packsToday += 1
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
