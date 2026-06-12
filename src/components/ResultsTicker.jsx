import { useEffect, useState, useMemo } from 'react'
import { getMatches } from '../api/client'
import { useLiveMatches } from '../hooks/useLiveMatches'
import './ResultsTicker.css'

// Cinta tipo "bolsa de Nueva York" con los partidos del día. Cada item muestra
// el estado: FINAL (marcador oficial), EN VIVO (marcador + minuto), o la hora
// de inicio si todavía no empezó. Scroll horizontal infinito.
//
// Si no hay partidos hoy (TZ Argentina), el componente devuelve null y el
// contenedor padre puede mostrar su cinta de banderas decorativa normal.

const NAME_TO_ISO = {
  'México':'mx','Sudáfrica':'za','República de Corea':'kr','República Checa':'cz',
  'Canadá':'ca','Bosnia y Herzegovina':'ba','Catar':'qa','Suiza':'ch',
  'Brasil':'br','Marruecos':'ma','Haití':'ht','Escocia':'gb-sct',
  'Estados Unidos':'us','Paraguay':'py','Australia':'au','Turquía':'tr',
  'Alemania':'de','Curazao':'cw','Costa de Marfil':'ci','Ecuador':'ec',
  'Países Bajos':'nl','Japón':'jp','Suecia':'se','Túnez':'tn',
  'Bélgica':'be','Egipto':'eg','RI de Irán':'ir','Nueva Zelanda':'nz',
  'España':'es','Cabo Verde':'cv','Arabia Saudí':'sa','Uruguay':'uy',
  'Francia':'fr','Senegal':'sn','Irak':'iq','Noruega':'no',
  'Argentina':'ar','Argelia':'dz','Austria':'at','Jordania':'jo',
  'Portugal':'pt','RD Congo':'cd','Uzbekistán':'uz','Colombia':'co',
  'Inglaterra':'gb-eng','Croacia':'hr','Ghana':'gh','Panamá':'pa',
}
// Abreviatura corta de 3 letras para el ticker (toma del fixture m.home/m.away)
function abbr3(code) { return (code || '').slice(0, 3).toUpperCase() }
function flagUrl(name) {
  const iso = NAME_TO_ISO[name]
  return iso ? `https://flagcdn.com/w20/${iso}.png` : null
}

function todayARDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}
function matchARDate(iso) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso))
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

// Un item de la cinta
function TickerItem({ m, live }) {
  const home = abbr3(m.home)
  const away = abbr3(m.away)
  const hasResult = !!m.result
  const isLive = live?.status === 'in_progress'
  const isFinishingGap = !hasResult && live?.status === 'finished'

  let scoreEl, statusEl, cls = 'rtick__item'
  if (hasResult) {
    cls += ' rtick__item--final'
    scoreEl = <span className="rtick__score">{m.result.home}-{m.result.away}</span>
    statusEl = <span className="rtick__tag rtick__tag--ft">FT</span>
  } else if (isLive) {
    cls += ' rtick__item--live'
    scoreEl = <span className="rtick__score rtick__score--live">{live.homeScore ?? 0}-{live.awayScore ?? 0}</span>
    statusEl = <span className="rtick__tag rtick__tag--live"><span className="rtick__dot" />{live.minute || 'EN VIVO'}</span>
  } else if (isFinishingGap) {
    cls += ' rtick__item--final'
    scoreEl = <span className="rtick__score">{live.homeScore ?? 0}-{live.awayScore ?? 0}</span>
    statusEl = <span className="rtick__tag rtick__tag--ft">FT</span>
  } else {
    cls += ' rtick__item--pre'
    scoreEl = <span className="rtick__vs">vs</span>
    statusEl = <span className="rtick__tag rtick__tag--time">PRONTO</span>
  }

  const homeFlag = flagUrl(m.homeName)
  const awayFlag = flagUrl(m.awayName)

  return (
    <span className={cls}>
      <span className="rtick__hour">{fmtTime(m.date)}</span>
      {homeFlag && <img src={homeFlag} alt="" className="rtick__flag" loading="eager" />}
      <span className="rtick__abbr">{home}</span>
      {scoreEl}
      <span className="rtick__abbr">{away}</span>
      {awayFlag && <img src={awayFlag} alt="" className="rtick__flag" loading="eager" />}
      {statusEl}
    </span>
  )
}

export default function ResultsTicker({ onEmpty }) {
  const [matches, setMatches] = useState([])
  const { byAbbr: liveByAbbr } = useLiveMatches({ intervalMs: 60000 })

  useEffect(() => {
    getMatches().then(setMatches).catch(() => {})
  }, [])

  const todayMatches = useMemo(() => {
    const today = todayARDate()
    return (matches || [])
      .filter(m => matchARDate(m.date) === today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [matches])

  // Avisar al padre si no hay partidos hoy (para que muestre las banderas)
  useEffect(() => {
    if (matches.length > 0 && onEmpty) onEmpty(todayMatches.length === 0)
  }, [todayMatches.length, matches.length])

  if (todayMatches.length === 0) return null

  // ¿Hay algún partido en vivo ahora mismo? (para el label)
  const anyLive = todayMatches.some(m => liveByAbbr[`${m.home}-${m.away}`]?.status === 'in_progress')

  // Duplicamos la lista para que el scroll sea infinito y continuo
  const loop = [...todayMatches, ...todayMatches, ...todayMatches]

  return (
    <div className="rtick" aria-label="Partidos de hoy">
      {/* Label fijo a la izquierda — no scrollea, indica que son los de HOY */}
      <div className={`rtick__label ${anyLive ? 'rtick__label--live' : ''}`}>
        <span className="rtick__label-dot" />
        {anyLive ? 'EN VIVO' : 'HOY'}
      </div>
      <div className="rtick__viewport">
        <div className="rtick__track">
          {loop.map((m, i) => (
            <TickerItem key={`${m.id}-${i}`} m={m} live={liveByAbbr[`${m.home}-${m.away}`] || null} />
          ))}
        </div>
      </div>
    </div>
  )
}
