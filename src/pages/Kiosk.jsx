import { useState, useEffect, useRef, useCallback } from 'react'
import { clubLookupDni, loginPlayer, clubSignup, clubCreatePin, loyaltyCheckin, getActiveTournament, promoInscribeTournament, promoUpdateContact, getLoyaltyMe, getLoyaltyCatalog, redeemLoyaltyReward, getSpinStatus, API_BASE, kioskKey } from '../api/client'
import './Kiosk.css'

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
function SesionTimer({ lastActRef, paused, onExpirar }) {
  const [rem, setRem] = useState(SESION_MS)
  useEffect(() => {
    if (paused) { setRem(SESION_MS); return }
    const iv = setInterval(() => {
      const r = SESION_MS - (Date.now() - lastActRef.current)
      setRem(r)
      if (r <= 0) onExpirar()
    }, 500)
    return () => clearInterval(iv)
  }, [lastActRef, paused, onExpirar])
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
function FortunaEstado({ token, refreshKey, onJugar }) {
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
      <div className="kiosk__hub-countdown">{fmtCountdown(cd)}</div>
      <div className="kiosk__hub-sub">Se están cargando tus {porVentana} giros gratis. Volvé en breve — ¡podrías obtener un premio!</div>
    </>
  )
  return (
    <>
      <div className="kiosk__hub-sub">
        {left === 1 ? '¡Te queda 1 giro en esta ronda!' : `Tenés ${left} giros gratis · premios y puntos`}
      </div>
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
function musicaClubPlay() {
  try {
    if (!musicaClub) {
      musicaClub = new Audio('/kiosk-audio/musica-club.mp3')
      musicaClub.loop = true; musicaClub.volume = 0.04
    }
    musicaClub.play().catch(() => {})
  } catch { /* sin audio no es fatal */ }
}
function musicaClubPause() { try { if (musicaClub) musicaClub.pause() } catch { /* idem */ } }

// Audio del kiosk: Chrome bloquea el play() cuando pasó demasiado tiempo desde
// el último toque (por ejemplo tras esperar al servidor en el login). Por eso
// los MP3 se precargan y se "desbloquean" con el primer toque de la pantalla:
// un play+pause en silencio deja a cada archivo habilitado para después.
const VOCES = ['atraccion-1', 'atraccion-2', 'atraccion-3', 'atraccion-4', 'checkin',
  'cumple', 'nuevo-socio', 'cupon', 'despedida', 'ya-checkin', 'ui-tap']
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
  Object.values(poolVoz).forEach(a => {
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
    if (adminTaps.current.n >= 5) window.location.href = '/admin'
  }

  const reset = useCallback(() => {
    setScreen('idle'); setDni(''); setPin(''); setPlayer(null); setBalance(0)
    setCheckin(null); setReg({ name: '', tel: '', email: '' }); setErr(''); setBusy(false)
    setTourney(null); setTourneyReg(null); setTourneyBusy(false); setShowTorneoOk(false); setShowCarta(false); setShowGiro(false)
    setShowMovs(false); setShowCanjes(false); setMovs([]); setCanjeados({}); setBusyReward(null); setGiroJugado(false); setCuponEstado(''); setLookup(null)
    setShowDatos(false); setDatosForm({ tel: '', email: '' }); setDatosOk(false); setDatosBusy(false)
  }, [])

  // Vinculación de la máquina: una sola vez, abrir /kiosk?key=LLAVE en el
  // gabinete guarda la llave (queda en el perfil de Chrome) y se limpia la URL.
  useEffect(() => {
    try {
      const k = new URLSearchParams(window.location.search).get('key')
      if (k) {
        localStorage.setItem('kiosk_key', k)
        window.history.replaceState({}, '', window.location.pathname)
      }
    } catch { /* sin storage */ }
  }, [])
  const vinculada = !!kioskKey()

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
      if (e.data.tipo === 'listo' && player?.token) {
        try { e.source.postMessage({ tipo: 'init', token: player.token, apiBase: API_BASE, kioskKey: kioskKey() }, '*') } catch { /* iframe cerrado */ }
      }
      if (e.data.tipo === 'giro-jugado' && player) {
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

  async function inscribirTorneo() {
    if (!player || tourneyBusy) return
    // Modo prueba (/kiosk?test=1): simula la inscripción sin tocar la base real
    if (new URLSearchParams(window.location.search).has('test')) {
      setTourneyReg({ ok: true, registrationNo: 99 })
      setShowTorneoOk(true)
      voz('ui-tap', 0.7)
      return
    }
    setTourneyBusy(true); setErr('')
    try {
      const r = await promoInscribeTournament({ dni: player.dni || dni, name: player.name, tel: player.tel || lookup?.player?.tel || '', email: player.email || lookup?.player?.email || '' })
      setTourneyReg(r)
      setShowTorneoOk(true)
      voz('ui-tap', 0.7)
    } catch (e) {
      console.error('inscripcion torneo:', e)
      setErr('No pudimos completar tu inscripción. Consultá en la barra.')
    } finally { setTourneyBusy(false) }
  }

  function jugarGiro() {
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
    setShowMovs(true)
    refrescarCuenta()
  }
  function abrirCanjes() {
    setShowCanjes(true)
    refrescarCuenta()
    getLoyaltyCatalog().then(c => setRewards((c.rewards || []).sort((a, b) => a.points - b.points))).catch(() => {})
  }
  async function canjear(reward) {
    if (busyReward || balance < reward.points || !player?.token) return
    setBusyReward(reward.id)
    try {
      await redeemLoyaltyReward(player.token, reward.id)
      setCanjeados(c => ({ ...c, [reward.id]: true }))
      voz('ui-tap', 0.7)
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
      voz('ui-tap', 0.7)
    } catch {
      setErr('No pudimos guardar tus datos. Consultá en la barra.')
    } finally { setDatosBusy(false) }
  }

  // Cupón del sorteo: FÍSICO — se imprime y va a la urna, uno por visita/día.
  // La impresión real (impresora del gabinete / térmica ESC-POS) se conecta después.
  const [cuponEstado, setCuponEstado] = useState('') // '' | 'imprimiendo' | 'listo'
  useEffect(() => {
    if (screen !== 'done' || !player) return
    try {
      if (localStorage.getItem(`kiosk_cupon_${player.dni || dni}`) === new Date().toDateString()) setCuponEstado('listo')
    } catch { /* sin storage */ }
  }, [screen, player, dni])
  function imprimirCupon() {
    if (cuponEstado) return
    setCuponEstado('imprimiendo')
    voz('cupon')
    setTimeout(() => {
      try { localStorage.setItem(`kiosk_cupon_${player.dni || dni}`, new Date().toDateString()) } catch {}
      setCuponEstado('listo')
    }, 3500)
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
    // alreadyToday: sin voz — si entra varias veces en el día no hace falta repetírselo
  }, [screen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitDni() {
    if (!/^\d{7,8}$/.test(dni)) { setErr('El DNI son 7 u 8 números'); return }
    setBusy(true); setErr('')
    try {
      const r = await clubLookupDni(dni)
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
      const p = await loginPlayer(dni, pin)
      const c = await loyaltyCheckin(p.token).catch(() => null)
      setPlayer(p); setCheckin(c); setBalance(c?.balance ?? 0); setScreen('done')
    } catch (e) {
      setErr('No pudimos crear tu PIN. Probá de nuevo o consultá en la barra.')
    } finally { setBusy(false) }
  }

  async function submitPin() {
    if (!/^\d{4}$/.test(pin)) { setErr('El PIN son 4 números'); return }
    setBusy(true); setErr('')
    try {
      const p = await loginPlayer(dni, pin)
      const c = await loyaltyCheckin(p.token).catch(() => null)
      setPlayer(p); setCheckin(c); setBalance(c?.balance ?? 0); setScreen('done')
    } catch (e) {
      setErr('PIN incorrecto. Probá de nuevo — y si no te sale, en la barra te ayudamos con tu DNI.')
      setPin('')
    } finally { setBusy(false) }
  }

  async function submitRegister() {
    if (reg.name.trim().length < 3) { setErr('Escribí tu nombre'); return }
    if (!/^\d{4}$/.test(pin)) { setErr('El PIN son 4 números.'); return }
    setBusy(true); setErr('')
    try {
      const r = await clubSignup({ dni, name: reg.name.trim(), tel: reg.tel.trim(), email: reg.email.trim(), pin })
      const c = await loyaltyCheckin(r.player.token).catch(() => null)
      setPlayer(r.player); setCheckin(c); setBalance(c?.balance ?? r.balance ?? 0); setScreen('done')
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const firstName = player?.name?.split(' ')[0] || ''
  const esNuevo = !!(player?.created_at && Date.now() - new Date(player.created_at).getTime() < 60000)

  return (
    <div
      className="kiosk"
      onClick={screen === 'idle' ? () => { voz('ui-tap', 0.7); setScreen('dni') } : undefined}
      onPointerDownCapture={() => { lastActRef.current = Date.now(); desbloquearAudio(); if (!showGiro) musicaClubPlay() }}
    >
      <div className="kiosk__bg" />
      <div className="kiosk__vignette" />

      {/* ───────── IDLE ───────── */}
      {screen === 'idle' && (
        <div className="kiosk__idle">
          <img className="kiosk__logo" src="/club-logo.png" alt="Sala Crespo Club" onClick={tapSecreto} onError={e => { e.target.style.display = 'none' }} />
          <div className="kiosk__idle-kicker">★ Sala Crespo Club ★</div>
          <h1 className="kiosk__idle-title">Tu visita tiene premio</h1>
          <p className="kiosk__idle-sub">Registrá tu visita en 30 segundos y empezá a ganar HOY.</p>
          <div className="kiosk__perks">
            <div className="kiosk__perk kiosk__perk--star"><span className="kiosk__perk-num kiosk__perk-num--brand">FORTUNA DORADA</span><span className="kiosk__perk-lbl">Dos giros gratis cada 3 horas (ganá puntos y tickets promocionales)</span></div>
            <div className="kiosk__perk"><span className="kiosk__perk-num kiosk__perk-num--brand">SUMÁ 50 PUNTOS POR TU VISITA</span><span className="kiosk__perk-lbl">Todos los días</span></div>
            <div className="kiosk__perk"><span className="kiosk__perk-num kiosk__perk-num--brand">PARTICIPÁ DE SORTEOS</span><span className="kiosk__perk-lbl">Obtené cupones a diario</span></div>
            <div className="kiosk__perk"><span className="kiosk__perk-num kiosk__perk-num--brand">TORNEOS DE SLOTS</span><span className="kiosk__perk-lbl">Inscribite acá y competí por premios</span></div>
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
              <span>Tu nombre</span>
              <input type="text" value={reg.name} maxLength={40} autoComplete="off"
                onChange={e => { setReg({ ...reg, name: e.target.value }); setErr('') }}
                placeholder="Nombre y apellido" />
            </label>
            <label className="kiosk__field">
              <span>Creá tu PIN (4 números)</span>
              <input type="tel" inputMode="numeric" value={pin} maxLength={4}
                onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErr('') }}
                placeholder="4 números fáciles de recordar" />
            </label>
            <label className="kiosk__field">
              <span>Teléfono <em>(opcional)</em></span>
              <input type="tel" inputMode="numeric" value={reg.tel} maxLength={15}
                onChange={e => setReg({ ...reg, tel: e.target.value })}
                placeholder="Ej. 3435 123456" />
            </label>
            <label className="kiosk__field">
              <span>Email <em>(opcional)</em><b className="kiosk__cortesia"><IconoBebida /> Completalo y recibí una bebida de cortesía</b></span>
              <input type="email" value={reg.email} maxLength={80} autoComplete="off"
                onChange={e => setReg({ ...reg, email: e.target.value })}
                placeholder="tu@email.com" />
            </label>
          </div>
          {err && <div className="kiosk__err">{err}</div>}
          <button className="kiosk__cta" disabled={busy} onClick={submitRegister}>
            {busy ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
          </button>
        </div>
      )}

      {/* ───────── HOME DEL SOCIO (post-login) ───────── */}
      {screen === 'done' && (
        <div className="kiosk__done">
          <div className="kiosk__done-saludo">
            <div className="kiosk__done-kicker">{esNuevo ? '¡Ya sos parte del Club!' : '¡Hola de nuevo!'}</div>
            <h1 className="kiosk__done-name">{firstName}</h1>
          </div>
          <img className="kiosk__done-logo" src="/club-logo.png" alt="Sala Crespo Club" onError={e => { e.target.style.display = 'none' }} />

          {checkin?.granted && (
            <div className="kiosk__done-row">
              <div className="kiosk__done-earned">✓ +50 puntos por tu visita de hoy</div>
            </div>
          )}
          {checkin?.alreadyToday && <div className="kiosk__visita-corner">✓ Visita de hoy registrada</div>}

          <div className="kiosk__saldo-line">Tenés <strong>{balance.toLocaleString('es-AR')}</strong> puntos</div>

          <div className="kiosk__done-row">
            <button className="kiosk__mini-btn" onClick={abrirMovs}>MIS MOVIMIENTOS</button>
            <button className="kiosk__mini-btn" onClick={abrirDatos}>
              {faltanDatos && !emailActual
                ? <span className="kiosk__mini-btn-cortesia"><IconoBebida /> COMPLETÁ TU EMAIL — HAY CORTESÍA</span>
                : faltanDatos ? 'MIS DATOS — FALTA TU TELÉFONO' : 'MIS DATOS'}
            </button>
          </div>

          {err && <div className="kiosk__err">{err}</div>}

          <div className="kiosk__hub">
            <div className="kiosk__hub-card kiosk__hub-card--giro">
              <div className="kiosk__hub-title">FORTUNA DORADA</div>
              <FortunaEstado token={player?.token} refreshKey={spinRefresh} onJugar={jugarGiro} />
            </div>

            <div className="kiosk__hub-card">
              <div className="kiosk__hub-title">TORNEO DE SLOTS</div>
              <div className="kiosk__hub-sub">{tourney?.name ? tourney.name : 'Serie 2026'} · participá por $2.000.000</div>
              {tourneyReg ? (
                <div className="kiosk__hub-ok">✓ Ya estás participando{tourneyReg.registrationNo ? ` con el N° ${tourneyReg.registrationNo}` : ''} por los $2.000.000</div>
              ) : (
                <button className="kiosk__cta kiosk__cta--hub" disabled={tourneyBusy || !tourney} onClick={inscribirTorneo}>
                  {!tourney ? 'PRÓXIMAMENTE' : tourneyBusy ? 'Inscribiendo…' : 'INSCRIBIRME'}
                </button>
              )}
            </div>

            <div className="kiosk__hub-card">
              <div className="kiosk__hub-title">SORTEO DEL MES</div>
              <div className="kiosk__hub-sub">Imprimí tu cupón y participá por $100.000</div>
              {cuponEstado === 'listo' ? (
                <div className="kiosk__hub-ok">✓ Cupón impreso — no olvides depositarlo en la urna</div>
              ) : cuponEstado === 'imprimiendo' ? (
                <div className="kiosk__hub-ok kiosk__hub-ok--proceso">Imprimiendo tu cupón…</div>
              ) : (
                <button className="kiosk__cta kiosk__cta--hub" onClick={imprimirCupon}>IMPRIMIR CUPÓN</button>
              )}
            </div>

            <div className="kiosk__hub-card">
              <div className="kiosk__hub-title">CANJEÁ TUS PUNTOS</div>
              <div className="kiosk__hub-sub">Convertilos en bebidas, comidas o tickets promocionales</div>
              <button className="kiosk__cta kiosk__cta--hub" onClick={abrirCanjes}>QUIERO CANJEAR</button>
            </div>

            <div className="kiosk__hub-card">
              <div className="kiosk__hub-title">NUESTRA CARTA</div>
              <div className="kiosk__hub-sub">Conocé nuestra variedad y promociones</div>
              <button className="kiosk__cta kiosk__cta--hub" onClick={() => setShowCarta(true)}>VER CARTA</button>
            </div>
          </div>

          <button className="kiosk__cta kiosk__cta--done" onClick={() => { voz('despedida'); reset() }}>SALIR · CERRAR SESIÓN</button>
        </div>
      )}

      {/* Contador de cierre de sesión del Home */}
      {screen === 'done' && (
        <SesionTimer lastActRef={lastActRef} paused={showGiro || showCarta || showMovs || showCanjes || showTorneoOk || showDatos} onExpirar={reset} />
      )}

      {/* Completar datos de contacto */}
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
              <br />¡Te esperamos para competir!
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
            <p className="kiosk__carta-txt">Escaneala con tu celu y mirala tranquilo.<br />Pedís en la barra — <strong>tus puntos valen</strong>.</p>
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
            <button className="kiosk__cta kiosk__cta--hub" onClick={() => setShowMovs(false)}>VOLVER ✓</button>
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
                <button className={`kiosk__tab ${canjeTab === 'tickets' ? 'kiosk__tab--on' : ''}`} onClick={() => setCanjeTab('tickets')}>TICKETS PROMOCIONALES</button>
                <button className={`kiosk__tab ${canjeTab === 'consumo' ? 'kiosk__tab--on' : ''}`} onClick={() => setCanjeTab('consumo')}>BEBIDAS Y COMIDAS</button>
              </div>
              <div className="kiosk__canje-grid">
                {rewards
                  .filter(r => canjeTab === 'tickets' ? r.category === 'ticket' : r.category !== 'ticket')
                  .sort((a, b) => ((balance >= a.points ? 0 : 1) - (balance >= b.points ? 0 : 1)) || a.points - b.points)
                  .map(r => {
                    const puede = balance >= r.points
                    return (
                      <div key={r.id} className={`kiosk__canje ${puede ? 'kiosk__canje--ya' : 'kiosk__canje--no'}`}>
                        <div className="kiosk__canje-nombre">{r.name}</div>
                        <div className="kiosk__canje-pts">{r.points.toLocaleString('es-AR')} pts</div>
                        {canjeados[r.id] ? (
                          <div className="kiosk__mov-ok">✓ Cupón impreso — a la barra</div>
                        ) : puede ? (
                          <button className="kiosk__mov-btn" disabled={busyReward === r.id} onClick={() => canjear(r)}>
                            {busyReward === r.id ? 'Canjeando…' : 'CANJEAR'}
                          </button>
                        ) : (
                          <div className="kiosk__canje-falta">Te faltan {(r.points - balance).toLocaleString('es-AR')}</div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
            <p className="kiosk__carta-txt">Una vez seleccionado el canje, se imprimirá un cupón para retirarlo en la barra.</p>
            <button className="kiosk__cta kiosk__cta--hub" onClick={() => setShowCanjes(false)}>VOLVER ✓</button>
          </div>
        </div>
      )}

      {/* Fortuna Dorada en overlay: el slot completo dentro del kiosk */}
      {showGiro && (
        <div className="kiosk__carta">
          <iframe src="/fortuna-dorada/index.html" title="Fortuna Dorada" allow="autoplay" />
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
