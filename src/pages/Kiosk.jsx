import { useState, useEffect, useRef, useCallback } from 'react'
import * as realApi from '../api/client'
import * as demoApi from '../api/kiosk-demo'
import './Kiosk.css'
import { ArtFortuna, ArtTorneo, ArtCanjes, ArtCarta, ArtVisita, ArtSorteo, IconTicket, IconCopa } from './kiosk-art'

// Demo mode (/kiosk?demo=1): shareable test link. Same screens, but every call
// goes to an in-browser simulator — no DB writes, no printing, no mails.
const DEMO = demoApi.isKioskDemo()
const { kioskLookupDni, kioskLogin, kioskSignup, kioskAcceptTerms, clubCreatePin, loyaltyCheckin, getActiveTournament, kioskInscribeTournament, promoUpdateContact, kioskSetBirthday, getLoyaltyMe, getLoyaltyCatalog, redeemLoyaltyReward, getSpinStatus, loyaltyRaffleStatus, loyaltyRaffleTicket, loyaltyRafflePack } = DEMO ? demoApi : realApi
const { API_BASE } = realApi
const kioskKey = DEMO ? () => 'demo' : realApi.kioskKey

// Tótem de autogestión del Sala Crespo Club.
// Flujo DNI-first: DNI → si existe pide PIN (login + check-in), si no registro rápido.
// Pensado para pantalla touch en la sala. Auto-reset por inactividad.
// Ruta: /kiosk (bloqueada en robots, sin link público).

const IDLE_MS = 40000 // vuelve al inicio tras 40s sin tocar
const CARTA_IDLE_MS = 90000 // con la carta abierta se tolera más lectura
const ATTRACT_MS = 180000 // frase de atracción cada 3 min en idle
// Giro Gratuito: 1 giro cada N horas (la matemática/stock diario se define en el
// backend; acá solo corre el contador). DEMO: cooldown en localStorage hasta que
// exista POST /api/loyalty/spin — el estado real SIEMPRE va a ser del servidor.
// Fortuna Dorada: el estado del giro (giros restantes, próxima ventana) vive
// en el SERVIDOR — el kiosk solo lo consulta y muestra el contador.

const TX_LABELS = {
  earn_checkin: 'Puntos por visita', earn_ayb: 'Consumo en barra', earn_birthday: 'Regalo de cumpleaños',
  earn_signup_bonus: 'Bienvenida al Club', earn_manual: 'Ajuste del Club', redeem: 'Canje', refund: 'Devolución', expire: 'Vencimiento',
}
function fmtTxFecha(iso) {
  // el backend puede mandar timestamps sin zona: son UTC — sin la 'Z' el
  // navegador los lee como hora local y corre la fecha un día
  const s = String(iso)
  const d = new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(s) ? s : s.replace(' ', 'T') + 'Z')
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

// 'jueves 29 de octubre a las 21:30' (tournament_date comes in UTC)
function fmtTorneoFecha(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const tz = 'America/Argentina/Buenos_Aires'
    const dia = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz })
    const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
    return `${dia.replace(',', '')} a las ${hora}`
  } catch (e) { console.warn('fecha torneo:', e); return '' }
}

function fmtCountdown(totalSec) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const p = (n) => String(n).padStart(2, '0')
  return `${h}:${p(m)}:${p(s)}`
}

// Cierre de sesión del Home: contador visible en los últimos 10s, urgente a los
// 5s; cualquier toque lo renueva. Aislado para que su tick no repinte el Home.
const SESION_MS = 40000
function SesionTimer({ lastActRef, paused, onExpirar, margen = SESION_MS }) {
  const [rem, setRem] = useState(margen)
  useEffect(() => {
    if (paused) { setRem(margen); return }
    const iv = setInterval(() => {
      const r = margen - (Date.now() - lastActRef.current)
      setRem(r)
      if (r <= 0) onExpirar()
    }, 500)
    return () => clearInterval(iv)
  }, [lastActRef, paused, onExpirar, margen])
  const s = Math.max(0, Math.ceil(rem / 1000))
  if (paused || s > 10) return null
  return (
    <div className="kiosk__sesion kiosk__sesion--urgente">
      Tu sesión se cierra en {s}… ¡tocá la pantalla si necesitás más tiempo!
    </div>
  )
}

// Contador del giro AISLADO: su tick de 1s re-renderiza solo este bloque,
// nunca el Home entero (si viviera arriba, toda la pantalla titila).
function FortunaEstado({ token, refreshKey, onJugar, art }) {
  const [st, setSt] = useState(null) // { left, nextAt, porVentana } — del servidor
  const [cd, setCd] = useState(0)
  useEffect(() => {
    if (!token) return
    let vivo = true
    getSpinStatus(token).then(s => { if (vivo) setSt(s) }).catch(() => { if (vivo) setSt(null) })
    return () => { vivo = false }
  }, [token, refreshKey])
  useEffect(() => {
    if (!st?.nextAt) { setCd(0); return }
    const leer = () => {
      const s = Math.max(0, Math.ceil((new Date(st.nextAt).getTime() - Date.now()) / 1000))
      setCd(s)
      if (s <= 0) setSt(x => x ? { ...x, left: x.porVentana || 2, nextAt: null } : x)
    }
    leer()
    const iv = setInterval(leer, 1000)
    return () => clearInterval(iv)
  }, [st?.nextAt]) // eslint-disable-line react-hooks/exhaustive-deps
  const left = st?.left ?? 2
  const porVentana = st?.porVentana || 2
  if (left <= 0 && cd > 0) return (
    <>
      <div className="kiosk__hub-sub kiosk__hub-sub--antes">Próxima ronda de {porVentana} giros gratis en:</div>
      <div className="kiosk__hub-countdown">{fmtCountdown(cd)}</div>
      <div className="kiosk__hub-sub">Cada 3 horas, nuevos premios</div>
      {art}
    </>
  )
  return (
    <>
      <div className="kiosk__hub-sub">
        {left === 1 ? '¡Te queda 1 giro en esta ronda!' : `Tenés ${left} giros gratis · premios y puntos`}
      </div>
      {art}
      <button className="kiosk__cta kiosk__cta--hub" onClick={onJugar}>JUGÁ AHORA</button>
    </>
  )
}

// ── Voz de la máquina (MP3s pregrabados con ElevenLabs en /kiosk-audio) ──
// Un solo canal: la máquina dice una cosa a la vez. Si falta un audio o el
// navegador lo bloquea, la UI sigue muda pero funcional (nunca romper el flujo).
// Música ambiente del Club (neutra, NO la oriental del slot): suena en toda la
// app y se pausa mientras Fortuna Dorada está abierta (el juego tiene la suya).
let musicaClub = null
const MUSICA_VOL = 0.1   // colchon de fondo: audible sin tapar las voces
function musicaClubPlay() {
  try {
    if (!musicaClub) {
      musicaClub = new Audio('/kiosk-audio/musica-club.mp3')
      musicaClub.loop = true; musicaClub.volume = MUSICA_VOL
      musicaClub.preload = 'auto'
    }
    if (!musicaClub.paused) return
    const p = musicaClub.play()
    if (p) p.catch(err => console.warn('musica del club bloqueada:', err && err.name))
  } catch { /* sin audio no es fatal */ }
}
function musicaClubPause() { try { if (musicaClub) musicaClub.pause() } catch { /* idem */ } }

// Audio del kiosk: Chrome bloquea el play() cuando pasó demasiado tiempo desde
// el último toque (por ejemplo tras esperar al servidor en el login). Por eso
// los MP3 se precargan y se "desbloquean" con el primer toque de la pantalla:
// un play+pause en silencio deja a cada archivo habilitado para después.
// Redemption voice lines: two takes per catalog category, picked at random.
// Unknown categories fall back to the generic 'sin_alcohol' takes.
const CANJE_CATS = ['sin_alcohol', 'cerveza', 'trago', 'comida', 'ticket']
const CANJE_VOCES = CANJE_CATS.flatMap(c => [`canje-${c}-1`, `canje-${c}-2`])
function vozCanje(category) {
  const cat = CANJE_CATS.includes(category) ? category : 'sin_alcohol'
  return `canje-${cat}-${Math.random() < 0.5 ? 1 : 2}`
}
const VOCES = ['atraccion-1', 'atraccion-2', 'atraccion-3', 'atraccion-4', 'checkin',
  'cumple', 'cumple-guardado', 'nuevo-socio', 'cupon', 'cupones-pack', 'torneo-inscripto', 'canjes', 'carta', 'mis-datos', 'movimientos', 'cortesia-email', 'despedida', ...CANJE_VOCES, 'ya-checkin', 'ui-tap']
