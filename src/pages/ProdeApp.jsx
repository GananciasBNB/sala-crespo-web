import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  registerPlayer, loginPlayer, forgotPin,
  getMatches, getMyPredictions, savePrediction, savePredictionsBatch,
  getLeaderboard, getEmployeesLeaderboard, getRegistrationStatus,
  getContent,
  getMyAchievements, dailyCheckin, getChampionPick, setChampionPick,
  submitStaffSuggestion,
} from '../api/client'
import MundialCountdown from '../components/MundialCountdown'
import './ProdeApp.css'

// ─── Mapa de nombre → ISO para flagcdn.com ────────────────────────────────────
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
function isoFlag(name) { return NAME_TO_ISO[name] || null }
function flagSrc(name) {
  const iso = isoFlag(name)
  return iso ? `https://flagcdn.com/w40/${iso}.png` : null
}

// ─── Componente bandera ────────────────────────────────────────────────────────
function FlagImg({ name, size = 32, className = '' }) {
  const src = flagSrc(name)
  if (!src) return <span className={`flag-placeholder ${className}`} title={name}>🏳️</span>
  return (
    <img
      src={src}
      alt={name}
      title={name}
      width={size}
      className={`flag-img ${className}`}
      onError={e => { e.currentTarget.style.opacity = '0' }}
    />
  )
}

// ─── Datos de equipos por grupo ───────────────────────────────────────────────
const TEAMS_BY_GROUP = {
  A: [{ name: 'México' }, { name: 'Sudáfrica' }, { name: 'República de Corea' }, { name: 'República Checa' }],
  B: [{ name: 'Canadá' }, { name: 'Bosnia y Herzegovina' }, { name: 'Catar' }, { name: 'Suiza' }],
  C: [{ name: 'Brasil' }, { name: 'Marruecos' }, { name: 'Haití' }, { name: 'Escocia' }],
  D: [{ name: 'Estados Unidos' }, { name: 'Paraguay' }, { name: 'Australia' }, { name: 'Turquía' }],
  E: [{ name: 'Alemania' }, { name: 'Curazao' }, { name: 'Costa de Marfil' }, { name: 'Ecuador' }],
  F: [{ name: 'Países Bajos' }, { name: 'Japón' }, { name: 'Suecia' }, { name: 'Túnez' }],
  G: [{ name: 'Bélgica' }, { name: 'Egipto' }, { name: 'RI de Irán' }, { name: 'Nueva Zelanda' }],
  H: [{ name: 'España' }, { name: 'Cabo Verde' }, { name: 'Arabia Saudí' }, { name: 'Uruguay' }],
  I: [{ name: 'Francia' }, { name: 'Senegal' }, { name: 'Irak' }, { name: 'Noruega' }],
  J: [{ name: 'Argentina' }, { name: 'Argelia' }, { name: 'Austria' }, { name: 'Jordania' }],
  K: [{ name: 'Portugal' }, { name: 'RD Congo' }, { name: 'Uzbekistán' }, { name: 'Colombia' }],
  L: [{ name: 'Inglaterra' }, { name: 'Croacia' }, { name: 'Ghana' }, { name: 'Panamá' }],
}

// ISO codes en orden para el ticker (48 países — los 48 clasificados al Mundial 2026)
const ALL_FLAGS_ISO = [
  'mx','za','kr','cz','ca','ba','qa','ch','br','ma','ht','gb-sct',
  'us','py','au','tr','de','cw','ci','ec','nl','jp','se','tn',
  'be','eg','ir','nz','es','cv','sa','uy','fr','sn','iq','no',
  'ar','dz','at','jo','pt','cd','uz','co','gb-eng','hr','gh','pa',
]

const PHASE_LABELS = {
  group:   'Fase de Grupos',
  round32: '16avos de Final',
  round16: 'Octavos de Final',
  quarter: 'Cuartos de Final',
  semi:    'Semifinales',
  third:   'Tercer Puesto',
  final:   'Gran Final',
}
const PHASE_ORDER   = ['group','round32','round16','quarter','semi','third','final']
const KNOCKOUT_PHASES = ['round32','round16','quarter','semi','third','final']
const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

// ─── Toast ────────────────────────────────────────────────────────────────────
// type: 'ok' | 'err' | 'info' (info no prefija con ✓/✕ — útil cuando msg ya trae emoji)
function Toast({ msg, type, duration = 3000, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [onDone, duration])
  const prefix = type === 'ok' ? '✓ ' : type === 'err' ? '✕ ' : ''
  return <div className={`prode-toast prode-toast--${type}`}>{prefix}{msg}</div>
}

