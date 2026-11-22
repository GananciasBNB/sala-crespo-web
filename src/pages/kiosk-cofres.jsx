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

export default function CofresPopup({ cofre, onAbrir, onCerrar }) {
  const ganaste = cofre.modo === 'ganaste'
  const nombre = cofre.nombre ? `, ${cofre.nombre}` : ''
  const titulo = ganaste
    ? (cofre.cofres.length > 1 ? `¡Ganaste tu ${cofre.cofres.length === 2 ? 'segundo' : 'otro'} cofre${nombre}!` : `¡Ganaste un cofre${nombre}!`)
    : cofre.pendientes > 0
      ? `${cofre.nombre ? `${cofre.nombre}, t` : 'T'}enés ${cofre.pendientes === 1 ? 'un cofre' : `${cofre.pendientes} cofres`} para abrir`
      : `¡Sumaste ${Number(cofre.sumados || 0).toLocaleString('es-AR')} puntos!`
  const fantasmas = ganaste ? (cofre.quedanDiasDeEntrega || []) : []
  const hoy = ganaste ? cofre.cofres[cofre.cofres.length - 1]?.dia : null   // today's chest is the last one earned

  // weekend: the chest lands at ~450 ms; if the browser blocks autoplay (preview link), play on the first touch
  useEffect(() => {
    if (!ganaste) return
    const a = cache.ganaste
    if (!a) return
    a.volume = SFX.ganaste[1]
    let reintento = null
    const t = setTimeout(() => a.play().catch(() => {
      reintento = () => a.play().catch(err => console.warn('cofre audio:', err))
      document.addEventListener('pointerdown', reintento, { once: true })
    }), 450)
    return () => { clearTimeout(t); if (reintento) document.removeEventListener('pointerdown', reintento) }
  }, [ganaste])

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
