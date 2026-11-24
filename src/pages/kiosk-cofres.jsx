// "Días de cofres" kiosk UI.
// - EntregaCofre (weekend): voiced thank-you, the chest drops in and flies into the member's "Mis cofres" card,
//   then a live countdown to the opening day.
// - CofresPopup 'abrir' (Mon-Thu): tap each chest; it shakes while the server answers, a golden flash covers the
//   swap to the open art, coins burst out and the prize counts up (points, or a promo ticket that prints).
// - FranjaCofres: the member's chests on their home screen, with the countdown or the button to open them.
import { useEffect, useMemo, useRef, useState } from 'react'
import './kiosk-cofres.css'

const IMG_CERRADO = '/kiosk-art/cofre-cerrado.webp'
const IMG_ABIERTO = '/kiosk-art/cofre-abierto.webp'
const FLASH_MS = 380        // the open art appears at the flash peak
const CONTEO_MS = 1400
// ElevenLabs SFX (giro-diario-assets/gen-sfx-cofres.mjs); volumes level them (conteo comes out louder)
const SFX = {
  ganaste: ['/kiosk-audio/cofre-ganaste.mp3', 1],
  tiembla: ['/kiosk-audio/cofre-tiembla.mp3', 0.8],
  abre: ['/kiosk-audio/cofre-abre.mp3', 0.9],
  monedas: ['/kiosk-audio/cofre-monedas.mp3', 0.75],
  conteo: ['/kiosk-audio/cofre-conteo.mp3', 0.45],
  guardado: ['/kiosk-audio/cofre-guardado.mp3', 0.9],
}
const cache = {}

function sonar(nombre) {
  try {
    const [src, volume] = SFX[nombre]
    const a = cache[nombre] || (cache[nombre] = new Audio(src))
    a.volume = volume; a.currentTime = 0
    a.play().catch(err => console.warn('cofre audio:', err))
  } catch (err) { console.warn('cofre audio:', err) }
}
// preload so the first tap sounds on time
if (typeof window !== 'undefined') Object.keys(SFX).forEach(n => { try { const a = cache[n] = new Audio(SFX[n][0]); a.preload = 'auto' } catch (err) { console.warn('cofre audio:', err) } })

// Kiosk voice (Juan Carlos, giro-diario-assets/gen-voces-cofres.mjs). Resolves when the line ends,
// fails or after maxMs, so the animation never waits forever on audio.
let vozActual = null
function hablar(nombre, maxMs = 12000) {
  return new Promise(resolve => {
    try {
      if (vozActual) vozActual.pause()
      const a = new Audio(`/kiosk-audio/${nombre}.mp3`)
      vozActual = a
      let listo = false
      const fin = () => { if (!listo) { listo = true; resolve() } }
      a.onended = fin; a.onerror = fin
      setTimeout(fin, maxMs)
      a.play().catch(fin)
    } catch (err) { console.warn('cofre voz:', err); resolve() }
  })
}
const callar = () => { try { if (vozActual) vozActual.pause() } catch (err) { console.warn('cofre voz:', err) } }
const dormir = ms => new Promise(r => setTimeout(r, ms))

const pesos = n => `$${Number(n).toLocaleString('es-AR')}`
const fmtPts = n => Number(n).toLocaleString('es-AR')
const diaCorto = x => `${x.diaTxt.slice(0, 3).toUpperCase()} ${x.dia.slice(8, 10)}`
const mayus = s => s.charAt(0).toUpperCase() + s.slice(1)

// "Podés ganar desde 100 hasta 1.000 puntos ¡y también tickets de $20.000!"
function QueGanas({ cofre }) {
  if (!cofre.maxPts) return null
  return <>podés ganar <b>desde {fmtPts(cofre.minPts)} hasta {fmtPts(cofre.maxPts)} puntos</b>{cofre.maxTicket ? <> <b>¡y también tickets de {pesos(cofre.maxTicket)}!</b></> : '.'}</>
}