// ─── Flag Ticker ──────────────────────────────────────────────────────────────
function FlagTicker() {
  const isos = [...ALL_FLAGS_ISO, ...ALL_FLAGS_ISO]
  return (
    <div className="flag-ticker">
      <div className="flag-ticker__track">
        {isos.map((iso, i) => (
          <img
            key={i}
            src={`https://flagcdn.com/w40/${iso}.png`}
            alt={iso}
            className="flag-ticker__item"
            width={32}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Groups Grid ──────────────────────────────────────────────────────────────
function GroupsGrid() {
  return (
    <div className="groups-grid-wrap">
      <div className="groups-grid__eyebrow">🌍 LOS 48 EQUIPOS</div>
      <div className="groups-grid">
        {Object.entries(TEAMS_BY_GROUP).map(([group, teams]) => (
          <div key={group} className={`group-card ${group === 'J' ? 'group-card--arg' : ''}`}>
            <div className="group-card__header">
              {group === 'J' ? '⭐ Grupo J' : `Grupo ${group}`}
            </div>
            <div className="group-card__teams">
              {teams.map((t, i) => (
                <div key={i} className={`group-card__team ${group === 'J' && i === 0 ? 'group-card__team--arg' : ''}`}>
                  {t.name
                    ? <FlagImg name={t.name} size={20} className="group-card__flag-img" />
                    : <span className="group-card__flag-ph">🏳️</span>
                  }
                  <span className="group-card__name">{t.name || t.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Medallero (achievements) ─────────────────────────────────────────────────
// Colores por tier (silueta vs color desbloqueada)
const TIER_GRAD = {
  bronze:  ['#7a4f1f', '#c9923f'],
  silver:  ['#5a6678', '#b6c0d0'],
  gold:    ['#7a6620', '#f0c945'],
  special: ['#7a1010', '#e63946'],
}
const CATEGORY_LABEL = {
  pronostico: 'Pronóstico',
  engagement: 'Fidelidad',
  mundial:    'Mundial',
  social:     'Social',
  meta:       'Coleccionista',
}

// Iconos pictográficos: uno único por medalla (slug). Fallback a categoría si no existe.
// Estilo: line-art trazo limpio, 24x24 viewBox, stroke-width 1.8, currentColor.
const SVG_PROPS = { width: 36, height: 36, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

const SLUG_GLYPH = {
  // Pronóstico / acierto
  bautismo: (
    <svg {...SVG_PROPS}>
      {/* Cabecita del bebé */}
      <circle cx="12" cy="7" r="3.5" />
      {/* Mechón / rulito */}
      <path d="M11 4.2c.5-.6 1.5-.6 2 0" />
      {/* Cuerpo con pañal (línea de cinta del pañal) */}
      <path d="M7 14c0-1.7 2.2-3 5-3s5 1.3 5 3v3c0 1.7-2.2 3-5 3s-5-1.3-5-3z" />
      <path d="M7 16h10" />
      {/* Bracitos */}
      <path d="M5 12.5l2 1" />
      <path d="M19 12.5l-2 1" />
    </svg>
  ),
  'fixture-completo': (
    <svg {...SVG_PROPS}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9l2 2 4-4" /><path d="M8 14h8" /><path d="M8 17h5" /></svg>
  ),
  'tirador-certero': (
    <svg {...SVG_PROPS}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><path d="M19 5l-5 5" /><path d="M16 4h3v3" /></svg>
  ),
  'triple-corona': (
    <svg {...SVG_PROPS}><path d="M3 8l3 8h12l3-8-4 3-3-5-3 5-3-5-3 5z" /><circle cx="6" cy="7" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="18" cy="7" r="1" /><path d="M6 19h12" /></svg>
  ),
  'pronosticador-del-dia': (
    <svg {...SVG_PROPS}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9h16" /><path d="M9 3v4" /><path d="M15 3v4" /><path d="M11 13h2v5" /><path d="M11 18h3" /></svg>
  ),
  'hat-trick': (
    <svg {...SVG_PROPS}>
      {/* 3 pelotas de fútbol: 2 abajo, 1 arriba (triángulo) */}
      {/* Pelota 1 — arriba centro */}
      <circle cx="12" cy="6.5" r="3.2" />
      <path d="M12 3.5l1.5 1L13 6l-2 0-.5-1z" />
      <path d="M12 9.5l-1-1.5M12 9.5l1-1.5" />
      {/* Pelota 2 — abajo izquierda */}
      <circle cx="6.5" cy="16.5" r="3.2" />
      <path d="M6.5 13.5l1.5 1L7.5 16l-2 0-.5-1z" />
      <path d="M6.5 19.5l-1-1.5M6.5 19.5l1-1.5" />
      {/* Pelota 3 — abajo derecha */}
      <circle cx="17.5" cy="16.5" r="3.2" />
      <path d="M17.5 13.5l1.5 1L18.5 16l-2 0-.5-1z" />
      <path d="M17.5 19.5l-1-1.5M17.5 19.5l1-1.5" />
    </svg>
  ),
  imparable: (
    <svg {...SVG_PROPS}><path d="M3 12h13" /><path d="M12 6l6 6-6 6" /><path d="M3 8h6" /><path d="M3 16h6" /></svg>
  ),
  cuadrangular: (
    <svg {...SVG_PROPS}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /><path d="M7 7l1 1 1.5-2" /><path d="M16 7l1 1 1.5-2" /><path d="M7 16l1 1 1.5-2" /><path d="M16 16l1 1 1.5-2" /></svg>
  ),
  'toque-al-palo': (
    <svg {...SVG_PROPS}><rect x="3" y="6" width="18" height="11" rx="0.5" /><path d="M3 17h18" /><path d="M3 6L1 17" /><path d="M21 6l2 11" /><path d="M3 10h18" /><circle cx="12" cy="14" r="2" /></svg>
  ),
  goleadita: (
    <svg {...SVG_PROPS}>
      {/* Red del arco — perspectiva con líneas verticales y horizontales */}
      <path d="M3 7l2-2h14l2 2v13l-2 1H5l-2-1z" />
      <path d="M5 5v15M19 5v15M3 11h18M3 15h18M9 5v15M15 5v15" />
      {/* Pelota grande clavada en la red — el "golazo" */}
      <circle cx="12" cy="13" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13" r="2.6" />
    </svg>
  ),

  // Engagement (3 niveles de llama)
  'visitante-regular': (
    <svg {...SVG_PROPS}><path d="M12 6c-1 3-3 4-3 7a3 3 0 0 0 6 0c0-2-1.5-3-3-7z" /></svg>
  ),
  'hincha-leal': (
    <svg {...SVG_PROPS}><path d="M12 3c-2 4-5 6-5 10a5 5 0 0 0 10 0c0-3-2-5-5-10z" /><path d="M12 11c-1 1.5-2 2.5-2 4a2 2 0 0 0 4 0c0-1-0.8-2-2-4z" fill="currentColor" /></svg>
  ),
  leyenda: (
    <svg {...SVG_PROPS}><path d="M12 2c-3 5-6 7-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z" /><path d="M12 10c-2 2-3.5 3.5-3.5 6a3.5 3.5 0 0 0 7 0c0-1.5-1.2-3-3.5-6z" fill="currentColor" /><path d="M3 13l-2-1M21 13l2-1M5 7l-2 1M19 7l2 1" /></svg>
  ),

  // Mundial específicos
  patriota: (
    <svg {...SVG_PROPS}><path d="M5 3v18" /><path d="M5 4h13l-2 5 2 5H5" /><circle cx="11" cy="9" r="1.7" /><path d="M11 6.5v.8M11 11v.8M14 9h-.8M8 9h.8M13.1 7l-.6.6M9.5 10.4l-.6.6M13.1 11l-.6-.6M9.5 7.6l-.6-.6" /></svg>
  ),
  globetrotter: (
    <svg {...SVG_PROPS}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c3 3 4.5 6 4.5 9s-1.5 6-4.5 9c-3-3-4.5-6-4.5-9s1.5-6 4.5-9z" /></svg>
  ),
  profeta: (
    <svg {...SVG_PROPS}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3.2" /><circle cx="12" cy="12" r="1" fill="currentColor" /><path d="M12 4v1.5M12 18.5v1.5M4 12h-1.5M21.5 12H20" /></svg>
  ),

  // Social
  embajador: (
    <svg {...SVG_PROPS}>
      {/* Apretón de manos: dos brazos saliendo de cada lado, manos chocando al centro */}
      <path d="M2 13l3-1.5 3 1 3.5 1.5h1l3.5-1.5 3-1L22 13" />
      <path d="M9 14l3-1 3 1" />
      {/* Antebrazos */}
      <path d="M2 13v3l3-1v-3.5" />
      <path d="M22 13v3l-3-1v-3.5" />
      {/* Pulgares apretándose */}
      <path d="M11 13.5l1-1 1 1" />
    </svg>
  ),

  // Meta-medallas (1, 2, 3 estrellas)
  coleccionista: (
    <svg {...SVG_PROPS}><path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5L12 17l-5.5 3.5L8 14l-5-4.5L9.5 9z" /></svg>
  ),
  'maestro-coleccionista': (
    <svg {...SVG_PROPS}><path d="M7 6l1.6 4 4.4.3-3.4 3 1 4.4L7 16l-3.6 1.7L4.4 13.3 1 10.3l4.4-.3z" /><path d="M17 6l1.6 4 4.4.3-3.4 3 1 4.4L17 16l-3.6 1.7L14.4 13.3 11 10.3l4.4-.3z" /><path d="M9 22h6" /></svg>
  ),
  'vitrina-llena': (
    <svg {...SVG_PROPS}><path d="M5 5l1 3 3 .3-2.5 2.2.8 3-2.3-1.5-2.3 1.5.8-3L1 8.3l3-.3z" /><path d="M19 5l1 3 3 .3-2.5 2.2.8 3-2.3-1.5-2.3 1.5.8-3L15 8.3l3-.3z" /><path d="M12 11l1.4 4 4.1.3-3.2 2.7L15.5 23 12 20.5 8.5 23l1.2-4.7L6.5 15.3l4.1-.3z" /></svg>
  ),
}

const CATEGORY_FALLBACK = {
  pronostico: (<svg {...SVG_PROPS}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>),
  engagement: (<svg {...SVG_PROPS}><path d="M12 3c0 4-4 5-4 9a4 4 0 0 0 8 0c0-2-1-3-2-4 0 2-1 3-2 3 0-3 2-5 0-8z" /></svg>),
  mundial:    (<svg {...SVG_PROPS}><path d="M12 2l2.5 5 5.5.8-4 4 1 5.5L12 14.8 7 17.3 8 11.8 4 7.8l5.5-.8L12 2z" /></svg>),
  social:     (<svg {...SVG_PROPS}><circle cx="9" cy="9" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 19c0-3 3-5 6-5s6 2 6 5" /><path d="M14 14c2 0 5 1.5 5 4" /></svg>),
  meta:       (<svg {...SVG_PROPS}><path d="M12 2l2.5 7h7l-5.7 4.5L18 21l-6-4.5L6 21l2.2-7.5L2.5 9h7L12 2z" /></svg>),
}

function AchievementGlyph({ slug, category }) {
  return SLUG_GLYPH[slug] || CATEGORY_FALLBACK[category] || null
}

// Compatibilidad — ChampionPickCard sigue usando CategoryGlyph
function CategoryGlyph({ category }) {
  return CATEGORY_FALLBACK[category] || null
}

// Componente reusable: una medalla individual (lockeada = silueta gris, desbloqueada = a color)
function AchievementBadge({ achievement, unlocked, size = 88, onClick, showName = true }) {
  const [start, end] = TIER_GRAD[achievement.tier] || TIER_GRAD.bronze
  const grayStart = '#2a2f3a'
  const grayEnd   = '#1a1d24'
  const fillStart = unlocked ? start : grayStart
  const fillEnd   = unlocked ? end   : grayEnd
  const stroke    = unlocked ? '#FFD250' : '#3a4150'
  const glow      = unlocked ? `drop-shadow(0 0 12px ${end}88)` : 'none'
  // Silueta del ícono cuando está locked: gris claro sólido (forma nítida pero sin tier color)
  const iconColor = unlocked ? '#fff' : '#a5afbf'
  return (
    <button
      type="button"
      className={`badge ${unlocked ? 'badge--unlocked' : 'badge--locked'} badge--${achievement.tier}`}
      onClick={onClick}
      aria-label={achievement.name}
      style={{ width: size, height: showName ? size + 22 : size, filter: glow }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={`grad-${achievement.slug}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"  stopColor={fillEnd} />
            <stop offset="100%" stopColor={fillStart} />
          </linearGradient>
        </defs>
        <polygon points="50,2 60,12 50,16 40,12" fill={fillStart} opacity={unlocked ? 0.9 : 0.5} />
        <circle cx="50" cy="55" r="38" fill={`url(#grad-${achievement.slug})`} stroke={stroke} strokeWidth="2.5" />
        <circle cx="50" cy="55" r="32" fill="none" stroke={stroke} strokeWidth="0.7" opacity="0.6" />
        <g transform="translate(32, 37)" color={iconColor}>
          <AchievementGlyph slug={achievement.slug} category={achievement.category} />
        </g>
      </svg>
      {showName && <div className="badge__name">{achievement.name}</div>}
    </button>
  )
}

// Card para tab Inicio: hero con última medalla + grilla de próximas con descripción
function MedalleroCard({ player, onOpenFull }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!player?.token) return
    getMyAchievements(player.token).then(setData).catch(() => setData(null))
  }, [player?.token])
  if (!data) return null
  const { catalog, unlocked = [], totalUnlocked, totalCatalog } = data
  const unlockedMap = Object.fromEntries(unlocked.map(u => [u.slug, u.unlockedAt]))
  // Última desbloqueada (más reciente). Si no hay, marcamos null.
  const lastUnlocked = unlocked.length > 0
    ? catalog.find(a => a.slug === unlocked[0].slug)
    : null
  // Próximas 4 a desbloquear (las primeras locked del catálogo)
  const nextUp = catalog.filter(a => !unlockedMap[a.slug]).slice(0, 4)
  const pct = Math.round((totalUnlocked / Math.max(totalCatalog, 1)) * 100)
  return (
    <div className="medallero-card">
      <div className="medallero-card__head">
        <div>
          <h2 className="medallero-card__title">Tu Medallero</h2>
          <p className="medallero-card__sub">{totalUnlocked} de {totalCatalog} medallas · {pct}% completado</p>
        </div>
        <button className="medallero-card__cta" onClick={onOpenFull}>Ver todas →</button>
      </div>
      <div className="medallero-card__progress">
        <div className="medallero-card__progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="medallero-card__layout">
        {/* HERO — última medalla obtenida o "estás por arrancar" */}
        <div className="medallero-card__hero">
          {lastUnlocked ? (
            <>
              <div className="medallero-card__hero-label">Última medalla</div>
              <AchievementBadge achievement={lastUnlocked} unlocked={true} size={140} onClick={onOpenFull} showName={false} />
              <div className="medallero-card__hero-name">{lastUnlocked.name}</div>
              <div className="medallero-card__hero-desc">{lastUnlocked.description}</div>
            </>
          ) : (
            <>
              <div className="medallero-card__hero-label">Tu vitrina está vacía</div>
              <div className="medallero-card__hero-empty-glyph">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#FFD250" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity=".5">
                  <path d="M12 2l2.5 7h7l-5.7 4.5L18 21l-6-4.5L6 21l2.2-7.5L2.5 9h7L12 2z" />
                </svg>
              </div>
              <div className="medallero-card__hero-name">Tu primera medalla te espera</div>
              <div className="medallero-card__hero-desc">Cargá tu primer pronóstico y desbloqueá la medalla "Bautismo" para arrancar la colección.</div>
            </>
          )}
        </div>

        {/* COLUMNA DERECHA — próximas a desbloquear, con descripción visible */}
        <div className="medallero-card__upcoming">
          <div className="medallero-card__upcoming-label">Próximas a desbloquear</div>
          <div className="medallero-card__upcoming-list">
            {nextUp.map(a => (
              <button
                key={a.slug}
                type="button"
                className="medallero-card__upcoming-item"
                onClick={onOpenFull}
              >
                <AchievementBadge achievement={a} unlocked={false} size={64} showName={false} />
                <div className="medallero-card__upcoming-text">
                  <div className="medallero-card__upcoming-name">{a.name}</div>
                  <div className="medallero-card__upcoming-desc">{a.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Modal con el grid completo del medallero — cards horizontales con descripción visible
function MedalleroFull({ player, onClose }) {
  const [data, setData] = useState(null)
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    if (!player?.token) return
    getMyAchievements(player.token).then(setData).catch(() => setData(null))
  }, [player?.token])
  if (!data) return null
  const unlockedMap = Object.fromEntries((data.unlocked || []).map(u => [u.slug, u.unlockedAt]))
  const byCat = {}
  for (const a of data.catalog) (byCat[a.category] ||= []).push(a)
  const order = ['pronostico', 'mundial', 'engagement', 'social', 'meta']
  const TIER_LABEL = { bronze: 'Bronce', silver: 'Plata', gold: 'Oro', special: 'Especial' }
  const pct = Math.round((data.totalUnlocked / Math.max(data.totalCatalog, 1)) * 100)
  return (
    <div className="medallero-modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="medallero-modal__inner">
        <button className="medallero-modal__close" onClick={onClose}>✕</button>
        <div className="medallero-modal__header">
          <div>
            <div className="medallero-modal__eyebrow">Vitrina personal</div>
            <h2 className="medallero-modal__title">Medallero</h2>
            <p className="medallero-modal__sub">{data.totalUnlocked} de {data.totalCatalog} desbloqueadas · {pct}% completado</p>
          </div>
          <div className="medallero-modal__progress-wrap">
            <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                stroke="url(#progressGrad)" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * Math.PI * 100} ${Math.PI * 100}`}
                transform="rotate(-90 60 60)"
              />
              <defs>
                <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"  stopColor="#C41E3A" />
                  <stop offset="100%" stopColor="#FFD250" />
                </linearGradient>
              </defs>
              <text x="60" y="58" textAnchor="middle" fill="#FFD250" fontSize="26" fontFamily="'Bebas Neue', sans-serif" fontWeight="700">{data.totalUnlocked}</text>
              <text x="60" y="76" textAnchor="middle" fill="#B0B8C4" fontSize="11">de {data.totalCatalog}</text>
            </svg>
          </div>
        </div>

        {order.map(cat => byCat[cat] ? (
          <div key={cat} className="medallero-modal__section">
            <div className="medallero-modal__section-head">
              <span className="medallero-modal__section-bar" />
              <h3 className="medallero-modal__section-title">{CATEGORY_LABEL[cat]}</h3>
              <span className="medallero-modal__section-count">
                {byCat[cat].filter(a => unlockedMap[a.slug]).length} / {byCat[cat].length}
              </span>
            </div>
            <div className="medallero-modal__grid">
              {byCat[cat].map(a => {
                const isUnlocked = !!unlockedMap[a.slug]
                return (
                  <button
                    key={a.slug}
                    type="button"
                    className={`mm-card ${isUnlocked ? 'mm-card--unlocked' : 'mm-card--locked'} mm-card--${a.tier}`}
                    onClick={() => setSelected({ ...a, unlockedAt: unlockedMap[a.slug] })}
                  >
                    <AchievementBadge achievement={a} unlocked={isUnlocked} size={76} showName={false} />
                    <div className="mm-card__body">
                      <div className="mm-card__top">
                        <span className="mm-card__name">{a.name}</span>
                        <span className={`mm-card__tier mm-card__tier--${a.tier}`}>{TIER_LABEL[a.tier]}</span>
                      </div>
                      <div className="mm-card__desc">{a.description}</div>
                      <div className="mm-card__status">
                        {isUnlocked
                          ? <span className="mm-card__status-pill mm-card__status-pill--ok">✓ Desbloqueada</span>
                          : <span className="mm-card__status-pill mm-card__status-pill--locked">Por desbloquear</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null)}
        {selected && (
          <div className="medallero-modal__detail" onClick={() => setSelected(null)}>
            <div className="medallero-modal__detail-card" onClick={e => e.stopPropagation()}>
              <button className="medallero-modal__close" onClick={() => setSelected(null)}>✕</button>
              <AchievementBadge achievement={selected} unlocked={!!selected.unlockedAt} size={160} showName={false} />
              <h3 className="medallero-modal__detail-name">{selected.name}</h3>
              <p className="medallero-modal__detail-desc">{selected.description}</p>
              {selected.unlockedAt
                ? <p className="medallero-modal__detail-date">Desbloqueada el {new Date(selected.unlockedAt).toLocaleDateString('es-AR')}</p>
                : <p className="medallero-modal__detail-locked">Aún no desbloqueada</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Modal celebratorio con confeti — se muestra cuando se desbloquea una medalla
function UnlockModal({ achievements, onClose }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    let cancelled = false
    import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return
      const colors = ['#C41E3A', '#FFD250', '#ffffff', '#74ACDF']
      // zIndex 9999 para quedar por encima del modal (que está en 6000)
      const base = { zIndex: 9999, colors }
      confetti({ ...base, particleCount: 100, spread: 80, origin: { y: 0.6 }, startVelocity: 45 })
      setTimeout(() => !cancelled && confetti({ ...base, particleCount: 60, spread: 110, origin: { x: 0, y: 0.7 }, angle: 60, startVelocity: 50 }), 200)
      setTimeout(() => !cancelled && confetti({ ...base, particleCount: 60, spread: 110, origin: { x: 1, y: 0.7 }, angle: 120, startVelocity: 50 }), 400)
      // Lluvia más larga estilo final de partido (~2s)
      setTimeout(() => !cancelled && confetti({ ...base, particleCount: 80, spread: 160, origin: { y: 0.3 }, gravity: 0.6, ticks: 300 }), 700)
    }).catch(err => console.warn('[confetti] failed to load:', err?.message))
    return () => { cancelled = true }
  }, [idx])
  if (!achievements || achievements.length === 0) return null
  const current = achievements[idx]
  const hasMore = idx < achievements.length - 1
  const shareText = `🏆 Gané la medalla "${current.name}" en el Prode Mundial 2026 de Sala de Juegos Crespo. ¿Te animás a competir? https://saladejuegoscrespo.ar/prode`
  const shareUrl  = 'https://saladejuegoscrespo.ar/prode'
  const handleShare = (network) => {
    const enc = encodeURIComponent(shareText)
    if (network === 'wa')  window.open(`https://wa.me/?text=${enc}`, '_blank')
    if (network === 'tw')  window.open(`https://twitter.com/intent/tweet?text=${enc}`, '_blank')
    if (network === 'fb')  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${enc}`, '_blank')
    if (network === 'native' && navigator.share) navigator.share({ title: current.name, text: shareText, url: shareUrl }).catch(() => {})
  }
  return (
    <div className="unlock-modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="unlock-modal__card">
        <div className="unlock-modal__ribbon">¡Nueva medalla!</div>
        <div className="unlock-modal__badge-wrap">
          <AchievementBadge achievement={current} unlocked={true} size={160} />
        </div>
        <h2 className="unlock-modal__name">{current.name}</h2>
        <p className="unlock-modal__desc">{current.description}</p>
        <p className="unlock-modal__hint">¡Felicitaciones! La sumaste a tu vitrina personal.</p>
        <div className="unlock-modal__share">
          <span className="unlock-modal__share-label">Compartir:</span>
          <button className="unlock-modal__share-btn unlock-modal__share-btn--wa" onClick={() => handleShare('wa')} aria-label="WhatsApp">WhatsApp</button>
          <button className="unlock-modal__share-btn unlock-modal__share-btn--tw" onClick={() => handleShare('tw')} aria-label="X / Twitter">Twitter</button>
          <button className="unlock-modal__share-btn unlock-modal__share-btn--fb" onClick={() => handleShare('fb')} aria-label="Facebook">Facebook</button>
        </div>
        <div className="unlock-modal__actions">
          {hasMore && (
            <button className="unlock-modal__next" onClick={() => setIdx(idx + 1)}>
              Siguiente medalla ({idx + 2} / {achievements.length}) →
            </button>
          )}
          <button className="unlock-modal__close-btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Profeta — pre-Mundial champion pick ──────────────────────────────────────
const TEAMS_FOR_PICK = [
  { code: 'ARG', name: 'Argentina' }, { code: 'BRA', name: 'Brasil' }, { code: 'FRA', name: 'Francia' },
  { code: 'ESP', name: 'España' }, { code: 'ENG', name: 'Inglaterra' }, { code: 'POR', name: 'Portugal' },
  { code: 'GER', name: 'Alemania' }, { code: 'NED', name: 'Países Bajos' }, { code: 'BEL', name: 'Bélgica' },
  { code: 'CRO', name: 'Croacia' }, { code: 'ITA', name: 'Italia' }, { code: 'URU', name: 'Uruguay' },
  { code: 'COL', name: 'Colombia' }, { code: 'MEX', name: 'México' }, { code: 'USA', name: 'Estados Unidos' },
  { code: 'CAN', name: 'Canadá' }, { code: 'JPN', name: 'Japón' }, { code: 'KOR', name: 'Corea del Sur' },
  { code: 'AUS', name: 'Australia' }, { code: 'MAR', name: 'Marruecos' }, { code: 'SEN', name: 'Senegal' },
  { code: 'EGY', name: 'Egipto' }, { code: 'NGA', name: 'Nigeria' }, { code: 'CIV', name: 'Costa de Marfil' },
  { code: 'CHI', name: 'Chile' }, { code: 'PAR', name: 'Paraguay' }, { code: 'ECU', name: 'Ecuador' },
  { code: 'VEN', name: 'Venezuela' }, { code: 'SUI', name: 'Suiza' }, { code: 'POL', name: 'Polonia' },
  { code: 'DEN', name: 'Dinamarca' }, { code: 'SRB', name: 'Serbia' },
]

function ChampionPickCard({ player }) {
  const [state, setState] = useState({ pick: null, locked: false, lockAt: null })
  const [selected, setSelected] = useState('')
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')
  useEffect(() => {
    if (!player?.token) return
    getChampionPick(player.token).then(setState).catch(() => {})
  }, [player?.token])
  async function handleSave() {
    setErr('')
    if (!selected) return setErr('Elegí una selección.')
    const team = TEAMS_FOR_PICK.find(t => t.code === selected)
    if (!team) return setErr('Selección inválida.')
    setSaving(true)
    try {
      const r = await setChampionPick(player.token, team.code, team.name)
      setState(s => ({ ...s, pick: r.pick }))
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }
  if (state.pick) {
    return (
      <div className="profeta-card profeta-card--locked">
        <div className="profeta-card__icon"><CategoryGlyph category="mundial" /></div>
        <div className="profeta-card__body">
          <h3 className="profeta-card__title">Tu profecía</h3>
          <p className="profeta-card__sub">Elegiste a <strong>{state.pick.teamName}</strong> como campeón del Mundial 2026.</p>
          <p className="profeta-card__note">Si acertás → +20 pts al ranking + medalla "Profeta". La elección no se puede modificar.</p>
        </div>
      </div>
    )
  }
  if (state.locked) {
    return (
      <div className="profeta-card profeta-card--closed">
        <div className="profeta-card__icon"><CategoryGlyph category="mundial" /></div>
        <div className="profeta-card__body">
          <h3 className="profeta-card__title">Profecía cerrada</h3>
          <p className="profeta-card__sub">La elección del campeón cerró al iniciar el Mundial.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="profeta-card">
      <div className="profeta-card__icon"><CategoryGlyph category="mundial" /></div>
      <div className="profeta-card__body">
        <h3 className="profeta-card__title">Sé un Profeta</h3>
        <p className="profeta-card__sub">Elegí ahora quién va a ganar el Mundial. Si acertás, ganás <strong>+20 pts</strong> al ranking y la medalla <strong>Profeta</strong>. La elección cierra cuando arranque el Mundial.</p>
        <div className="profeta-card__form">
          <select className="profeta-card__select" value={selected} onChange={e => setSelected(e.target.value)} disabled={saving}>
            <option value="">— Elegí tu campeón —</option>
            {TEAMS_FOR_PICK.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
          </select>
          <button className="profeta-card__submit" onClick={handleSave} disabled={saving || !selected}>
            {saving ? 'Guardando...' : 'Confirmar profecía'}
          </button>
        </div>
        {err && <div className="profeta-card__err">⚠️ {err}</div>}
      </div>
    </div>
  )
}

function PrizeCards() {
  const tiers = [
    {
      label: '🏅 Fase de Grupos',
      prizes: ['$75.000', '$50.000', '$25.000'],
      accent: '#C9A84C',
    },
    {
      label: '🔥 16avos de Final',
      prizes: ['$75.000', '$50.000', '$25.000'],
      accent: '#C41E3A',
    },
    {
      label: '🏆 Acumulado Total',
      prizes: ['$100.000', '$75.000', '$50.000'],
      accent: '#00B140',
      featured: true,
    },
  ]
  const medalIcons = ['🥇', '🥈', '🥉']

  return (
    <div className="prizes">
      <div className="prizes__eyebrow">🎁 PREMIOS EN TICKETS PROMOCIONALES</div>
      <div className="prizes__grid">
        {tiers.map((tier) => (
          <div key={tier.label} className={`prize-card ${tier.featured ? 'prize-card--featured' : ''}`} style={{ '--accent': tier.accent }}>
            <div className="prize-card__label">{tier.label}</div>
            <div className="prize-card__list">
              {tier.prizes.map((amount, i) => (
                <div key={i} className="prize-card__row">
                  <span className="prize-card__medal">{medalIcons[i]}</span>
                  <span className="prize-card__amount">{amount}</span>
                </div>
              ))}
            </div>
            {tier.featured && <div className="prize-card__star">★ GRAN PREMIO</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Nav con hint de scroll en mobile ─────────────────────────────────────────
function ProdeNav({ tabs, activeTab, onTabChange }) {
  const navRef = useRef(null)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [atEnd, setAtEnd] = useState(false)

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const update = () => {
      const overflow = el.scrollWidth > el.clientWidth + 4
      setHasOverflow(overflow)
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [tabs.length])

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const btn = el.querySelector('.prode-nav__btn--active')
    if (btn) btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeTab])

  const showHint = hasOverflow && !atEnd

  return (
    <div className={`prode-nav-wrap ${showHint ? 'prode-nav-wrap--hint' : ''}`}>
      <nav className="prode-nav" ref={navRef}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`prode-nav__btn ${activeTab === t.id ? 'prode-nav__btn--active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {showHint && (
        <button
          type="button"
          className="prode-nav__hint"
          aria-label="Ver más opciones"
          onClick={() => navRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}
    </div>
  )
}

// ─── Leaderboard con 3 tabs ───────────────────────────────────────────────────
function LeaderboardView({ myId, audience = 'public', token }) {
  const [phase, setPhase] = useState('all')
  const [data, setData]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const fetcher = audience === 'employees'
      ? getEmployeesLeaderboard(phase, token)
      : getLeaderboard(phase)
    fetcher
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [phase, audience, token])

  const tabs = [
    { id: 'group',   label: 'Grupos' },
    { id: 'round32', label: '16avos' },
    { id: 'all',     label: 'Acumulado' },
  ]
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="lb-wrap">
      <div className="lb-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`lb-tab ${phase === t.id ? 'lb-tab--active' : ''}`}
            onClick={() => setPhase(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="prode-loading">Cargando tabla...</div>
      ) : data.length === 0 ? (
        <div className="prode-empty">
          <div className="prode-empty__icon">🏆</div>
          <p><strong>Todavía no empezó el Mundial.</strong> Pre-cargá tus pronósticos ahora y arrancá con ventaja desde el primer partido.</p>
        </div>
      ) : (
        <table className="lb__table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>Pts</th>
              <th className="lb__hide-sm" style={{textAlign:'center'}}>Resultado Perfecto</th>
              <th className="lb__hide-sm" style={{textAlign:'center'}}>Acierto Ganador</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr key={p.id} className={`lb__row ${p.id === myId ? 'lb__row--me' : ''} ${i < 3 ? 'lb__row--top' : ''}`}>
                <td className="lb__pos">
                  {i < 3 ? <span style={{fontSize:'22px'}}>{medals[i]}</span> : <span className="lb__pos-num">{i + 1}</span>}
                </td>
                <td className="lb__name">
                  <span style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <PlayerAvatar mascotId={p.mascota} size={32} name={p.name} />
                    <span>
                      {p.name}
                      {p.dniLast3 && <span className="lb__dni"> ···{p.dniLast3}</span>}
                      {p.id === myId && <span className="lb__you"> (vos)</span>}
                    </span>
                  </span>
                </td>
                <td className="lb__pts">{p.total}</td>
                <td className="lb__hide-sm lb__exact" style={{textAlign:'center'}}>{p.exact}</td>
                <td className="lb__hide-sm" style={{textAlign:'center'}}>{p.correct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="lb__legend">
        <div className="lb__legend-row"><span className="lb__legend-pts lb__legend-pts--gold">10 pts</span><span><strong>Resultado Perfecto</strong> — acertás el marcador exacto (ej: 2-1 y salió 2-1)</span></div>
        <div className="lb__legend-row"><span className="lb__legend-pts lb__legend-pts--silver">5 pts</span><span><strong>Acierto Ganador</strong> — acertás quién gana o que empata, sin importar el marcador</span></div>
        <div className="lb__legend-row"><span className="lb__legend-pts lb__legend-pts--bronze">1 pt</span><span><strong>Total de goles</strong> — la suma de goles del partido coincide, aunque no el resultado</span></div>
        <div className="lb__legend-row lb__legend-row--arg"><span className="lb__legend-pts lb__legend-pts--arg">×2</span><span><strong>Partidos de Argentina</strong> — todos los puntos se duplican</span></div>
      </div>
    </div>
  )
}

// ─── Mascotas ─────────────────────────────────────────────────────────────────
const MASCOTAS = [
  { id: 'cocodrilo', label: 'Cocodrilo', src: '/mascotas/Cocodrilo.png' },
  { id: 'gorilla',   label: 'Gorila',    src: '/mascotas/Gorilla.png'   },
  { id: 'guepardo',  label: 'Guepardo',  src: '/mascotas/Guepardo.png'  },
  { id: 'oso',       label: 'Oso',       src: '/mascotas/Oso.png'       },
  { id: 'tigre',     label: 'Tigre',     src: '/mascotas/Tigre.png'     },
  { id: 'elefante',  label: 'Elefante',  src: '/mascotas/Elefante.png'  },
  { id: 'rino',      label: 'Rinoceronte', src: '/mascotas/Rino.png'    },
  { id: 'tibu',      label: 'Tiburón',   src: '/mascotas/Tibu.png'      },
]
function PlayerAvatar({ mascotId, size = 36, name = '' }) {
  const m = MASCOTAS.find(x => x.id === mascotId) || MASCOTAS[0]
  return <img src={m.src} alt={m.label || name} width={size} height={size} className="player-avatar" style={{ flexShrink: 0 }} />
}

function AuthModal({ onClose, onLogin, staffSignupCode = null, initialTab = null }) {
  const [registrationClosed, setRegistrationClosed] = useState(false)
  useEffect(() => {
    getRegistrationStatus().then(s => setRegistrationClosed(!!s.closed)).catch(() => {})
  }, [])
  const [tab, setTab]           = useState(initialTab || (registrationClosed ? 'login' : 'registro'))
  const [name, setName]         = useState('')
  const [dni, setDni]           = useState('')
  const [tel, setTel]           = useState('')
  const [email, setEmail]       = useState('')
  const [pin, setPin]           = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [showPin, setShowPin]   = useState(true)
  const [mascota, setMascota]   = useState('cocodrilo')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')

  async function handleRegister(e) {
    e.preventDefault()
    setError(''); setInfo('')
    if (!name.trim())            return setError('Ingresá tu nombre.')
    if (!/^\d{7,8}$/.test(dni))  return setError(`Revisá tu DNI: ingresaste ${dni.length} ${dni.length === 1 ? 'número' : 'números'}, deberían ser 7 u 8 (sin puntos).`)
    if (!/^[\d\s\-\+\(\)]{8,15}$/.test(tel.trim())) return setError('Ingresá un teléfono válido (ej: 3435 123456).')
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Email inválido. Dejalo en blanco si no querés cargarlo.')
    if (!/^\d{4}$/.test(pin))    return setError('El PIN debe tener exactamente 4 dígitos.')
    if (pin !== pinConfirm)      return setError('Los PINs no coinciden. Volvé a escribirlo.')
    setLoading(true)
    try {
      const player = await registerPlayer(name.trim(), dni, tel.trim(), pin, mascota, email.trim() || null, staffSignupCode || null)
      localStorage.setItem('prode_player', JSON.stringify(player))
      onLogin(player)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleForgot() {
    setError(''); setInfo('')
    if (!/^\d{7,8}$/.test(dni)) return setError('Ingresá primero tu DNI arriba.')
    const e = prompt('Ingresá el email que registraste para enviarte un PIN nuevo:')
    if (!e) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())) return setError('Email inválido.')
    setLoading(true)
    try {
      const r = await forgotPin(dni, e.trim())
      setInfo(r.message || 'Te enviamos un email con tu nuevo PIN.')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    // Atajo de prueba: PIN 3907 sin DNI → loguea al jugador de prueba (is_employee=true, no compite)
    const isTestShortcut = !dni && pin === '3907'
    const effectiveDni = isTestShortcut ? '99999999' : dni
    if (!/^\d{7,8}$/.test(effectiveDni)) return setError('Ingresá tu DNI (7 u 8 dígitos, sin puntos).')
    if (!/^\d{4}$/.test(pin))             return setError('Ingresá tu PIN de 4 dígitos.')
    setLoading(true)
    try {
      const player = await loginPlayer(effectiveDni, pin)
      localStorage.setItem('prode_player', JSON.stringify(player))
      onLogin(player)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal__close" onClick={onClose}>✕</button>
        <div className="modal__header">
          <span className="modal__icon">⚽</span>
          <h2 className="modal__title">Sumate al Prode</h2>
        </div>

        <div className="modal__tabs">
          <button className={`modal__tab ${tab === 'registro' ? 'modal__tab--active' : ''}`} onClick={() => { setTab('registro'); setError('') }}>
            Soy nuevo
          </button>
          <button className={`modal__tab ${tab === 'login' ? 'modal__tab--active' : ''}`} onClick={() => { setTab('login'); setError('') }}>
            Ya tengo cuenta
          </button>
        </div>

        {error && <div className="modal__error">⚠️ {error}</div>}
        {info && <div className="modal__info">✓ {info}</div>}
        {registrationClosed && tab === 'registro' && (
          <div className="modal__error" style={{ background: 'rgba(255,157,58,.12)', borderColor: 'rgba(255,157,58,.5)', color: '#FFB870' }}>
            🔒 Las inscripciones cerraron el <strong>30/06/2026</strong> al finalizar la fase de 16avos. Si ya tenías cuenta, podés ingresar desde "Ya tengo cuenta".
          </div>
        )}

        {tab === 'login' ? (
          <form className="modal__form" onSubmit={handleLogin}>
            <label className="modal__label">DNI (sin puntos)</label>
            <input
              className="modal__input"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={dni}
              onChange={e => setDni(e.target.value.replace(/\D/g,''))}
              placeholder="Ej: 35123456"
              maxLength={8}
              autoFocus
            />
            <label className="modal__label">PIN de 4 dígitos</label>
            <div className="modal__pin-row">
              <input
                className="modal__input modal__input--pin"
                type={showPin ? 'tel' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g,''))}
                placeholder="1234"
                maxLength={4}
              />
              <button type="button" className="modal__pin-toggle" onClick={() => setShowPin(s => !s)} aria-label="Mostrar/ocultar PIN">
                {showPin ? '🙈' : '👁️'}
              </button>
            </div>
            <button className="modal__submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar →'}
            </button>
            <button type="button" className="modal__link" onClick={handleForgot} disabled={loading}>
              ¿Olvidaste tu PIN?
            </button>
          </form>
        ) : (
          <form className="modal__form" onSubmit={handleRegister}>
            {staffSignupCode && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(196,30,58,.15), rgba(255,210,80,.08))',
                border: '1px solid rgba(196,30,58,.5)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 16,
                color: '#FFD250',
                fontSize: 13,
                lineHeight: 1.5,
              }}>
                🏢 <strong>Registro de personal interno</strong> — al confirmar quedarás marcado como <strong>empleado de Sala de Juegos Crespo</strong> y verás la tabla interna.
              </div>
            )}
            <label className="modal__label">Tu nombre (aparecerá en la tabla)</label>
            <input
              className="modal__input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              maxLength={30}
              autoFocus
            />
            <label className="modal__label">DNI (sin puntos)</label>
            <input
              className="modal__input"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={dni}
              onChange={e => setDni(e.target.value.replace(/\D/g,''))}
              placeholder="Ej: 35123456"
              maxLength={8}
            />
            <label className="modal__label">Teléfono (para contactarte si ganás)</label>
            <input
              className="modal__input"
              type="tel"
              inputMode="tel"
              value={tel}
              onChange={e => setTel(e.target.value)}
              placeholder="Ej: 3435 123456"
              maxLength={15}
            />
            <label className="modal__label">Email <span className="modal__label-opt">(opcional, para recuperar tu PIN si lo olvidás)</span></label>
            <input
              className="modal__input"
              type="email"
              inputMode="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              maxLength={120}
              autoComplete="email"
            />
            <label className="modal__label">Elegí tu PIN (4 dígitos)</label>
            <div className="modal__pin-row">
              <input
                className="modal__input modal__input--pin"
                type={showPin ? 'tel' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g,''))}
                placeholder="1234"
                maxLength={4}
              />
              <button type="button" className="modal__pin-toggle" onClick={() => setShowPin(s => !s)} aria-label="Mostrar/ocultar PIN">
                {showPin ? '🙈' : '👁️'}
              </button>
            </div>
            <label className="modal__label">Confirmá tu PIN</label>
            <input
              className="modal__input modal__input--pin"
              type={showPin ? 'tel' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value.replace(/\D/g,''))}
              placeholder="Repetí los 4 dígitos"
              maxLength={4}
            />
            <label className="modal__label">Elegí tu mascota</label>
            <div className="modal__mascotas">
              {MASCOTAS.map(m => (
                <button key={m.id} type="button"
                  className={`modal__mascota-btn ${mascota === m.id ? 'modal__mascota-btn--active' : ''}`}
                  onClick={() => setMascota(m.id)}
                  title={m.label}
                >
                  <img src={m.src} alt={m.label} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            <p className="modal__hint">💡 El PIN lo elegís vos. Anotalo para no olvidarlo.</p>
            <button className="modal__submit" disabled={loading || registrationClosed}>
              {registrationClosed ? '🔒 Inscripciones cerradas' : (loading ? 'Registrando...' : 'Registrarme y jugar →')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// Formatea nombre de equipo — si es placeholder tipo "Ganador P74" lo muestra bonito
function formatTeamName(name) {
  if (!name) return 'Por definir'
  if (/^(Ganador|Winner|Vencedor)\s+P\d+$/i.test(name.trim())) return 'Por definir'
  return name
}

// ─── Match Card ───────────────────────────────────────────────────────────────
// MatchCard en modo batch: inputs controlados desde el padre, sin botón propio
function MatchCard({ match, myPred, localPred, onLocalChange }) {
  const locked    = match.locked
  const hasResult = !!match.result
  const isArg     = match.isArgentina

  const matchDate = new Date(match.date)
  const TZ        = 'America/Argentina/Buenos_Aires'
  const dateStr   = matchDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ })
  const timeStr   = matchDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) + ' hs (ARG)'

  // Valor a mostrar: si hay cambio local, ese; si no, el guardado en server
  const homeVal = localPred?.home ?? myPred?.home ?? ''
  const awayVal = localPred?.away ?? myPred?.away ?? ''
  const isDirty = localPred !== undefined &&
    (localPred.home !== (myPred?.home ?? '') || localPred.away !== (myPred?.away ?? ''))

  return (
    <div className={`mc ${locked ? 'mc--locked' : ''} ${hasResult ? 'mc--result' : ''} ${isArg ? 'mc--argentina' : ''} ${isDirty ? 'mc--dirty' : ''}`}>
      {isArg && <div className="mc__arg-banner">⭐ DOBLE PUNTOS — Partido de Argentina</div>}
      <div className="mc__meta">
        <span className="mc__date">{dateStr} · {timeStr}</span>
        <span className="mc__group">{match.phase === 'group' ? `Grupo ${match.group}` : PHASE_LABELS[match.phase]}</span>
        {locked && !hasResult && <span className="mc__badge mc__badge--closed">Cerrado</span>}
        {hasResult && <span className="mc__badge mc__badge--done">Finalizado</span>}
        {!locked && <span className="mc__badge mc__badge--open">Abierto</span>}
      </div>

      <div className="mc__teams">
        <div className="mc__team mc__team--home">
          <FlagImg name={match.homeName} size={36} className="mc__flag-img" />
          <span className="mc__name">{formatTeamName(match.homeName)}</span>
        </div>

        <div className="mc__score">
          {hasResult ? (
            <div className="mc__result">
              <span className="mc__result-score">{match.result.home} — {match.result.away}</span>
              {myPred && <span className="mc__mypred">Tu pronóstico: {myPred.home}–{myPred.away}</span>}
            </div>
          ) : locked ? (
            <div className="mc__score-locked">
              {myPred
                ? <span className="mc__mypred-only">{myPred.home} – {myPred.away}</span>
                : <span className="mc__no-pred">Sin pronóstico</span>}
            </div>
          ) : (
            <div className="mc__inputs">
              <div className="mc__stepper">
                <button className="mc__step-btn" onClick={() => onLocalChange?.(match.id, 'home', Math.max(0, (homeVal === '' ? 0 : +homeVal) - 1))}>−</button>
                <span className="mc__step-val">{homeVal === '' ? '?' : homeVal}</span>
                <button className="mc__step-btn" onClick={() => onLocalChange?.(match.id, 'home', (homeVal === '' ? 0 : +homeVal) + 1)}>+</button>
              </div>
              <span className="mc__vs">VS</span>
              <div className="mc__stepper">
                <button className="mc__step-btn" onClick={() => onLocalChange?.(match.id, 'away', Math.max(0, (awayVal === '' ? 0 : +awayVal) - 1))}>−</button>
                <span className="mc__step-val">{awayVal === '' ? '?' : awayVal}</span>
                <button className="mc__step-btn" onClick={() => onLocalChange?.(match.id, 'away', (awayVal === '' ? 0 : +awayVal) + 1)}>+</button>
              </div>
            </div>
          )}
        </div>

        <div className="mc__team mc__team--away">
          <span className="mc__name">{formatTeamName(match.awayName)}</span>
          <FlagImg name={match.awayName} size={36} className="mc__flag-img" />
        </div>
      </div>
    </div>
  )
}

// ─── Vista Pronósticos ────────────────────────────────────────────────────────
function PronosticosView({ matches, myPreds, player, onSaved, onUnlocked }) {
  const [phase, setPhase]       = useState('group')
  const [group, setGroup]       = useState('J')
  const [localPreds, setLocalPreds] = useState({}) // { matchId: { home, away } }
  const [saving, setSaving]     = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const phases = [...new Set(matches.map(m => m.phase))]
    .sort((a, b) => PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b))

  const filtered = phase === 'group'
    ? matches.filter(m => m.phase === 'group' && m.group === group)
    : matches.filter(m => m.phase === phase)

  // Partidos abiertos del grupo actual
  const openMatches = filtered.filter(m => !m.locked && !m.result)

  function handleLocalChange(matchId, side, val) {
    setLocalPreds(prev => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? { home: myPreds?.[matchId]?.home ?? '', away: myPreds?.[matchId]?.away ?? '' }), [side]: val }
    }))
  }

  // Pronósticos del grupo listos para guardar (home y away completos)
  const toSave = openMatches
    .map(m => {
      const local = localPreds[m.id]
      const saved = myPreds?.[m.id]
      const home = local?.home !== undefined ? local.home : saved?.home ?? ''
      const away = local?.away !== undefined ? local.away : saved?.away ?? ''
      return { matchId: m.id, home, away }
    })
    .filter(p => p.home !== '' && p.away !== '')

  async function handleSaveGroup() {
    if (!player || toSave.length === 0) return
    setSaving(true)
    setSavedMsg('')
    try {
      const responses = await savePredictionsBatch(player.token, toSave)
      // Unión de medallas únicas que vinieron en cualquier respuesta del batch
      const allNew = []
      const seen = new Set()
      for (const r of responses) {
        for (const a of (r?.unlockedAchievements || [])) {
          if (!seen.has(a.slug)) { seen.add(a.slug); allNew.push(a) }
        }
      }
      if (allNew.length > 0) onUnlocked?.(allNew)
      setLocalPreds(prev => {
        const next = { ...prev }
        toSave.forEach(p => delete next[p.matchId])
        return next
      })
      setSavedMsg(`✓ ${toSave.length} pronóstico${toSave.length > 1 ? 's' : ''} guardado${toSave.length > 1 ? 's' : ''}`)
      setTimeout(() => setSavedMsg(''), 3000)
      onSaved?.()
    } catch (e) {
      setSavedMsg('Error al guardar. Intentá de nuevo.')
    }
    setSaving(false)
  }

  return (
    <div className="pronosticos">
      <div className="pronosticos__hint">
        Ingresá el resultado que esperás de cada partido antes de que empiece. Una vez iniciado, ya no podés cambiarlo.
      </div>
      <div className="pronosticos__phases">
        {phases.map(ph => (
          <button
            key={ph}
            className={`pronosticos__phase-btn ${phase === ph ? 'pronosticos__phase-btn--active' : ''}`}
            onClick={() => setPhase(ph)}
          >
            {ph === 'group' ? 'Grupos' : PHASE_LABELS[ph]}
          </button>
        ))}
      </div>

      {phase === 'group' && (
        <div className="pronosticos__groups">
          {GROUPS.filter(g => matches.some(m => m.phase === 'group' && m.group === g)).map(g => (
            <button
              key={g}
              className={`pronosticos__group-btn ${group === g ? 'pronosticos__group-btn--active' : ''} ${g === 'J' ? 'pronosticos__group-btn--arg' : ''}`}
              onClick={() => setGroup(g)}
            >
              {g === 'J' ? (
                <><img src="https://flagcdn.com/w20/ar.png" alt="AR" width={16} style={{verticalAlign:'middle',marginRight:4,borderRadius:2}} />J</>
              ) : g}
            </button>
          ))}
        </div>
      )}

      <div className="pronosticos__matches">
        {filtered.length === 0 && <p className="prode-empty">No hay partidos disponibles.</p>}
        {filtered.map(m => (
          <MatchCard
            key={m.id}
            match={m}
            myPred={myPreds?.[m.id]}
            localPred={localPreds[m.id]}
            onLocalChange={player ? handleLocalChange : undefined}
          />
        ))}
      </div>

      {/* Botón guardar grupo — solo si hay partidos abiertos y usuario logueado */}
      {player && openMatches.length > 0 && (
        <div className="pronosticos__batch-save">
          {savedMsg ? (
            <span className="pronosticos__batch-ok">{savedMsg}</span>
          ) : (
            <button
              className="pronosticos__batch-btn"
              onClick={handleSaveGroup}
              disabled={saving || toSave.length === 0}
            >
              {saving
                ? 'Guardando...'
                : toSave.length === openMatches.length
                  ? `Guardar los ${toSave.length} pronósticos del Grupo ${group}`
                  : `Guardar ${toSave.length} de ${openMatches.length} pronósticos del Grupo ${group}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Fixture (rediseñado con tabs por fase + tabla de grupos) ─────────────────

// Compute group standings from results (PJ, G, E, P, GF, GC, DG, Pts)
function computeGroupStandings(matches, group) {
  const groupMatches = matches.filter(m => m.phase === 'group' && m.group === group)
  const teams = {}
  // Init from TEAMS_BY_GROUP order to keep canonical order
  const canonical = TEAMS_BY_GROUP[group] || []
  canonical.forEach(t => {
    if (t.name) {
      teams[t.name] = { name: t.name, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 }
    }
  })
  groupMatches.forEach(m => {
    if (!m.result) return
    const { home, away } = m.result
    const h = teams[m.homeName]
    const a = teams[m.awayName]
    if (!h || !a) return
    h.pj++; a.pj++
    h.gf += home; h.gc += away
    a.gf += away; a.gc += home
    if (home > away)      { h.g++; a.p++; h.pts += 3 }
    else if (home < away) { a.g++; h.p++; a.pts += 3 }
    else                  { h.e++; a.e++; h.pts += 1; a.pts += 1 }
  })
  Object.values(teams).forEach(t => { t.dg = t.gf - t.gc })
  return Object.values(teams).sort((a, b) =>
    b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.name.localeCompare(b.name)
  )
}

// Format kickoff time (Buenos Aires)
function fmtKickoff(dateStr) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    })
  } catch { return null }
}

// Match status: 'upcoming' | 'live' | 'done'
function matchStatus(m) {
  if (m.result) return 'done'
  const now = new Date()
  const start = new Date(m.date)
  const end = new Date(start.getTime() + 110 * 60 * 1000) // ~110 min hasta probable fin
  if (now < start) return 'upcoming'
  if (now < end)   return 'live'
  return 'past' // sin resultado y ya pasó la ventana — pendiente de carga
}

// Single match card
function FixtureMatchCard({ m, showPhase = false }) {
  const st = matchStatus(m)
  const kickoff = fmtKickoff(m.date)
  return (
    <div className={`fx-match fx-match--${st} ${m.isArgentina ? 'fx-match--arg' : ''}`}>
      <div className="fx-match__meta">
        {showPhase && <span className="fx-match__phase">{m.label || PHASE_LABELS[m.phase] || ''}</span>}
        {kickoff && <span className="fx-match__time">🕒 {kickoff} hs (ARG)</span>}
        {m.venue && <span className="fx-match__venue">📍 {m.venue}</span>}
        {st === 'live' && <span className="fx-match__live">● EN VIVO</span>}
        {st === 'done' && <span className="fx-match__done">✓ Finalizado</span>}
      </div>
      <div className="fx-match__teams">
        <div className="fx-team fx-team--home">
          <FlagImg name={m.homeName} size={28} className="fx-team__flag" />
          <span className="fx-team__name">{m.homeName}</span>
          {m.result && <span className="fx-team__score">{m.result.home}</span>}
        </div>
        <div className="fx-match__sep">{m.result ? '—' : 'VS'}</div>
        <div className="fx-team fx-team--away">
          {m.result && <span className="fx-team__score">{m.result.away}</span>}
          <span className="fx-team__name">{m.awayName}</span>
          <FlagImg name={m.awayName} size={28} className="fx-team__flag" />
        </div>
      </div>
    </div>
  )
}

// Grupo card (tabla + partidos)
function FixtureGroupCard({ group, matches, argFilter }) {
  const standings = computeGroupStandings(matches, group)
  const groupMatches = matches
    .filter(m => m.phase === 'group' && m.group === group)
    .filter(m => !argFilter || m.isArgentina)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  if (argFilter && groupMatches.length === 0) return null
  return (
    <div className="fx-group">
      <div className="fx-group__header">
        <h3 className="fx-group__title">Grupo {group}</h3>
      </div>
      <div className="fx-group__table-wrap">
        <table className="fx-group__table">
          <thead>
            <tr>
              <th>#</th>
              <th>Equipo</th>
              <th>PJ</th>
              <th>G</th>
              <th>E</th>
              <th>P</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((t, i) => (
              <tr key={t.name} className={i < 2 ? 'fx-group__row--top' : i === 2 ? 'fx-group__row--mid' : ''}>
                <td>{i + 1}</td>
                <td className="fx-group__team-cell">
                  <FlagImg name={t.name} size={20} className="fx-team__flag" />
                  <span>{t.name}</span>
                </td>
                <td>{t.pj}</td>
                <td>{t.g}</td>
                <td>{t.e}</td>
                <td>{t.p}</td>
                <td>{t.gf}</td>
                <td>{t.gc}</td>
                <td>{t.dg > 0 ? '+' + t.dg : t.dg}</td>
                <td className="fx-group__pts">{t.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="fx-group__matches">
        {groupMatches.map(m => <FixtureMatchCard key={m.id} m={m} />)}
      </div>
    </div>
  )
}

// Pestañas de fase
const FIXTURE_PHASES = [
  { id: 'group',   label: '📊 Grupos' },
  { id: 'round32', label: '🔥 16avos' },
  { id: 'round16', label: '⚔️ Octavos' },
  { id: 'quarter', label: '🏆 Cuartos' },
  { id: 'semi',    label: '🥈 Semis' },
  { id: 'third',   label: '🥉 3° Puesto' },
  { id: 'final',   label: '👑 Final' },
]

function FixtureView({ matches }) {
  // Default: si todavía no terminó fase de grupos, mostrar Grupos. Si ya pasó, 16avos.
  const now = new Date()
  const groupsEnd = new Date('2026-06-27T23:59:59-03:00')
  const defaultPhase = now < groupsEnd ? 'group' : 'round32'
  const [phase, setPhase] = useState(defaultPhase)
  const [argFilter, setArgFilter] = useState(false)

  // Solo mostrar tabs de fases que tienen partidos cargados
  const availablePhases = FIXTURE_PHASES.filter(p =>
    matches.some(m => m.phase === p.id)
  )

  // Si la fase elegida no tiene partidos (ej: aún no se cargaron 16avos), saltar a la primera disponible
  const activePhase = availablePhases.some(p => p.id === phase) ? phase : (availablePhases[0]?.id || 'group')

  if (activePhase === 'group') {
    return (
      <div className="fx">
        <div className="fx-tabs-row">
          <div className="fx-tabs">
            {availablePhases.map(p => (
              <button
                key={p.id}
                className={`fx-tab ${activePhase === p.id ? 'fx-tab--active' : ''}`}
                onClick={() => setPhase(p.id)}
              >{p.label}</button>
            ))}
          </div>
          <button
            className={`fx-arg-toggle ${argFilter ? 'fx-arg-toggle--on' : ''}`}
            onClick={() => setArgFilter(v => !v)}
            title="Filtrar solo partidos de Argentina"
          >🇦🇷 {argFilter ? 'Quitar filtro' : 'Solo Argentina'}</button>
        </div>
        <div className="fx-groups">
          {GROUPS.map(g => (
            <FixtureGroupCard key={g} group={g} matches={matches} argFilter={argFilter} />
          ))}
        </div>
      </div>
    )
  }

  // Vistas de eliminatoria
  const phaseMatches = matches
    .filter(m => m.phase === activePhase)
    .filter(m => !argFilter || m.isArgentina)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <div className="fx">
      <div className="fx-tabs-row">
        <div className="fx-tabs">
          {availablePhases.map(p => (
            <button
              key={p.id}
              className={`fx-tab ${activePhase === p.id ? 'fx-tab--active' : ''}`}
              onClick={() => setPhase(p.id)}
            >{p.label}</button>
          ))}
        </div>
        <button
          className={`fx-arg-toggle ${argFilter ? 'fx-arg-toggle--on' : ''}`}
          onClick={() => setArgFilter(v => !v)}
        >🇦🇷 {argFilter ? 'Quitar filtro' : 'Solo Argentina'}</button>
      </div>

      {phaseMatches.length === 0 ? (
        <div className="prode-empty">
          <div className="prode-empty__icon">⏳</div>
          <p>{argFilter
            ? 'Argentina no juega en esta fase (o aún no se definió).'
            : `Los partidos de ${PHASE_LABELS[activePhase]} se definen al avanzar el torneo.`}</p>
        </div>
      ) : (
        <div className="fx-knockout">
          {phaseMatches.map(m => <FixtureMatchCard key={m.id} m={m} showPhase />)}
        </div>
      )}
    </div>
  )
}

// ─── Home Pública ─────────────────────────────────────────────────────────────
// Hero compacto para usuario logueado: saludo + countdown + CTA, sin scroll de bienvenida
function LoggedInBanner({ player, onParticipa }) {
  const firstName = (player.name || '').split(' ')[0] || ''
  return (
    <div className="logged-banner">
      <div className="logged-banner__bg" />
      <div className="logged-banner__inner">
        <div className="logged-banner__greet">
          <div className="logged-banner__hi">Hola, <span>{firstName}</span></div>
          <div className="logged-banner__sub">¡Bienvenido al Prode Mundial 2026! Cargá ya tu primer pronóstico.</div>
        </div>
        <div className="logged-banner__countdown">
          <MundialCountdown variant="inline" />
        </div>
        <button className="logged-banner__cta" onClick={onParticipa}>
          🎯 Cargar mis pronósticos →
        </button>
      </div>
    </div>
  )
}

function PublicHome({ player, onParticipa }) {
  const [showMedalleroFull, setShowMedalleroFull] = useState(false)

  // Bloques reutilizables (mismo render para ambos paths) para mantener un solo source of truth
  const argBanner = (
    <div className="arg-banner">
      <img src="https://flagcdn.com/w80/ar.png" alt="Argentina" className="arg-banner__flag" width="48" height="32" />
      <div className="arg-banner__text">
        <strong>¡LOS PARTIDOS DE NUESTRA SELECCIÓN SUMAN DOBLE!</strong>
        <span>Cada partido de Argentina vale el doble de puntos. ¡Dale Albiceleste!</span>
      </div>
      <img src="https://flagcdn.com/w80/ar.png" alt="Argentina" className="arg-banner__flag" width="48" height="32" />
    </div>
  )

  const infoCards = (
    <div className="pub-info">
      <div className="pub-info__card">
        <div className="pub-info__icon">🎯</div>
        <h3>¿Cómo jugar?</h3>
        <p>Registrate con tu DNI y un PIN de 4 dígitos. Pronosticá el marcador de cada partido antes de que empiece.</p>
      </div>
      <div className="pub-info__card">
        <div className="pub-info__icon">⭐</div>
        <h3>Sistema de puntos</h3>
        <div className="pub-info__pts">
          <div><span className="pts-badge pts-badge--gold">10 pts</span> Marcador exacto</div>
          <div><span className="pts-badge pts-badge--silver">5 pts</span> Ganador o empate correcto</div>
          <div><span className="pts-badge pts-badge--bronze">1 pt</span> Total de goles correcto</div>
          <div className="pts-arg"><span>⭐ ×2</span> en partidos de Argentina</div>
        </div>
      </div>
      <div className="pub-info__card">
        <div className="pub-info__icon">🎁</div>
        <h3>¿Cómo cobrar?</h3>
        <p>Los premios son en tickets promocionales de Sala Crespo. El admin verifica identidad con DNI al finalizar la fase.</p>
      </div>
    </div>
  )

  const leaderboardBlock = (
    <div className="pub-lb">
      <div className="pub-lb__header">
        <h2 className="pub-lb__title">🏆 Tabla de Posiciones</h2>
        <p className="pub-lb__sub">{player ? 'Tu posición resaltada' : 'Actualizada en tiempo real'}</p>
      </div>
      <LeaderboardView myId={player?.id || null} />
      <div className="pub-lb__cta">
        {player ? (
          <>
            <p>Estás dentro del concurso 🎯</p>
            <button className="pub-lb__btn" onClick={onParticipa}>Cargar mis pronósticos →</button>
          </>
        ) : (
          <>
            <p>¿Querés aparecer acá?</p>
            <button className="pub-lb__btn" onClick={onParticipa}>Registrarme y jugar →</button>
          </>
        )}
      </div>
    </div>
  )

  // ─── LAYOUT LOGUEADO: progreso primero, info al final ────────────────────────
  if (player) {
    return (
      <div className="pub-home">
        <LoggedInBanner player={player} onParticipa={onParticipa} />

        {/* Profeta + Medallero — la información de valor para el que ya juega */}
        <div className="medallero-section">
          <ChampionPickCard player={player} />
        </div>
        <div className="medallero-section">
          <MedalleroCard player={player} onOpenFull={() => setShowMedalleroFull(true)} />
        </div>
        {showMedalleroFull && (
          <MedalleroFull player={player} onClose={() => setShowMedalleroFull(false)} />
        )}

        {/* Tabla — ego boost (su posición resaltada) */}
        {leaderboardBlock}

        {/* Premios — recordatorio de qué se gana */}
        <PrizeCards />

        {/* Banner Argentina — motivación */}
        {argBanner}

        {/* Grupos — referencia */}
        <GroupsGrid />

        {/* Cómo jugar — al final, ya lo sabe */}
        {infoCards}
      </div>
    )
  }

  // ─── LAYOUT NO LOGUEADO: hero comercial + premios + info para convencer ───────
  return (
    <div className="pub-home">
      {/* Hero completo */}
      <div className="pub-hero">
        <div className="pub-hero__bg" />
        <div className="pub-hero__content">
          <div className="pub-hero__eyebrow">CRESPO, ENTRE RÍOS</div>
          <div className="pub-hero__title-row">
            <img src="/logo-sin-fondo.png" alt="Sala Crespo" className="pub-hero__logo" />
            <h1 className="pub-hero__title">PRODE<br /><span className="pub-hero__title--mundial">MUNDIAL</span><br />2026</h1>
            <img src="/logo-sin-fondo.png" alt="Sala Crespo" className="pub-hero__logo" />
          </div>
          <p className="pub-hero__sub">104 partidos · Premios reales · Gratis para todos los clientes</p>
          <MundialCountdown variant="hero" />
          <FlagTicker />
          <button className="pub-hero__cta" onClick={onParticipa}>⚽ PARTICIPÁ AQUÍ</button>
        </div>
        <div className="pub-hero__balls">
          {['⚽','🌎','⚽','🌎','⚽'].map((e,i) => <span key={i} className={`pub-hero__ball pub-hero__ball--${i}`}>{e}</span>)}
        </div>
      </div>

      {/* Premios — gancho monetario */}
      <PrizeCards />

      {/* Cómo jugar — instrucciones */}
      {infoCards}

      {/* Banner Argentina */}
      {argBanner}

      {/* Tabla — social proof */}
      {leaderboardBlock}

      {/* Grupos */}
      <GroupsGrid />
    </div>
  )
}

// ─── Modo Promotora ───────────────────────────────────────────────────────────
// URL ?promo=1 — pantalla full pensada para tablet, registro rápido por la promotora

// Instagram oficial de Sala Crespo (mismo handle que footer público)
const INSTAGRAM_HANDLE = '@salajuegoscrespo'
const INSTAGRAM_URL    = 'https://www.instagram.com/salajuegoscrespo/'

// Fallbacks por si /api/content todavía no responde — se reemplazan por valores reales de DB
const FALLBACK_TOURNAMENT_DATE = '21 de mayo · 2026'
const FALLBACK_TOURNAMENT_URL  = 'https://docs.google.com/forms/d/1sOfBSy8FXm-ncMuQGU6GqbP60zP08DADbb0DrqGBG8g/edit'

// ─── Staff Portal ─────────────────────────────────────────────────────────────
// Activado por ?staff=CODIGO en la URL. Pantalla dedicada que vende la idea +
// permite registrarse como empleado + recibe sugerencias del staff.
// Iconos SVG line-art para reemplazar emojis del portal (más premium, sin emojis)
function SPIcon({ name, size = 28 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  switch (name) {
    case 'ball':     return (<svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 3l3 5-3 4-3-4z" /><path d="M12 12l4 3-1.5 5h-5L8 15z" /></svg>)
    case 'target':   return (<svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></svg>)
    case 'trophy':   return (<svg {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" /><path d="M7 6H4a3 3 0 0 0 3 5" /><path d="M17 6h3a3 3 0 0 1-3 5" /><path d="M9 14h6v3l-1 4h-4l-1-4z" /><path d="M8 21h8" /></svg>)
    case 'star':     return (<svg {...p}><path d="M12 2.5l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.3 6.4 19.5l1.5-6.3L3 9l6.4-.5z" /></svg>)
    case 'gift':     return (<svg {...p}><rect x="3" y="9" width="18" height="11" rx="1.5" /><path d="M3 13h18" /><path d="M12 9v11" /><path d="M12 9c-2-3-5-3-5-1 0 2 3 1 5 1zm0 0c2-3 5-3 5-1 0 2-3 1-5 1z" /></svg>)
    case 'medal':    return (<svg {...p}><circle cx="12" cy="14" r="6" /><path d="M9 8L7 3h4l1.5 4M15 8l2-5h-4l-1.5 4" /><path d="M12 11.5L13 14h2.5l-2 1.5.7 2.5L12 16.5 9.8 18l.7-2.5L8.5 14H11z" /></svg>)
    case 'crystal':  return (<svg {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3.2" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></svg>)
    case 'warning':  return (<svg {...p}><path d="M12 3l10 17H2z" /><path d="M12 9v5" /><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none" /></svg>)
    case 'wave':     return (<svg {...p}><path d="M9 11V4a1.5 1.5 0 0 1 3 0v6" /><path d="M12 5a1.5 1.5 0 0 1 3 0v6" /><path d="M15 7a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-12 0v-3a1.5 1.5 0 0 1 3 0" /></svg>)
    case 'showcase': return (<svg {...p}><rect x="3" y="3" width="18" height="14" rx="1.5" /><path d="M3 8h18" /><circle cx="8" cy="13" r="1.5" /><circle cx="16" cy="13" r="1.5" /><path d="M8 21l1-4M16 21l-1-4" /></svg>)
    case 'sparkles': return (<svg {...p}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /><path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5z" /></svg>)
    case 'bulb':     return (<svg {...p}><path d="M9 18h6" /><path d="M10 21h4" /><path d="M9 15c-2-1-3-3-3-5a6 6 0 0 1 12 0c0 2-1 4-3 5" /><path d="M9 15h6" /></svg>)
    case 'bug':      return (<svg {...p}><ellipse cx="12" cy="13" rx="5" ry="6" /><path d="M12 7v12M7 13H3M21 13h-4M5 8l2 2M5 18l2-2M19 8l-2 2M19 18l-2-2M9 4l1 2M15 4l-1 2" /></svg>)
    case 'question': return (<svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7" /><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none" /></svg>)
    case 'pencil':   return (<svg {...p}><path d="M16 3l5 5-12 12H4v-5z" /><path d="M14 5l5 5" /></svg>)
    case 'arm':      return (<svg {...p}><path d="M5 11c0-3 2-5 5-5h3v3l-2 1c0 2 1 4 3 4 2 0 3-1 3-3" /><path d="M14 14c0 3-2 5-5 5H6v-3" /></svg>)
    case 'paperclip':return (<svg {...p}><path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8" /></svg>)
    case 'check':    return (<svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></svg>)
    default: return null
  }
}

function StaffPortal({ staffCode, player, onLogin, onExit }) {
  const [showRegister, setShowRegister] = useState(false)
  const [showLogin, setShowLogin]       = useState(false)
  const isLoggedIn = !!player
  const firstName = (player?.name || '').split(' ')[0] || ''
  const [sugName, setSugName]   = useState(player?.name || '')
  const [sugEmail, setSugEmail] = useState('')
  const [sugText, setSugText]   = useState('')
  const [sugKind, setSugKind]   = useState('propuesta')
  const [sugFiles, setSugFiles] = useState([]) // [{ name, type, data, preview }]
  const [sugSent, setSugSent]   = useState(false)
  const [sugErr,  setSugErr]    = useState('')
  const [sugLoad, setSugLoad]   = useState(false)

  // Lee archivos seleccionados, los convierte a base64 y los suma a sugFiles
  function handleFilePick(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const remaining = 3 - sugFiles.length
    if (remaining <= 0) { setSugErr('Máximo 3 imágenes.'); return }
    const toRead = files.slice(0, remaining)
    let pending = toRead.length
    const newOnes = []
    toRead.forEach(f => {
      if (!f.type.startsWith('image/')) { pending--; return }
      if (f.size > 5 * 1024 * 1024) { setSugErr(`"${f.name}" supera 5MB.`); pending--; return }
      const reader = new FileReader()
      reader.onload = () => {
        newOnes.push({ name: f.name, type: f.type, data: reader.result, preview: reader.result })
        pending--
        if (pending <= 0) setSugFiles(prev => [...prev, ...newOnes].slice(0, 3))
      }
      reader.onerror = () => { pending--; }
      reader.readAsDataURL(f)
    })
    e.target.value = '' // permitir re-seleccionar el mismo archivo
  }

  function removeFile(idx) {
    setSugFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSuggestion(e) {
    e.preventDefault()
    setSugErr('')
    if (sugText.trim().length < 8) { setSugErr('Escribí al menos 8 caracteres.'); return }
    setSugLoad(true)
    try {
      const attachments = sugFiles.map(f => ({ name: f.name, type: f.type, data: f.data }))
      await submitStaffSuggestion(sugName.trim(), sugEmail.trim(), sugText.trim(), sugKind, attachments)
      setSugSent(true)
      setSugName(''); setSugEmail(''); setSugText(''); setSugKind('propuesta'); setSugFiles([])
    } catch (err) {
      setSugErr(err.message || 'No pudimos enviar la sugerencia.')
    }
    setSugLoad(false)
  }

  return (
    <div className="staff-portal">
      <div className="staff-portal__bg" />
      <div className="staff-portal__inner">

        {/* Header centrado con pelotas + banderas Mundialeras flotando — bien vivo */}
        <header className="staff-portal__header">
          <div className="staff-portal__deco staff-portal__deco--left" aria-hidden="true">
            <span className="sp-deco sp-deco--ball sp-deco--1">⚽</span>
            <img src="https://flagcdn.com/w40/ar.png" alt="" className="sp-deco sp-deco--flag sp-deco--2" />
            <span className="sp-deco sp-deco--ball sp-deco--3">⚽</span>
            <img src="https://flagcdn.com/w40/br.png" alt="" className="sp-deco sp-deco--flag sp-deco--4" />
            <span className="sp-deco sp-deco--world sp-deco--5">🏆</span>
          </div>
          <div className="staff-portal__deco staff-portal__deco--right" aria-hidden="true">
            <span className="sp-deco sp-deco--ball sp-deco--6">⚽</span>
            <img src="https://flagcdn.com/w40/ar.png" alt="" className="sp-deco sp-deco--flag sp-deco--7" />
            <img src="https://flagcdn.com/w40/fr.png" alt="" className="sp-deco sp-deco--flag sp-deco--8" />
            <span className="sp-deco sp-deco--world sp-deco--9">🌎</span>
            <span className="sp-deco sp-deco--ball sp-deco--10">⚽</span>
          </div>
          <img src="/logo-sin-fondo.png" alt="Sala Crespo" className="staff-portal__logo" />
          <div className="staff-portal__eyebrow">PORTAL DE PERSONAL</div>
          <h1 className="staff-portal__title">Prode Mundial 2026</h1>
          <p className="staff-portal__subtitle">Sala de Juegos Crespo · Acceso exclusivo para el staff</p>
        </header>

        {/* Aviso compacto al tope: solo para staff, no compartir */}
        {isLoggedIn ? (
          <div className="staff-portal__bar staff-portal__bar--ok">
            <SPIcon name="wave" size={18} />
            <span>Hola, <strong>{firstName}</strong>. Bienvenido al Prode. El form de sugerencias está al final.</span>
          </div>
        ) : (
          <div className="staff-portal__bar staff-portal__bar--warn">
            <SPIcon name="warning" size={18} />
            <span>Acceso exclusivo para colaboradores de Sala Crespo. <strong>No compartas este link con clientes.</strong></span>
          </div>
        )}

        {/* Hook: invitación cálida al staff + 3 cards con beneficios concretos */}
        {!isLoggedIn && (
          <section className="staff-portal__hook">
            <h2 className="staff-portal__hook-headline">
              Se acerca el Mundial y, como colaborador de Sala Crespo, queremos invitarte a participar del Prode 2026.
            </h2>
            <p className="staff-portal__hook-intro">
              En unos días arrancamos el <strong>Prode Mundial 2026</strong> para nuestros clientes.
              Pero antes de eso, <strong>no queríamos dejar de armar algo para el equipo</strong> que hace
              que la sala funcione todos los días. Esta es nuestra invitación —
              un concurso <strong>exclusivo para el staff</strong>, con su propia tabla y sus propios premios.
            </p>
            <div className="staff-portal__hook-grid">
              <div className="sp-hook-card">
                <div className="sp-hook-card__icon">🎯</div>
                <div className="sp-hook-card__title">¿De qué se trata?</div>
                <div className="sp-hook-card__text">
                  Un Prode es predecir cómo van a terminar los partidos del Mundial 2026
                  <em> antes de que se jueguen</em>. Si acertás el resultado, sumás puntos.
                  Cuanto mejor predecís, más alto vas en la tabla.
                </div>
              </div>
              <div className="sp-hook-card">
                <div className="sp-hook-card__icon">🏆</div>
                <div className="sp-hook-card__title">¿Qué te llevás?</div>
                <div className="sp-hook-card__text">
                  <strong>$100.000 en órdenes de compra de Supermercado Clauser</strong>, repartidos
                  entre los tres primeros puestos. Sumás medallas por cada logro y peleás por ser
                  el <strong>#1 de la sala</strong>, contra tus compañeros.
                </div>
              </div>
              <div className="sp-hook-card">
                <div className="sp-hook-card__icon">🎉</div>
                <div className="sp-hook-card__title">¿Por qué te queremos adentro?</div>
                <div className="sp-hook-card__text">
                  Antes que nada, <strong>queremos que la pases bien</strong>: que vivas el Mundial
                  con tu equipo, sumes medallas y compitas por los premios.
                  Si en el camino tenés ideas o ves algo raro, contanos en el form de abajo — pero lo primero es divertirse.
                </div>
              </div>
            </div>
            {/* CTA temprano: el que ya quiere anotarse / cargar pronósticos */}
            <div className="staff-portal__ctas staff-portal__ctas--early">
              {isLoggedIn ? (
                <button className="staff-portal__cta staff-portal__cta--primary" onClick={onExit}>
                  CARGAR MIS PRONÓSTICOS →
                </button>
              ) : (
                <>
                  <button className="staff-portal__cta staff-portal__cta--primary" onClick={() => { setShowRegister(true); setShowLogin(false) }}>
                    ANOTARME AL PRODE →
                  </button>
                  <button
                    type="button"
                    className="staff-portal__cta-link"
                    onClick={() => { setShowLogin(true); setShowRegister(false) }}
                  >
                    ¿Ya tenés cuenta? Ingresá acá
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {/* Stats hero — números grandes que llaman la atención */}
        <div className="staff-portal__stats">
          <div className="sp-stat">
            <div className="sp-stat__num">104</div>
            <div className="sp-stat__label">partidos para pronosticar</div>
          </div>
          <div className="sp-stat">
            <div className="sp-stat__num">20</div>
            <div className="sp-stat__label">medallas por desbloquear</div>
          </div>
          <div className="sp-stat">
            <div className="sp-stat__num">×2</div>
            <div className="sp-stat__label">
              en partidos de Argentina
              <img src="https://flagcdn.com/w40/ar.png" alt="" className="sp-stat__flag" />
            </div>
          </div>
        </div>

        {/* Cómo se juega — 3 cards visuales */}
        <h2 className="staff-portal__h2 staff-portal__h2--center">Cómo funciona</h2>
        <div className="staff-portal__how">
          <div className="sp-step">
            <div className="sp-step__num">1</div>
            <div className="sp-step__title">Te anotás</div>
            <div className="sp-step__text">Tu DNI + un PIN de 4 dígitos. 30 segundos.</div>
          </div>
          <div className="sp-step">
            <div className="sp-step__num">2</div>
            <div className="sp-step__title">Tirás tu pronóstico</div>
            <div className="sp-step__text">Antes del pitazo inicial, marcás cómo creés que va a terminar el partido.</div>
          </div>
          <div className="sp-step">
            <div className="sp-step__num">3</div>
            <div className="sp-step__title">Sumás puntos</div>
            <div className="sp-step__text">Cuanto mejor predecís, más puntos sumás.</div>
          </div>
        </div>

        {/* Sistema de puntos */}
        <h2 className="staff-portal__h2 staff-portal__h2--center">Sistema de puntos</h2>
        <div className="staff-portal__points-grid">
          <div className="sp-point sp-point--gold">
            <div className="sp-point__pts">10</div>
            <div className="sp-point__label">PUNTOS</div>
            <div className="sp-point__desc">Acertaste el marcador exacto. Ej: pronosticaste 2-1 y el partido terminó 2-1.</div>
          </div>
          <div className="sp-point sp-point--silver">
            <div className="sp-point__pts">5</div>
            <div className="sp-point__label">PUNTOS</div>
            <div className="sp-point__desc">Acertaste quién ganó (o si fue empate), pero no el marcador exacto.</div>
          </div>
          <div className="sp-point sp-point--bronze">
            <div className="sp-point__pts">1</div>
            <div className="sp-point__label">PUNTO</div>
            <div className="sp-point__desc">Acertaste cuántos goles se hicieron en total. Ej: pronosticaste un partido con 3 goles y fueron 3 (no importa el marcador).</div>
          </div>
        </div>
        <div className="staff-portal__arg">
          <img src="https://flagcdn.com/w80/ar.png" alt="Argentina" className="staff-portal__arg-flag" />
          <div><strong>Los partidos de Argentina valen el doble.</strong> Cada gol que metan los nuestros suma más en tu cuenta.</div>
          <img src="https://flagcdn.com/w80/ar.png" alt="Argentina" className="staff-portal__arg-flag" />
        </div>

        {/* Profeta hero */}
        <div className="staff-portal__profeta">
          <div className="staff-portal__profeta-eyebrow">🔮 La gran apuesta</div>
          <h2 className="staff-portal__profeta-title">Sé un Profeta</h2>
          <p className="staff-portal__profeta-text">
            Antes de que ruede la pelota el <strong>11 de junio</strong>, elegís quién creés que se lleva el Mundial.
            Una sola selección. Sin chance de arrepentirte.
          </p>
          <div className="staff-portal__profeta-reward">
            <div className="sp-reward">
              <div className="sp-reward__num">+20</div>
              <div className="sp-reward__label">puntos extra al ranking</div>
            </div>
            <div className="sp-reward">
              <div className="sp-reward__badge">
                <AchievementBadge
                  achievement={{ slug: 'profeta', name: 'Profeta', category: 'mundial', tier: 'special' }}
                  unlocked={true}
                  size={70}
                  showName={false}
                />
              </div>
              <div className="sp-reward__label">medalla exclusiva "Profeta"</div>
            </div>
          </div>
          <p className="staff-portal__profeta-foot">
            Si acertás al campeón, te llevás los dos. Si no, sigue siendo un golazo haberte animado.
          </p>
        </div>

        {/* Vitrina + tabla — 2 columnas */}
        <div className="staff-portal__split">
          <div className="staff-portal__split-card">
            <div className="staff-portal__split-icon">🏅</div>
            <h3>Tu vitrina personal</h3>
            <p>
              Vas ganando <strong>medallas</strong> por logros: el primer pronóstico, 5 aciertos al hilo,
              acertar un 0-0 raro, terminar el fixture entero. Cada una queda guardada en tu perfil
              y la podés compartir en <strong>WhatsApp, Instagram o Facebook</strong>.
            </p>
          </div>
          <div className="staff-portal__split-card">
            <div className="staff-portal__split-icon">🏆</div>
            <h3>Compiten entre ustedes</h3>
            <p>
              Tienen su propia tabla, separada de la pública.
              <strong> No están mezclados con clientes</strong> — la pelea por el #1 es entre el staff.
              Vas a ver quién manda en la sala.
            </p>
          </div>
        </div>

        {/* Premios concretos para el staff */}
        <section className="staff-portal__prizes">
          <div className="staff-portal__prizes-icon">🎁</div>
          <h2>Premios exclusivos para el staff</h2>
          <p className="staff-portal__prizes-sub">
            Órdenes de compra en <strong>Supermercado Clauser</strong>
          </p>
          <img src="/clauser-logo.jpg" alt="Supermercado Clauser" className="staff-portal__prizes-logo" />
          <div className="staff-portal__prizes-grid">
            <div className="sp-prize sp-prize--gold">
              <div className="sp-prize__medal">🥇</div>
              <div className="sp-prize__pos">1er puesto</div>
              <div className="sp-prize__amount">$50.000</div>
            </div>
            <div className="sp-prize sp-prize--silver">
              <div className="sp-prize__medal">🥈</div>
              <div className="sp-prize__pos">2do puesto</div>
              <div className="sp-prize__amount">$30.000</div>
            </div>
            <div className="sp-prize sp-prize--bronze">
              <div className="sp-prize__medal">🥉</div>
              <div className="sp-prize__pos">3er puesto</div>
              <div className="sp-prize__amount">$20.000</div>
            </div>
          </div>
          {isLoggedIn ? (
            <button
              className="staff-portal__cta staff-portal__cta--inline"
              onClick={onExit}
            >
              CARGAR MIS PRONÓSTICOS →
            </button>
          ) : (
            <button
              className="staff-portal__cta staff-portal__cta--inline"
              onClick={() => { setShowRegister(true); setShowLogin(false) }}
            >
              QUIERO ANOTARME →
            </button>
          )}
        </section>

        {/* CTA principal — uno solo, grande, centrado */}
        <div className="staff-portal__ctas">
          {isLoggedIn ? (
            <button className="staff-portal__cta staff-portal__cta--primary" onClick={onExit}>
              IR AL PRODE →
            </button>
          ) : (
            <>
              <button className="staff-portal__cta staff-portal__cta--primary" onClick={() => { setShowRegister(true); setShowLogin(false) }}>
                ANOTARME AL PRODE →
              </button>
              <button
                type="button"
                className="staff-portal__cta-link"
                onClick={() => { setShowLogin(true); setShowRegister(false) }}
              >
                ¿Ya tenés cuenta? Ingresá acá
              </button>
            </>
          )}
        </div>

        {/* Sticky CTA flotante: solo logueado, siempre visible */}
        {isLoggedIn && (
          <button
            type="button"
            className="staff-portal__cta-float"
            onClick={onExit}
            aria-label="Cargar mis pronósticos"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            <span>Cargar pronósticos</span>
          </button>
        )}

        {(showRegister || showLogin) && (
          <AuthModal
            onClose={() => { setShowRegister(false); setShowLogin(false) }}
            onLogin={(p) => { setShowRegister(false); setShowLogin(false); onLogin(p) }}
            staffSignupCode={showRegister ? staffCode : null}
            initialTab={showRegister ? 'registro' : 'login'}
          />
        )}

        {/* Nota — cierre cálido y motivador para el staff antes del form */}
        <section className="staff-portal__note">
          <div className="staff-portal__note-icon">💪</div>
          <div>
            <strong>Te toca ser embajador del Prode.</strong>
            <p>
              Si esto te resulta fácil de usar, vas a poder explicarle a los clientes cómo participar —
              porque el proceso para ellos va a ser <strong>idéntico al tuyo</strong>: registro, pronósticos, medallas, todo igual.
              Si algo te traba a vos, seguro le va a trabar a un cliente. Por eso tu feedback vale oro.
            </p>
          </div>
        </section>

        {/* Sugerencias */}
        <section className="staff-portal__section staff-portal__suggestions">
          <h2 className="staff-portal__h2">💡 Tus sugerencias suman</h2>
          <p>
            Lo están probando antes que nadie. Lo que digas va a definir cómo lo lanzamos al público.
          </p>
          {sugSent ? (
            <div className="staff-portal__sug-ok">✓ ¡Gracias! Recibimos tu sugerencia. Te respondemos a la brevedad si dejaste tu mail.</div>
          ) : (
            <form className="staff-portal__sug-form" onSubmit={handleSuggestion}>
              {/* Selector de tipo */}
              <div className="staff-portal__sug-kinds">
                {[
                  { id: 'propuesta', label: '💡 Propuesta', desc: 'Idea para mejorar' },
                  { id: 'fallo',     label: '🐛 Fallo',     desc: 'Algo no funciona' },
                  { id: 'pregunta',  label: '❓ Pregunta',  desc: 'No entiendo algo' },
                  { id: 'otro',      label: '✏️ Otro',      desc: 'Cualquier cosa' },
                ].map(k => (
                  <button
                    key={k.id} type="button"
                    onClick={() => setSugKind(k.id)}
                    className={`sp-kind ${sugKind === k.id ? 'sp-kind--on' : ''}`}
                  >
                    <span className="sp-kind__label">{k.label}</span>
                    <span className="sp-kind__desc">{k.desc}</span>
                  </button>
                ))}
              </div>

              <div className="staff-portal__sug-row">
                <input
                  type="text" placeholder="Tu nombre (opcional)"
                  value={sugName} onChange={e => setSugName(e.target.value)}
                  className="staff-portal__input" maxLength={80}
                />
                <input
                  type="email" placeholder="Tu email (opcional, por si querés respuesta)"
                  value={sugEmail} onChange={e => setSugEmail(e.target.value)}
                  className="staff-portal__input" maxLength={120}
                />
              </div>

              <textarea
                placeholder={
                  sugKind === 'fallo'     ? 'Contanos qué falla. ¿Qué hiciste? ¿Qué esperabas que pasara?' :
                  sugKind === 'propuesta' ? '¿Qué se podría mejorar? ¿Qué le falta?' :
                  sugKind === 'pregunta'  ? '¿Qué no entendiste?' :
                  'Contanos lo que sea...'
                }
                value={sugText} onChange={e => setSugText(e.target.value)}
                className="staff-portal__textarea" rows={5} maxLength={4000}
              />

              {/* Adjuntar imágenes */}
              <div className="staff-portal__sug-attach">
                <label className="sp-attach-btn">
                  📎 Adjuntar capturas {sugFiles.length > 0 && `(${sugFiles.length}/3)`}
                  <input
                    type="file" accept="image/*" multiple
                    onChange={handleFilePick}
                    style={{ display: 'none' }}
                    disabled={sugFiles.length >= 3}
                  />
                </label>
                <span className="sp-attach-hint">Hasta 3 imágenes, máx. 5MB cada una</span>
              </div>

              {sugFiles.length > 0 && (
                <div className="staff-portal__sug-previews">
                  {sugFiles.map((f, i) => (
                    <div key={i} className="sp-thumb">
                      <img src={f.preview} alt={f.name} />
                      <button type="button" className="sp-thumb__rm" onClick={() => removeFile(i)} aria-label="Quitar">✕</button>
                      <span className="sp-thumb__name">{f.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {sugErr && <div className="staff-portal__sug-err">⚠️ {sugErr}</div>}
              <button type="submit" className="staff-portal__sug-btn" disabled={sugLoad}>
                {sugLoad ? 'Enviando...' : 'Enviar →'}
              </button>
            </form>
          )}
        </section>

        <footer className="staff-portal__footer">
          <button className="staff-portal__exit" onClick={onExit}>
            ← Salir del portal de staff
          </button>
        </footer>
      </div>
    </div>
  )
}

function PromoMode({ onExit }) {
  const [step, setStep] = useState('form') // 'form' | 'success' | 'extras'
  const [name, setName] = useState('')
  const [dni, setDni]   = useState('')
  const [tel, setTel]   = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin]   = useState('')
  const [showYearInput, setShowYearInput] = useState(false)
  const [year, setYear] = useState('')
  const [accept, setAccept] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo]   = useState('')
  const [lastResult, setLastResult] = useState(null) // { name, pin }
  const [count, setCount] = useState(0)

  // Cargar datos del torneo desde la misma fuente que la landing pública
  const [tournament, setTournament] = useState({
    date: FALLBACK_TOURNAMENT_DATE,
    url:  FALLBACK_TOURNAMENT_URL,
  })
  useEffect(() => {
    getContent().then(content => {
      const t = content?.torneos || {}
      setTournament({
        date: t.fecha_torneo  || FALLBACK_TOURNAMENT_DATE,
        url:  t.link_torneo   || FALLBACK_TOURNAMENT_URL,
      })
    }).catch(() => {})
  }, [])

  const currentYear = new Date().getFullYear()
  const minBirthYear = 1900
  const maxBirthYear = currentYear - 18

  function applyYearAsPin() {
    if (!/^\d{4}$/.test(year)) {
      setError('Ingresá un año válido de 4 dígitos.')
      return
    }
    const y = parseInt(year, 10)
    if (y < minBirthYear || y > maxBirthYear) {
      setError(`El año debe estar entre ${minBirthYear} y ${maxBirthYear} (mayor de 18).`)
      return
    }
    setPin(year)
    setError('')
    setInfo('PIN sugerido cargado: el año de nacimiento del cliente.')
    setShowYearInput(false)
  }

  function reset() {
    setName(''); setDni(''); setTel(''); setEmail(''); setPin('')
    setYear(''); setShowYearInput(false)
    setAccept(false); setError(''); setInfo(''); setStep('form')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Falta el nombre del cliente.')
    if (!/^\d{7,8}$/.test(dni)) return setError(`DNI: ingresaste ${dni.length} ${dni.length === 1 ? 'número' : 'números'}, debe tener 7 u 8 (sin puntos).`)
    if (!/^[\d\s\-\+\(\)]{8,15}$/.test(tel.trim())) return setError('Teléfono inválido (ej: 3435 123456).')
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Email inválido. Borralo si no querés cargarlo.')
    if (!/^\d{4}$/.test(pin)) return setError('El PIN debe tener exactamente 4 dígitos.')
    if (!accept) return setError('El cliente debe aceptar las bases del concurso.')
    setLoading(true)
    try {
      await registerPlayer(name.trim(), dni, tel.trim(), pin, 'cocodrilo', email.trim() || null)
      setLastResult({ name: name.trim(), pin })
      setCount(c => c + 1)
      setStep('success')
    } catch (err) {
      // Caso especial: DNI duplicado
      if (/ya está registrad|exist|duplicad/i.test(err.message || '')) {
        setError(`Este DNI ya está registrado. ${err.message}`)
      } else {
        setError(err.message)
      }
    }
    setLoading(false)
  }

  // PASO 2 — PIN listo, mostrar el código grande para que el cliente lo anote
  if (step === 'success' && lastResult) {
    return (
      <div className="promo">
        <header className="promo__header">
          <div className="promo__brand">
            <img src="/logo-sin-fondo.png" alt="Sala Crespo" className="promo__logo" />
            <div>
              <div className="promo__title">Modo Promotora</div>
              <div className="promo__sub">Paso 2 de 3 · Registros: {count}</div>
            </div>
          </div>
          <button className="promo__exit" onClick={onExit}>✕ Salir del modo</button>
        </header>

        <div className="promo__body promo__body--success">
          <div className="promo-success">
            <div className="promo-success__icon">✅</div>
            <h2 className="promo-success__title">¡Listo, {lastResult.name.split(' ')[0]}!</h2>
            <p className="promo-success__sub">El cliente ya está participando del Prode Mundial 2026.</p>
            <div className="promo-success__pin-label">PIN del cliente</div>
            <div className="promo-success__pin">{lastResult.pin}</div>
            <p className="promo-success__hint">📝 Anotalo y entregáselo al cliente. Lo va a necesitar para cargar sus pronósticos.</p>

            <div className="promo-success__actions">
              <button className="promo-btn promo-btn--primary" onClick={() => setStep('extras')}>Continuar →</button>
              <button className="promo-btn promo-btn--ghost" onClick={onExit}>Salir del modo</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // PASO 3 — Extras / Checklist final antes de soltar al cliente
  if (step === 'extras' && lastResult) {
    const firstName = lastResult.name.split(' ')[0]
    return (
      <div className="promo">
        <header className="promo__header">
          <div className="promo__brand">
            <img src="/logo-sin-fondo.png" alt="Sala Crespo" className="promo__logo" />
            <div>
              <div className="promo__title">Modo Promotora</div>
              <div className="promo__sub">Paso 3 de 3 · Antes de soltar al cliente</div>
            </div>
          </div>
          <button className="promo__exit" onClick={onExit}>✕ Salir del modo</button>
        </header>

        <div className="promo__body promo__body--success">
          <div className="promo-checklist">
            <div className="promo-checklist__icon">🎯</div>
            <h2 className="promo-checklist__title">Antes de soltar a {firstName}…</h2>
            <p className="promo-checklist__sub">Aprovechá que está acá. Tocá las tarjetas que correspondan, o pasá al siguiente cliente si ya las hicieron.</p>

            <div className="promo-checklist__grid">
              <a
                className="promo-extra promo-extra--tournament"
                href={tournament.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="promo-extra__icon">🎰</div>
                <div className="promo-extra__label">Inscribirlo al torneo de máquinas</div>
                <div className="promo-extra__sub">{tournament.date}</div>
              </a>
              <a
                className="promo-extra promo-extra--instagram"
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="promo-extra__icon">📸</div>
                <div className="promo-extra__label">Que nos siga en Instagram</div>
                <div className="promo-extra__sub">{INSTAGRAM_HANDLE}</div>
              </a>
            </div>

            <p className="promo-checklist__skip">Si {firstName} ya está inscripto al torneo y nos sigue en Instagram, podés pasar directo al siguiente cliente.</p>

            <div className="promo-success__actions">
              <button className="promo-btn promo-btn--primary" onClick={reset}>✓ Listo, registrar siguiente cliente</button>
              <button className="promo-btn promo-btn--ghost" onClick={onExit}>Salir del modo</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="promo">
      <header className="promo__header">
        <div className="promo__brand">
          <img src="/logo-sin-fondo.png" alt="Sala Crespo" className="promo__logo" />
          <div>
            <div className="promo__title">Modo Promotora</div>
            <div className="promo__sub">Registros hoy: {count}</div>
          </div>
        </div>
        <button className="promo__exit" onClick={onExit}>✕ Salir del modo</button>
      </header>

      <div className="promo__body">
        <form className="promo-form" onSubmit={handleSubmit}>
          <h2 className="promo-form__title">Inscribir cliente al Prode</h2>
          <p className="promo-form__sub">Cargá los datos básicos. Al final también vas a poder inscribirlo al torneo de máquinas e invitarlo a seguirnos en Instagram.</p>

          {/* Indicador de pasos */}
          <div className="promo-reminders">
            <div className="promo-reminders__title">📌 Paso 1 de 3 · Datos del cliente</div>
            <ul className="promo-reminders__list">
              <li>1️⃣ <strong>Cargar datos</strong> y elegir PIN (este paso)</li>
              <li>2️⃣ Mostrarle el PIN al cliente para que lo anote</li>
              <li>3️⃣ Inscribirlo al torneo de máquinas + pedirle que siga el Instagram</li>
            </ul>
          </div>

          <label className="promo-label">Nombre y apellido</label>
          <input
            className="promo-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Juan Pérez"
            autoFocus
            autoCapitalize="words"
            spellCheck={false}
          />

          <label className="promo-label">DNI <span className="promo-label__hint">(sin puntos)</span></label>
          <input
            className="promo-input"
            type="tel"
            inputMode="numeric"
            maxLength={8}
            value={dni}
            onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
            placeholder="35123456"
          />

          <label className="promo-label">Teléfono</label>
          <input
            className="promo-input"
            type="tel"
            inputMode="tel"
            value={tel}
            onChange={e => setTel(e.target.value)}
            placeholder="3435 123456"
          />

          <label className="promo-label">
            Email <span className="promo-label__optional">(opcional pero recomendado)</span>
          </label>
          <p className="promo-label__why">📧 Sirve para avisarle al cliente si gana y para que pueda recuperar su PIN si lo olvida.</p>
          <input
            className="promo-input"
            type="email"
            inputMode="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="cliente@gmail.com"
            autoCapitalize="off"
            spellCheck={false}
          />

          <label className="promo-label">PIN <span className="promo-label__hint">(4 dígitos — el cliente lo va a usar para entrar)</span></label>
          <div className="promo-pin-row">
            <input
              className="promo-input promo-input--pin"
              type="tel"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
              autoComplete="off"
            />
            <button
              type="button"
              className="promo-btn promo-btn--ghost promo-btn--sm"
              onClick={() => { setShowYearInput(v => !v); setError('') }}
            >📅 Sugerir año de nacimiento</button>
          </div>

          {showYearInput && (
            <div className="promo-year-box">
              <p className="promo-year-box__hint">💡 <strong>Truco:</strong> el año de nacimiento es fácil de recordar para el cliente y no es un dato sensible. Cargalo y se completa el PIN.</p>
              <div className="promo-pin-row">
                <input
                  className="promo-input promo-input--pin"
                  type="tel"
                  inputMode="numeric"
                  maxLength={4}
                  value={year}
                  onChange={e => setYear(e.target.value.replace(/\D/g, ''))}
                  placeholder={`Ej: 1965 (entre ${minBirthYear} y ${maxBirthYear})`}
                  autoFocus
                />
                <button type="button" className="promo-btn promo-btn--primary promo-btn--sm" onClick={applyYearAsPin}>
                  Usar como PIN
                </button>
              </div>
            </div>
          )}

          <label className="promo-check">
            <input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} />
            <span>El cliente fue informado y acepta las bases del concurso.</span>
          </label>

          {error && <div className="promo-error">⚠ {error}</div>}
          {info && <div className="promo-info">ℹ {info}</div>}

          <button className="promo-btn promo-btn--primary promo-btn--full" disabled={loading}>
            {loading ? 'Registrando...' : '🎯 Registrar e imprimir PIN'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── ProdeApp (main) ──────────────────────────────────────────────────────────
export default function ProdeApp() {
  const [player, setPlayer] = useState(() => {
    try { return JSON.parse(localStorage.getItem('prode_player')) } catch { return null }
  })
  const [tab, setTab]         = useState('inicio')
  const [matches, setMatches] = useState([])
  const [myPreds, setMyPreds] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [unlockedQueue, setUnlockedQueue] = useState([])

  // Modo Promotora — detectado por ?promo=1 en la URL
  const [promoMode, setPromoMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('promo') === '1'
  })

  function exitPromoMode() {
    setPromoMode(false)
    // Limpiar el query param sin recargar
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('promo')
      window.history.replaceState({}, '', url.toString())
    }
  }

  // Modo Staff Portal — detectado por ?staff=CODIGO en la URL
  const [staffPortalCode, setStaffPortalCode] = useState(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('staff')
  })
  function exitStaffPortal() {
    setStaffPortalCode(null)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('staff')
      window.history.replaceState({}, '', url.toString())
    }
  }

  const showToast = useCallback((msg, type = 'ok', duration = 3000) => {
    setToast({ msg, type, duration, key: Date.now() })
  }, [])

  useEffect(() => {
    getMatches()
      .then(setMatches)
      .catch(() => showToast('Error al cargar partidos', 'err'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => {
    if (!player) return
    getMyPredictions(player.id, player.token)
      .then(data => setMyPreds(data || {}))
      .catch((err) => {
        if (String(err.message || '').includes('Token') || String(err.message || '').includes('autoriz')) {
          localStorage.removeItem('prode_player')
          setPlayer(null)
          showToast('Sesión expirada, volvé a entrar')
        }
      })
  }, [player, showToast])

  // Check-in diario al montar si ya hay sesión guardada (no solo al fresh login).
  // Una vez por carga de página — si vuelve a abrir la app el día siguiente, registra otro día.
  useEffect(() => {
    if (!player?.token) return
    let cancelled = false
    dailyCheckin(player.token)
      .then(r => { if (!cancelled) enqueueUnlocked(r?.unlockedAchievements || []) })
      .catch(() => {})
    return () => { cancelled = true }
    // Solo al montar / cuando cambia el player.id (no en cada render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id])

  // Cuando savePrediction o checkin devuelve medallas, las apilamos para mostrar el modal celebratorio
  const enqueueUnlocked = useCallback((achievements) => {
    if (!achievements || achievements.length === 0) return
    setUnlockedQueue(prev => [...prev, ...achievements])
  }, [])

  function handleLogin(p) {
    setPlayer(p)
    setShowAuth(false)
    setTab('inicio')
    // Scroll al tope para que vean el banner de bienvenida con el CTA grande,
    // si no quedan en mitad de pantalla donde estaba el modal y se pierde el CTA
    if (typeof window !== 'undefined') {
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
    }
    // Check-in diario al loguearse: registra visita + dispara medallas de fidelidad
    dailyCheckin(p.token)
      .then(r => enqueueUnlocked(r.unlockedAchievements || []))
      .catch(() => {})
    const firstName = (p.name || '').split(' ')[0] || ''
    const stat = p.stat || {}
    let msg
    if (p.isEmployee && stat.position && stat.total) {
      msg = `🏢 ¡Hola ${firstName}! Vas ${stat.position}° de ${stat.total} en la tabla interna`
    } else if (stat.position && stat.total) {
      msg = `🏆 ¡Hola ${firstName}! Vas en el puesto ${stat.position} de ${stat.total}`
    } else if (stat.total > 0) {
      // El jugador no jugó aún o no tiene resultados procesados
      msg = `👋 ¡Hola ${firstName}! Cargá tu primer pronóstico para entrar al ranking`
    } else {
      // Sin más jugadores o sin partidos jugados — fallback simple
      msg = `🎉 ¡Bienvenido, ${firstName}!`
    }
    // type 'info' (sin prefijo ✓) + 4.5s para que dé tiempo de leer
    showToast(msg, 'info', 4500)
  }

  function handleLogout() {
    localStorage.removeItem('prode_player')
    setPlayer(null)
    setMyPreds({})
    setTab('inicio')
  }

  function refreshPreds() {
    if (!player) return
    getMyPredictions(player.id, player.token).then(d => setMyPreds(d || {})).catch(() => {})
    showToast('Pronóstico guardado ✓')
  }

  const TABS = player ? [
    { id: 'inicio',      label: '🏠 Inicio' },
    { id: 'pronosticos', label: '🎯 Mis pronósticos' },
    { id: 'tabla',       label: '📊 Mi posición' },
    // Tab interno: visible automáticamente para empleados (el backend marca is_employee)
    ...(player.isEmployee ? [{ id: 'tabla-interna', label: '🏢 Tabla interna' }] : []),
    { id: 'llaves',      label: '🗓️ Fixture' },
  ] : [
    { id: 'inicio', label: '🏠 Inicio' },
    { id: 'tabla',  label: '📊 Posiciones' },
  ]

  // Modo promotora — render dedicado, no muestra el resto de la app
  if (promoMode) {
    return <PromoMode onExit={exitPromoMode} />
  }

  // Portal de staff — accesible siempre con el link, también para empleados ya logueados
  // (así pueden volver a mandar sugerencias). El componente cambia el render según haya o no player.
  if (staffPortalCode) {
    return <StaffPortal staffCode={staffPortalCode} player={player} onLogin={handleLogin} onExit={exitStaffPortal} />
  }

  return (
    <div className="prode-page">
      {/* Header */}
      <header className="prode-header">
        <div className="prode-header__inner">
          <Link to="/" className="prode-header__back">← Sala Crespo</Link>
          <div className="prode-header__brand">
            <span className="prode-header__icon">⚽</span>
            <div>
              <h1 className="prode-header__title">PRODE MUNDIAL 2026</h1>
              <p className="prode-header__sub">Sala Crespo · Crespo, Entre Ríos</p>
            </div>
          </div>
          <div className="prode-header__right">
            {player ? (
              <>
                <span className="prode-header__player-name" style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <PlayerAvatar mascotId={player.mascota} size={32} name={player.name} />
                  {player.name}
                </span>
                <button className="prode-header__logout" onClick={handleLogout}>Salir</button>
              </>
            ) : (
              <button className="prode-header__join" onClick={() => setShowAuth(true)}>
                ⚽ Participar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Nav */}
      <ProdeNav tabs={TABS} activeTab={tab} onTabChange={setTab} />

      {/* Toast */}
      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} duration={toast.duration} onDone={() => setToast(null)} />}

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={handleLogin} />}

      {/* Modal celebratorio cuando se desbloquea una o varias medallas */}
      {unlockedQueue.length > 0 && (
        <UnlockModal
          achievements={unlockedQueue}
          onClose={() => setUnlockedQueue([])}
        />
      )}

      {/* Body */}
      <div className="prode-body">
        {loading ? (
          <div className="prode-loading prode-loading--full">
            <div className="prode-spinner" />
            <p>Cargando el Mundial...</p>
          </div>
        ) : (
          <>
            {tab === 'inicio' && (
              <PublicHome
                player={player}
                onParticipa={() => player ? setTab('pronosticos') : setShowAuth(true)}
              />
            )}
            {tab === 'tabla' && (
              <div className="prode-content">
                <LeaderboardView myId={player?.id} />
              </div>
            )}
            {tab === 'tabla-interna' && player?.isEmployee && (
              <div className="prode-content">
                <div style={{ background: 'rgba(155,31,31,0.12)', border: '1px solid rgba(155,31,31,0.4)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#FF8888', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 'bold', marginBottom: 6 }}>🏢 Concurso Interno</div>
                  <div style={{ color: '#E8EDF5', fontSize: 14, lineHeight: 1.5 }}>Esta tabla es exclusiva del staff de Electric Line SRL. Premios y bases independientes del concurso público.</div>
                </div>
                <LeaderboardView myId={player?.id} audience="employees" token={player?.token} />
              </div>
            )}
            {tab === 'pronosticos' && player && (
              <div className="prode-content">
                <PronosticosView
                  matches={matches}
                  myPreds={myPreds}
                  player={player}
                  onSaved={refreshPreds}
                  onUnlocked={enqueueUnlocked}
                />
              </div>
            )}
            {tab === 'llaves' && player && (
              <div className="prode-content">
                <FixtureView matches={matches} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
