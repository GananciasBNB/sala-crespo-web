// "Días de cofres" pop-up: weekend = chest earned (closed, glowing); weekdays = tap to open.
// Opening: the chest shakes while the server answers, a golden flash covers the swap from the closed
// to the open art, light rays spin behind, coins burst out and the points count up.
import { useEffect, useMemo, useRef, useState } from 'react'
import './kiosk-cofres.css'

const IMG_CERRADO = '/kiosk-art/cofre-cerrado.webp'
const IMG_ABIERTO = '/kiosk-art/cofre-abierto.webp'
const SONIDO_APERTURA = '/la-gran-pesca/sfx/atrapa-legendario.mp3'
const FLASH_MS = 380        // the open art appears at the flash peak
const CONTEO_MS = 1400

function sonar(src, volume = 0.85) {
  try { const a = new Audio(src); a.volume = volume; a.play().catch(err => console.warn('cofre audio:', err)) }
  catch (err) { console.warn('cofre audio:', err) }
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

function Cofre({ x, clickable, abriendo, onAbrir, fantasma, etiqueta }) {
  const [fase, setFase] = useState(x.abierto ? 'abierto' : 'cerrado')   // cerrado | revelando | abierto
  const [conteo, setConteo] = useState(x.abierto && !x.recien ? x.pts : 0)
  const monedas = useMonedas(18, x.dia)
  const yaAnimado = useRef(false)

  useEffect(() => {
    if (!x.abierto || !x.recien || yaAnimado.current) return
    yaAnimado.current = true
    setFase('revelando')
    sonar(SONIDO_APERTURA)
    const t1 = setTimeout(() => setFase('abierto'), FLASH_MS)
    const t0 = performance.now() + FLASH_MS
    let raf = 0
    const subir = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / CONTEO_MS))
      setConteo(Math.round(x.pts * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(subir)
    }
    raf = requestAnimationFrame(subir)
    return () => { clearTimeout(t1); cancelAnimationFrame(raf) }
  }, [x.abierto, x.recien, x.pts])

  const abierto = fase === 'abierto'   // the open art only shows from the flash peak on
  const clases = ['cofre',
    fantasma && 'cofre--fantasma',
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

export default function CofresPopup({ cofre, onAbrir, onCerrar }) {
  const ganaste = cofre.modo === 'ganaste'
  const titulo = ganaste
    ? `¡Ganaste el cofre de hoy${cofre.nombre ? `, ${cofre.nombre}` : ''}!`
    : cofre.pendientes > 0
      ? `${cofre.nombre ? `${cofre.nombre}, t` : 'T'}enés ${cofre.pendientes === 1 ? 'un cofre' : `${cofre.pendientes} cofres`} para abrir`
      : `¡Sumaste ${Number(cofre.sumados || 0).toLocaleString('es-AR')} puntos!`
  const fantasmas = ganaste ? (cofre.quedanDiasDeEntrega || []) : []

  return (
    <div className="kiosk__carta kiosk__madre-fondo">
      <div className="kiosk__madre cofres-modal" onClick={e => e.stopPropagation()}>
        <img className="kiosk__madre-logo" src="/jackpoints/logo.webp" alt="Jackpoints" />
        <div className="kiosk__madre-kick">DÍAS DE COFRES</div>
        <h2 className="kiosk__madre-tit">{titulo}</h2>
        <div className="cofres-fila">
          {cofre.cofres.map(x => (
            <Cofre key={x.dia} x={x} clickable={!ganaste} abriendo={cofre.abriendo === x.dia}
              onAbrir={onAbrir} etiqueta={`Cofre del ${x.diaTxt}`} />
          ))}
          {fantasmas.map(d => (
            <Cofre key={d} x={{ dia: d, abierto: false }} fantasma etiqueta={`${d.charAt(0).toUpperCase() + d.slice(1)}: si venís, es tuyo`} />
          ))}
        </div>
        {ganaste ? (
          <>
            <p className="kiosk__madre-txt">Volvé de <b>lunes a jueves</b>, ingresá en esta máquina y abrilo: adentro hay <b>hasta {Number(cofre.maxPts).toLocaleString('es-AR')} puntos</b>.</p>
            <p className="cofres-vence">Tenés hasta el {cofre.abrirHastaTxt} para abrirlo.</p>
            <button className="kiosk__cta" onClick={onCerrar}>ENTENDIDO</button>
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