const poolVoz = {}
function audioDe(name) {
  let a = poolVoz[name]
  if (!a) { a = new Audio(`/kiosk-audio/${name}.mp3`); a.preload = 'auto'; poolVoz[name] = a }
  return a
}
VOCES.forEach(audioDe)
let audioListo = false
function desbloquearAudio() {
  if (audioListo) return
  audioListo = true
  // muted (no volume 0): con volumen algunos navegadores dejan escapar un
  // fragmento audible antes de silenciar, y se escuchaba todo junto
  const aDesbloquear = [...Object.values(poolVoz)]
  if (musicaClub && musicaClub.paused) aDesbloquear.push(musicaClub)
  aDesbloquear.forEach(a => {
    if (!a.paused) return   // ya esta sonando: no tocarla
    if (DEMO) {
      // Demo on phones: play() resolves only after the file downloads, and some
      // mobile browsers let the muted clip be heard for a moment. Starting and
      // stopping in the same tick unlocks the element without any sound.
      a.muted = true
      const p = a.play()
      a.pause()
      if (p) p.catch(() => {}).finally(() => { a.muted = false })
      else a.muted = false
      return
    }
    a.muted = true
    const p = a.play()
    if (p) p.then(() => { a.pause(); a.currentTime = 0; a.muted = false })
           .catch(() => { a.muted = false })
    else a.muted = false
  })
}

let vozActual = null
function voz(name, vol = 0.95) {
  try {
    if (vozActual && !vozActual.paused) { vozActual.pause(); vozActual.currentTime = 0 }
    const a = audioDe(name)
    a.volume = vol
    try { a.currentTime = 0 } catch { /* aún sin metadata */ }
    vozActual = a
    const p = a.play()
    if (p) p.catch(err => console.warn('voz', name, 'bloqueada:', err && err.name))
  } catch { /* sin audio no es error fatal */ }
}

// Plays a line right after the one that is sounding (e.g. check-in, then birthday)
function vozDespues(name, vol = 0.95) {
  const prev = vozActual
  if (!prev || prev.paused || prev.ended) { voz(name, vol); return }
  prev.addEventListener('ended', () => voz(name, vol), { once: true })
}

// Torta de cumpleaños (SVG inline en dorado, sin emojis)
function IconoTorta({ size = 40 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs><linearGradient id="kTortaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".55" stopColor="#f0d275" /><stop offset="1" stopColor="#b8923e" /></linearGradient></defs>
      <path d="M32 6c3 4 4 7 0 10c-4-3-3-6 0-10z" fill="#ffb347" />
      <rect x="30" y="16" width="4" height="10" rx="1.5" fill="#fdf6e6" />
      <rect x="10" y="26" width="44" height="14" rx="4" fill="url(#kTortaG)" />
      <path d="M10 33c4 4 7 4 11 0s7-4 11 0s7 4 11 0s7-4 11 0" fill="none" stroke="#8e1b2b" strokeWidth="2.5" />
      <rect x="6" y="40" width="52" height="16" rx="4" fill="url(#kTortaG)" />
      <path d="M6 47c4 4 8 4 13 0s9-4 13 0s9 4 13 0s9-4 13 0" fill="none" stroke="#8e1b2b" strokeWidth="2.5" />
      <rect x="2" y="56" width="60" height="4" rx="2" fill="#c9a84c" />
    </svg>
  )
}

function Numpad({ onDigit, onBack, onClear }) {
  const tap = (fn) => () => { voz('ui-tap', 0.45); fn() }
  return (
    <div className="kiosk-pad">
      {['1','2','3','4','5','6','7','8','9'].map(k => (
        <button key={k} className="kiosk-pad__key" onClick={tap(() => onDigit(k))}>{k}</button>
      ))}
      <button className="kiosk-pad__key kiosk-pad__key--sec" onClick={tap(onClear)}>C</button>
      <button className="kiosk-pad__key" onClick={tap(() => onDigit('0'))}>0</button>
      <button className="kiosk-pad__key kiosk-pad__key--sec" onClick={tap(onBack)}>⌫</button>
    </div>
  )
}

// Copa de cortesía (SVG inline, nada de emojis)
function IconoBebida() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M4 3h16l-6.9 9.2V19h3.4v2H7.5v-2h3.4v-6.8L4 3zm3.9 2 1.5 2h5.2l1.5-2H7.9z" fill="currentColor" />
      <circle cx="17.5" cy="4.6" r="1.1" fill="currentColor" />
    </svg>
  )
}

// Signup rules (same as the backend): first + last name, and a phone with area code
const nombreCompleto = (n) => String(n || '').trim().split(/\s+/).filter(w => w.length >= 2).length >= 2
const telValido = (t) => { const d = String(t || '').replace(/\D/g, ''); return d.length >= 10 && d.length <= 13 }

function Dots({ value, len }) {
  return (
    <div className="kiosk-dots">
      {Array.from({ length: len }).map((_, i) => (
        <span key={i} className={`kiosk-dots__d ${i < value.length ? 'on' : ''}`} />
      ))}
    </div>
  )
}

