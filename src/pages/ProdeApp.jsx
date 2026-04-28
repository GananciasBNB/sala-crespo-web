import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  registerPlayer, loginPlayer, forgotPin,
  getMatches, getMyPredictions, savePrediction, savePredictionsBatch,
  getLeaderboard,
} from '../api/client'
import MundialCountdown from '../components/MundialCountdown'
import './ProdeApp.css'

// ─── Mapa de nombre → ISO para flagcdn.com ────────────────────────────────────
const NAME_TO_ISO = {
  'México':'mx','Sudáfrica':'za','República de Corea':'kr','Canadá':'ca','Catar':'qa',
  'Suiza':'ch','Brasil':'br','Marruecos':'ma','Haití':'ht','Escocia':'gb-sct',
  'Estados Unidos':'us','Paraguay':'py','Australia':'au','Alemania':'de','Curazao':'cw',
  'Costa de Marfil':'ci','Ecuador':'ec','Países Bajos':'nl','Japón':'jp','Túnez':'tn',
  'Bélgica':'be','Egipto':'eg','RI de Irán':'ir','Nueva Zelanda':'nz','España':'es',
  'Islas de Cabo Verde':'cv','Arabia Saudí':'sa','Uruguay':'uy','Francia':'fr',
  'Senegal':'sn','Noruega':'no','Argentina':'ar','Argelia':'dz','Austria':'at',
  'Jordania':'jo','Portugal':'pt','Uzbekistán':'uz','Colombia':'co',
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
  A: [{ name: 'México' }, { name: 'Sudáfrica' }, { name: 'República de Corea' }, { name: null, label: 'Play-off D' }],
  B: [{ name: 'Canadá' }, { name: 'Catar' }, { name: 'Suiza' }, { name: null, label: 'Play-off A' }],
  C: [{ name: 'Brasil' }, { name: 'Marruecos' }, { name: 'Haití' }, { name: 'Escocia' }],
  D: [{ name: 'Estados Unidos' }, { name: 'Paraguay' }, { name: 'Australia' }, { name: null, label: 'Play-off C' }],
  E: [{ name: 'Alemania' }, { name: 'Curazao' }, { name: 'Costa de Marfil' }, { name: 'Ecuador' }],
  F: [{ name: 'Países Bajos' }, { name: 'Japón' }, { name: null, label: 'Play-off B' }, { name: 'Túnez' }],
  G: [{ name: 'Bélgica' }, { name: 'Egipto' }, { name: 'RI de Irán' }, { name: 'Nueva Zelanda' }],
  H: [{ name: 'España' }, { name: 'Islas de Cabo Verde' }, { name: 'Arabia Saudí' }, { name: 'Uruguay' }],
  I: [{ name: 'Francia' }, { name: 'Senegal' }, { name: null, label: 'Play-off IB' }, { name: 'Noruega' }],
  J: [{ name: 'Argentina' }, { name: 'Argelia' }, { name: 'Austria' }, { name: 'Jordania' }],
  K: [{ name: 'Portugal' }, { name: null, label: 'Play-off IA' }, { name: 'Uzbekistán' }, { name: 'Colombia' }],
  L: [{ name: 'Inglaterra' }, { name: 'Croacia' }, { name: 'Ghana' }, { name: 'Panamá' }],
}

// ISO codes en orden para el ticker (44 países)
const ALL_FLAGS_ISO = [
  'mx','za','kr','ca','qa','ch','br','ma','ht','gb-sct',
  'us','py','au','de','cw','ci','ec','nl','jp','tn',
  'be','eg','ir','nz','es','cv','sa','uy','fr','sn',
  'no','ar','dz','at','jo','pt','uz','co','gb-eng','hr','gh','pa',
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
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return <div className={`prode-toast prode-toast--${type}`}>{type === 'ok' ? '✓' : '✕'} {msg}</div>
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
function LeaderboardView({ myId }) {
  const [phase, setPhase] = useState('all')
  const [data, setData]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getLeaderboard(phase)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [phase])

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
  const [tab, setTab]           = useState('registro')
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
            <button className="modal__submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrarme y jugar →'}
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
  const dateStr   = matchDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr   = matchDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

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

// ─── Bracket ──────────────────────────────────────────────────────────────────
function BracketView({ matches }) {
  const knockout = matches.filter(m => KNOCKOUT_PHASES.includes(m.phase))

  if (knockout.length === 0) {
    return (
      <div className="prode-empty">
        <div className="prode-empty__icon">🌐</div>
        <p>Las llaves se definen al terminar la fase de grupos (27 de junio 2026).</p>
      </div>
    )
  }

  return (
    <div className="bracket">
      {KNOCKOUT_PHASES.filter(ph => knockout.some(m => m.phase === ph)).map(phase => (
        <div key={phase} className="bracket__round">
          <h3 className="bracket__round-title">{PHASE_LABELS[phase]}</h3>
          <div className="bracket__matches">
            {knockout.filter(m => m.phase === phase).map(m => (
              <div key={m.id} className={`bracket__match ${m.result ? 'bracket__match--done' : ''} ${m.isArgentina ? 'bracket__match--arg' : ''}`}>
                <div className="bracket__team">
                  <FlagImg name={m.homeName} size={24} className="bracket__flag-img" />
                  <span className="bracket__tname">{m.homeName}</span>
                  {m.result && <span className="bracket__score">{m.result.home}</span>}
                </div>
                <div className="bracket__sep">VS</div>
                <div className="bracket__team">
                  <FlagImg name={m.awayName} size={24} className="bracket__flag-img" />
                  <span className="bracket__tname">{m.awayName}</span>
                  {m.result && <span className="bracket__score">{m.result.away}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Home Pública ─────────────────────────────────────────────────────────────
function PublicHome({ onParticipa }) {
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
            ⚽ PARTICIPÁ AQUÍ
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
        <LeaderboardView myId={null} />
        <div className="pub-lb__cta">
          <p>¿Querés aparecer acá?</p>
          <button className="pub-lb__btn" onClick={onParticipa}>Registrarme y jugar →</button>
        </div>
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

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type, key: Date.now() })
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
    showToast(`¡Bienvenido, ${p.name}! 🎉`)
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
    { id: 'llaves',      label: '🗓️ Fixture' },
  ] : [
    { id: 'inicio', label: '🏠 Inicio' },
    { id: 'tabla',  label: '📊 Posiciones' },
  ]

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
      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

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
              <PublicHome onParticipa={() => setShowAuth(true)} />
            )}
            {tab === 'tabla' && (
              <div className="prode-content">
                <LeaderboardView myId={player?.id} />
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
                <BracketView matches={matches} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
