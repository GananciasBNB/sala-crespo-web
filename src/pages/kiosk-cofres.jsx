// "Días de cofres" pop-up: weekend = chest earned (closed, glowing); weekdays = tap to open.
// Opening: the chest shakes while the server answers, a golden flash covers the swap from the closed
// to the open art, light rays spin behind, coins burst out and the points count up.
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
  const [fase, setFase] = useState(x.abierto ? 'abierto' : 'cerrado')   // cerrado | revelando | abierto
  const [conteo, setConteo] = useState(x.abierto && !x.recien ? x.pts : 0)
  const monedas = useMonedas(18, x.dia)
  const yaAnimado = useRef(false)

  useEffect(() => {
    if (!x.abierto || !x.recien || yaAnimado.current) return
    yaAnimado.current = true
    setFase('revelando')
    sonar('abre')
    const t1 = setTimeout(() => { setFase('abierto'); sonar('monedas') }, FLASH_MS)
    const t2 = setTimeout(() => sonar('conteo'), FLASH_MS + 250)
    const t0 = performance.now() + FLASH_MS
    let raf = 0
    const subir = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / CONTEO_MS))
      setConteo(Math.round(x.pts * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(subir)
    }
    raf = requestAnimationFrame(subir)
    return () => { clearTimeout(t1); clearTimeout(t2); cancelAnimationFrame(raf) }
  }, [x.abierto, x.recien, x.pts])

  useEffect(() => { if (abriendo) sonar('tiembla') }, [abriendo])

  const abierto = fase === 'abierto'   // the open art only shows from the flash peak on
  const clases = ['cofre',
    fantasma && 'cofre--fantasma',
    nuevo && 'cofre--nuevo',
    clickable && !x.abierto && 'cofre--tocable',
    abriendo && 'cofre--temblando',
    fase === 'revelando' && 'cofre--revelando',
    abierto && 'cofre--abierto',
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
          ? <b className="cofre-pts">+{conteo.toLocaleString('es-AR')}<small>puntos</small></b>
          : clickable && !fantasma
            ? <b className="cofre-toca">{abriendo ? 'ABRIENDO…' : 'TOCÁ PARA ABRIR'}</b>
            : null}
        <span className="cofre-etiqueta">{etiqueta}</span>
      </div>
    </Tag>
  )
}

const diaCorto = x => `${x.diaTxt.slice(0, 3).toUpperCase()} ${x.dia.slice(8, 10)}`
const mayus = s => s.charAt(0).toUpperCase() + s.slice(1)

// Weekend hand-over: thank-you copy, the chest drops in, then flies into the member's "Mis cofres" card.
// Phases: 0 intro text · 1 chest landed · 2 flying to the card · 3 stored (button shows)
const T_CAE = 900, T_VUELA = 3400, T_VUELO_MS = 800