export default function Kiosk() {
  const [screen, setScreen] = useState('idle') // idle | dni | pin | register | done
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const [player, setPlayer] = useState(null)
  const [balance, setBalance] = useState(0)
  const [checkin, setCheckin] = useState(null)
  // Cumpleaños: el socio lo carga una vez desde la burbuja de la Home (DDMMAAAA)
  const [showCumple, setShowCumple] = useState(false)
  const [cumpleDigits, setCumpleDigits] = useState('')
  const [cumpleBusy, setCumpleBusy] = useState(false)
  const [cumpleErr, setCumpleErr] = useState('')
  const [cumpleListo, setCumpleListo] = useState(false) // saved this session
  const [cumpleGracias, setCumpleGracias] = useState(false) // confirmation popup
  const [reg, setReg] = useState({ name: '', tel: '', email: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [lookup, setLookup] = useState(null) // respuesta del lookup-dni (estado torneo, tel, email)
  const [tourney, setTourney] = useState(null)
  const [tourneyReg, setTourneyReg] = useState(null)
  const [tourneyBusy, setTourneyBusy] = useState(false)
  const [showTorneoOk, setShowTorneoOk] = useState(false)
  const [showCarta, setShowCarta] = useState(false)
  const [showGiro, setShowGiro] = useState(false)
  const [showMovs, setShowMovs] = useState(false)
  const [showCanjes, setShowCanjes] = useState(false)
  const [canjeTab, setCanjeTab] = useState('tickets')
  const idleTimer = useRef(null)
  // ref (no estado): los toques renuevan la sesión SIN re-renderizar la pantalla
  const lastActRef = useRef(Date.now())
  // Puerta escondida: 5 toques rápidos en el logo (pantalla de atracción) -> /admin
  const adminTaps = useRef({ n: 0, t: 0 })
  function tapSecreto(e) {
    e.stopPropagation()
    const ahora = Date.now()
    if (ahora - adminTaps.current.t > 4000) adminTaps.current.n = 0
    adminTaps.current.t = ahora
    adminTaps.current.n += 1
    if (adminTaps.current.n >= 5 && !DEMO) window.location.href = '/admin'
  }

  const reset = useCallback(() => {
    setScreen('idle'); setDni(''); setPin(''); setPlayer(null); setBalance(0)
    setCheckin(null); setReg({ name: '', tel: '', email: '' }); setErr(''); setBusy(false)
    setTourney(null); setTourneyReg(null); setTourneyBusy(false); setShowTorneoOk(false); setShowCarta(false); setShowGiro(false)
    setShowMovs(false); setShowCanjes(false); setMovs([]); setCanjeados({}); setBusyReward(null); setGiroJugado(false); setCuponEstado(''); setLookup(null)
    setShowDatos(false); setDatosForm({ tel: '', email: '' }); setDatosOk(false); setDatosBusy(false)
    setShowCumple(false); setCumpleDigits(''); setCumpleBusy(false); setCumpleErr(''); setCumpleListo(false); setCumpleGracias(false)
  }, [])

  // Vinculación de la máquina: una sola vez, abrir /kiosk?key=LLAVE en el
  // gabinete guarda la llave (queda en el perfil de Chrome) y se limpia la URL.
  useEffect(() => {
    try {
      const k = new URLSearchParams(window.location.search).get('key')
      if (k && !DEMO) {
        localStorage.setItem('kiosk_key', k)
        window.history.replaceState({}, '', window.location.pathname)
      }
    } catch { /* sin storage */ }
  }, [])
  const vinculada = !!kioskKey()

  // Demo on computers: shrink the visible screen just enough to fit the window,
  // whatever its size, so testers never need to scroll. Phones keep scrolling.
  useEffect(() => {
    if (!DEMO) return
    const pick = () => document.querySelector('.kiosk > .kiosk__idle, .kiosk > .kiosk__step, .kiosk > .kiosk__done')
    const fit = () => {
      const k = document.querySelector('.kiosk'); const c = pick()
      if (!k || !c) return
      c.style.zoom = ''
      if (window.innerWidth <= 700) return
      const cs = getComputedStyle(k)
      const avail = k.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 8
      const need = c.scrollHeight
      if (need > avail) c.style.zoom = String(Math.max(0.6, avail / need))
    }
    const t1 = setTimeout(fit, 50); const t2 = setTimeout(fit, 600)
    window.addEventListener('resize', fit)
    const c = pick(); const ro = c && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (!c.style.zoom) fit() }) : null
    if (ro && c) ro.observe(c)
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', fit); if (ro) ro.disconnect() }
  }) // runs after every render: cheap, and catches cards that grow (torneo, giros)

  // Auto-reset por inactividad en pantallas de trámite (dni/pin/registro).
  // El Home tiene su propio SesionTimer con contador visible; los overlays
  // (juego/carta/canjes) lo pausan y al cerrarse renuevan la actividad.
  useEffect(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (screen !== 'idle' && screen !== 'done') idleTimer.current = setTimeout(reset, IDLE_MS)
    return () => idleTimer.current && clearTimeout(idleTimer.current)
  }, [screen, dni, pin, reg, reset])
  useEffect(() => { lastActRef.current = Date.now() }, [screen, showCarta, showMovs, showCanjes, showGiro])

  // Música del Club: arranca al cargar (con el flag de kiosk) o al primer toque;
  // se pausa mientras el juego está abierto y vuelve al cerrarlo.
  useEffect(() => {
    if (showGiro) musicaClubPause()
    else musicaClubPlay()
  }, [showGiro])

  // Diálogo con Fortuna Dorada (iframe): al abrirse pide init (le pasamos el
  // token para que gire contra el servidor); cada giro jugado refresca el
  // estado y, agotada la ventana, se destaca el "Volver al Club".
  const [giroJugado, setGiroJugado] = useState(false)
  const [spinRefresh, setSpinRefresh] = useState(0)
  useEffect(() => {
    function onMsg(e) {
      if (!e?.data?.tipo) return
      if (e.data.tipo === 'listo' && player?.token && !DEMO) {
        try { e.source.postMessage({ tipo: 'init', token: player.token, apiBase: API_BASE, kioskKey: kioskKey() }, '*') } catch { /* iframe cerrado */ }
      }
      if (e.data.tipo === 'actividad') { lastActRef.current = Date.now(); return }
      if (e.data.tipo === 'giro-jugado' && player) {
        if (DEMO) demoApi.registerDemoSpin(player.token, e.data.premio)
        setSpinRefresh(k => k + 1)
        if (typeof e.data.left === 'number' && e.data.left <= 0) setGiroJugado(true)
        if (e.data.premio) refrescarCuenta() // premio en puntos -> saldo y movimientos al día
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [player]) // eslint-disable-line react-hooks/exhaustive-deps

  // Home del socio: torneo activo (para la inscripción 1-toque). Si el lookup
  // ya dijo que está inscripto, la tarjeta lo refleja sin que tenga que tocar.
  useEffect(() => {
    if (screen !== 'done') return
    getActiveTournament().then(r => setTourney(r?.active || r?.tournament || null)).catch(() => setTourney(null))
    if (lookup?.tournament?.registered) {
      setTourneyReg({ alreadyRegistered: true, registrationNo: lookup.tournament.registrationNo })
    }
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps

  const SOLO_EN_SALA = 'Esto solo se puede hacer en la Máquina del Club, en la sala.'
  async function inscribirTorneo() {
    if (!player || tourneyBusy) return
    if (!vinculada) { setErr(SOLO_EN_SALA); return }
    // Modo prueba (/kiosk?test=1): simula la inscripción sin tocar la base real
    if (new URLSearchParams(window.location.search).has('test')) {
      setTourneyReg({ ok: true, registrationNo: 99 })
      setShowTorneoOk(true)
      voz('torneo-inscripto')
      return
    }
    setTourneyBusy(true); setErr('')
    try {
      const r = await kioskInscribeTournament({ dni: player.dni || dni, name: player.name, tel: player.tel || lookup?.player?.tel || '', email: player.email || lookup?.player?.email || '' })
      setTourneyReg(r)
      setShowTorneoOk(true)
      voz('torneo-inscripto')
    } catch (e) {
      console.error('inscripcion torneo:', e)
      setErr('No pudimos completar tu inscripción. Consultá en la barra.')
    } finally { setTourneyBusy(false) }
  }

  const [demoGiros, setDemoGiros] = useState(3)
  function jugarGiro() {
    if (DEMO && player?.token) setDemoGiros(demoApi.demoSpinsLeft(player.token))
    setShowGiro(true) // el juego pide init y gira contra el servidor
  }

  // Movimientos y Canjes: dos mundos separados (extracto vs catálogo)
  const [movs, setMovs] = useState([])
  const [rewards, setRewards] = useState([])
  const [busyReward, setBusyReward] = useState(null)
  const [canjeados, setCanjeados] = useState({}) // rewardId -> true (canje pedido en esta sesión)
  function refrescarCuenta() {
    if (!player?.token) return
    getLoyaltyMe(player.token).then(me => {
      setMovs(me.transactions || [])
      if (typeof me.balance === 'number') setBalance(me.balance)
    }).catch(() => {})
  }
  function abrirMovs() {
    voz('movimientos')
    setShowMovs(true)
    refrescarCuenta()
  }
  function abrirCanjes() {
    setShowCanjes(true)
    voz('canjes')
    refrescarCuenta()
    getLoyaltyCatalog().then(c => setRewards((c.rewards || []).sort((a, b) => a.points - b.points))).catch(() => {})
  }
  // Todo lo que descuenta puntos pide un segundo toque: en una pantalla táctil
  // un roce alcanza para "canjear" sin querer.
  const [confirmar, setConfirmar] = useState(null) // { titulo, texto, okLabel, onOk }
  // Bases de Jackpoints: el alta exige aceptarlas; los socios anteriores las
  // aceptan una vez al entrar. Se pueden leer completas en una ventana.
  const [aceptoBases, setAceptoBases] = useState(false)
  const [verBases, setVerBases] = useState(false)
  const [aceptandoBases, setAceptandoBases] = useState(false)
  async function entrarConSocio(p) {
    if (!p.termsAccepted) { setPlayer(p); setScreen('terminos'); return }
    const c = await loyaltyCheckin(p.token).catch(() => null)
    setPlayer(p); setCheckin(c); setBalance(c?.balance ?? 0); setScreen('done')
  }
  async function aceptarBasesYEntrar() {
    if (aceptandoBases || !player?.token) return
    setAceptandoBases(true); setErr('')
    try {
      await kioskAcceptTerms(player.token)
      await entrarConSocio({ ...player, termsAccepted: true })
    } catch { setErr('No pudimos registrar tu aceptacion. Proba de nuevo.') }
    finally { setAceptandoBases(false) }
  }
  function canjear(reward) {
    if (busyReward || balance < reward.points || !player?.token) return
    if (!vinculada) { setErr(SOLO_EN_SALA); return }
    setConfirmar({
      titulo: '¿CONFIRMÁS EL CANJE?',
      texto: `Te descontaremos ${reward.points.toLocaleString('es-AR')} puntos por ${reward.name}. Te quedan ${(balance - reward.points).toLocaleString('es-AR')}.`,
      okLabel: 'SÍ, CANJEAR',
      onOk: () => ejecutarCanje(reward),
    })
  }
  async function ejecutarCanje(reward) {
    if (busyReward || balance < reward.points || !player?.token) return
    setBusyReward(reward.id)
    try {
      await redeemLoyaltyReward(player.token, reward.id)
      setCanjeados(c => ({ ...c, [reward.id]: true }))
      // the "Listo" note shows for a few seconds, then the card goes back to normal
      setTimeout(() => setCanjeados(c => { const n = { ...c }; delete n[reward.id]; return n }), 4500)
      voz(vozCanje(reward.category))
      refrescarCuenta()
    } catch {
      setErr('No pudimos completar el canje. Consultá en la barra.')
    } finally { setBusyReward(null) }
  }

  // Datos faltantes: si al socio le falta tel o email, el Home se lo pide amable
  const [showDatos, setShowDatos] = useState(false)
  const [datosForm, setDatosForm] = useState({ tel: '', email: '' })
  const [datosOk, setDatosOk] = useState(false)
  const [datosBusy, setDatosBusy] = useState(false)
  const telActual = player?.tel || lookup?.player?.tel || ''
  const emailActual = player?.email || lookup?.player?.email || ''
  const faltanDatos = !datosOk && (!telActual || !emailActual)
  function abrirDatos() {
    voz('mis-datos')
    setDatosForm({ tel: telActual, email: emailActual })
    setShowDatos(true)
  }
  async function guardarDatos() {
    if (datosBusy) return
    const telNuevo = datosForm.tel.trim() || telActual
    const emailNuevo = datosForm.email.trim() || emailActual
    setDatosBusy(true); setErr('')
    try {
      await promoUpdateContact({ dni: player?.dni || dni, tel: telNuevo, email: emailNuevo })
      // refrescar lo mostrado sin re-loguear
      setLookup(l => l ? { ...l, player: { ...l.player, tel: telNuevo, email: emailNuevo } } : l)
      setDatosOk(true); setShowDatos(false)
      // the backend sends the courtesy voucher only on the FIRST email saved
      voz(!emailActual && emailNuevo ? 'cortesia-email' : 'ui-tap', !emailActual && emailNuevo ? 0.95 : 0.7)
    } catch {
      setErr('No pudimos guardar tus datos. Consultá en la barra.')
    } finally { setDatosBusy(false) }
  }

  // Cupón del sorteo: FÍSICO — se imprime y va a la urna, uno por visita/día.
  // La impresión real (impresora del gabinete / térmica ESC-POS) se conecta después.
  const [cuponEstado, setCuponEstado] = useState('') // '' | 'imprimiendo' | 'listo'
  // el cupo diario lo decide el servidor (raffle_per_day): asi se puede subir
  // para pruebas y bajar a 1 sin tocar la maquina
  // Pack de cupones por puntos: el servidor manda precio, tamaño y si hoy ya lo usó
  const [pack, setPack] = useState(null)
  const [sorteoMonto, setSorteoMonto] = useState(150000) // lo manda el servidor (panel: Sorteo)
  const [packEstado, setPackEstado] = useState('') // '' | 'canjeando' | 'listo'
  useEffect(() => {
    if (screen !== 'done' || !player?.token) return
    loyaltyRaffleStatus(player.token).then(r => {
      if (!r.puede) setCuponEstado('listo')
      setPack(r.pack || null)
      if (r.monto) setSorteoMonto(r.monto)
      if (r.pack && !r.pack.puede) setPackEstado('listo')
    }).catch(() => {})
  }, [screen, player])
  function canjearPack() {
    if (packEstado || !pack || balance < pack.points) return
    if (!vinculada) { setErr(SOLO_EN_SALA); return }
    setConfirmar({
      titulo: '¿CONFIRMÁS EL PACK?',
      texto: `Te descontaremos ${pack.points.toLocaleString('es-AR')} puntos por ${pack.size} cupones del sorteo. Te quedan ${(balance - pack.points).toLocaleString('es-AR')}.`,
      okLabel: `SÍ, QUIERO LOS ${pack.size} CUPONES`,
      onOk: () => ejecutarPack(),
    })
  }
  async function ejecutarPack() {
    if (packEstado || !pack) return
    setPackEstado('canjeando')
    try {
      const r = await loyaltyRafflePack(player.token)   // descuenta los puntos e imprime los cupones
      if (typeof r.balance === 'number') setBalance(r.balance)
      voz('cupones-pack')
      lastActRef.current = Date.now()
      setPackEstado('listo')
      if (DEMO) setTimeout(() => setPackEstado(''), 6000) // demo: let testers repeat it
    } catch (err) {
      setPackEstado(/hoy/i.test(err.message || '') ? 'listo' : '')
      if (!/hoy/i.test(err.message || '')) setErr('No pudimos canjear el pack. Probá de nuevo o consultá en la barra.')
    }
  }
  async function imprimirCupon() {
    if (cuponEstado) return
    setCuponEstado('imprimiendo')
    try {
      const r = await loyaltyRaffleTicket(player.token)   // registra el cupon y lo manda a la termica
      voz('cupon')
      lastActRef.current = Date.now()
      setTimeout(() => setCuponEstado(r.puede && !DEMO ? '' : 'listo'), 3500)
      if (DEMO) setTimeout(() => setCuponEstado(''), 9500) // demo: show 'listo', then allow another
    } catch (err) {
      // 429 = ya uso el cupo de hoy; cualquier otra cosa, que pueda reintentar
      setCuponEstado(/hoy|cupo/i.test(err.message || '') ? 'listo' : '')
    }
  }

  // Modo atracción: en idle, una frase de voz rotativa cada ATTRACT_MS
  // (suena sola solo si Chrome corre con --autoplay-policy=no-user-gesture-required).
  const screenRef = useRef(screen)
  screenRef.current = screen
  useEffect(() => {
    if (screen !== 'idle') {
      // saliendo de idle: si una frase de atracción quedó sonando, se corta
      try { if (vozActual && !vozActual.ended && vozActual.src.includes('atraccion')) vozActual.pause() } catch { /* sin audio */ }
      return
    }
    let n = 0
    const t = setInterval(() => {
      if (screenRef.current !== 'idle') return // doble guarda anti-carrera
      voz(`atraccion-${(n % 4) + 1}`); n++
    }, ATTRACT_MS)
    return () => clearInterval(t)
  }, [screen])

  // Voces del resultado: check-in, ya-sumaste-hoy, socio nuevo
  useEffect(() => {
    if (screen !== 'done') return
    const esNuevo = player?.created_at && Date.now() - new Date(player.created_at).getTime() < 60000
    if (esNuevo) voz('nuevo-socio')
    else if (checkin?.granted) voz('checkin')
    if (checkin?.birthday?.granted) vozDespues('cumple')
    // alreadyToday: sin voz — si entra varias veces en el día no hace falta repetírselo
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps

  const faltaCumple = !!checkin?.birthday && !checkin.birthday.set && !cumpleListo
  function abrirCumple() {
    voz('ui-tap', 0.7)
    setCumpleDigits(''); setCumpleErr(''); setShowCumple(true)
  }
  async function guardarCumple() {
    if (cumpleBusy) return
    if (cumpleDigits.length !== 8) { setCumpleErr('Completá día, mes y año.'); return }
    const day = Number(cumpleDigits.slice(0, 2)), month = Number(cumpleDigits.slice(2, 4)), year = Number(cumpleDigits.slice(4))
    setCumpleBusy(true); setCumpleErr('')
    try {
      await kioskSetBirthday(player.token, { day, month, year })
      setCumpleListo(true); setShowCumple(false); setCumpleGracias(true)
      voz('cumple-guardado')
      setTimeout(() => setCumpleGracias(false), 6500)
    } catch (e) {
      setCumpleErr(e.message || 'No pudimos guardar tu cumpleaños. Consultá en la barra.')
      if (/ya está cargado/i.test(e.message || '')) setCumpleListo(true)
    } finally { setCumpleBusy(false) }
  }

  async function submitDni() {
    if (!vinculada) { setErr(SOLO_EN_SALA); return }
    if (!/^\d{7,8}$/.test(dni)) { setErr('El DNI son 7 u 8 números'); return }
    setBusy(true); setErr('')
    try {
      const r = await kioskLookupDni(dni)
      setLookup(r)
      // Importado del torneo con PIN temporal aleatorio -> crea su PIN primero
      setScreen(!r.exists ? 'register' : r.player?.needsPin ? 'crearpin' : 'pin')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  // Primera vez de un importado: crea su PIN y entra directo (login + check-in)
  async function submitCrearPin() {
    if (!/^\d{4}$/.test(pin)) { setErr('El PIN son 4 números'); return }
    setBusy(true); setErr('')
    try {
      await clubCreatePin(dni, pin)
      const p = await kioskLogin(dni, pin)
      await entrarConSocio(p)
    } catch (e) {
      setErr('No pudimos crear tu PIN. Probá de nuevo o consultá en la barra.')
    } finally { setBusy(false) }
  }

  async function submitPin() {
    if (!/^\d{4}$/.test(pin)) { setErr('El PIN son 4 números'); return }
    setBusy(true); setErr('')
    try {
      const p = await kioskLogin(dni, pin)
      await entrarConSocio(p)
    } catch (e) {
      setErr('PIN incorrecto. Probá de nuevo — y si no te sale, en la barra te ayudamos con tu DNI.')
      setPin('')
    } finally { setBusy(false) }
  }

  async function submitRegister() {
    if (!nombreCompleto(reg.name)) { setErr('Poné tu nombre y tu apellido.'); return }
    if (!telValido(reg.tel)) { setErr('Poné tu celular con la característica. Ej: 343 4123456'); return }
    if (!/^\d{4}$/.test(pin)) { setErr('El PIN son 4 números.'); return }
    if (!aceptoBases) { setErr('Para sumarte tenés que aceptar los términos y condiciones.'); return }
    setBusy(true); setErr('')
    try {
      const r = await kioskSignup({ dni, name: reg.name.trim(), tel: reg.tel.trim(), email: reg.email.trim(), pin, acceptTerms: true })
      const c = await loyaltyCheckin(r.player.token).catch(() => null)
      setPlayer(r.player); setCheckin(c); setBalance(c?.balance ?? r.balance ?? 0); setScreen('done')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const firstName = player?.name?.split(' ')[0] || ''
  const esNuevo = !!(player?.created_at && Date.now() - new Date(player.created_at).getTime() < 60000)

  return (
    <div
      className={DEMO ? 'kiosk kiosk--demo' : 'kiosk'}
      onClick={screen === 'idle' ? () => { voz('ui-tap', 0.7); setScreen('dni') } : undefined}
      onPointerDownCapture={() => { lastActRef.current = Date.now(); desbloquearAudio(); if (!showGiro) musicaClubPlay() }}
      onKeyDownCapture={() => { lastActRef.current = Date.now() }}
    >
      <div className="kiosk__bg" />
      {DEMO && <div className="kiosk__demo-badge">MODO PRUEBA · nada se guarda ni se imprime</div>}
      <div className="kiosk__vignette" />

      {/* ───────── IDLE ───────── */}
      {screen === 'idle' && (
        <div className="kiosk__idle">
          <img className="kiosk__logo" src="/jackpoints/logo.webp" alt="Jackpoints" onClick={tapSecreto} onError={e => { e.target.style.display = 'none' }} />
          <div className="kiosk__idle-kicker">★ Sala Crespo Club ★</div>
          <h1 className="kiosk__idle-title">Tu visita tiene premio</h1>
          <p className="kiosk__idle-sub">Registrá tu visita en 30 segundos y empezá a ganar HOY.</p>
          <div className="kiosk__perks">
            <div className="kiosk__perk kiosk__perk--star"><div className="kiosk__perk-art"><ArtFortuna /></div><span className="kiosk__perk-num kiosk__perk-num--brand">FORTUNA DORADA</span><span className="kiosk__perk-lbl">Tres giros gratis cada 3 horas (ganá puntos y tickets promocionales)</span></div>
            <div className="kiosk__perk"><div className="kiosk__perk-art"><ArtVisita /></div><span className="kiosk__perk-num kiosk__perk-num--brand">SUMÁ 50 PUNTOS POR TU VISITA</span><span className="kiosk__perk-lbl">Todos los días</span></div>
            <div className="kiosk__perk"><div className="kiosk__perk-art"><ArtSorteo /></div><span className="kiosk__perk-num kiosk__perk-num--brand">PARTICIPÁ DE SORTEOS</span><span className="kiosk__perk-lbl">Obtené cupones a diario</span></div>
            <div className="kiosk__perk"><div className="kiosk__perk-art"><ArtTorneo /></div><span className="kiosk__perk-num kiosk__perk-num--brand">TORNEOS DE SLOTS</span><span className="kiosk__perk-lbl">Inscribite acá y competí por premios</span></div>
          </div>
          <button className="kiosk__idle-btn">TOCÁ Y EMPEZÁ A GANAR</button>
          <p className="kiosk__idle-note">{vinculada ? 'Es gratis · Solo necesitás tu DNI' : 'Máquina no vinculada · el check-in y los giros solo funcionan en la Máquina del Club'}</p>
        </div>
      )}

      {/* ───────── DNI ───────── */}
      {screen === 'dni' && (
        <div className="kiosk__step">
          <button className="kiosk__back" onClick={reset}>← Cancelar</button>
          <h2 className="kiosk__h">Ingresá tu DNI</h2>
          <p className="kiosk__hint">Solo números, sin puntos ni espacios. Tu DNI es tu número de socio — no lo compartimos con nadie.</p>
          <div className="kiosk__display">{dni || <span className="kiosk__display-ph">00000000</span>}</div>
          {err && <div className="kiosk__err">{err}</div>}
          <Numpad
            onDigit={d => { if (dni.length < 8) { setDni(dni + d); setErr('') } }}
            onBack={() => setDni(dni.slice(0, -1))}
            onClear={() => setDni('')}
          />
          <button className="kiosk__cta" disabled={busy || dni.length < 7} onClick={submitDni}>
            {busy ? 'Buscando…' : 'Continuar'}
          </button>
        </div>
      )}

      {/* ───────── CREAR PIN (importado del torneo, primera vez) ───────── */}
      {screen === 'crearpin' && (
        <div className="kiosk__step">
          <button className="kiosk__back" onClick={reset}>← Cancelar</button>
          <h2 className="kiosk__h">¡Hola{lookup?.player?.name ? `, ${lookup.player.name.split(' ')[0]}` : ''}! Creá tu PIN</h2>
          <p className="kiosk__hint">Es tu primera vez en la máquina: elegí tu clave de socio, 4 números fáciles de recordar.</p>
          <Dots value={pin} len={4} />
          {err && <div className="kiosk__err">{err}</div>}
          <Numpad
            onDigit={d => { if (pin.length < 4) { setPin(pin + d); setErr('') } }}
            onBack={() => setPin(pin.slice(0, -1))}
            onClear={() => setPin('')}
          />
          <button className="kiosk__cta" disabled={busy || pin.length < 4} onClick={submitCrearPin}>
            {busy ? 'Creando…' : 'CREAR MI PIN Y ENTRAR'}
          </button>
        </div>
      )}

      {/* ───────── PIN (socio existente) ───────── */}
      {screen === 'pin' && (
        <div className="kiosk__step">
          <button className="kiosk__back" onClick={reset}>← Cancelar</button>
          <h2 className="kiosk__h">{lookup?.player?.name ? `¡Hola, ${lookup.player.name.split(' ')[0]}!` : 'Ingresá tu PIN'}</h2>
          <p className="kiosk__hint">Ingresá tu PIN — tu clave de socio de 4 números.</p>
          <Dots value={pin} len={4} />
          {err && <div className="kiosk__err">{err}</div>}
          <Numpad
            onDigit={d => { if (pin.length < 4) { setPin(pin + d); setErr('') } }}
            onBack={() => setPin(pin.slice(0, -1))}
            onClear={() => setPin('')}
          />
          <button className="kiosk__cta" disabled={busy || pin.length < 4} onClick={submitPin}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      )}

      {/* ───────── REGISTRO (socio nuevo) ───────── */}
      {screen === 'register' && (
        <div className="kiosk__step kiosk__step--reg">
          <button className="kiosk__back" onClick={reset}>← Cancelar</button>
          <h2 className="kiosk__h">¡Sumate al Club!</h2>
          <p className="kiosk__hint">Con estos datos ya sos socio y empezás a sumar puntos.</p>
          <div className="kiosk__form">
            <label className="kiosk__field">
              <span>Nombre y apellido</span>
              <input type="text" value={reg.name} maxLength={40} autoComplete="off"
                onChange={e => { setReg({ ...reg, name: e.target.value }); setErr('') }}
                placeholder="Ej. María González" />
            </label>
            <label className="kiosk__field">
              <span>Creá tu PIN (4 números)</span>
              <input type="tel" inputMode="numeric" value={pin} maxLength={4}
                onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErr('') }}
                placeholder="4 números fáciles de recordar" />
            </label>
            <label className="kiosk__field">
              <span>Celular<b className="kiosk__cortesia">Así te avisamos si ganás un premio o un sorteo</b></span>
              <input type="tel" inputMode="numeric" value={reg.tel} maxLength={15}
                onChange={e => { setReg({ ...reg, tel: e.target.value }); setErr('') }}
                placeholder="Ej. 343 4123456" />
            </label>
            <label className="kiosk__field">
              <span>Email <em>(opcional)</em><b className="kiosk__cortesia"><IconoBebida /> Completalo y recibí una bebida de cortesía</b></span>
              <input type="email" value={reg.email} maxLength={80} autoComplete="off"
                onChange={e => setReg({ ...reg, email: e.target.value })}
                placeholder="tu@email.com" />
            </label>
          </div>
          <label className="kiosk__acepto">
            <input type="checkbox" checked={aceptoBases} onChange={e => { setAceptoBases(e.target.checked); setErr('') }} />
            <span>Leí y acepto los <button type="button" className="kiosk__link" onClick={() => setVerBases(true)}>términos y condiciones de Jackpoints</button></span>
          </label>
          {err && <div className="kiosk__err">{err}</div>}
          <button className="kiosk__cta" disabled={busy || !aceptoBases} onClick={submitRegister}>
            {busy ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
          </button>
        </div>
      )}

      {/* ───────── ACEPTACIÓN DE BASES (socios anteriores, una vez) ───────── */}
      {screen === 'terminos' && (
        <div className="kiosk__step kiosk__step--reg">
          <button className="kiosk__back" onClick={reset}>← No acepto · salir</button>
          <h2 className="kiosk__h">Hola {player?.name?.split(' ')[0]}, una cosa antes</h2>
          <p className="kiosk__hint">Jackpoints tiene términos y condiciones. Para seguir usando tu cuenta necesitamos que los aceptes. Podés leerlos completos acá.</p>
          <button type="button" className="kiosk__cta kiosk__cta--pack" onClick={() => setVerBases(true)}>VER TÉRMINOS Y CONDICIONES</button>
          {err && <div className="kiosk__err">{err}</div>}
          <button className="kiosk__cta" disabled={aceptandoBases} onClick={aceptarBasesYEntrar}>
            {aceptandoBases ? 'Guardando…' : 'ACEPTO Y CONTINÚO'}
          </button>
        </div>
      )}

      {verBases && (
        <div className="kiosk__carta kiosk__confirm" onClick={() => setVerBases(false)}>
          <div className="kiosk__carta-panel kiosk__bases-panel" onClick={e => e.stopPropagation()}>
            <div className="kiosk__hub-title">TÉRMINOS Y CONDICIONES · JACKPOINTS</div>
            <iframe className="kiosk__bases-frame" src="/legal/bases-jackpoints.html" title="Bases y condiciones de Jackpoints" />
            <button className="kiosk__cta kiosk__cta--hub" onClick={() => setVerBases(false)}>VOLVER ✓</button>
          </div>
        </div>
      )}

      {/* ───────── HOME DEL SOCIO (post-login) ───────── */}
      {screen === 'done' && (
        <div className="kiosk__done">
          <div className="kiosk__done-saludo">
            <div className="kiosk__done-kicker">{esNuevo ? '¡Ya sos parte del Club!' : '¡Hola de nuevo!'}</div>
            <h1 className="kiosk__done-name">{firstName}</h1>
          </div>
          <img className="kiosk__done-logo" src="/jackpoints/logo.webp" alt="Jackpoints" onError={e => { e.target.style.display = 'none' }} />

          {checkin?.granted && (
            <div className="kiosk__done-row">
              <div className="kiosk__done-earned">✓ +50 puntos por tu visita de hoy</div>
            </div>
          )}
          {checkin?.birthday?.granted && (
            <div className="kiosk__done-row">
              <div className="kiosk__done-earned kiosk__done-earned--cumple"><IconoTorta size={30} /> ¡Feliz cumpleaños! +{checkin.birthday.points} puntos de regalo</div>
            </div>
          )}
          {(checkin?.alreadyToday || faltaCumple) && (
            <div className="kiosk__corner-stack">
              {checkin?.alreadyToday && <div className="kiosk__visita-corner">✓ Visita de hoy registrada</div>}
              {faltaCumple && (
                <button className="kiosk__cumple-bubble" onClick={abrirCumple}>
                  <span className="kiosk__cumple-ring"><IconoTorta size={34} /></span>
                  <span className="kiosk__cumple-txt"><small>Regalo especial</small>¿Cuándo es tu cumple?</span>
                </button>
              )}
            </div>
          )}

          <div className="kiosk__saldo-line">Tenés <strong>{balance.toLocaleString('es-AR')}</strong> puntos</div>

          <div className="kiosk__done-row">
            <button className="kiosk__mini-btn" onClick={abrirMovs}>MIS MOVIMIENTOS</button>
            <button className="kiosk__mini-btn" onClick={abrirDatos}>MIS DATOS</button>
            {faltanDatos && (
              <button className="kiosk__datos-hint" onClick={abrirDatos}>
                {!emailActual
                  ? <><IconoBebida /> Ingresá tu email y recibí una cortesía</>
                  : 'Te falta cargar tu teléfono'}
              </button>
            )}
          </div>

          {err && <div className="kiosk__err">{err}</div>}

          <div className="kiosk__hub">
            <div className="kiosk__hub-card kiosk__hub-card--giro kiosk__hub-card--art">
              <div className="kiosk__hub-title">FORTUNA DORADA</div>
              <FortunaEstado token={player?.token} refreshKey={spinRefresh} onJugar={jugarGiro}
                art={<div className="kiosk__hub-art"><ArtFortuna /></div>} />
            </div>

            <div className="kiosk__hub-card kiosk__hub-card--art">
              <div className="kiosk__hub-title">TORNEO DE SLOTS</div>
              <div className="kiosk__hub-sub">{tourney?.name ? tourney.name : 'Serie 2026'} · participá por $2.000.000</div>
              <div className="kiosk__hub-art"><ArtTorneo /></div>
              {tourneyReg ? (
                <div className="kiosk__hub-ok">✓ Ya estás inscripto{tourneyReg.registrationNo ? ` con el N° ${tourneyReg.registrationNo}` : ''} para participar por los $2.000.000 en la Gran Final{tourney?.tournament_date ? `. Te esperamos el ${fmtTorneoFecha(tourney.tournament_date)}` : ''}</div>
              ) : (
                <button className="kiosk__cta kiosk__cta--hub" disabled={tourneyBusy || !tourney} onClick={inscribirTorneo}>
                  {!tourney ? 'PRÓXIMAMENTE' : tourneyBusy ? 'Inscribiendo…' : 'INSCRIBIRME'}
                </button>
              )}
            </div>

            <div className="kiosk__hub-card">
              <div className="kiosk__hub-title">SORTEO DEL MES</div>
              <div className="kiosk__hub-sub">Imprimí tu cupón y participá por ${sorteoMonto.toLocaleString('es-AR')}</div>
              {cuponEstado === 'listo' ? (
                <div className="kiosk__hub-ok">✓ Cupón impreso — no olvides depositarlo en la urna</div>
              ) : cuponEstado === 'imprimiendo' ? (
                <div className="kiosk__hub-ok kiosk__hub-ok--proceso">Imprimiendo tu cupón…</div>
              ) : (
                <button className="kiosk__cta kiosk__cta--hub" onClick={imprimirCupon}>IMPRIMIR CUPÓN</button>
              )}
              {pack?.disponible && (
                packEstado === 'listo' ? (
                  <div className="kiosk__hub-ok">✓ Hoy ya canjeaste tu pack de {pack.size} cupones · mañana podés canjear otro pack</div>
                ) : packEstado === 'canjeando' ? (
                  <div className="kiosk__hub-ok kiosk__hub-ok--proceso">Imprimiendo tus {pack.size} cupones…</div>
                ) : balance >= pack.points ? (
                  <button className="kiosk__cta kiosk__cta--hub kiosk__cta--pack" onClick={canjearPack}>
                    +{pack.size} CUPONES POR {pack.points} PTS
                  </button>
                ) : (
                  <div className="kiosk__hub-sub kiosk__hub-sub--pack">Con {pack.points} puntos canjeás {pack.size} cupones más · te faltan {(pack.points - balance).toLocaleString('es-AR')}</div>
                )
              )}
            </div>

            <div className="kiosk__hub-card kiosk__hub-card--art">
              <div className="kiosk__hub-title">CANJEÁ TUS PUNTOS</div>
              <div className="kiosk__hub-sub">Convertilos en bebidas, comidas o tickets promocionales</div>
              <div className="kiosk__hub-art"><ArtCanjes /></div>
              <button className="kiosk__cta kiosk__cta--hub" onClick={abrirCanjes}>QUIERO CANJEAR</button>
            </div>

            <div className="kiosk__hub-card kiosk__hub-card--art">
              <div className="kiosk__hub-title">NUESTRA CARTA</div>
              <div className="kiosk__hub-sub">Conocé nuestra variedad y promociones</div>
              <div className="kiosk__hub-art"><ArtCarta /></div>
              <button className="kiosk__cta kiosk__cta--hub" onClick={() => { setShowCarta(true); voz('carta') }}>VER CARTA</button>
            </div>
          </div>

          <button className="kiosk__cta kiosk__cta--done" onClick={() => { voz('despedida'); reset() }}>SALIR · CERRAR SESIÓN</button>
        </div>
      )}

      {/* Contador de cierre de sesión del Home */}
      {screen === 'done' && (
        <SesionTimer
          lastActRef={lastActRef}
          // No pause while a panel is open: every touch or key restarts the 40 s, so a
          // member who walks away with Canjes open does not leave the session usable.
          paused={false}
          margen={showGiro ? 80000 : SESION_MS}
          onExpirar={reset}
        />
      )}

      {/* Cargar cumpleaños: teclado numérico DD MM AAAA */}
      {showCumple && (
        <div className="kiosk__carta" onClick={() => setShowCumple(false)}>
          <div className="kiosk__carta-panel kiosk__cumple-panel" onClick={e => e.stopPropagation()}>
            <IconoTorta size={64} />
            <div className="kiosk__cumple-title">¿Cuándo es tu cumple?</div>
            <p className="kiosk__carta-txt">El día de tu cumpleaños te espera un <b>regalo especial</b></p>
            <div className="kiosk__cumple-fields">
              {[['Día', 0, 2, 'DD'], ['Mes', 2, 4, 'MM'], ['Año', 4, 8, 'AAAA']].map(([label, from, to, ph]) => {
                const val = cumpleDigits.slice(from, to)
                const activo = cumpleDigits.length >= from && cumpleDigits.length < to
                return (
                  <div key={label} className={'kiosk__cumple-field' + (activo ? ' on' : '') + (to === 8 ? ' y' : '')}>
                    <span>{label}</span>
                    <div className={val ? '' : 'ph'}>{val || ph}</div>
                  </div>
                )
              })}
            </div>
            <Numpad
              onDigit={d => setCumpleDigits(v => (v.length < 8 ? v + d : v))}
              onBack={() => setCumpleDigits(v => v.slice(0, -1))}
              onClear={() => setCumpleDigits('')} />
            {cumpleErr && <div className="kiosk__err">{cumpleErr}</div>}
            <button className="kiosk__cta kiosk__cta--hub" disabled={cumpleBusy || cumpleDigits.length !== 8} onClick={guardarCumple}>
              {cumpleBusy ? 'Guardando…' : 'GUARDAR'}
            </button>
            <button className="kiosk__cumple-later" onClick={() => setShowCumple(false)}>Ahora no</button>
            <p className="kiosk__cumple-legal">Una vez guardada, la fecha solo se puede cambiar en la barra.</p>
          </div>
        </div>
      )}
      {cumpleGracias && (
        <div className="kiosk__carta" onClick={() => setCumpleGracias(false)}>
          <div className="kiosk__carta-panel kiosk__cumple-panel">
            <IconoTorta size={96} />
            <div className="kiosk__cumple-title">¡Listo, {firstName}!</div>
            <p className="kiosk__carta-txt">Te esperamos el <b>día de tu cumpleaños</b><br />con un regalo especial.</p>
          </div>
        </div>
      )}

      {/* Completar datos de contacto */}
      {confirmar && (
        <div className="kiosk__carta kiosk__confirm" onClick={() => setConfirmar(null)}>
          <div className="kiosk__carta-panel kiosk__confirm-panel" onClick={e => e.stopPropagation()}>
            <div className="kiosk__hub-title">{confirmar.titulo}</div>
            <p className="kiosk__carta-txt kiosk__confirm-txt">{confirmar.texto}</p>
            <div className="kiosk__confirm-btns">
              <button className="kiosk__cta kiosk__cta--hub kiosk__cta--pack" onClick={() => setConfirmar(null)}>NO, VOLVER</button>
              <button className="kiosk__cta kiosk__cta--hub" onClick={() => { const ok = confirmar.onOk; setConfirmar(null); ok() }}>{confirmar.okLabel}</button>
            </div>
          </div>
        </div>
      )}

      {showDatos && (
        <div className="kiosk__carta" onClick={() => setShowDatos(false)}>
          <div className="kiosk__carta-panel" onClick={e => e.stopPropagation()}>
            <div className="kiosk__hub-title">MIS DATOS</div>
            <p className="kiosk__carta-txt">{player?.name} · DNI {player?.dni || dni}<br />Editá lo que necesites — así te avisamos si ganás.</p>
            <div className="kiosk__form">
              <label className="kiosk__field">
                <span>Teléfono</span>
                <input type="tel" inputMode="numeric" value={datosForm.tel} maxLength={15}
                  onChange={e => setDatosForm(f => ({ ...f, tel: e.target.value }))}
                  placeholder="Ej. 3435 123456" />
              </label>
              <label className="kiosk__field">
                <span>Email {!emailActual && <b className="kiosk__cortesia"><IconoBebida /> Completalo y recibí una bebida de cortesía</b>}</span>
                <input type="email" value={datosForm.email} maxLength={80} autoComplete="off"
                  onChange={e => setDatosForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="tu@email.com" />
              </label>
            </div>
            {err && <div className="kiosk__err">{err}</div>}
            <div className="kiosk__done-row" style={{ width: '100%', marginBottom: 0 }}>
              <button className="kiosk__tab" onClick={() => setShowDatos(false)}>CERRAR</button>
              <button className="kiosk__cta kiosk__cta--hub" style={{ flex: 1 }} disabled={datosBusy} onClick={guardarDatos}>
                {datosBusy ? 'Guardando…' : 'GUARDAR ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inscripción al torneo confirmada */}
      {showTorneoOk && (
        <div className="kiosk__carta" onClick={() => setShowTorneoOk(false)}>
          <div className="kiosk__carta-panel" onClick={e => e.stopPropagation()}>
            <div className="kiosk__done-check">✓</div>
            <div className="kiosk__hub-title">{tourneyReg?.alreadyRegistered ? 'YA ESTABAS INSCRIPTO' : '¡ESTÁS EN EL TORNEO!'}</div>
            <p className="kiosk__carta-txt">
              {tourney?.name || 'Torneo de slots'}{tourneyReg?.registrationNo ? <><br /><strong>Tu número de inscripción: {tourneyReg.registrationNo}</strong></> : null}
              <br />Participás por los $2.000.000 en la Gran Final.
              <br />{tourney?.tournament_date ? `¡Te esperamos el ${fmtTorneoFecha(tourney.tournament_date)}!` : '¡Te esperamos para competir!'}
            </p>
            <button className="kiosk__cta kiosk__cta--hub" onClick={() => setShowTorneoOk(false)}>GENIAL ✓</button>
          </div>
        </div>
      )}

      {/* Carta: QR para verla en el celular */}
      {showCarta && (
        <div className="kiosk__carta" onClick={() => setShowCarta(false)}>
          <div className="kiosk__carta-panel" onClick={e => e.stopPropagation()}>
            <div className="kiosk__hub-title">NUESTRA CARTA</div>
            <div className="kiosk__carta-row">
              <video className="kiosk__carta-mascotas" src="/mascotas-carta.mp4" autoPlay muted loop playsInline />
              <img className="kiosk__carta-qr" src="/carta-qr.png" alt="QR de la carta" />
            </div>
            <p className="kiosk__carta-txt">Escaneala con la cámara de tu celular.<br />Luego podés pedir lo que quieras en la barra. <strong>¡Tus puntos valen!</strong></p>
            <button className="kiosk__cta kiosk__cta--hub" onClick={() => setShowCarta(false)}>LISTO ✓</button>
          </div>
        </div>
      )}

      {/* Mis Movimientos: el extracto de la cuenta (sumas y descuentos) */}
      {showMovs && (
        <div className="kiosk__carta" onClick={() => setShowMovs(false)}>
          <div className="kiosk__carta-panel kiosk__puntos" onClick={e => e.stopPropagation()}>
            <div className="kiosk__hub-title">MIS MOVIMIENTOS</div>
            <div className="kiosk__puntos-saldo">{balance.toLocaleString('es-AR')} <span>puntos</span></div>
            <div className="kiosk__puntos-col kiosk__puntos-col--solo">
              {movs.length === 0 && <p className="kiosk__carta-txt">Todavía no hay movimientos.</p>}
              {movs.map(t => (
                <div key={t.id} className="kiosk__mov">
                  <div className="kiosk__mov-info">
                    <div className="kiosk__mov-lbl">{t.reason || TX_LABELS[t.kind] || t.kind}</div>
                    <div className="kiosk__mov-fecha">{fmtTxFecha(t.created_at)}</div>
                  </div>
                  <div className={`kiosk__mov-pts ${t.points < 0 ? 'kiosk__mov-pts--menos' : ''}`}>
                    {t.points >= 0 ? '+' : ''}{t.points.toLocaleString('es-AR')}
                  </div>
                </div>
              ))}
            </div>
            <button className="kiosk__cta kiosk__cta--volver" onClick={() => setShowMovs(false)}>← VOLVER</button>
          </div>
        </div>
      )}

      {/* Canjes: vidriera del catálogo — primero lo que YA puede llevarse */}
      {showCanjes && (
        <div className="kiosk__carta" onClick={() => setShowCanjes(false)}>
          <div className="kiosk__carta-panel kiosk__puntos kiosk__puntos--ancho" onClick={e => e.stopPropagation()}>
            <div className="kiosk__hub-title">CANJEÁ TUS PUNTOS</div>
            <div className="kiosk__puntos-saldo">{balance.toLocaleString('es-AR')} <span>puntos</span></div>
            <div className="kiosk__puntos-col kiosk__puntos-col--canjes">
              {rewards.length === 0 && <p className="kiosk__carta-txt">Cargando el catálogo…</p>}
              {rewards.length > 0 && !rewards.some(r => balance >= r.points) && (
                <div className="kiosk__canje-aviso">Todavía no llegás a ningún premio con tus puntos — ¡seguí sumando, cada visita te acerca!</div>
              )}
              <div className="kiosk__tabs">
                <button className={`kiosk__tab ${canjeTab === 'tickets' ? 'kiosk__tab--on' : ''}`} onClick={() => setCanjeTab('tickets')}><IconTicket />TICKETS PROMOCIONALES</button>
                <button className={`kiosk__tab ${canjeTab === 'consumo' ? 'kiosk__tab--on' : ''}`} onClick={() => setCanjeTab('consumo')}><IconCopa />BEBIDAS Y COMIDAS</button>
              </div>
              {/* both sections share one cell: the panel keeps the height of the larger one */}
              <div className="kiosk__canje-stack">
              {['tickets', 'consumo'].map(tab => (
              <div key={tab} className={'kiosk__canje-grid kiosk__canje-grid--' + tab + (canjeTab === tab ? '' : ' kiosk__canje-grid--oculto')} aria-hidden={canjeTab !== tab}>
                {(() => {
                  // only the closest locked reward says how many points are missing;
                  // the rest show a progress bar (less noise on screen)
                  const tabRewards = rewards.filter(r => tab === 'tickets' ? r.category === 'ticket' : r.category !== 'ticket')
                  const locked = tabRewards.filter(r => balance < r.points).map(r => r.points)
                  const proximoPts = locked.length ? Math.min(...locked) : null
                  return rewards
                  .filter(r => tab === 'tickets' ? r.category === 'ticket' : r.category !== 'ticket')
                  .sort((a, b) => ((balance >= a.points ? 0 : 1) - (balance >= b.points ? 0 : 1)) || a.points - b.points)
                  .map(r => {
                    const puede = balance >= r.points
                    const enPromo = r.discount_pct > 0 && r.points_full > r.points
                    return (
                      <div key={r.id} className={`kiosk__canje ${puede ? 'kiosk__canje--ya' : 'kiosk__canje--no'} ${enPromo ? 'kiosk__canje--promo' : ''}`}>
                        {enPromo && <div className="kiosk__canje-promo">−{r.discount_pct}%</div>}
                        <div className="kiosk__canje-nombre">{r.name}</div>
                        <div className="kiosk__canje-pts">
                          {enPromo && <span className="kiosk__canje-antes">{r.points_full.toLocaleString('es-AR')}</span>}
                          {r.points.toLocaleString('es-AR')} pts
                        </div>
                        {canjeados[r.id] ? (
                          <div className="kiosk__mov-ok">✓ Listo. Retirá tu cupón y presentalo en la barra</div>
                        ) : puede ? (
                          <button className="kiosk__mov-btn" disabled={busyReward === r.id} onClick={() => canjear(r)}>
                            {busyReward === r.id ? 'Canjeando…' : 'CANJEAR'}
                          </button>
                        ) : (
                          r.points === proximoPts
                            ? <div className="kiosk__canje-falta kiosk__canje-falta--proximo">Te faltan {(r.points - balance).toLocaleString('es-AR')} pts</div>
                            : <div className="kiosk__canje-barra"><span style={{ width: `${Math.min(100, Math.round(balance / r.points * 100))}%` }} /></div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
              ))}
              </div>
            </div>
            <p className="kiosk__carta-txt">Una vez seleccionado el canje, se imprime un cupón: presentalo en la barra para retirarlo.</p>
            <button className="kiosk__cta kiosk__cta--volver" onClick={() => setShowCanjes(false)}>← VOLVER</button>
          </div>
        </div>
      )}

      {/* Fortuna Dorada en overlay: el slot completo dentro del kiosk */}
      {showGiro && (
        <div className="kiosk__carta">
          {/* v2 (3x3 + bonus) in trial at the venue; rollback = point back to /fortuna-dorada/ (v1 kept intact) */}
          <iframe src={DEMO ? `/fortuna-dorada-v2/index.html?demo=1&giros=${demoGiros}` : '/fortuna-dorada-v2/index.html'} title="Fortuna Dorada" allow="autoplay" />
          <button
            className={`kiosk__carta-close ${giroJugado ? 'kiosk__carta-close--destacado' : ''}`}
            onClick={() => { setShowGiro(false); setGiroJugado(false) }}
          >
            {giroJugado ? '← VOLVER AL CLUB' : '✕ Volver al Club'}
          </button>
        </div>
      )}
    </div>
  )
}