// Live countdown to the opening day
export function CuentaCofre({ hasta, corta = false }) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(t) }, [])
  const ms = new Date(hasta).getTime() - ahora
  if (!(ms > 0)) return <span className="cofre-cuenta cofre-cuenta--ya">¡Ya podés abrirlos!</span>
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60
  const dos = n => String(n).padStart(2, '0')
  return (
    <span className="cofre-cuenta">
      {d > 0 && <><b>{d}</b><small>{d === 1 ? 'día' : 'días'}</small></>}
      <b>{dos(h)}</b><small>h</small><b>{dos(m)}</b><small>m</small>{!corta && <><b>{dos(seg)}</b><small>s</small></>}
    </span>
  )
}

// stable random coin trajectories per chest
function useMonedas(n, seed) {
  return useMemo(() => {
    let s = [...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 7)
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    return Array.from({ length: n }, (_, i) => {
      const ang = (-160 + (140 * i) / (n - 1) + (rnd() - 0.5) * 18) * Math.PI / 180   // fan upwards
      const fuerza = 120 + rnd() * 140
      return {
        '--x': `${Math.cos(ang) * fuerza * 1.25}px`,
        '--y': `${Math.sin(ang) * fuerza}px`,
        '--caida': `${60 + rnd() * 90}px`,
        '--giro': `${(rnd() - 0.5) * 900}deg`,
        '--t': `${0.9 + rnd() * 0.5}s`,
        '--d': `${rnd() * 0.15}s`,
        '--s': `${0.7 + rnd() * 0.6}`,
      }
    })
  }, [n, seed])
}

function Destellos({ n = 7 }) {
  return Array.from({ length: n }, (_, i) => (
    <span key={i} className="cofre-destello" style={{ '--i': i, '--n': n }} />
  ))
}

function Cofre({ x, clickable, abriendo, onAbrir, fantasma, etiqueta, nuevo }) {
  const valor = x.pesos || x.pts || 0
  const [fase, setFase] = useState(x.abierto ? 'abierto' : 'cerrado')   // cerrado | revelando | abierto
  const [conteo, setConteo] = useState(x.abierto && !x.recien ? valor : 0)
  const monedas = useMonedas(18, x.dia)
  const yaAnimado = useRef(false)

  useEffect(() => {
    if (!x.abierto || !x.recien || yaAnimado.current) return
    yaAnimado.current = true
    setFase('revelando')
    sonar('abre')
    const t1 = setTimeout(() => { setFase('abierto'); sonar('monedas') }, FLASH_MS)
    const t2 = setTimeout(() => sonar('conteo'), FLASH_MS + 250)
    const t3 = x.pesos ? setTimeout(() => hablar('voz-cofre-ticket'), FLASH_MS + 900) : null
    const t0 = performance.now() + FLASH_MS
    let raf = 0
    const subir = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / CONTEO_MS))
      setConteo(Math.round(valor * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(subir)
    }
    raf = requestAnimationFrame(subir)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); cancelAnimationFrame(raf) }
  }, [x.abierto, x.recien, x.pesos, valor])

  useEffect(() => { if (abriendo) sonar('tiembla') }, [abriendo])

  const abierto = fase === 'abierto'   // the open art only shows from the flash peak on
  const clases = ['cofre',
    fantasma && 'cofre--fantasma',
    nuevo && 'cofre--nuevo',
    clickable && !x.abierto && 'cofre--tocable',
    abriendo && 'cofre--temblando',
    fase === 'revelando' && 'cofre--revelando',
    abierto && 'cofre--abierto',
    x.pesos && 'cofre--ticket',
  ].filter(Boolean).join(' ')

  const Tag = clickable && !x.abierto ? 'button' : 'div'
  return (
    <Tag type={Tag === 'button' ? 'button' : undefined} className={clases}
      disabled={Tag === 'button' ? !!abriendo : undefined}
      onClick={Tag === 'button' ? () => onAbrir(x.dia) : undefined}>
      <div className="cofre-escena">
        <div className="cofre-rayos" />
        <div className="cofre-halo" />
        <img className="cofre-img cofre-img--cerrado" src={IMG_CERRADO} alt="" draggable="false" />
        <img className="cofre-img cofre-img--abierto" src={IMG_ABIERTO} alt="" draggable="false" />
        {!abierto && !fantasma && <Destellos />}
        {nuevo && (
          <div className="cofre-monedas cofre-monedas--llegada">{monedas.map((st, i) => <span key={i} className="cofre-chispa" style={st} />)}</div>
        )}
        {(fase === 'revelando' || (abierto && x.recien)) && (
          <div className="cofre-monedas">{monedas.map((st, i) => <span key={i} className="cofre-moneda" style={st} />)}</div>
        )}
        <div className="cofre-flash" />
      </div>
      <div className="cofre-pie">
        {fase !== 'cerrado'
          ? (x.pesos
            ? <><small className="cofre-ticket-tit">¡TICKET PROMOCIONAL!</small><b className="cofre-pts cofre-pts--ticket">{pesos(conteo)}</b></>
            : <b className="cofre-pts">+{fmtPts(conteo)}<small>puntos</small></b>)
          : clickable && !fantasma
            ? <b className="cofre-toca">{abriendo ? 'ABRIENDO…' : 'TOCÁ PARA ABRIR'}</b>
            : null}
        <span className="cofre-etiqueta">{abierto && x.pesos ? 'Retirá tu cupón de la impresora' : etiqueta}</span>
      </div>
    </Tag>
  )
}

