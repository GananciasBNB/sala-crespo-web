import { useEffect, useState, useRef } from 'react'
import html2canvas from 'html2canvas-pro'
import { getMatches } from '../api/client'
import './MatchStories.css'

// Generador de historias 9:16 para la CM: una card por partido del día.
// Descarga cada una como PNG 1080x1920 para subir directo a la historia de IG.

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
const SHORT_NAMES = {
  'República de Corea':'Corea del Sur','República Checa':'Chequia','Bosnia y Herzegovina':'Bosnia',
  'Estados Unidos':'EE.UU.','RI de Irán':'Irán','Países Bajos':'P. Bajos','Nueva Zelanda':'N. Zelanda',
}
const shortName = n => SHORT_NAMES[n] || n
const DECO_FLAGS = ['ar','br','fr','es','de','it','pt','nl','mx','uy','gb-eng','co','us','jp']

const AR_TZ = 'America/Argentina/Buenos_Aires'
const todayARDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: AR_TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date())
const matchARDate = iso => iso ? new Intl.DateTimeFormat('en-CA', { timeZone: AR_TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(iso)) : ''
const fmtTime = iso => new Date(iso).toLocaleTimeString('es-AR', { timeZone: AR_TZ, hour:'2-digit', minute:'2-digit', hour12:false })
function dayLabel(iso) {
  const d = new Intl.DateTimeFormat('es-AR', { timeZone: AR_TZ, weekday:'long', day:'2-digit', month:'2-digit' }).format(new Date(iso))
  return d.charAt(0).toUpperCase() + d.slice(1) // "Miércoles 18/06"
}

const ICONS = (
  <div className="story__icons">
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 8.2l3.4 2.5-1.3 4h-4.2l-1.3-4z"/>
      <path d="M12 8.2V3.3M15.4 10.7l4.4-1.6M14.1 14.7l2.8 3.7M9.9 14.7l-2.8 3.7M8.6 10.7L4.2 9.1"/>
    </svg>
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M4 9.5c0-3 3.6-5 8-5s8 2 8 5z"/><path d="M3.6 12.6h16.8"/><path d="M4 15.5c0 2.4 2.4 4 8 4s8-1.6 8-4"/>
    </svg>
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M12 3l8.2 15.8c-2.6 1.4-5.3 2.2-8.2 2.2s-5.6-.8-8.2-2.2z"/>
      <circle cx="10" cy="11" r=".9" fill="currentColor"/><circle cx="13.6" cy="13" r=".9" fill="currentColor"/><circle cx="11" cy="16.2" r=".9" fill="currentColor"/>
    </svg>
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M6 8.5h9V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/>
      <path d="M15 10.5h2.4A1.6 1.6 0 0 1 19 12.1v2.6a1.6 1.6 0 0 1-1.6 1.6H15"/>
      <path d="M6.5 8.5c-.3-2 1-3.2 2.6-3 .3-1.6 2-2.2 3.3-1.2 1.3-.7 2.8.1 2.7 1.7"/>
    </svg>
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M7 4.5h10V9a5 5 0 0 1-10 0z"/><path d="M7 6H4.6v1.4A2.6 2.6 0 0 0 7 10M17 6h2.4v1.4A2.6 2.6 0 0 1 17 10"/>
      <path d="M12 14v2.5M9.5 20h5M10.3 16.5h3.4V20h-3.4z"/>
    </svg>
  </div>
)

function StoryCard({ match }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const home = match.homeName, away = match.awayName
  const homeIso = NAME_TO_ISO[home], awayIso = NAME_TO_ISO[away]

  const download = async () => {
    setBusy(true)
    try {
      // Esperar a que las fuentes web (Anton, etc.) estén listas → si no, el texto
      // grande sale en una tipografía de respaldo y se ve mal.
      if (document.fonts?.ready) { try { await document.fonts.ready } catch {} }
      const canvas = await html2canvas(ref.current, { scale: 3, useCORS: true, backgroundColor: null, imageTimeout: 15000 })
      const slug = `${home}-${away}`.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      const file = new File([blob], `historia-${slug}.png`, { type: 'image/png' })
      // En celular: menú de compartir nativo → "Guardar imagen" (Fotos) o Instagram directo.
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Historia Sala Crespo' })
      } else {
        // Desktop: descarga clásica
        const link = document.createElement('a')
        link.download = file.name
        link.href = URL.createObjectURL(blob)
        link.click()
        URL.revokeObjectURL(link.href)
      }
    } catch (e) {
      if (e?.name !== 'AbortError') alert('No se pudo generar la imagen: ' + (e?.message || e))
    } finally { setBusy(false) }
  }

  return (
    <div className="ms__item">
      <div className="story" ref={ref}>
        <div className="story__flags">
          {DECO_FLAGS.map(c => <img key={c} src={`https://flagcdn.com/w80/${c}.png`} alt="" crossOrigin="anonymous" />)}
        </div>

        <div className="story__logos">
          <img className="story__logo" src="/logo-mundial-2026.png" alt="Sala Crespo Mundial 2026" />
          <span className="story__logo-sep" />
          <img className="story__logo-casino" src="/casino-er-blanco.png" alt="Casinos de Entre Ríos" />
        </div>
        <div className="story__floor">⚽ Primer piso · Nuevo espacio deportivo</div>

        <div className="story__eyebrow">Hoy te esperamos para ver</div>

        <div className="story__match">
          <div className="story__team">
            {homeIso ? <img src={`https://flagcdn.com/w640/${homeIso}.png`} alt={home} crossOrigin="anonymous" /> : <div className="story__team-noflag">🏳</div>}
            <span className="story__team-name">{shortName(home)}</span>
          </div>
          <span className="story__vs">VS</span>
          <div className="story__team">
            {awayIso ? <img src={`https://flagcdn.com/w640/${awayIso}.png`} alt={away} crossOrigin="anonymous" /> : <div className="story__team-noflag">🏳</div>}
            <span className="story__team-name">{shortName(away)}</span>
          </div>
        </div>

        <div className="story__when">
          <div className="story__day">Hoy · {dayLabel(match.date)}</div>
          <div className="story__time">{fmtTime(match.date)}<span> hs</span></div>
        </div>

        <p className="story__invite">Vení a vivirlo en <b>pantallas grandes</b>, con clima de hinchada y la mejor compañía. ⚽</p>

        {ICONS}

        <div className="story__promos">
          <div className="story__promos-title">🍔 Para acompañar el partido</div>
          <div className="story__promos-sub">Hamburguesas · Pizzas · Empanadas · Picadas</div>
          <div className="story__promos-deal">🎉 Promos para compartir desde <b>$18.000</b></div>
        </div>

        <div className="story__foot">
          <b>Sala de Juegos Crespo</b><br />
          San Martín 1053, Crespo · @saladejuegoscrespo
        </div>
      </div>

      <button className="ms__dl" onClick={download} disabled={busy}>
        {busy ? 'Generando…' : '📲 Guardar / Compartir'}
      </button>
    </div>
  )
}

export default function MatchStories() {
  const [matches, setMatches] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getMatches()
      .then(d => setMatches(Array.isArray(d) ? d : (d?.matches || [])))
      .catch(e => setError(e?.message || 'No se pudieron cargar los partidos'))
  }, [])

  const todayAR = todayARDate()
  const todayMatches = (matches || [])
    .filter(m => matchARDate(m.date) === todayAR && NAME_TO_ISO[m.homeName] !== undefined)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <div className="ms">
      <header className="ms__head">
        <h1>Historias para Instagram</h1>
        <p>Una imagen por partido de <b>hoy</b>. Tocá <b>“Descargar PNG”</b>, guardá la imagen y subila a la historia para invitar a verlo en el local. 📲</p>
      </header>

      {error && <p className="ms__msg ms__msg--err">{error}</p>}
      {!matches && !error && <p className="ms__msg">Cargando partidos…</p>}
      {matches && todayMatches.length === 0 && (
        <p className="ms__msg">No hay partidos hoy. Volvé un día que se juegue. ⚽</p>
      )}

      <div className="ms__grid">
        {todayMatches.map(m => <StoryCard key={m.id} match={m} />)}
      </div>
    </div>
  )
}