function EntregaCofre({ cofre, onCerrar }) {
  const [fase, setFase] = useState(0)
  const vuelaRef = useRef(null)
  const slotRef = useRef(null)
  const rafVuelo = useRef(0)
  const hoy = cofre.cofres[cofre.cofres.length - 1]?.dia   // today's chest is the last one earned
  const previos = cofre.cofres.filter(x => x.dia !== hoy)
  const ordinal = cofre.cofres.length === 1 ? 'primer' : cofre.cofres.length === 2 ? 'segundo' : 'nuevo'
  const futuros = cofre.quedanDiasDeEntrega || []

  useEffect(() => {
    let reintento = null
    const sonarGanaste = () => {
      const a = cache.ganaste
      if (!a) return
      a.volume = SFX.ganaste[1]
      a.play().catch(() => {   // preview link: autoplay blocked until the first touch
        reintento = () => a.play().catch(err => console.warn('cofre audio:', err))
        document.addEventListener('pointerdown', reintento, { once: true })
      })
    }
    const t1 = setTimeout(() => setFase(1), T_CAE)
    const t1s = setTimeout(sonarGanaste, T_CAE + 420)
    const t2 = setTimeout(() => {
      const el = vuelaRef.current, slot = slotRef.current
      if (el && slot) {
        const a = el.getBoundingClientRect(), b = slot.getBoundingClientRect()
        const dx = (b.left + b.width / 2) - (a.left + a.width / 2)
        const dy = (b.top + b.height / 2) - (a.top + a.height / 2)
        const s = Math.max(0.12, (b.width * 0.9) / a.width)
        // frame by frame: a small hop up, then an accelerating arc into the slot
        const t0 = performance.now()
        const paso = now => {
          const k = Math.min(1, (now - t0) / T_VUELO_MS)
          const e = k * k * k                                     // ease-in: slow lift, fast dive
          const hop = Math.sin(Math.min(1, k * 1.6) * Math.PI) * -60   // up-arc at the start
          const sc = k < 0.2 ? 1 + k * 0.4 : 1.08 + (s - 1.08) * e
          el.style.transform = `translate(${dx * e}px, ${dy * e + hop * (1 - e)}px) scale(${sc})`
          el.style.opacity = k > 0.9 ? String((1 - k) * 10) : '1'
          if (k < 1) rafVuelo.current = requestAnimationFrame(paso)
        }
        rafVuelo.current = requestAnimationFrame(paso)
      }
      sonar('guardado')
      setFase(2)
    }, T_VUELA)
    const t3 = setTimeout(() => setFase(3), T_VUELA + T_VUELO_MS)
    return () => { [t1, t1s, t2, t3].forEach(clearTimeout); cancelAnimationFrame(rafVuelo.current); if (reintento) document.removeEventListener('pointerdown', reintento) }
  }, [])

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
          Este fin de semana te regalamos un <b>cofre sorpresa por cada día que venís</b>. Lo abrís <b>de lunes a jueves</b> en Sala Crespo… <b>¡y tiene premio!</b>
        </p>

        <div className="entrega-escenario">
          {fase >= 1 && fase < 3 && (
            <div className="entrega-vuela" ref={vuelaRef}>
              <Cofre x={{ dia: hoy, abierto: false }} nuevo etiqueta="" />
            </div>
          )}
          {fase === 1 && <p className="entrega-leyenda">Acá tenés tu {ordinal} cofre del día</p>}
          {fase === 3 && (
            <p className="entrega-guardado"><b>¡Guardado en tu tarjeta!</b><span>Te esperamos de lunes a jueves para abrirlo</span></p>
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
            <div className="tarjeta-abrir"><b>LUN a JUE</b><span>Los abrís acá</span><small>hasta {Number(cofre.maxPts).toLocaleString('es-AR')} pts</small></div>
          </div>
        </div>

        <p className="cofres-vence">Tenés hasta el {cofre.abrirHastaTxt} para abrirlos.</p>
        <button className={`kiosk__cta entrega-boton${fase === 3 ? ' entrega-boton--listo' : ''}`} onClick={onCerrar}>¡GENIAL!</button>
      </div>
    </div>
  )
}

export default function CofresPopup({ cofre, onAbrir, onCerrar }) {
  const ganaste = cofre.modo === 'ganaste'
  if (ganaste) return <EntregaCofre cofre={cofre} onCerrar={onCerrar} />
  const nombre = cofre.nombre ? `, ${cofre.nombre}` : ''
  const titulo = ganaste
    ? (cofre.cofres.length > 1 ? `¡Ganaste tu ${cofre.cofres.length === 2 ? 'segundo' : 'otro'} cofre${nombre}!` : `¡Ganaste un cofre${nombre}!`)
    : cofre.pendientes > 0
      ? `${cofre.nombre ? `${cofre.nombre}, t` : 'T'}enés ${cofre.pendientes === 1 ? 'un cofre' : `${cofre.pendientes} cofres`} para abrir`
      : `¡Sumaste ${Number(cofre.sumados || 0).toLocaleString('es-AR')} puntos!`
  const fantasmas = ganaste ? (cofre.quedanDiasDeEntrega || []) : []
  const hoy = ganaste ? cofre.cofres[cofre.cofres.length - 1]?.dia : null   // today's chest is the last one earned

  return (
    <div className="kiosk__carta kiosk__madre-fondo">
      <div className={`kiosk__madre cofres-modal${ganaste ? ' cofres-modal--ganaste' : ''}`} onClick={e => e.stopPropagation()}>
        <img className="kiosk__madre-logo" src="/jackpoints/logo.webp" alt="Jackpoints" />
        <div className="kiosk__madre-kick">{ganaste ? 'REGALO POR TU VISITA' : 'DÍAS DE COFRES'}</div>
        <h2 className="kiosk__madre-tit cofres-tit">{titulo}</h2>
        {ganaste && <p className="cofres-regla">Este fin de semana, <b>cada día que venís te llevás un cofre</b>.</p>}
        <div className="cofres-fila">
          {cofre.cofres.map(x => (
            <Cofre key={x.dia} x={x} clickable={!ganaste} abriendo={cofre.abriendo === x.dia} nuevo={x.dia === hoy}
              onAbrir={onAbrir} etiqueta={`Cofre del ${x.diaTxt}`} />
          ))}
          {fantasmas.map(d => (
            <Cofre key={d} x={{ dia: d, abierto: false }} fantasma etiqueta={`${mayus(d)}: si venís, es tuyo`} />
          ))}
        </div>
        {ganaste ? (
          <>
            <ol className="cofres-pasos">
              {cofre.cofres.map(x => (
                <li key={x.dia} className="cofres-paso cofres-paso--ok"><b>{diaCorto(x)}</b><span>✓ ¡Ganado!</span></li>
              ))}
              {fantasmas.map(d => (
                <li key={d} className="cofres-paso"><b>{d.slice(0, 3).toUpperCase()}</b><span>Venís y ganás otro</span></li>
              ))}
              <li className="cofres-paso cofres-paso--abrir"><b>LUN a JUE</b><span>Los abrís acá: hasta {Number(cofre.maxPts).toLocaleString('es-AR')} puntos cada uno</span></li>
            </ol>
            <p className="cofres-vence">Tenés hasta el {cofre.abrirHastaTxt} para abrirlos.</p>
            <button className="kiosk__cta" onClick={onCerrar}>¡GENIAL!</button>
          </>
        ) : (
          <>
            {cofre.error && <p className="kiosk__madre-txt" role="alert">{cofre.error}</p>}
            {cofre.pendientes > 0
              ? <button className="kiosk__madre-luego" disabled={!!cofre.abriendo} onClick={onCerrar}>Abrir después (hasta el {cofre.abrirHastaTxt})</button>
              : <button className="kiosk__cta" onClick={onCerrar}>CONTINUAR</button>}
          </>
        )}
      </div>
    </div>
  )
}