// Weekend hand-over. Phases: 0 voiced intro · 1 chest landed · 2 flying to the card · 3 stored (button + countdown)
const T_VUELO_MS = 800

function EntregaCofre({ cofre, onCerrar }) {
  const [fase, setFase] = useState(0)
  const [esperaToque, setEsperaToque] = useState(false)   // browser blocked audio: start on the first tap
  const [arrancar, setArrancar] = useState(0)
  const vuelaRef = useRef(null)
  const slotRef = useRef(null)
  const rafVuelo = useRef(0)
  const hoy = cofre.cofres[cofre.cofres.length - 1]?.dia   // today's chest is the last one earned
  const previos = cofre.cofres.filter(x => x.dia !== hoy)
  const segundo = cofre.cofres.length >= 2
  const unDia = cofre.diasEntrega === 1      // one-day edition (e.g. a group visit): "hoy" instead of "este fin de semana"
  const futuros = cofre.quedanDiasDeEntrega || []

  // probe autoplay once: the kiosk allows it (the member already tapped); a phone preview may not
  useEffect(() => {
    const a = new Audio('/kiosk-audio/voz-cofre-primero.mp3')
    a.volume = 0
    a.play().then(() => { a.pause(); setArrancar(1) }).catch(() => setEsperaToque(true))
  }, [])

  useEffect(() => {
    if (!arrancar) return
    let vivo = true
    const volar = () => {
      const el = vuelaRef.current, slot = slotRef.current
      if (!el || !slot) return
      const a = el.getBoundingClientRect(), b = slot.getBoundingClientRect()
      const dx = (b.left + b.width / 2) - (a.left + a.width / 2)
      const dy = (b.top + b.height / 2) - (a.top + a.height / 2)
      const s = Math.max(0.12, (b.width * 0.9) / a.width)
      // frame by frame: a small hop up, then an accelerating arc into the slot
      const t0 = performance.now()
      const paso = now => {
        const k = Math.min(1, (now - t0) / T_VUELO_MS)
        const e = k * k * k
        const hop = Math.sin(Math.min(1, k * 1.6) * Math.PI) * -60
        const sc = k < 0.2 ? 1 + k * 0.4 : 1.08 + (s - 1.08) * e
        el.style.transform = `translate(${dx * e}px, ${dy * e + hop * (1 - e)}px) scale(${sc})`
        el.style.opacity = k > 0.9 ? String((1 - k) * 10) : '1'
        if (k < 1) rafVuelo.current = requestAnimationFrame(paso)
      }
      rafVuelo.current = requestAnimationFrame(paso)
    }
    ;(async () => {
      await Promise.all([hablar(unDia ? 'voz-cofre-intro-hoy' : 'voz-cofre-intro', 9000), dormir(3200)])          // thank-you + the rule
      if (!vivo) return
      setFase(1)                                                             // chest drops in
      await dormir(420); if (!vivo) return
      sonar('ganaste')
      await Promise.all([hablar(unDia ? 'voz-cofre-tuyo' : segundo ? 'voz-cofre-segundo' : 'voz-cofre-primero', 3200), dormir(1600)])
      await dormir(500); if (!vivo) return
      setFase(2); sonar('guardado'); volar()                                 // into the card
      await dormir(T_VUELO_MS); if (!vivo) return
      setFase(3)
      hablar('voz-cofre-guardado')                                           // what you can win + Monday to Thursday
    })()
    return () => { vivo = false; cancelAnimationFrame(rafVuelo.current); callar() }
  }, [arrancar, segundo, unDia])

  const slot = (key, etiqueta, estado, clase, ref) => (
    <div key={key} ref={ref} className={`tarjeta-slot ${clase}`}>
      <div className="tarjeta-slot-img"><img src={IMG_CERRADO} alt="" draggable="false" /></div>
      <b>{etiqueta}</b><span>{estado}</span>
    </div>
  )

  return (
    <div className="kiosk__carta kiosk__madre-fondo">
      <div className="kiosk__madre cofres-modal cofres-modal--ganaste" onClick={e => e.stopPropagation()}>
        <img className="kiosk__madre-logo" src="/jackpoints/logo.webp" alt="Jackpoints" />
        <div className="kiosk__madre-kick entrega-in" style={{ '--d': '.15s' }}>GRACIAS POR VENIR</div>
        <h2 className="kiosk__madre-tit entrega-tit">¡Premiamos tu fidelidad{cofre.nombre ? `, ${cofre.nombre}` : ''}!</h2>
        <p className="cofres-regla entrega-in" style={{ '--d': '.5s' }}>
          {unDia
            ? <>Hoy te regalamos un <b>cofre sorpresa por tu visita</b>. Lo abrís <b>del {cofre.abrirDesdeTxt} al {cofre.abrirHastaTxt}</b> en Sala Crespo: <QueGanas cofre={cofre} /></>
            : <>Este fin de semana te regalamos un <b>cofre sorpresa por cada día que venís</b>. Lo abrís <b>de lunes a jueves</b> en Sala Crespo: <QueGanas cofre={cofre} /></>}
        </p>

        <div className="entrega-escenario">
          {esperaToque && !arrancar && (
            <button type="button" className="kiosk__cta entrega-play" onClick={() => { setEsperaToque(false); setArrancar(1) }}>▶ TOCÁ PARA RECIBIR TU COFRE</button>
          )}
          {fase >= 1 && fase < 3 && (
            <div className="entrega-vuela" ref={vuelaRef}>
              <Cofre x={{ dia: hoy, abierto: false }} nuevo etiqueta="" />
            </div>
          )}
          {fase === 1 && <p className="entrega-leyenda">{unDia ? '¡Acá tenés tu cofre!' : `¡Acá tenés tu ${segundo ? 'segundo' : 'primer'} cofre!`}</p>}
          {fase === 3 && (
            <div className="entrega-guardado">
              <b>¡Guardado en tu tarjeta!</b>
              <span>Se abre en</span>
              <CuentaCofre hasta={cofre.abreEn} />
            </div>
          )}
        </div>

        <div className="tarjeta-cofres entrega-in" style={{ '--d': '.75s' }}>
          <div className="tarjeta-cab"><img src="/jackpoints/logo.webp" alt="" /> MIS COFRES</div>
          <div className="tarjeta-slots">
            {previos.map(x => slot(x.dia, diaCorto(x), '¡Guardado!', 'tarjeta-slot--lleno'))}
            {slot(hoy, cofre.cofres.length ? diaCorto(cofre.cofres[cofre.cofres.length - 1]) : 'HOY',
              fase === 3 ? '¡Guardado!' : 'Hoy',
              fase === 3 ? 'tarjeta-slot--lleno tarjeta-slot--nuevo' : 'tarjeta-slot--esperando', slotRef)}
            {futuros.map(d => slot(d, d.slice(0, 3).toUpperCase(), `Volvé el ${d} y sumás otro`, 'tarjeta-slot--futuro'))}
            <div className="tarjeta-abrir"><b>LUN a JUE</b><span>Los abrís acá</span>{cofre.maxTicket ? <small>¡puntos y tickets!</small> : <small>hasta {fmtPts(cofre.maxPts)} pts</small>}</div>
          </div>
        </div>

        <p className="cofres-vence">Tenés hasta el {cofre.abrirHastaTxt} para {cofre.cofres.length > 1 ? 'abrirlos' : 'abrirlo'}.</p>
        <button className={`kiosk__cta entrega-boton${fase === 3 ? ' entrega-boton--listo' : ''}`} onClick={() => { callar(); onCerrar() }}>¡GENIAL!</button>
      </div>
    </div>
  )
}

