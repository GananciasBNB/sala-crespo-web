import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  registerPlayer, loginPlayer, forgotPin,
  getMatches, getMyPredictions, savePrediction, savePredictionsBatch,
  getLeaderboard, getEmployeesLeaderboard, getRegistrationStatus,
  getContent, getMyStreak,
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

// ─── Prize Cards ──────────────────────────────────────────────────────────────
// ─── Racha del Hincha ─────────────────────────────────────────────────────────
function StreakCard({ player }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!player?.token) { setLoading(false); return }
    getMyStreak(player.token)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [player?.token])

  if (loading || !data) return null

  const { current, best, rank, next, daysToNext, activeToday } = data
  const isActive = current > 0
  // Cálculo del progreso al siguiente rango
  let progress = 0
  if (next && rank) {
    const span = next.min - rank.min
    const done  = current - rank.min
    progress = span > 0 ? Math.max(0, Math.min(100, (done / span) * 100)) : 100
  } else if (!next) {
    progress = 100
  }

  // Círculo SVG: 88 radio, perímetro = 553
  const RADIUS = 78
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const dashOffset = CIRCUMFERENCE * (1 - progress / 100)

  return (
    <div className={`streak-card streak-card--${rank.id}`} style={{ '--streak-color': rank.color }}>
      <div className="streak-card__visual">
        <svg className="streak-card__ring" viewBox="0 0 200 200" aria-hidden="true">
          <circle className="streak-card__ring-bg" cx="100" cy="100" r={RADIUS} />
          {isActive && (
            <circle
              className="streak-card__ring-fg"
              cx="100" cy="100" r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 100 100)"
            />
          )}
        </svg>
        <div className="streak-card__center">
          <div className="streak-card__number">{current}</div>
          <div className="streak-card__unit">{current === 1 ? 'día' : 'días'}</div>
        </div>
      </div>

      <div className="streak-card__info">
        <div className="streak-card__rank">{rank.label}</div>
        {isActive ? (
          <p className="streak-card__sub">
            {activeToday
              ? `Ya cargaste hoy. Volvé mañana para sumar otro día.`
              : `Cargá un pronóstico antes de medianoche para no romper la racha.`}
          </p>
        ) : best > 0 ? (
          <p className="streak-card__sub">Tu mejor racha fue de <strong>{best}</strong> {best === 1 ? 'día' : 'días'}. Empezá una nueva hoy.</p>
        ) : (
          <p className="streak-card__sub">Cargá tu primer pronóstico para arrancar tu racha.</p>
        )}

        {next && isActive && (
          <div className="streak-card__progress">
            <div className="streak-card__progress-track">
              <div className="streak-card__progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="streak-card__progress-label">
              <span>Próximo: <strong>{next.label}</strong></span>
              <span>Faltan {daysToNext} {daysToNext === 1 ? 'día' : 'días'}</span>
            </div>
          </div>
        )}

        {best > current && (
          <div className="streak-card__best">Récord personal: {best} días</div>
        )}
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

function AuthModal({ onClose, onLogin }) {
  const [registrationClosed, setRegistrationClosed] = useState(false)
  useEffect(() => {
    getRegistrationStatus().then(s => setRegistrationClosed(!!s.closed)).catch(() => {})
  }, [])
  const [tab, setTab]           = useState(registrationClosed ? 'login' : 'registro')
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
      const player = await registerPlayer(name.trim(), dni, tel.trim(), pin, mascota, email.trim() || null)
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
    if (!/^\d{7,8}$/.test(dni)) return setError('Ingresá tu DNI (7 u 8 dígitos, sin puntos).')
    if (!/^\d{4}$/.test(pin))   return setError('Ingresá tu PIN de 4 dígitos.')
    setLoading(true)
    try {
      const player = await loginPlayer(dni, pin)
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
function PronosticosView({ matches, myPreds, player, onSaved }) {
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
      await savePredictionsBatch(player.token, toSave)
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
function PublicHome({ player, onParticipa }) {
  return (
    <div className="pub-home">
      {/* Hero */}
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
          <button className="pub-hero__cta" onClick={onParticipa}>
            {player ? `🎯 Cargar mis pronósticos` : '⚽ PARTICIPÁ AQUÍ'}
          </button>
        </div>
        <div className="pub-hero__balls">
          {['⚽','🌎','⚽','🌎','⚽'].map((e,i) => <span key={i} className={`pub-hero__ball pub-hero__ball--${i}`}>{e}</span>)}
        </div>
      </div>

      {/* Banner Argentina */}
      <div className="arg-banner">
        <img src="https://flagcdn.com/w80/ar.png" alt="Argentina" className="arg-banner__flag" width="48" height="32" />
        <div className="arg-banner__text">
          <strong>¡LOS PARTIDOS DE NUESTRA SELECCIÓN SUMAN DOBLE!</strong>
          <span>Cada partido de Argentina vale el doble de puntos. ¡Dale Albiceleste!</span>
        </div>
        <img src="https://flagcdn.com/w80/ar.png" alt="Argentina" className="arg-banner__flag" width="48" height="32" />
      </div>

      {/* Racha del Hincha — solo para player logueado */}
      {player && (
        <div className="streak-section">
          <h2 className="streak-section__title">Racha del Hincha</h2>
          <p className="streak-section__sub">Días consecutivos cargando pronósticos. No la rompas.</p>
          <StreakCard player={player} />
        </div>
      )}

      {/* Info — al tope para que sea lo primero que lean */}
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

      {/* Premios */}
      <PrizeCards />

      {/* 48 equipos */}
      <GroupsGrid />

      {/* Tabla */}
      <div className="pub-lb">
        <div className="pub-lb__header">
          <h2 className="pub-lb__title">🏆 Tabla de Posiciones</h2>
          <p className="pub-lb__sub">Actualizada en tiempo real</p>
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

  function handleLogin(p) {
    setPlayer(p)
    setShowAuth(false)
    setTab('pronosticos')
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
      <nav className="prode-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`prode-nav__btn ${tab === t.id ? 'prode-nav__btn--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Toast */}
      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} duration={toast.duration} onDone={() => setToast(null)} />}

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={handleLogin} />}

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