export default function CofresPopup({ cofre, onAbrir, onCerrar }) {
  if (cofre.modo === 'ganaste') return <EntregaCofre cofre={cofre} onCerrar={onCerrar} />
  return <AbrirCofres cofre={cofre} onAbrir={onAbrir} onCerrar={onCerrar} />
}

function AbrirCofres({ cofre, onAbrir, onCerrar }) {
  useEffect(() => { hablar('voz-cofre-abrir'); return callar }, [])
  const titulo = cofre.pendientes > 0
    ? `${cofre.nombre ? `${cofre.nombre}, t` : 'T'}enés ${cofre.pendientes === 1 ? 'un cofre' : `${cofre.pendientes} cofres`} para abrir`
    : '¡Abriste tus cofres!'
  return (
    <div className="kiosk__carta kiosk__madre-fondo">
      <div className="kiosk__madre cofres-modal" onClick={e => e.stopPropagation()}>
        <img className="kiosk__madre-logo" src="/jackpoints/logo.webp" alt="Jackpoints" />
        <div className="kiosk__madre-kick">DÍAS DE COFRES</div>
        <h2 className="kiosk__madre-tit">{titulo}</h2>
        {cofre.pendientes > 0 && <p className="cofres-regla">{mayus('tocá cada cofre: ')}<QueGanas cofre={cofre} /></p>}
        <div className="cofres-fila">
          {cofre.cofres.map(x => (
            <Cofre key={x.dia} x={x} clickable abriendo={cofre.abriendo === x.dia} onAbrir={onAbrir} etiqueta={`Cofre del ${x.diaTxt}`} />
          ))}
        </div>
        {cofre.error && <p className="kiosk__madre-txt" role="alert">{cofre.error}</p>}
        {cofre.pendientes > 0
          ? <button className="kiosk__madre-luego" disabled={!!cofre.abriendo} onClick={() => { callar(); onCerrar() }}>Abrir después (hasta el {cofre.abrirHastaTxt})</button>
          : <button className="kiosk__cta" onClick={() => { callar(); onCerrar() }}>CONTINUAR</button>}
      </div>
    </div>
  )
}

// Member's home screen: their chests, the countdown before Monday, or the button to open them
export function FranjaCofres({ info, onAbrir }) {
  if (!info?.cofres?.length) return null
  const pendientes = info.cofres.filter(x => !x.abierto).length
  return (
    <div className="franja-cofres">
      <div className="franja-cofres-imgs">
        {info.cofres.map(x => <img key={x.dia} src={x.abierto ? IMG_ABIERTO : IMG_CERRADO} alt="" draggable="false" />)}
      </div>
      <div className="franja-cofres-txt">
        <b>MIS COFRES</b>
        <span>{pendientes === 0
          ? 'Ya abriste tus cofres. ¡Gracias por venir!'
          : `Tenés ${pendientes === 1 ? '1 cofre guardado' : `${pendientes} cofres guardados`} · podés ganar puntos y tickets`}</span>
      </div>
      {pendientes > 0 && (info.modo === 'abrir' || info.puedeAbrir
        ? <button type="button" className="kiosk__cta kiosk__cta--hub franja-cofres-btn" onClick={onAbrir}>ABRIR MIS COFRES</button>
        : info.antesDeAbrir
          ? <div className="franja-cofres-cuenta"><small>Se abren en</small><CuentaCofre hasta={info.abreEn} corta /></div>
          : <div className="franja-cofres-cuenta"><small>Se abren de</small><b>lunes a jueves</b></div>)}
    </div>
  )
}
