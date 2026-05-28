import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  adminLogin, adminVerify, getMatches, getShows, getContent,
  adminSetResult, adminDeleteResult, adminSetTeams, adminSyncTeamsFromFixture, adminGetPlayers, adminSearchPlayers, adminDeletePlayer, adminEditPlayer, adminResetPin, adminInvitePlayer, adminTogglePlayerEmployee,
  adminGetLeagues, adminGetLeagueDetail, adminDeleteLeague,
  adminEspnTestDiscover, adminEspnTestAdd, adminEspnTestList, adminEspnTestSync, adminEspnTestDelete,
  adminGetTournaments, adminCreateTournament, adminUpdateTournament, adminDeleteTournament,
  adminGetTournamentRegistrations, adminSetRegistrationAttended, adminSetRegistrationPosition, adminDeleteTournamentRegistration,
  adminCreateShow, adminUpdateShow, adminDeleteShow,
  adminUpdateContent, adminUploadImage,
  adminGetAdmins, adminCreateAdmin, adminDeleteAdmin,
  adminGetPrizes, adminGetPrizesSummary, adminGeneratePrizes, adminRedeemPrize, adminRevokePrize,
  adminEmailBlast, adminEmailPreview, adminEmailDefaults,
  adminEmailCampaigns, adminEmailCampaignDetail,
  adminPromoCampaigns, adminCreatePromoCampaign, adminPromoCampaignBlast, adminPromoPreview,
  adminDashboardStats, adminAnalyticsSnapshot,
  adminSaveAnalyticsSnapshot, adminListAnalyticsSnapshots, adminDeleteAnalyticsSnapshot, adminCompareAnalyticsSnapshots,
} from '../api/client'
import './AdminPanel.css'

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className={`ap-toast ap-toast--${type}`}>
      {type === 'ok' ? '✓' : '✕'} {msg}
    </div>
  )
}

function useToast() {
  const [toast, setToast] = useState(null)
  const show = (msg, type = 'ok') => setToast({ msg, type, key: Date.now() })
  const clear = () => setToast(null)
  return { toast, show, clear }
}

// ─── Login ────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await adminLogin(email, pass)
      localStorage.setItem('admin_token', res.token)
      localStorage.setItem('admin_info', JSON.stringify(res.admin))
      onLogin(res.token, res.admin)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="ap-login">
      <Link to="/" className="ap-login__back">← Sala Crespo</Link>
      <div className="ap-login__box">
        <div className="ap-login__icon">⚙️</div>
        <h1 className="ap-login__title">Panel de Administración</h1>
        <p className="ap-login__sub">Sala de Juegos Crespo</p>
        <form className="ap-login__form" onSubmit={handleSubmit}>
          <input
            className="ap-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="ap-input"
            type="password"
            placeholder="Contraseña"
            value={pass}
            onChange={e => setPass(e.target.value)}
            required
          />
          {error && <p className="ap-login__error">{error}</p>}
          <button className="ap-login__submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar →'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Prode Management ─────────────────────────────────────────────────────────
// Card mobile-first para cargar resultado de un partido de hoy
function TodayMatchCard({ match, onSave, onDelete }) {
  const [home, setHome] = useState(match.result ? String(match.result.home) : '')
  const [away, setAway] = useState(match.result ? String(match.result.away) : '')
  const [saving, setSaving] = useState(false)

  const dt = new Date(match.date)
  const timeStr = dt.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires'
  }) + ' horas'
  const hasResult = !!match.result

  async function handleSave() {
    if (home === '' || away === '') return
    setSaving(true)
    await onSave(home, away)
    setSaving(false)
  }

  return (
    <div className={`ap-today-card ${hasResult ? 'ap-today-card--done' : ''}`}>
      <div className="ap-today-card__meta">
        <span className="ap-today-card__time">⏰ {timeStr}</span>
        <span className="ap-today-card__phase">
          {match.phase === 'group' ? `Grupo ${match.group}` : match.phase}
        </span>
        {hasResult && <span className="ap-today-card__badge">✓ Cargado</span>}
      </div>
      <div className="ap-today-card__teams">
        <div className="ap-today-card__team">{match.homeName}</div>
        <input
          type="number" inputMode="numeric" min="0" max="30"
          className="ap-today-card__score"
          value={home}
          onChange={e => setHome(e.target.value)}
          placeholder="0"
        />
        <span className="ap-today-card__vs">–</span>
        <input
          type="number" inputMode="numeric" min="0" max="30"
          className="ap-today-card__score"
          value={away}
          onChange={e => setAway(e.target.value)}
          placeholder="0"
        />
        <div className="ap-today-card__team ap-today-card__team--away">{match.awayName}</div>
      </div>
      <div className="ap-today-card__actions">
        <button
          className="ap-btn ap-btn--primary ap-today-card__save"
          onClick={handleSave}
          disabled={saving || home === '' || away === ''}
        >
          {saving ? 'Guardando…' : hasResult ? 'Actualizar' : 'Guardar resultado'}
        </button>
        {hasResult && (
          <button
            className="ap-btn ap-btn--danger ap-btn--sm"
            onClick={onDelete}
          >
            Borrar
          </button>
        )}
      </div>
    </div>
  )
}

function ProdeAdmin({ token, toast }) {
  const [matches, setMatches]   = useState([])
  const [players, setPlayers]   = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null) // null = no buscó | [] = sin matches
  const [playersFilter, setPlayersFilter] = useState('prode') // 'prode' | 'tournament' | 'all'
  const [matchId, setMatchId]   = useState('')
  const [home, setHome]         = useState('')
  const [away, setAway]         = useState('')
  const [teamsMatchId, setTeamsMatchId] = useState('')
  const [teamData, setTeamData] = useState({ homeName: '', homeFlag: '', awayName: '', awayFlag: '' })
  const [subtab, setSubtab]     = useState('hoy')
  const [editingPlayer, setEditingPlayer] = useState(null) // { id, name, tel, email }
  const [invitingPlayer, setInvitingPlayer] = useState(null) // { name, dni, tel, email, isEmployee } | null
  const [invitedPin, setInvitedPin] = useState(null)         // { name, pin, emailSent }

  useEffect(() => {
    getMatches().then(setMatches).catch(() => {})
  }, [token])

  // Recargar players al cambiar el filtro
  useEffect(() => {
    adminGetPlayers(token, playersFilter).then(setPlayers).catch(() => {})
  }, [token, playersFilter])

  async function handleSetResult(e) {
    e.preventDefault()
    if (!matchId) return
    try {
      await adminSetResult(token, parseInt(matchId), parseInt(home), parseInt(away))
      toast.show(`Resultado guardado para partido #${matchId}`)
      setHome(''); setAway(''); setMatchId('')
      getMatches().then(setMatches)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleDeleteResult(mid) {
    if (!confirm(`¿Borrar resultado del partido #${mid}?`)) return
    try {
      await adminDeleteResult(token, mid)
      toast.show(`Resultado #${mid} eliminado`)
      getMatches().then(setMatches)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleSetTeams(e) {
    e.preventDefault()
    if (!teamsMatchId) return
    try {
      await adminSetTeams(token, parseInt(teamsMatchId),
        teamData.homeName, teamData.homeFlag,
        teamData.awayName, teamData.awayFlag)
      toast.show('Equipos actualizados')
      setTeamsMatchId('')
      setTeamData({ homeName: '', homeFlag: '', awayName: '', awayFlag: '' })
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleSyncFixture() {
    if (!confirm('Esto re-cargará los 72 partidos de fase de grupos desde el fixture oficial. Útil tras actualizar equipos de repechaje. ¿Continuar?')) return
    try {
      const r = await adminSyncTeamsFromFixture(token)
      toast.show(`Sincronizados ${r.synced} partidos`)
      getMatches().then(setMatches)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleDeletePlayer(id) {
    if (!confirm('¿Eliminar este jugador y sus pronósticos?')) return
    try {
      await adminDeletePlayer(token, id)
      toast.show('Jugador eliminado')
      adminGetPlayers(token, playersFilter).then(setPlayers)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleEditPlayerSave() {
    if (!editingPlayer.name.trim()) return toast.show('El nombre no puede estar vacío.', 'err')
    const dniClean = (editingPlayer.dni || '').trim()
    if (dniClean && !/^\d{7,8}$/.test(dniClean)) return toast.show('DNI debe ser 7 u 8 dígitos.', 'err')
    try {
      await adminEditPlayer(token, editingPlayer.id, {
        name: editingPlayer.name.trim(),
        dni: dniClean || null,
        tel: editingPlayer.tel,
        email: editingPlayer.email || null,
      })
      toast.show('Jugador actualizado')
      setEditingPlayer(null)
      adminGetPlayers(token, playersFilter).then(setPlayers)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleInvitePlayerSave() {
    const inv = invitingPlayer
    if (!inv) return
    if (!inv.name?.trim()) return toast.show('Nombre requerido', 'err')
    if (!/^\d{7,8}$/.test(String(inv.dni || '').trim())) return toast.show('DNI debe tener 7 u 8 dígitos', 'err')
    if (!/^[\d\s\-\+\(\)]{8,15}$/.test(String(inv.tel || '').trim())) return toast.show('Teléfono inválido', 'err')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(inv.email || '').trim().toLowerCase())) return toast.show('Email obligatorio (se envía el PIN por mail)', 'err')
    try {
      const res = await adminInvitePlayer(token, {
        name: inv.name.trim(),
        dni: String(inv.dni).trim(),
        tel: String(inv.tel).trim(),
        email: String(inv.email).trim().toLowerCase(),
        isEmployee: !!inv.isEmployee,
      })
      setInvitingPlayer(null)
      setInvitedPin({ name: inv.name.trim(), pin: res.pin, isEmployee: !!inv.isEmployee, emailSent: res.emailSent })
      adminGetPlayers(token, playersFilter).then(setPlayers)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleToggleEmployee(player) {
    const next = !player.isEmployee
    const verb = next ? 'marcar como empleado' : 'desmarcar como empleado'
    const ok = confirm(`¿${verb.charAt(0).toUpperCase() + verb.slice(1)} a ${player.name}?\n\n${next ? 'Pasará a la tabla interna y dejará de aparecer en el ranking público.' : 'Volverá a aparecer en el ranking público.'}`)
    if (!ok) return
    try {
      await adminTogglePlayerEmployee(token, player.id, next)
      toast.show(`✓ ${player.name} ${next ? 'marcado como empleado' : 'quitado de empleados'}`)
      adminGetPlayers(token, playersFilter).then(setPlayers)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleResetPin(player) {
    const ok = confirm(`¿Resetear el PIN de ${player.name}?\n\nSe generará un PIN nuevo y se mostrará en pantalla. ${player.email ? 'También se enviará por email.' : 'El jugador no tiene email registrado, anotalo y entregalo en mostrador.'}`)
    if (!ok) return
    try {
      const res = await adminResetPin(token, player.id)
      // Mostrar PIN en alert grande y obvio
      const msg = res.emailSent
        ? `✓ PIN nuevo de ${player.name}: ${res.pin}\n\nTambién se envió por email a ${player.email}.\n\nAnotalo igual por las dudas.`
        : `✓ PIN nuevo de ${player.name}: ${res.pin}\n\n(El jugador no tiene email — anotalo y entregalo en mostrador)`
      alert(msg)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  const withResults = matches.filter(m => m.result)
  const knockout    = matches.filter(m => !['group'].includes(m.phase))

  // Partidos de HOY en zona horaria Argentina (UTC-3)
  const todayARDate = (() => {
    const now = new Date()
    // Convertir a Argentina (UTC-3) sin importar TZ del cliente
    const ms = now.getTime() - 3 * 60 * 60 * 1000
    return new Date(ms).toISOString().slice(0, 10) // YYYY-MM-DD
  })()
  const todayMatches = matches.filter(m => {
    const d = new Date(m.date)
    const localMs = d.getTime() - 3 * 60 * 60 * 1000
    return new Date(localMs).toISOString().slice(0, 10) === todayARDate
  })
  const upcomingMatches = matches.filter(m => {
    const d = new Date(m.date)
    return d > new Date() && !m.result
  }).slice(0, 1)

  async function saveQuickResult(mid, h, a) {
    try {
      await adminSetResult(token, mid, parseInt(h), parseInt(a))
      toast.show(`✓ Resultado guardado (#${mid}: ${h}-${a})`)
      const fresh = await getMatches()
      setMatches(fresh)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  return (
    <div className="ap-section">
      <div className="ap-subtabs">
        {[
          { id: 'hoy',        label: '📆 Hoy', badge: todayMatches.length },
          { id: 'resultados', label: 'Resultados' },
          { id: 'equipos',    label: 'Equipos' },
          { id: 'jugadores',  label: 'Jugadores' },
          { id: 'ligas',      label: 'Mini-ligas' },
          { id: 'espn',       label: '🌐 ESPN sync' },
        ].map(s => (
          <button
            key={s.id}
            className={`ap-subtab ${subtab === s.id ? 'ap-subtab--active' : ''}`}
            onClick={() => setSubtab(s.id)}
          >
            {s.label}
            {s.badge > 0 && <span className="ap-subtab__badge">{s.badge}</span>}
          </button>
        ))}
      </div>

      {subtab === 'hoy' && (
        <div className="ap-block">
          <h3 className="ap-block__title">Partidos de hoy</h3>
          {todayMatches.length === 0 ? (
            <div className="ap-today__empty">
              <div className="ap-today__empty-icon">⚽</div>
              <p><strong>No hay partidos hoy.</strong></p>
              {upcomingMatches[0] && (
                <p className="ap-today__empty-next">
                  Próximo: <strong>{upcomingMatches[0].homeName} vs {upcomingMatches[0].awayName}</strong>
                  <br />
                  {new Date(upcomingMatches[0].date).toLocaleDateString('es-AR', {
                    weekday: 'long', day: 'numeric', month: 'long',
                    timeZone: 'America/Argentina/Buenos_Aires'
                  })}
                  {' · '}
                  {new Date(upcomingMatches[0].date).toLocaleTimeString('es-AR', {
                    hour: '2-digit', minute: '2-digit', hour12: false,
                    timeZone: 'America/Argentina/Buenos_Aires'
                  })} horas
                </p>
              )}
            </div>
          ) : (
            <div className="ap-today__list">
              {todayMatches.map(m => (
                <TodayMatchCard
                  key={m.id}
                  match={m}
                  onSave={(h, a) => saveQuickResult(m.id, h, a)}
                  onDelete={() => handleDeleteResult(m.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {subtab === 'resultados' && (
        <div className="ap-block">
          <h3 className="ap-block__title">Cargar resultado de partido</h3>
          <form className="ap-form ap-form--inline" onSubmit={handleSetResult}>
            <select
              className="ap-input ap-input--sm"
              value={matchId}
              onChange={e => setMatchId(e.target.value)}
            >
              <option value="">Elegir partido...</option>
              {matches.map(m => (
                <option key={m.id} value={m.id}>
                  #{m.id} — {m.homeName} vs {m.awayName} {m.result ? '(tiene resultado)' : ''}
                </option>
              ))}
            </select>
            <input
              className="ap-input ap-input--xs"
              type="number" min="0" max="30"
              placeholder="Local"
              value={home}
              onChange={e => setHome(e.target.value)}
            />
            <span className="ap-form__sep">–</span>
            <input
              className="ap-input ap-input--xs"
              type="number" min="0" max="30"
              placeholder="Visita"
              value={away}
              onChange={e => setAway(e.target.value)}
            />
            <button className="ap-btn ap-btn--primary">Guardar resultado</button>
          </form>

          {withResults.length > 0 && (
            <>
              <h4 className="ap-block__subtitle">Resultados cargados</h4>
              <div className="ap-table-wrap">
                <table className="ap-table">
                  <thead>
                    <tr><th>#</th><th>Partido</th><th>Resultado</th><th></th></tr>
                  </thead>
                  <tbody>
                    {withResults.map(m => (
                      <tr key={m.id}>
                        <td>{m.id}</td>
                        <td>{m.homeName} vs {m.awayName}</td>
                        <td className="ap-result">{m.result.home} – {m.result.away}</td>
                        <td>
                          <button
                            className="ap-btn ap-btn--danger ap-btn--sm"
                            onClick={() => handleDeleteResult(m.id)}
                          >Borrar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {subtab === 'equipos' && (
        <div className="ap-block">
          <h3 className="ap-block__title">Sincronizar fase de grupos desde fixture oficial</h3>
          <p className="ap-block__desc">Carga los 72 partidos de fase de grupos en la base de datos según el archivo <code>fixture.js</code>. Útil tras actualizar equipos clasificados de repechaje.</p>
          <button className="ap-btn ap-btn--primary" onClick={handleSyncFixture}>🔄 Sincronizar fase de grupos</button>

          <hr style={{ margin: '24px 0', border: 0, borderTop: '1px solid var(--ap-border)' }} />

          <h3 className="ap-block__title">Actualizar equipos de eliminatoria</h3>
          <p className="ap-block__desc">Usar cuando se definan los cruces de 16avos, octavos, etc.</p>
          <form className="ap-form ap-form--col" onSubmit={handleSetTeams}>
            <select
              className="ap-input"
              value={teamsMatchId}
              onChange={e => setTeamsMatchId(e.target.value)}
            >
              <option value="">Elegir partido eliminatoria...</option>
              {knockout.map(m => (
                <option key={m.id} value={m.id}>
                  #{m.id} · {m.phase.toUpperCase()} — {m.homeName} vs {m.awayName}
                </option>
              ))}
            </select>
            <div className="ap-form--grid2">
              <div>
                <label className="ap-label">Equipo local — Nombre</label>
                <input className="ap-input" value={teamData.homeName}
                  onChange={e => setTeamData(p => ({ ...p, homeName: e.target.value }))}
                  placeholder="Ej: Argentina" />
              </div>
              <div>
                <label className="ap-label">Equipo local — Bandera (emoji)</label>
                <input className="ap-input" value={teamData.homeFlag}
                  onChange={e => setTeamData(p => ({ ...p, homeFlag: e.target.value }))}
                  placeholder="🇦🇷" />
              </div>
              <div>
                <label className="ap-label">Equipo visita — Nombre</label>
                <input className="ap-input" value={teamData.awayName}
                  onChange={e => setTeamData(p => ({ ...p, awayName: e.target.value }))}
                  placeholder="Ej: Brasil" />
              </div>
              <div>
                <label className="ap-label">Equipo visita — Bandera (emoji)</label>
                <input className="ap-input" value={teamData.awayFlag}
                  onChange={e => setTeamData(p => ({ ...p, awayFlag: e.target.value }))}
                  placeholder="🇧🇷" />
              </div>
            </div>
            <button className="ap-btn ap-btn--primary">Actualizar equipos</button>
          </form>
        </div>
      )}

      {subtab === 'jugadores' && (
        <div className="ap-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 className="ap-block__title" style={{ margin: 0 }}>
                {playersFilter === 'prode' ? 'Jugadores del Prode' : playersFilter === 'tournament' ? 'Importados del torneo' : 'Toda la base de clientes'}
                {' '}({players.length})
              </h3>
              <div style={{ display: 'inline-flex', gap: 4, marginTop: 8, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 8 }}>
                {[
                  { id: 'prode', label: '⚽ Prode' },
                  { id: 'tournament', label: '🎰 Torneo' },
                  { id: 'all', label: '👥 Todos' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setPlayersFilter(opt.id)}
                    style={{
                      padding: '6px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: playersFilter === opt.id ? 'linear-gradient(90deg, #F0D275, #C41E3A)' : 'transparent',
                      color: playersFilter === opt.id ? '#0C0606' : '#a0a0b0',
                      transition: 'all 0.15s',
                    }}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="ap-btn"
                onClick={async () => {
                  try {
                    const base = import.meta.env.VITE_API_URL || ''
                    const r = await fetch(base + '/api/admin/players/export.csv', {
                      headers: { Authorization: `Bearer ${token}` },
                    })
                    if (!r.ok) throw new Error(`Error ${r.status}`)
                    const blob = await r.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `jugadores-prode-${new Date().toISOString().slice(0,10)}.csv`
                    document.body.appendChild(a); a.click(); a.remove()
                    URL.revokeObjectURL(url)
                  } catch (err) {
                    alert('No se pudo exportar: ' + err.message)
                  }
                }}
              >↓ Exportar CSV</button>
              <button
                className="ap-btn"
                onClick={async () => {
                  try {
                    const base = import.meta.env.VITE_API_URL || ''
                    const r = await fetch(base + '/api/admin/players/cleanup-test', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ dryRun: true, windowHours: 24 }),
                    })
                    const data = await r.json()
                    if (!r.ok) throw new Error(data.error || `Error ${r.status}`)
                    if (data.count === 0) {
                      alert('No hay registros de prueba para limpiar de las últimas 24h.')
                      return
                    }
                    const list = data.candidates.map(c => `• ${c.name} (DNI ${c.dni})`).join('\n')
                    if (!confirm(`Se van a borrar ${data.count} registros creados en las últimas 24h:\n\n${list}\n\n¿Confirmás el borrado?`)) return
                    const r2 = await fetch(base + '/api/admin/players/cleanup-test', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ dryRun: false, windowHours: 24 }),
                    })
                    const result = await r2.json()
                    if (!r2.ok) throw new Error(result.error || `Error ${r2.status}`)
                    alert(`Borrados: ${result.deleted} de ${result.requested}`)
                    adminGetPlayers(token, playersFilter).then(setPlayers)
                  } catch (err) {
                    alert('Error: ' + err.message)
                  }
                }}
              >🧪 Limpiar pruebas de hoy</button>
              <button
                className="ap-btn ap-btn--primary"
                onClick={() => setInvitingPlayer({ name: '', dni: '', tel: '', email: '', isEmployee: false })}
              >+ Invitar jugador</button>
            </div>
          </div>

          {/* Buscador global (incluye importados del torneo) */}
          <div style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 10, padding: 14, margin: '16px 0' }}>
            <div style={{ fontSize: 13, color: '#a0a0b0', marginBottom: 8 }}>
              🔍 Buscar por nombre, email o DNI (incluye importados del torneo, que no aparecen en la lista de abajo)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="ap-input"
                style={{ flex: 1 }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ej: schmidt, brunner, stieben…"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                    try {
                      const r = await adminSearchPlayers(token, searchQuery.trim())
                      setSearchResults(r)
                    } catch (err) { alert('Error: ' + err.message) }
                  }
                }}
              />
              <button
                className="ap-btn ap-btn--primary"
                disabled={searchQuery.trim().length < 2}
                onClick={async () => {
                  try {
                    const r = await adminSearchPlayers(token, searchQuery.trim())
                    setSearchResults(r)
                  } catch (err) { alert('Error: ' + err.message) }
                }}
              >Buscar</button>
              {searchResults && (
                <button className="ap-btn" onClick={() => { setSearchResults(null); setSearchQuery('') }}>Limpiar</button>
              )}
            </div>

            {searchResults && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#a0a0b0', marginBottom: 8 }}>
                  {searchResults.length === 0 ? 'Sin resultados.' : `${searchResults.length} resultado${searchResults.length === 1 ? '' : 's'}`}
                </div>
                {searchResults.map(p => (
                  <div key={p.id} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                          {p.name}
                          {p.tournamentOnly && <span style={{ fontSize: 10, background: 'rgba(255,209,102,0.15)', color: '#ffd166', padding: '2px 8px', borderRadius: 999, marginLeft: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Importado torneo</span>}
                          {p.isEmployee && <span style={{ fontSize: 10, background: 'rgba(155,31,31,0.2)', color: '#fca5a5', padding: '2px 8px', borderRadius: 999, marginLeft: 8 }}>Empleado</span>}
                        </div>
                        <div style={{ fontSize: 13, color: '#a0a0b0', marginTop: 4 }}>DNI: {p.dni} · Tel: {p.tel || '—'}</div>
                        <div style={{ fontSize: 13, color: p.email ? '#86efac' : '#fca5a5', marginTop: 4, wordBreak: 'break-all' }}>
                          📧 {p.email || '(sin email)'}
                        </div>
                      </div>
                      <button
                        className="ap-btn"
                        onClick={() => setEditingPlayer({ id: p.id, name: p.name, dni: p.dni || '', tel: p.tel || '', email: p.email || '' })}
                      >Editar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal de invitación */}
          {invitingPlayer && (
            <div className="ap-edit-modal">
              <h4 className="ap-edit-modal__title">Invitar jugador</h4>
              <p style={{ color: 'var(--ap-muted)', fontSize: 13, marginTop: 0 }}>
                Se generará un PIN de 4 dígitos y se enviará por email al jugador.
              </p>
              <label className="ap-label">Nombre completo</label>
              <input className="ap-input" value={invitingPlayer.name}
                onChange={e => setInvitingPlayer(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Juan Pérez" autoFocus />
              <label className="ap-label">DNI (7 u 8 dígitos, sin puntos)</label>
              <input className="ap-input" type="tel" inputMode="numeric" maxLength={8}
                value={invitingPlayer.dni}
                onChange={e => setInvitingPlayer(p => ({ ...p, dni: e.target.value.replace(/\D/g, '') }))}
                placeholder="Ej: 35123456" />
              <label className="ap-label">Teléfono</label>
              <input className="ap-input" value={invitingPlayer.tel}
                onChange={e => setInvitingPlayer(p => ({ ...p, tel: e.target.value }))}
                placeholder="Ej: 3435 123456" />
              <label className="ap-label">Email (obligatorio para invitación)</label>
              <input className="ap-input" type="email" value={invitingPlayer.email}
                onChange={e => setInvitingPlayer(p => ({ ...p, email: e.target.value }))}
                placeholder="ejemplo@correo.com" />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, background: 'rgba(155,31,31,0.1)', border: '1px solid rgba(155,31,31,0.3)', borderRadius: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!invitingPlayer.isEmployee}
                  onChange={e => setInvitingPlayer(p => ({ ...p, isEmployee: e.target.checked }))}
                  style={{ width: 18, height: 18, cursor: 'pointer' }} />
                <span style={{ fontSize: 14, color: '#E8EDF5' }}>
                  🏢 <strong>Es empleado de Electric Line SRL</strong>
                  <br /><span style={{ fontSize: 12, color: 'var(--ap-muted)' }}>(participa solo del concurso interno, no aparece en ranking público)</span>
                </span>
              </label>
              <div className="ap-edit-modal__btns">
                <button className="ap-btn ap-btn--primary" onClick={handleInvitePlayerSave}>Generar PIN y enviar email</button>
                <button className="ap-btn" onClick={() => setInvitingPlayer(null)}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Modal post-invitación con PIN visible */}
          {invitedPin && (
            <div className="ap-edit-modal" style={{ borderColor: '#C9A84C' }}>
              <h4 className="ap-edit-modal__title" style={{ color: '#F0D275' }}>✓ Invitación enviada a {invitedPin.name}</h4>
              <p style={{ color: 'var(--ap-muted)', fontSize: 14 }}>
                {invitedPin.emailSent ? 'Se envió un email con el PIN.' : 'No se pudo enviar el email — anotá el PIN.'}
                {invitedPin.isEmployee && <><br /><strong style={{ color: '#9B1F1F' }}>🏢 Marcado como empleado interno.</strong></>}
              </p>
              <div style={{ background: '#0a0d12', border: '2px solid #C9A84C', borderRadius: 12, padding: 24, textAlign: 'center', margin: '16px 0' }}>
                <div style={{ fontSize: 11, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>PIN generado</div>
                <div style={{ fontFamily: 'Courier New, monospace', fontSize: 48, color: '#F0D275', letterSpacing: 16, fontWeight: 'bold' }}>{invitedPin.pin}</div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ap-muted)' }}>El jugador puede cambiar su PIN cuando quiera desde "Olvidé mi PIN" en el sitio.</p>
              <div className="ap-edit-modal__btns">
                <button className="ap-btn ap-btn--primary" onClick={() => setInvitedPin(null)}>Cerrar</button>
              </div>
            </div>
          )}

          {/* Modal de edición inline */}
          {editingPlayer && (
            <div className="ap-edit-modal">
              <h4 className="ap-edit-modal__title">Editar jugador</h4>
              <label className="ap-label">Nombre</label>
              <input
                className="ap-input"
                value={editingPlayer.name}
                onChange={e => setEditingPlayer(p => ({ ...p, name: e.target.value }))}
              />
              <label className="ap-label">DNI (7 u 8 dígitos)</label>
              <input
                className="ap-input"
                type="tel"
                inputMode="numeric"
                maxLength={8}
                value={editingPlayer.dni || ''}
                onChange={e => setEditingPlayer(p => ({ ...p, dni: e.target.value.replace(/\D/g, '') }))}
                placeholder="35123456"
              />
              <label className="ap-label">Teléfono</label>
              <input
                className="ap-input"
                value={editingPlayer.tel || ''}
                onChange={e => setEditingPlayer(p => ({ ...p, tel: e.target.value }))}
                placeholder="Ej: 3435 123456"
              />
              <label className="ap-label">Email (opcional)</label>
              <input
                className="ap-input"
                type="email"
                value={editingPlayer.email || ''}
                onChange={e => setEditingPlayer(p => ({ ...p, email: e.target.value }))}
                placeholder="ejemplo@correo.com"
              />
              <div className="ap-edit-modal__btns">
                <button className="ap-btn ap-btn--primary" onClick={handleEditPlayerSave}>Guardar</button>
                <button className="ap-btn" onClick={() => setEditingPlayer(null)}>Cancelar</button>
              </div>
            </div>
          )}

          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr><th>Nombre</th><th>DNI</th><th>Teléfono</th><th>Email</th><th>Registrado</th><th></th></tr>
              </thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id}>
                    <td>
                      {p.name}
                      {p.isEmployee && <span title="Empleado interno" style={{ marginLeft: 6, fontSize: 11, padding: '2px 6px', background: 'rgba(155,31,31,0.2)', border: '1px solid rgba(155,31,31,0.5)', color: '#FF8888', borderRadius: 4, letterSpacing: 0.5 }}>🏢 INTERNO</span>}
                      {p.tournamentOnly && <span title="Importado del torneo, no es jugador del Prode" style={{ marginLeft: 6, fontSize: 11, padding: '2px 6px', background: 'rgba(255,209,102,0.15)', border: '1px solid rgba(255,209,102,0.4)', color: '#FFD166', borderRadius: 4, letterSpacing: 0.5 }}>📋 IMPORTADO</span>}
                    </td>
                    <td><code className="ap-code">{p.dni}</code></td>
                    <td>{p.tel || '—'}</td>
                    <td>{p.email ? <span title={p.email}>{p.email.length > 22 ? p.email.slice(0,20) + '…' : p.email}</span> : <span className="ap-muted">—</span>}</td>
                    <td>{new Date(p.createdAt).toLocaleDateString('es-AR')}</td>
                    <td className="ap-table__actions">
                      <button
                        className="ap-btn ap-btn--sm"
                        onClick={() => setEditingPlayer({ id: p.id, name: p.name, dni: p.dni || '', tel: p.tel || '', email: p.email || '' })}
                      >Editar</button>
                      <button
                        className="ap-btn ap-btn--sm"
                        onClick={() => handleResetPin(p)}
                        title="Generar PIN nuevo"
                      >🔑 Reset PIN</button>
                      <button
                        className="ap-btn ap-btn--sm"
                        onClick={() => handleToggleEmployee(p)}
                        title={p.isEmployee ? 'Quitar como empleado' : 'Marcar como empleado'}
                      >{p.isEmployee ? '👤 Quitar empleado' : '🏢 Marcar empleado'}</button>
                      <button
                        className="ap-btn ap-btn--danger ap-btn--sm"
                        onClick={() => handleDeletePlayer(p.id)}
                      >Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subtab === 'ligas' && <LeaguesAdmin token={token} toast={toast} />}
      {subtab === 'espn'  && <EspnTestAdmin token={token} toast={toast} />}
    </div>
  )
}

// ─── ESPN test sync ─────────────────────────────────────────────────────────
// Sandbox para validar el flow de sync automático contra partidos reales de
// Premier, La Liga, etc. NO toca la tabla `results` real del Prode.
const ESPN_LEAGUES = [
  { slug: 'eng.1', label: 'Premier League (ENG)' },
  { slug: 'esp.1', label: 'La Liga (ESP)' },
  { slug: 'ita.1', label: 'Serie A (ITA)' },
  { slug: 'ger.1', label: 'Bundesliga (GER)' },
  { slug: 'fra.1', label: 'Ligue 1 (FRA)' },
  { slug: 'arg.1', label: 'Liga Argentina' },
  { slug: 'uefa.champions', label: 'UEFA Champions League' },
  { slug: 'conmebol.libertadores', label: 'CONMEBOL Libertadores' },
  { slug: 'fifa.world', label: 'FIFA World Cup 2026' },
]
const ESPN_STATUS_LABEL = {
  waiting:     { txt: 'Programado',  color: '#94a3b8' },
  in_progress: { txt: 'En juego',    color: '#f59e0b' },
  finished:    { txt: 'Finalizado',  color: '#22c55e' },
  not_found:   { txt: 'No encontrado', color: '#ef4444' },
  unknown:     { txt: 'Desconocido', color: '#a78bfa' },
}

function EspnTestAdmin({ token, toast }) {
  const [list, setList]                 = useState([])
  const [lastSync, setLastSync]         = useState(null)
  const [loading, setLoading]           = useState(true)
  const [syncing, setSyncing]           = useState(false)
  const [discoverLeague, setDiscoverLeague] = useState('eng.1')
  const [discoverDate, setDiscoverDate]     = useState('')
  const [discoverResults, setDiscoverResults] = useState(null)
  const [selected, setSelected]         = useState({}) // espnEventId -> true
  const [discovering, setDiscovering]   = useState(false)

  async function reload() {
    try {
      const r = await adminEspnTestList(token)
      setList(r.matches || [])
      setLastSync(r.lastSync || null)
    } catch (err) { toast.show(err.message, 'err') }
  }

  useEffect(() => {
    setLoading(true)
    reload().finally(() => setLoading(false))
  }, [token])

  // Auto-refresh cada 30s mientras la tab está abierta
  useEffect(() => {
    const t = setInterval(reload, 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleDiscover(e) {
    e?.preventDefault()
    if (!discoverDate) { toast.show('Elegí una fecha', 'err'); return }
    const dateYYYYMMDD = discoverDate.replace(/-/g, '')
    setDiscovering(true)
    setDiscoverResults(null)
    setSelected({})
    try {
      const r = await adminEspnTestDiscover(token, discoverLeague, dateYYYYMMDD)
      setDiscoverResults(r)
      if (!r.events || r.events.length === 0) toast.show('Sin partidos en esa fecha', 'err')
    } catch (err) {
      toast.show(err.message, 'err')
    } finally {
      setDiscovering(false)
    }
  }

  async function handleAddSelected() {
    if (!discoverResults) return
    const events = (discoverResults.events || []).filter(ev => selected[ev.espnEventId] && !ev.alreadyAdded)
    if (events.length === 0) { toast.show('Marcá al menos un partido nuevo', 'err'); return }
    try {
      const r = await adminEspnTestAdd(token, discoverResults.leagueSlug, events)
      toast.show(`✓ ${r.added?.length || 0} prueba(s) agregada(s)`)
      setSelected({})
      // re-discover para refrescar alreadyAdded
      await handleDiscover()
      await reload()
    } catch (err) { toast.show(err.message, 'err') }
  }

  async function handleSyncNow() {
    setSyncing(true)
    try {
      const r = await adminEspnTestSync(token)
      toast.show(`✓ Sync OK · actualizados: ${r.updated}, finalizados: ${r.finished || 0}`)
      await reload()
    } catch (err) { toast.show(err.message, 'err') }
    setSyncing(false)
  }

  async function handleDelete(id, label) {
    if (!confirm(`¿Borrar la prueba "${label}"?`)) return
    try {
      await adminEspnTestDelete(token, id)
      toast.show('✓ Eliminada')
      await reload()
    } catch (err) { toast.show(err.message, 'err') }
  }

  const fmtScore = (m) => (m.homeScore != null && m.awayScore != null) ? `${m.homeScore} - ${m.awayScore}` : '—'

  if (loading) return <div className="ap-block"><p>Cargando…</p></div>

  return (
    <>
      <div className="ap-block">
        <h3 className="ap-block__title">🌐 ESPN sync · sandbox</h3>
        <p style={{ opacity: 0.75, fontSize: 13, lineHeight: 1.5 }}>
          Trackea partidos reales (Premier, La Liga, etc.) para validar que el sync
          automático con ESPN funciona antes del Mundial. <strong>No toca la tabla de resultados del Prode.</strong> Auto-refresh cada 30s.
        </p>

        <form onSubmit={handleDiscover} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end', marginTop: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase' }}>Liga</label>
            <select value={discoverLeague} onChange={e => setDiscoverLeague(e.target.value)} className="ap-input" style={{ minWidth: 220 }}>
              {ESPN_LEAGUES.map(l => <option key={l.slug} value={l.slug}>{l.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase' }}>Fecha</label>
            <input type="date" value={discoverDate} onChange={e => setDiscoverDate(e.target.value)} className="ap-input" />
          </div>
          <button type="submit" className="ap-btn ap-btn--primary" disabled={discovering}>
            {discovering ? 'Buscando…' : 'Buscar partidos'}
          </button>
        </form>

        {discoverResults && (
          <div style={{ marginTop: 16, padding: 12, border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, marginBottom: 10 }}>
              <strong>{discoverResults.leagueName}</strong> · {discoverResults.season || ''} · {discoverResults.events.length} partido(s)
            </div>
            {discoverResults.events.length === 0 ? (
              <p style={{ opacity: 0.7 }}>Sin partidos en esa fecha.</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {discoverResults.events.map(ev => {
                    const dt = ev.dateUtc ? new Date(ev.dateUtc).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
                    const st = ESPN_STATUS_LABEL[ev.status] || ESPN_STATUS_LABEL.unknown
                    return (
                      <label key={ev.espnEventId} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6, cursor: ev.alreadyAdded ? 'not-allowed' : 'pointer', opacity: ev.alreadyAdded ? 0.5 : 1 }}>
                        <input
                          type="checkbox"
                          disabled={ev.alreadyAdded}
                          checked={!!selected[ev.espnEventId]}
                          onChange={e => setSelected(prev => ({ ...prev, [ev.espnEventId]: e.target.checked }))}
                        />
                        <span style={{ flex: 1 }}>
                          <strong>{ev.homeAbbr}</strong> {ev.homeName} <span style={{ opacity: 0.5 }}>vs</span> <strong>{ev.awayAbbr}</strong> {ev.awayName}
                        </span>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>{dt} ARG</span>
                        <span style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>● {st.txt}</span>
                        {ev.alreadyAdded && <span style={{ fontSize: 11, opacity: 0.6 }}>(ya agregado)</span>}
                      </label>
                    )
                  })}
                </div>
                <button onClick={handleAddSelected} className="ap-btn ap-btn--primary" style={{ marginTop: 12 }}>
                  Agregar seleccionados
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="ap-block">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 className="ap-block__title" style={{ margin: 0 }}>Pruebas activas ({list.length})</h3>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {lastSync && <span style={{ fontSize: 12, opacity: 0.65 }}>Último sync: {new Date(lastSync).toLocaleString('es-AR')}</span>}
            <button onClick={handleSyncNow} className="ap-btn" disabled={syncing}>
              {syncing ? 'Sincronizando…' : '🔄 Sincronizar ahora'}
            </button>
          </div>
        </div>

        {list.length === 0 ? (
          <p style={{ opacity: 0.7, marginTop: 12 }}>No hay pruebas activas. Agregá algunas desde el bloque de arriba.</p>
        ) : (
          <div className="ap-table-wrap" style={{ marginTop: 12 }}>
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Liga</th>
                  <th>Partido</th>
                  <th>Fecha (ARG)</th>
                  <th>Estado</th>
                  <th>Score</th>
                  <th>Último check</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map(m => {
                  const dt = m.expectedDate ? new Date(m.expectedDate).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
                  const checked = m.lastCheckedAt ? new Date(m.lastCheckedAt).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
                  const st = ESPN_STATUS_LABEL[m.status] || ESPN_STATUS_LABEL.unknown
                  const label = `${m.homeAbbr} vs ${m.awayAbbr}`
                  return (
                    <tr key={m.id}>
                      <td style={{ fontSize: 11, opacity: 0.7 }}>{m.leagueSlug}</td>
                      <td><strong>{m.homeAbbr}</strong> vs <strong>{m.awayAbbr}</strong></td>
                      <td style={{ fontSize: 12 }}>{dt}</td>
                      <td style={{ color: st.color, fontWeight: 600 }}>● {st.txt}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtScore(m)}</td>
                      <td style={{ fontSize: 11, opacity: 0.6 }}>{checked}</td>
                      <td>
                        <button className="ap-btn ap-btn--small ap-btn--danger" onClick={() => handleDelete(m.id, label)}>Borrar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Clientes (base completa) ─────────────────────────────────────────────────
// Tab principal del panel admin. Default trae TODA la base, con filtros opcionales
// para acotar a Prode / Torneo / Todos.
function ClientsAdmin({ token, toast }) {
  const [players, setPlayers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [playersFilter, setPlayersFilter] = useState('all') // ← default: TODA la base
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [invitingPlayer, setInvitingPlayer] = useState(null)
  const [invitedPin, setInvitedPin] = useState(null)

  useEffect(() => {
    adminGetPlayers(token, playersFilter).then(setPlayers).catch(() => {})
  }, [token, playersFilter])

  async function handleDeletePlayer(id) {
    if (!confirm('¿Eliminar este cliente y sus pronósticos asociados?')) return
    try {
      await adminDeletePlayer(token, id)
      toast.show('Cliente eliminado')
      adminGetPlayers(token, playersFilter).then(setPlayers)
    } catch (err) { toast.show(err.message, 'err') }
  }

  async function handleEditPlayerSave() {
    if (!editingPlayer.name.trim()) return toast.show('El nombre no puede estar vacío.', 'err')
    const dniClean = (editingPlayer.dni || '').trim()
    if (dniClean && !/^\d{7,8}$/.test(dniClean)) return toast.show('DNI debe ser 7 u 8 dígitos.', 'err')
    try {
      await adminEditPlayer(token, editingPlayer.id, {
        name: editingPlayer.name.trim(),
        dni: dniClean || null,
        tel: editingPlayer.tel,
        email: editingPlayer.email || null,
      })
      toast.show('Cliente actualizado')
      setEditingPlayer(null)
      adminGetPlayers(token, playersFilter).then(setPlayers)
      // si hay búsqueda activa, refrescarla también
      if (searchResults && searchQuery) {
        adminSearchPlayers(token, searchQuery.trim()).then(setSearchResults).catch(() => {})
      }
    } catch (err) { toast.show(err.message, 'err') }
  }

  async function handleInvitePlayerSave() {
    const inv = invitingPlayer
    if (!inv) return
    if (!inv.name?.trim()) return toast.show('Nombre requerido', 'err')
    if (!/^\d{7,8}$/.test(String(inv.dni || '').trim())) return toast.show('DNI debe tener 7 u 8 dígitos', 'err')
    if (!/^[\d\s\-\+\(\)]{8,15}$/.test(String(inv.tel || '').trim())) return toast.show('Teléfono inválido', 'err')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(inv.email || '').trim().toLowerCase())) return toast.show('Email obligatorio (se envía el PIN por mail)', 'err')
    try {
      const res = await adminInvitePlayer(token, {
        name: inv.name.trim(),
        dni: String(inv.dni).trim(),
        tel: String(inv.tel).trim(),
        email: String(inv.email).trim().toLowerCase(),
        isEmployee: !!inv.isEmployee,
      })
      setInvitingPlayer(null)
      setInvitedPin({ name: inv.name.trim(), pin: res.pin, isEmployee: !!inv.isEmployee, emailSent: res.emailSent })
      adminGetPlayers(token, playersFilter).then(setPlayers)
    } catch (err) { toast.show(err.message, 'err') }
  }

  async function handleToggleEmployee(player) {
    const next = !player.isEmployee
    const verb = next ? 'marcar como empleado' : 'desmarcar como empleado'
    const ok = confirm(`¿${verb.charAt(0).toUpperCase() + verb.slice(1)} a ${player.name}?\n\n${next ? 'Pasará a la tabla interna y dejará de aparecer en el ranking público.' : 'Volverá a aparecer en el ranking público.'}`)
    if (!ok) return
    try {
      await adminTogglePlayerEmployee(token, player.id, next)
      toast.show(`✓ ${player.name} ${next ? 'marcado como empleado' : 'quitado de empleados'}`)
      adminGetPlayers(token, playersFilter).then(setPlayers)
    } catch (err) { toast.show(err.message, 'err') }
  }

  async function handleResetPin(player) {
    const ok = confirm(`¿Resetear el PIN de ${player.name}?\n\nSe generará un PIN nuevo y se mostrará en pantalla. ${player.email ? 'También se enviará por email.' : 'El cliente no tiene email registrado, anotalo y entregalo en mostrador.'}`)
    if (!ok) return
    try {
      const res = await adminResetPin(token, player.id)
      const msg = res.emailSent
        ? `✓ PIN nuevo de ${player.name}: ${res.pin}\n\nTambién se envió por email a ${player.email}.\n\nAnotalo igual por las dudas.`
        : `✓ PIN nuevo de ${player.name}: ${res.pin}\n\n(El cliente no tiene email — anotalo y entregalo en mostrador)`
      alert(msg)
    } catch (err) { toast.show(err.message, 'err') }
  }

  return (
    <div className="ap-block">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 className="ap-block__title" style={{ margin: 0 }}>
            👥 Base de clientes — {playersFilter === 'prode' ? 'Solo Prode' : playersFilter === 'tournament' ? 'Solo importados de torneo' : 'Todos'}
            {' '}({players.length})
          </h3>
          <div style={{ display: 'inline-flex', gap: 4, marginTop: 8, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 8 }}>
            {[
              { id: 'all', label: '👥 Todos' },
              { id: 'prode', label: '⚽ Prode' },
              { id: 'tournament', label: '🎰 Torneo' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setPlayersFilter(opt.id)}
                style={{
                  padding: '6px 14px', fontSize: 13, fontWeight: 600, border: 'none',
                  borderRadius: 6, cursor: 'pointer',
                  background: playersFilter === opt.id ? 'linear-gradient(90deg, #F0D275, #C41E3A)' : 'transparent',
                  color: playersFilter === opt.id ? '#0C0606' : '#a0a0b0',
                  transition: 'all 0.15s',
                }}
              >{opt.label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="ap-btn"
            onClick={async () => {
              try {
                const base = import.meta.env.VITE_API_URL || ''
                const r = await fetch(base + '/api/admin/players/export.csv', { headers: { Authorization: `Bearer ${token}` } })
                if (!r.ok) throw new Error(`Error ${r.status}`)
                const blob = await r.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `clientes-sala-crespo-${new Date().toISOString().slice(0,10)}.csv`
                document.body.appendChild(a); a.click(); a.remove()
                URL.revokeObjectURL(url)
              } catch (err) { alert('No se pudo exportar: ' + err.message) }
            }}
          >↓ Exportar CSV</button>
          <button
            className="ap-btn"
            onClick={async () => {
              try {
                const base = import.meta.env.VITE_API_URL || ''
                const r = await fetch(base + '/api/admin/players/cleanup-test', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dryRun: true, windowHours: 24 }),
                })
                const data = await r.json()
                if (!r.ok) throw new Error(data.error || `Error ${r.status}`)
                if (data.count === 0) { alert('No hay registros de prueba para limpiar de las últimas 24h.'); return }
                const list = data.candidates.map(c => `• ${c.name} (DNI ${c.dni})`).join('\n')
                if (!confirm(`Se van a borrar ${data.count} registros creados en las últimas 24h:\n\n${list}\n\n¿Confirmás el borrado?`)) return
                const r2 = await fetch(base + '/api/admin/players/cleanup-test', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dryRun: false, windowHours: 24 }),
                })
                const result = await r2.json()
                if (!r2.ok) throw new Error(result.error || `Error ${r2.status}`)
                alert(`Borrados: ${result.deleted} de ${result.requested}`)
                adminGetPlayers(token, playersFilter).then(setPlayers)
              } catch (err) { alert('Error: ' + err.message) }
            }}
          >🧪 Limpiar pruebas de hoy</button>
          <button
            className="ap-btn"
            onClick={async () => {
              try {
                const base = import.meta.env.VITE_API_URL || ''
                // 1. Dry run para ver qué va a hacer
                const r = await fetch(base + '/api/admin/players/cleanup-dni-zeros', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dryRun: true }),
                })
                const data = await r.json()
                if (!r.ok) throw new Error(data.error || `Error ${r.status}`)
                if (data.stats.pairs === 0 && data.stats.renamedExtra === 0) {
                  alert('La base ya está limpia: 0 pares duplicados con DNI X+0, 0 nombres a normalizar.')
                  return
                }
                const summary =
`Resumen del cleanup:

• Pares duplicados (DNI X / X+0): ${data.stats.pairs}
   ↳ a borrar: ${data.stats.deleted}
   ↳ con info copiada: ${data.stats.merged}
   ↳ con nombre mejorado: ${data.stats.renamed}
   ↳ saltados (con datos): ${data.stats.skipped}

• Nombres a normalizar (mayúsculas/paréntesis): ${data.stats.renamedExtra}

¿Confirmás la ejecución?`
                if (!confirm(summary)) return
                // 2. Ejecución real
                const r2 = await fetch(base + '/api/admin/players/cleanup-dni-zeros', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dryRun: false }),
                })
                const result = await r2.json()
                if (!r2.ok) throw new Error(result.error || `Error ${r2.status}`)
                alert(`✓ Listo!\n\nPares borrados: ${result.stats.deleted}\nNombres mejorados: ${result.stats.renamed + result.stats.renamedExtra}\nMergeados con info: ${result.stats.merged}`)
                adminGetPlayers(token, playersFilter).then(setPlayers)
              } catch (err) {
                alert('Error: ' + err.message)
              }
            }}
          >🧹 Unificar duplicados DNI</button>
          <button
            className="ap-btn ap-btn--primary"
            onClick={() => setInvitingPlayer({ name: '', dni: '', tel: '', email: '', isEmployee: false })}
          >+ Invitar cliente</button>
        </div>
      </div>

      {/* Buscador global */}
      <div style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 10, padding: 14, margin: '16px 0' }}>
        <div style={{ fontSize: 13, color: '#a0a0b0', marginBottom: 8 }}>
          🔍 Buscar por nombre, email o DNI (busca en TODA la base)
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="ap-input"
            style={{ flex: 1 }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Ej: schmidt, brunner, gadea, 12345678…"
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                try { setSearchResults(await adminSearchPlayers(token, searchQuery.trim())) }
                catch (err) { alert('Error: ' + err.message) }
              }
            }}
          />
          <button
            className="ap-btn ap-btn--primary"
            disabled={searchQuery.trim().length < 2}
            onClick={async () => {
              try { setSearchResults(await adminSearchPlayers(token, searchQuery.trim())) }
              catch (err) { alert('Error: ' + err.message) }
            }}
          >Buscar</button>
          {searchResults && (
            <button className="ap-btn" onClick={() => { setSearchResults(null); setSearchQuery('') }}>Limpiar</button>
          )}
        </div>

        {searchResults && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#a0a0b0', marginBottom: 8 }}>
              {searchResults.length === 0 ? 'Sin resultados.' : `${searchResults.length} resultado${searchResults.length === 1 ? '' : 's'}`}
            </div>
            {searchResults.map(p => (
              <div key={p.id} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                      {p.name}
                      {p.tournamentOnly && <span style={{ fontSize: 10, background: 'rgba(255,209,102,0.15)', color: '#ffd166', padding: '2px 8px', borderRadius: 999, marginLeft: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>Importado torneo</span>}
                      {p.isEmployee && <span style={{ fontSize: 10, background: 'rgba(155,31,31,0.2)', color: '#fca5a5', padding: '2px 8px', borderRadius: 999, marginLeft: 8 }}>Empleado</span>}
                    </div>
                    <div style={{ fontSize: 13, color: '#a0a0b0', marginTop: 4 }}>DNI: {p.dni} · Tel: {p.tel || '—'}</div>
                    <div style={{ fontSize: 13, color: p.email ? '#86efac' : '#fca5a5', marginTop: 4, wordBreak: 'break-all' }}>
                      📧 {p.email || '(sin email)'}
                    </div>
                  </div>
                  <button
                    className="ap-btn"
                    onClick={() => setEditingPlayer({ id: p.id, name: p.name, dni: p.dni || '', tel: p.tel || '', email: p.email || '' })}
                  >Editar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de invitación */}
      {invitingPlayer && (
        <div className="ap-edit-modal">
          <h4 className="ap-edit-modal__title">Invitar cliente</h4>
          <p style={{ color: 'var(--ap-muted)', fontSize: 13, marginTop: 0 }}>Se generará un PIN de 4 dígitos y se enviará por email.</p>
          <label className="ap-label">Nombre completo</label>
          <input className="ap-input" value={invitingPlayer.name} onChange={e => setInvitingPlayer(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Juan Pérez" autoFocus />
          <label className="ap-label">DNI (7 u 8 dígitos, sin puntos)</label>
          <input className="ap-input" type="tel" inputMode="numeric" maxLength={8} value={invitingPlayer.dni} onChange={e => setInvitingPlayer(p => ({ ...p, dni: e.target.value.replace(/\D/g, '') }))} placeholder="Ej: 35123456" />
          <label className="ap-label">Teléfono</label>
          <input className="ap-input" value={invitingPlayer.tel} onChange={e => setInvitingPlayer(p => ({ ...p, tel: e.target.value }))} placeholder="Ej: 3435 123456" />
          <label className="ap-label">Email (obligatorio para invitación)</label>
          <input className="ap-input" type="email" value={invitingPlayer.email} onChange={e => setInvitingPlayer(p => ({ ...p, email: e.target.value }))} placeholder="ejemplo@correo.com" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, background: 'rgba(155,31,31,0.1)', border: '1px solid rgba(155,31,31,0.3)', borderRadius: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!invitingPlayer.isEmployee} onChange={e => setInvitingPlayer(p => ({ ...p, isEmployee: e.target.checked }))} style={{ width: 18, height: 18, cursor: 'pointer' }} />
            <span style={{ fontSize: 14, color: '#E8EDF5' }}>🏢 <strong>Es empleado de Electric Line SRL</strong></span>
          </label>
          <div className="ap-edit-modal__btns">
            <button className="ap-btn ap-btn--primary" onClick={handleInvitePlayerSave}>Generar PIN y enviar email</button>
            <button className="ap-btn" onClick={() => setInvitingPlayer(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {invitedPin && (
        <div className="ap-edit-modal" style={{ borderColor: '#C9A84C' }}>
          <h4 className="ap-edit-modal__title" style={{ color: '#F0D275' }}>✓ Invitación enviada a {invitedPin.name}</h4>
          <p style={{ color: 'var(--ap-muted)', fontSize: 14 }}>{invitedPin.emailSent ? 'Se envió un email con el PIN.' : 'No se pudo enviar el email — anotá el PIN.'}</p>
          <div style={{ background: '#0a0d12', border: '2px solid #C9A84C', borderRadius: 12, padding: 24, textAlign: 'center', margin: '16px 0' }}>
            <div style={{ fontSize: 11, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>PIN generado</div>
            <div style={{ fontFamily: 'Courier New, monospace', fontSize: 48, color: '#F0D275', letterSpacing: 16, fontWeight: 'bold' }}>{invitedPin.pin}</div>
          </div>
          <div className="ap-edit-modal__btns">
            <button className="ap-btn ap-btn--primary" onClick={() => setInvitedPin(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {editingPlayer && (
        <div className="ap-edit-modal">
          <h4 className="ap-edit-modal__title">Editar cliente</h4>
          <label className="ap-label">Nombre</label>
          <input className="ap-input" value={editingPlayer.name} onChange={e => setEditingPlayer(p => ({ ...p, name: e.target.value }))} />
          <label className="ap-label">DNI (7 u 8 dígitos)</label>
          <input className="ap-input" type="tel" inputMode="numeric" maxLength={8} value={editingPlayer.dni || ''} onChange={e => setEditingPlayer(p => ({ ...p, dni: e.target.value.replace(/\D/g, '') }))} placeholder="35123456" />
          <label className="ap-label">Teléfono</label>
          <input className="ap-input" value={editingPlayer.tel || ''} onChange={e => setEditingPlayer(p => ({ ...p, tel: e.target.value }))} placeholder="Ej: 3435 123456" />
          <label className="ap-label">Email (opcional)</label>
          <input className="ap-input" type="email" value={editingPlayer.email || ''} onChange={e => setEditingPlayer(p => ({ ...p, email: e.target.value }))} placeholder="ejemplo@correo.com" />
          <div className="ap-edit-modal__btns">
            <button className="ap-btn ap-btn--primary" onClick={handleEditPlayerSave}>Guardar</button>
            <button className="ap-btn" onClick={() => setEditingPlayer(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="ap-table-wrap">
        <table className="ap-table">
          <thead>
            <tr><th>Nombre</th><th>DNI</th><th>Teléfono</th><th>Email</th><th>Registrado</th><th></th></tr>
          </thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id}>
                <td>
                  {p.name}
                  {p.isEmployee && <span title="Empleado interno" style={{ marginLeft: 6, fontSize: 11, padding: '2px 6px', background: 'rgba(155,31,31,0.2)', border: '1px solid rgba(155,31,31,0.5)', color: '#FF8888', borderRadius: 4, letterSpacing: 0.5 }}>🏢 INTERNO</span>}
                  {p.tournamentOnly && <span title="Importado del torneo" style={{ marginLeft: 6, fontSize: 11, padding: '2px 6px', background: 'rgba(255,209,102,0.15)', border: '1px solid rgba(255,209,102,0.4)', color: '#FFD166', borderRadius: 4, letterSpacing: 0.5 }}>📋 IMPORTADO</span>}
                </td>
                <td><code className="ap-code">{p.dni}</code></td>
                <td>{p.tel || '—'}</td>
                <td>{p.email ? <span title={p.email}>{p.email.length > 22 ? p.email.slice(0,20) + '…' : p.email}</span> : <span className="ap-muted">—</span>}</td>
                <td>{new Date(p.createdAt).toLocaleDateString('es-AR')}</td>
                <td className="ap-table__actions">
                  <button className="ap-btn ap-btn--sm" onClick={() => setEditingPlayer({ id: p.id, name: p.name, dni: p.dni || '', tel: p.tel || '', email: p.email || '' })}>Editar</button>
                  {!p.tournamentOnly && (
                    <button className="ap-btn ap-btn--sm" onClick={() => handleResetPin(p)} title="Generar PIN nuevo">🔑 Reset PIN</button>
                  )}
                  <button className="ap-btn ap-btn--sm" onClick={() => handleToggleEmployee(p)} title={p.isEmployee ? 'Quitar como empleado' : 'Marcar como empleado'}>{p.isEmployee ? '👤 Quitar empleado' : '🏢 Marcar empleado'}</button>
                  <button className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => handleDeletePlayer(p.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Torneos de Slots Management ──────────────────────────────────────────────
function TournamentsAdmin({ token, toast }) {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  function loadTournaments() {
    setLoading(true)
    adminGetTournaments(token)
      .then(setTournaments)
      .catch(err => toast.show(err.message, 'err'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadTournaments() }, [token])

  function loadRegistrations(t) {
    setSelected(t)
    setRegistrations([])
    adminGetTournamentRegistrations(token, t.id)
      .then(setRegistrations)
      .catch(err => toast.show(err.message, 'err'))
  }

  async function handleAttend(reg, attended) {
    try {
      await adminSetRegistrationAttended(token, reg.id, attended)
      setRegistrations(rs => rs.map(r => r.id === reg.id ? { ...r, attended } : r))
    } catch (err) { toast.show(err.message, 'err') }
  }

  async function handlePosition(reg, position) {
    try {
      await adminSetRegistrationPosition(token, reg.id, position)
      setRegistrations(rs => rs.map(r => r.id === reg.id ? { ...r, final_position: position } : r))
      toast.show(position ? `✓ Puesto ${position} asignado` : '✓ Puesto removido')
    } catch (err) { toast.show(err.message, 'err') }
  }

  async function handleDeleteReg(reg) {
    if (!confirm(`¿Sacar a "${reg.name}" del torneo?`)) return
    try {
      await adminDeleteTournamentRegistration(token, reg.id)
      setRegistrations(rs => rs.filter(r => r.id !== reg.id))
      toast.show('✓ Inscripción eliminada')
    } catch (err) { toast.show(err.message, 'err') }
  }

  async function handleCloseRegistrations(t) {
    if (!confirm(`¿Cerrar inscripciones del torneo "${t.name}"? Deja de aceptar nuevos inscriptos pero el torneo sigue figurando hasta que se juegue.`)) return
    try {
      await adminUpdateTournament(token, t.id, { status: 'closed' })
      toast.show('✓ Inscripciones cerradas')
      loadTournaments()
    } catch (err) { toast.show(err.message, 'err') }
  }

  async function handleFinishTournament(t) {
    if (!confirm(`¿Marcar el torneo "${t.name}" como FINALIZADO? Queda como histórico, no aparece en /torneo público.`)) return
    try {
      await adminUpdateTournament(token, t.id, { status: 'finished' })
      toast.show('✓ Torneo finalizado')
      loadTournaments()
    } catch (err) { toast.show(err.message, 'err') }
  }

  async function handleReopenTournament(t) {
    if (!confirm(`¿Reabrir inscripciones del torneo "${t.name}"? Volverá a aceptar nuevos inscriptos. Si hay otro torneo "ACTIVO" en simultáneo el flow puede confundirse.`)) return
    try {
      await adminUpdateTournament(token, t.id, { status: 'open' })
      toast.show('✓ Torneo reabierto')
      loadTournaments()
    } catch (err) { toast.show(err.message, 'err') }
  }

  async function handleDeleteTournament(t) {
    if (!confirm(`¿BORRAR el torneo "${t.name}" Y todas sus inscripciones? Esto NO se puede deshacer.`)) return
    try {
      await adminDeleteTournament(token, t.id)
      toast.show('✓ Torneo eliminado')
      setSelected(null); setRegistrations([])
      loadTournaments()
    } catch (err) { toast.show(err.message, 'err') }
  }

  function exportCSV() {
    if (!registrations.length || !selected) return
    const rows = [
      ['Nº', 'Nombre', 'DNI', 'Tel', 'Email', 'Ciudad', 'Origen', 'Asistió', 'Puesto final', 'Inscripto el'],
      ...registrations.map(r => [
        r.registration_no, r.name, r.dni, r.tel || '', r.email || '',
        r.city || '', r.source, r.attended ? 'SI' : 'NO',
        r.final_position || '', new Date(r.registered_at).toLocaleString('es-AR')
      ])
    ]
    const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `torneo-${selected.name.toLowerCase().replace(/\s+/g, '-')}-inscriptos.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = registrations.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.name.toLowerCase().includes(q)
      || String(r.dni).includes(search)
      || (r.email || '').toLowerCase().includes(q)
  })

  if (loading) return <div className="ap-block"><p>Cargando torneos…</p></div>

  return (
    <div className="ap-block">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <h3 className="ap-block__title" style={{ margin: 0 }}>Torneos de Slots ({tournaments.length})</h3>
        <button className="ap-btn ap-btn--primary" onClick={() => setShowCreate(true)}>+ Nuevo torneo</button>
      </div>

      {tournaments.length === 0 ? (
        <p style={{ opacity: 0.7 }}>Todavía no hay torneos creados. Apretá <strong>+ Nuevo torneo</strong> para arrancar.</p>
      ) : (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Nombre</th><th>Fecha</th><th>Estado</th><th>Inscriptos</th><th>Asistencia</th><th></th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map(t => (
                <tr key={t.id} style={selected?.id === t.id ? { background: 'rgba(201,168,76,0.1)' } : null}>
                  <td><strong>{t.name}</strong></td>
                  <td>{new Date(t.tournament_date).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' })}</td>
                  <td>
                    {(() => {
                      const styles = {
                        open:     { bg: 'rgba(0,177,64,0.2)',   fg: '#5cd87f', label: 'ACTIVO' },
                        closed:   { bg: 'rgba(255,193,7,0.18)', fg: '#ffd166', label: 'INSCRIPCIONES CERRADAS' },
                        finished: { bg: 'rgba(255,255,255,0.1)', fg: '#aaa',    label: 'FINALIZADO' },
                      }
                      const s = styles[t.status] || styles.finished
                      return (
                        <span style={{
                          padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                          background: s.bg, color: s.fg, letterSpacing: 0.5,
                        }}>{s.label}</span>
                      )
                    })()}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{t.registered_count}</td>
                  <td style={{ textAlign: 'center' }}>
                    {t.status === 'finished' || t.attended_count > 0
                      ? <span style={{ fontWeight: 700, fontSize: 15 }}>{t.attended_count} / {t.registered_count}</span>
                      : <span style={{ opacity: 0.4, fontSize: 13 }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        className="ap-btn ap-btn--small"
                        onClick={() => loadRegistrations(t)}
                        style={{ background: 'rgba(116,172,223,0.14)', borderColor: 'rgba(116,172,223,0.4)', color: '#9ec5e8' }}
                      >👥 Ver inscriptos</button>
                      {t.status === 'open' && (
                        <>
                          <button
                            className="ap-btn ap-btn--small"
                            onClick={() => handleCloseRegistrations(t)}
                            title="Deja de aceptar inscripciones, pero el torneo sigue en pie"
                            style={{ background: 'rgba(255,193,7,0.14)', borderColor: 'rgba(255,193,7,0.42)', color: '#ffd166' }}
                          >🔒 Cerrar inscripciones</button>
                          <button
                            className="ap-btn ap-btn--small"
                            onClick={() => handleFinishTournament(t)}
                            title="Marca el torneo como histórico"
                            style={{ background: 'rgba(140,140,140,0.16)', borderColor: 'rgba(255,255,255,0.22)', color: '#ddd' }}
                          >🏁 Finalizar</button>
                        </>
                      )}
                      {t.status === 'closed' && (
                        <>
                          <button
                            className="ap-btn ap-btn--small"
                            onClick={() => handleReopenTournament(t)}
                            style={{ background: 'rgba(0,177,64,0.14)', borderColor: 'rgba(0,177,64,0.42)', color: '#5cd87f' }}
                          >🔓 Reabrir inscripciones</button>
                          <button
                            className="ap-btn ap-btn--small"
                            onClick={() => handleFinishTournament(t)}
                            style={{ background: 'rgba(140,140,140,0.16)', borderColor: 'rgba(255,255,255,0.22)', color: '#ddd' }}
                          >🏁 Finalizar</button>
                        </>
                      )}
                      {t.status === 'finished' && (
                        <button
                          className="ap-btn ap-btn--small"
                          onClick={() => handleReopenTournament(t)}
                          style={{ background: 'rgba(0,177,64,0.14)', borderColor: 'rgba(0,177,64,0.42)', color: '#5cd87f' }}
                        >🔓 Reabrir</button>
                      )}
                      {/* Borrar solo si está finalizado Y sin inscriptos — destructivo. */}
                      {t.status === 'finished' && t.registered_count === 0 && (
                        <button
                          className="ap-btn ap-btn--small ap-btn--danger"
                          onClick={() => handleDeleteTournament(t)}
                          title="Borrar permanentemente"
                        >🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <TournamentCreateModal token={token} toast={toast} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadTournaments() }} />}

      {selected && (
        <div style={{ marginTop: 28, padding: 18, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <h4 style={{ margin: 0 }}>Inscriptos · {selected.name} <span style={{ opacity: 0.6, fontSize: 13 }}>({registrations.length})</span></h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="ap-input" placeholder="🔍 Buscar nombre, DNI o email" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 220 }} />
              <button className="ap-btn ap-btn--small" onClick={exportCSV}>📥 Exportar CSV</button>
              <button className="ap-btn ap-btn--small" onClick={() => { setSelected(null); setRegistrations([]) }}>Cerrar</button>
            </div>
          </div>

          {registrations.length === 0 ? (
            <p style={{ opacity: 0.7, textAlign: 'center', padding: 24 }}>Sin inscriptos todavía.</p>
          ) : (
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr><th>N°</th><th>Nombre</th><th>DNI</th><th>Tel</th><th>Email</th><th>Origen</th><th>Asistió</th><th>Puesto</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} style={r.attended ? { background: 'rgba(0,177,64,0.05)' } : null}>
                      <td><strong>{r.registration_no}</strong></td>
                      <td>{r.name}</td>
                      <td><code style={{ fontSize: 12 }}>{r.dni}</code></td>
                      <td>{r.tel || <span style={{ opacity: 0.4 }}>—</span>}</td>
                      <td style={{ fontSize: 12 }}>{r.email || <span style={{ opacity: 0.4 }}>—</span>}</td>
                      <td><span style={{ fontSize: 11, opacity: 0.7 }}>{r.source}</span></td>
                      <td>
                        <button
                          className={`ap-btn ap-btn--small ${r.attended ? 'ap-btn--success' : ''}`}
                          onClick={() => handleAttend(r, !r.attended)}
                          style={{ minWidth: 64 }}
                        >
                          {r.attended ? '✓ SÍ' : '○ NO'}
                        </button>
                      </td>
                      <td>
                        <select
                          value={r.final_position || ''}
                          onChange={e => handlePosition(r, e.target.value ? parseInt(e.target.value) : null)}
                          style={{ background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', padding: '6px 8px', borderRadius: 6 }}
                        >
                          <option value="">—</option>
                          <option value="1">🥇 1°</option>
                          <option value="2">🥈 2°</option>
                          <option value="3">🥉 3°</option>
                        </select>
                      </td>
                      <td>
                        <button className="ap-btn ap-btn--small ap-btn--danger" onClick={() => handleDeleteReg(r)} title="Eliminar inscripción">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TournamentCreateModal({ token, toast, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('21:30')
  const [location, setLocation] = useState('San Martín 1053, Crespo, Entre Ríos')
  const [prizePool, setPrizePool] = useState('Premios totales: $200.000 en tickets promocionales')
  const [infoHtml, setInfoHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setErr('')
    if (!name.trim() || !date) return setErr('Nombre y fecha son obligatorios.')
    const tournamentDate = new Date(`${date}T${time || '21:30'}:00-03:00`).toISOString()
    setSaving(true)
    try {
      await adminCreateTournament(token, {
        name: name.trim(),
        tournamentDate,
        location: location.trim() || null,
        prizePool: prizePool.trim() || null,
        infoHtml: infoHtml.trim() || null,
      })
      toast.show('✓ Torneo creado')
      onCreated()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }} onClick={onClose}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSave} style={{ background: '#15191f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 28, maxWidth: 540, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Nuevo torneo</h3>
        <label className="ap-label">Nombre</label>
        <input className="ap-input" value={name} onChange={e => setName(e.target.value)} placeholder="Torneo de Slots Mayo 2026" disabled={saving} />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="ap-label">Fecha</label>
            <input className="ap-input" type="date" value={date} onChange={e => setDate(e.target.value)} disabled={saving} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="ap-label">Hora</label>
            <input className="ap-input" type="time" value={time} onChange={e => setTime(e.target.value)} disabled={saving} />
          </div>
        </div>
        <label className="ap-label">Lugar</label>
        <input className="ap-input" value={location} onChange={e => setLocation(e.target.value)} disabled={saving} />
        <label className="ap-label">Premios (texto destacado)</label>
        <input className="ap-input" value={prizePool} onChange={e => setPrizePool(e.target.value)} disabled={saving} />
        <label className="ap-label">Bases / info completa <span style={{ opacity: 0.6, fontWeight: 400 }}>(HTML, opcional)</span></label>
        <textarea className="ap-input" rows={6} value={infoHtml} onChange={e => setInfoHtml(e.target.value)} placeholder="<p><strong>1° puesto:</strong> $100.000...</p>" disabled={saving} style={{ fontFamily: 'monospace', fontSize: 13 }} />
        {err && <div style={{ color: '#ff8b9c', fontSize: 13 }}>⚠️ {err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="ap-btn" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="ap-btn ap-btn--primary" disabled={saving}>{saving ? 'Creando…' : 'Crear torneo'}</button>
        </div>
      </form>
    </div>
  )
}

// ─── Mini-ligas Management ────────────────────────────────────────────────────
function LeaguesAdmin({ token, toast }) {
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    adminGetLeagues(token)
      .then(setLeagues)
      .catch(err => toast.show(err.message, 'err'))
      .finally(() => setLoading(false))
  }, [token])

  async function openDetail(id) {
    setSelected(id)
    setDetail(null)
    setDetailLoading(true)
    try {
      const data = await adminGetLeagueDetail(token, id)
      setDetail(data)
    } catch (err) {
      toast.show(err.message, 'err')
    } finally {
      setDetailLoading(false)
    }
  }

  async function deleteLeague(id, name) {
    if (!confirm(`¿Borrar la liga "${name}"? Esto elimina la liga y todos sus miembros. No se puede deshacer.`)) return
    try {
      await adminDeleteLeague(token, id)
      toast.show(`✓ Liga "${name}" eliminada`)
      setLeagues(leagues.filter(l => l.id !== id))
      if (selected === id) { setSelected(null); setDetail(null) }
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  if (loading) return <div className="ap-block"><p>Cargando mini-ligas…</p></div>

  return (
    <div className="ap-block">
      <h3 className="ap-block__title">Mini-ligas privadas ({leagues.length})</h3>
      {leagues.length === 0 ? (
        <p style={{ opacity: 0.7 }}>Todavía no hay ligas creadas. Aparecen acá cuando un jugador crea una desde su panel.</p>
      ) : (
        <>
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Código</th>
                  <th>Dueño</th>
                  <th>Miembros</th>
                  <th>Creada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leagues.map(l => (
                  <tr key={l.id}>
                    <td><strong>{l.name}</strong></td>
                    <td><code>{l.code}</code></td>
                    <td>{l.ownerName || '—'} {l.ownerDniLast3 ? <span style={{ opacity: 0.6 }}>···{l.ownerDniLast3}</span> : null}</td>
                    <td style={{ textAlign: 'center' }}>{l.memberCount}</td>
                    <td style={{ opacity: 0.7, fontSize: 12 }}>{new Date(l.createdAt).toLocaleDateString('es-AR')}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="ap-btn ap-btn--small" onClick={() => openDetail(l.id)}>Ver</button>
                      <button className="ap-btn ap-btn--small ap-btn--danger" onClick={() => deleteLeague(l.id, l.name)}>Borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              {detailLoading && <p>Cargando detalle…</p>}
              {detail && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <h4 style={{ margin: 0 }}>{detail.name} <span style={{ opacity: 0.6, fontSize: 14 }}>(código: <code>{detail.code}</code>)</span></h4>
                    <button className="ap-btn ap-btn--small" onClick={() => { setSelected(null); setDetail(null) }}>Cerrar</button>
                  </div>
                  <p style={{ margin: '4px 0 12px', opacity: 0.7, fontSize: 13 }}>
                    Dueño: <strong>{detail.ownerName}</strong> · Miembros: {detail.memberCount}
                  </p>
                  <h5 style={{ margin: '16px 0 8px' }}>Tabla de la liga</h5>
                  <table className="ap-table">
                    <thead>
                      <tr><th>#</th><th>Jugador</th><th>Pts</th><th>Exactos</th><th>Aciertos</th></tr>
                    </thead>
                    <tbody>
                      {detail.leaderboard.map((p, i) => (
                        <tr key={p.id}>
                          <td>{i + 1}</td>
                          <td>{p.name} <span style={{ opacity: 0.5, fontSize: 12 }}>···{p.dniLast3}</span></td>
                          <td><strong>{p.total}</strong></td>
                          <td>{p.exact}</td>
                          <td>{p.correct}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Shows Management ─────────────────────────────────────────────────────────
function ShowsAdmin({ token, toast }) {
  const [shows, setShows]   = useState([])
  const [form, setForm]     = useState({ name: '', dateLabel: '', type: 'upcoming', imageUrl: '', imagePosition: 'center center', sortOrder: 0 })
  const [editing, setEditing] = useState(null)
  const fileRef             = useRef(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    getShows().then(setShows).catch(() => {})
  }, [token])

  function resetForm() {
    setForm({ name: '', dateLabel: '', type: 'upcoming', imageUrl: '', imagePosition: 'center center', sortOrder: 0 })
    setEditing(null)
  }

  function startEdit(show) {
    setEditing(show.id)
    setForm({ name: show.name, dateLabel: show.dateLabel, type: show.type, imageUrl: show.imageUrl || '', imagePosition: show.imagePosition || 'center center', sortOrder: show.sortOrder ?? 0 })
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const res = await adminUploadImage(token, ev.target.result, 'sala-crespo/shows')
        setForm(p => ({ ...p, imageUrl: res.url }))
        toast.show('Imagen subida')
      } catch (err) {
        toast.show('Error al subir imagen: ' + err.message, 'err')
      }
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }

  async function handleSave(e) {
    e.preventDefault()
    try {
      if (editing) {
        await adminUpdateShow(token, editing, form)
        toast.show('Show actualizado')
      } else {
        await adminCreateShow(token, form)
        toast.show('Show creado')
      }
      getShows().then(setShows)
      resetForm()
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este show?')) return
    try {
      await adminDeleteShow(token, id)
      toast.show('Show eliminado')
      getShows().then(setShows)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  return (
    <div className="ap-section">
      <div className="ap-block">
        <h3 className="ap-block__title">{editing ? 'Editar show' : 'Agregar show'}</h3>
        <form className="ap-form ap-form--col" onSubmit={handleSave}>
          <div className="ap-form--grid2">
            <div>
              <label className="ap-label">Nombre del artista / evento *</label>
              <input
                className="ap-input"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Mauro Nelly"
                required
              />
            </div>
            <div>
              <label className="ap-label">Fecha / descripción</label>
              <input
                className="ap-input"
                value={form.dateLabel}
                onChange={e => setForm(p => ({ ...p, dateLabel: e.target.value }))}
                placeholder="Ej: Vie 21 de Noviembre"
              />
            </div>
          </div>

          <div className="ap-form-row">
            <div>
              <label className="ap-label">Tipo</label>
              <select
                className="ap-input"
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                <option value="upcoming">Próximo</option>
                <option value="past">Pasado</option>
              </select>
            </div>
            <div>
              <label className="ap-label">Orden <span style={{ color: 'var(--ap-muted)', fontWeight: 400, fontSize: 11 }}>(menor = más prominente)</span></label>
              <input
                className="ap-input"
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
              <div style={{ fontSize: 11, color: 'var(--ap-muted)', marginTop: 4 }}>
                💡 El show con menor orden queda <strong>destacado grande</strong>. Para próximos: usá <strong>1</strong> en el más cercano, <strong>2</strong> en el siguiente, etc.
              </div>
            </div>
          </div>

          <div>
            <label className="ap-label">Imagen del show</label>
            <div className="ap-upload-row">
              <input
                className="ap-input"
                value={form.imageUrl}
                onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
                placeholder="URL de imagen (o subí una abajo)"
              />
              <button
                type="button"
                className="ap-btn ap-btn--secondary"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Subiendo...' : '📁 Subir'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
            </div>
            {form.imageUrl && (
              <div className="ap-img-pos-wrap">
                <div className="ap-img-pos-preview">
                  <img
                    src={form.imageUrl}
                    alt="preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: form.imagePosition }}
                  />
                  <div className="ap-img-pos-grid">
                    {['left top','center top','right top','left center','center center','right center','left bottom','center bottom','right bottom'].map(pos => (
                      <button
                        key={pos}
                        type="button"
                        title={pos}
                        className={`ap-pos-dot ${form.imagePosition === pos ? 'ap-pos-dot--active' : ''}`}
                        onClick={() => setForm(p => ({ ...p, imagePosition: pos }))}
                      />
                    ))}
                  </div>
                </div>
                <p className="ap-img-pos-hint">Hacé clic en los puntos para ajustar el encuadre</p>
              </div>
            )}
          </div>

          <div className="ap-form--actions">
            <button className="ap-btn ap-btn--primary">{editing ? 'Guardar cambios' : 'Agregar show'}</button>
            {editing && <button type="button" className="ap-btn ap-btn--ghost" onClick={resetForm}>Cancelar</button>}
          </div>
        </form>
      </div>

      <div className="ap-block">
        <h3 className="ap-block__title">Shows ({shows.length})</h3>
        {shows.length === 0 && <p className="ap-empty">No hay shows cargados.</p>}
        <div className="ap-shows-grid">
          {shows.map(s => (
            <div key={s.id} className={`ap-show-card ap-show-card--${s.type}`}>
              {s.imageUrl && <img src={s.imageUrl} alt={s.name} className="ap-show-card__img" />}
              <div className="ap-show-card__body">
                <span className={`ap-show-card__badge ${s.type === 'upcoming' ? 'ap-show-card__badge--up' : ''}`}>
                  {s.type === 'upcoming' ? 'Próximo' : 'Pasado'}
                </span>
                <h4 className="ap-show-card__name">{s.name}</h4>
                {s.dateLabel && <p className="ap-show-card__date">{s.dateLabel}</p>}
              </div>
              <div className="ap-show-card__actions">
                <button className="ap-btn ap-btn--secondary ap-btn--sm" onClick={() => startEdit(s)}>Editar</button>
                <button className="ap-btn ap-btn--danger ap-btn--sm" onClick={() => handleDelete(s.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Content Management ───────────────────────────────────────────────────────
function ContentAdmin({ token, toast }) {
  const SECTIONS = {
    hero:     { label: 'Hero', fields: [
      { key: 'tagline',  label: 'Tagline principal', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo',          type: 'text' },
    ]},
    sala:     { label: 'La Sala', fields: [
      { key: 'intro',  label: 'Texto de introducción', type: 'textarea' },
      { key: 'title',  label: 'Título',                 type: 'text' },
    ]},
    ayb:      { label: 'A&B', fields: [
      { key: 'intro',  label: 'Descripción', type: 'textarea' },
    ]},
    shows:    { label: 'Shows', fields: [
      { key: 'intro',  label: 'Descripción', type: 'textarea' },
    ]},
    torneos:  { label: 'Torneos', fields: [
      { key: 'fecha_torneo',  label: 'Fecha del próximo torneo',   type: 'datetime' },
      { key: 'banner_activo', label: 'Mostrar banner en la web',   type: 'toggle'   },
      { key: 'premio',        label: 'Premio destacado',           type: 'text'     },
      { key: 'link_torneo',   label: 'Link de inscripción',        type: 'text'     },
      { key: 'intro',         label: 'Descripción',                type: 'textarea' },
    ]},
    prode:    { label: 'Prode Mundial', fields: [
      { key: 'desc',   label: 'Descripción', type: 'textarea' },
    ]},
    ubicacion: { label: 'Ubicación', fields: [
      { key: 'telefono', label: 'Teléfono',   type: 'text' },
      { key: 'horario',  label: 'Horario extra', type: 'text' },
    ]},
  }

  const [selected, setSelected] = useState('hero')
  const [content, setContent]   = useState({})
  const [saving, setSaving]     = useState({})

  useEffect(() => {
    getContent().then(setContent).catch(() => {})
  }, [])

  async function handleSaveField(section, key, value) {
    setSaving(p => ({ ...p, [`${section}.${key}`]: true }))
    try {
      await adminUpdateContent(token, section, key, value)
      setContent(p => ({
        ...p,
        [section]: { ...(p[section] || {}), [key]: value },
      }))
      toast.show('Guardado')
    } catch (err) {
      toast.show(err.message, 'err')
    }
    setSaving(p => ({ ...p, [`${section}.${key}`]: false }))
  }

  const sec = SECTIONS[selected]

  return (
    <div className="ap-section">
      <div className="ap-section__sidebar">
        {Object.entries(SECTIONS).map(([k, v]) => (
          <button
            key={k}
            className={`ap-sec-btn ${selected === k ? 'ap-sec-btn--active' : ''}`}
            onClick={() => setSelected(k)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="ap-section__main">
        <div className="ap-block">
          <h3 className="ap-block__title">Sección: {sec.label}</h3>
          {sec.fields.map(f => (
            <ContentField
              key={f.key}
              field={f}
              value={content[selected]?.[f.key] || ''}
              saving={saving[`${selected}.${f.key}`]}
              onSave={v => handleSaveField(selected, f.key, v)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Convierte "26 de Marzo · 21:30 hs" → "2026-03-26T21:30" para el input
function labelToDatetime(label) {
  if (!label) return ''
  // si ya viene en formato datetime-local, devolverlo tal cual
  if (/^\d{4}-\d{2}-\d{2}T/.test(label)) return label
  // Parseo del label "26 de Marzo · 21:30 hs"
  const meses = { enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',octubre:'10',noviembre:'11',diciembre:'12' }
  const m = label.match(/^(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s*·\s*(\d{1,2}):(\d{2})/)
  if (!m) return ''
  const [, dia, mesNombre, hh, mm] = m
  const mes = meses[mesNombre.toLowerCase()]
  if (!mes) return ''
  const year = new Date().getFullYear()
  return `${year}-${mes}-${String(dia).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${mm}`
}
// Convierte "2026-03-26T21:30" → "26 de Marzo · 21:30 hs"
function datetimeToLabel(dt) {
  if (!dt) return ''
  const d = new Date(dt + ':00')
  if (isNaN(d)) return dt
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const dia = d.getDate()
  const mes = meses[d.getMonth()]
  const hh  = String(d.getHours()).padStart(2,'0')
  const mm  = String(d.getMinutes()).padStart(2,'0')
  return `${dia} de ${mes} · ${hh}:${mm} hs`
}

// Componente dedicado para fechas: state interno en formato datetime-local
// (yyyy-MM-ddTHH:mm) y label generado solo al guardar.
function DatetimeField({ field, value, saving, onSave }) {
  const [dt, setDt] = useState(() => labelToDatetime(value))
  // Si el valor cargado desde DB cambia (al volver a la pestaña), re-sincronizamos
  useEffect(() => { setDt(labelToDatetime(value)) }, [value])

  const previewLabel = datetimeToLabel(dt)
  return (
    <div className="ap-content-field">
      <label className="ap-label">{field.label}</label>
      <input
        className="ap-input"
        type="datetime-local"
        value={dt}
        onChange={e => setDt(e.target.value)}
      />
      {previewLabel && <p className="ap-field-preview">Se mostrará como: <strong>{previewLabel}</strong></p>}
      <button
        className="ap-btn ap-btn--primary ap-btn--sm"
        onClick={() => onSave(previewLabel || dt)}
        disabled={saving || !dt}
      >
        {saving ? 'Guardando...' : '✓ Guardar fecha'}
      </button>
    </div>
  )
}

function ContentField({ field, value, saving, onSave }) {
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])

  // Tipo datetime — date picker + preview del texto generado
  if (field.type === 'datetime') {
    return <DatetimeField field={field} value={value} saving={saving} onSave={onSave} />
  }

  // Tipo toggle — switch on/off
  if (field.type === 'toggle') {
    const active = val === 'true'
    return (
      <div className="ap-content-field ap-content-field--toggle">
        <label className="ap-label">{field.label}</label>
        <button
          className={`ap-toggle ${active ? 'ap-toggle--on' : ''}`}
          onClick={() => { const next = (!active).toString(); setVal(next); onSave(next) }}
          disabled={saving}
        >
          <span className="ap-toggle__knob" />
          <span className="ap-toggle__label">{active ? 'Visible' : 'Oculto'}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="ap-content-field">
      <label className="ap-label">{field.label}</label>
      {field.type === 'textarea' ? (
        <textarea className="ap-input ap-textarea" value={val} onChange={e => setVal(e.target.value)} rows={4} />
      ) : (
        <input className="ap-input" value={val} onChange={e => setVal(e.target.value)} />
      )}
      <button className="ap-btn ap-btn--secondary ap-btn--sm" onClick={() => onSave(val)} disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  )
}

// ─── Admins Management ────────────────────────────────────────────────────────
function AdminsAdmin({ token, currentAdmin, toast }) {
  const [admins, setAdmins]   = useState([])
  const [form, setForm]       = useState({ email: '', password: '', name: '', role: 'admin' })

  useEffect(() => {
    adminGetAdmins(token).then(setAdmins).catch(() => {})
  }, [token])

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await adminCreateAdmin(token, form)
      toast.show(`Admin ${form.email} creado`)
      setForm({ email: '', password: '', name: '', role: 'admin' })
      adminGetAdmins(token).then(setAdmins)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleDelete(id, email) {
    if (!confirm(`¿Eliminar admin ${email}?`)) return
    try {
      await adminDeleteAdmin(token, id)
      toast.show('Admin eliminado')
      adminGetAdmins(token).then(setAdmins)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  return (
    <div className="ap-section">
      <div className="ap-block">
        <h3 className="ap-block__title">Crear nuevo administrador</h3>
        <form className="ap-form ap-form--col" onSubmit={handleCreate}>
          <div className="ap-form--grid2">
            <div>
              <label className="ap-label">Email *</label>
              <input
                className="ap-input"
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="ap-label">Nombre</label>
              <input
                className="ap-input"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="ap-label">Contraseña *</label>
              <input
                className="ap-input"
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="ap-label">Rol</label>
              <select
                className="ap-input"
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
          </div>
          <button className="ap-btn ap-btn--primary">Crear administrador</button>
        </form>
      </div>

      <div className="ap-block">
        <h3 className="ap-block__title">Administradores actuales</h3>
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Creado</th><th></th></tr>
            </thead>
            <tbody>
              {admins.map(a => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.email}</td>
                  <td>
                    <span className={`ap-role ap-role--${a.role}`}>{a.role}</span>
                  </td>
                  <td>{new Date(a.createdAt).toLocaleDateString('es-AR')}</td>
                  <td>
                    {a.id !== currentAdmin?.id && (
                      <button
                        className="ap-btn ap-btn--danger ap-btn--sm"
                        onClick={() => handleDelete(a.id, a.email)}
                      >Eliminar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── PrizesAdmin — sistema de canje de premios ────────────────────────────────
const PHASE_LABELS = {
  group:   'Fase de Grupos',
  round32: '16avos de Final',
  total:   'Acumulado Total (Gran Premio)',
}
function fmtMoney(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR')
}

function PrizesAdmin({ token, toast }) {
  const [prizes, setPrizes]   = useState([])
  const [summary, setSummary] = useState({ committed: 0, total: 0, pending: 0, redeemed: 0, prize_count: 0, pending_count: 0, redeemed_count: 0 })
  const [filter, setFilter]   = useState('all') // 'all' | 'pending' | 'redeemed'
  const [search, setSearch]   = useState('')
  const [redeemingId, setRedeemingId] = useState(null)
  const [redeemForm, setRedeemForm]   = useState({ ticketCode: '', notes: '' })
  const [loading, setLoading] = useState(true)

  function reload() {
    setLoading(true)
    Promise.all([
      adminGetPrizes(token, filter === 'all' ? {} : { status: filter }),
      adminGetPrizesSummary(token),
    ]).then(([list, sum]) => {
      setPrizes(list)
      setSummary(sum)
    }).catch(err => toast.show(err.message, 'err'))
      .finally(() => setLoading(false))
  }
  useEffect(reload, [token, filter])

  async function handleGenerate(phase) {
    if (!confirm(`Generar premios para "${PHASE_LABELS[phase]}"? Se tomarán los top 3 del leaderboard público actual.`)) return
    try {
      const r = await adminGeneratePrizes(token, phase)
      toast.show(r.created > 0 ? `Generados ${r.created} premios` : 'No se generaron premios nuevos (ya existían o no hay top 3 con partidos jugados)')
      reload()
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleRedeem(e) {
    e.preventDefault()
    try {
      await adminRedeemPrize(token, redeemingId, redeemForm.ticketCode || null, redeemForm.notes || null)
      toast.show('Premio marcado como entregado')
      setRedeemingId(null)
      setRedeemForm({ ticketCode: '', notes: '' })
      reload()
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleRevoke(id) {
    if (!confirm('¿Anular este canje? El premio volverá a estado "Pendiente".')) return
    try {
      await adminRevokePrize(token, id)
      toast.show('Canje anulado')
      reload()
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  const filtered = prizes.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (p.playerName || '').toLowerCase().includes(q) ||
           String(p.playerDniLast3 || '').includes(q) ||
           String(p.amount || '').includes(q)
  })

  return (
    <div className="ap-block">
      {/* Stats */}
      <div className="ap-prize-stats">
        <div className="ap-stat ap-stat--committed">
          <div className="ap-stat__label">💰 Comprometido</div>
          <div className="ap-stat__value">{fmtMoney(summary.committed || 525000)}</div>
          <div className="ap-stat__sub">Total a otorgar según bases</div>
        </div>
        <div className="ap-stat ap-stat--pending">
          <div className="ap-stat__label">⏳ Pendiente de canje</div>
          <div className="ap-stat__value">{fmtMoney(summary.pending)}</div>
          <div className="ap-stat__sub">{summary.pending_count} premios</div>
        </div>
        <div className="ap-stat ap-stat--redeemed">
          <div className="ap-stat__label">✅ Entregado</div>
          <div className="ap-stat__value">{fmtMoney(summary.redeemed)}</div>
          <div className="ap-stat__sub">{summary.redeemed_count} canjes</div>
        </div>
      </div>

      {/* Generación de premios por fase */}
      <div className="ap-block__title-row">
        <h3 className="ap-block__title" style={{ margin: 0 }}>Generar premios por fase</h3>
      </div>
      <p className="ap-block__desc">Cuando termine una fase, generá los 3 premios automáticamente desde el leaderboard público. Idempotente: si ya existen, no los duplica.</p>
      <div className="ap-prize-generators">
        {Object.entries(PHASE_LABELS).map(([phase, label]) => (
          <button
            key={phase}
            className="ap-btn ap-btn--primary"
            onClick={() => handleGenerate(phase)}
          >🏅 Generar — {label}</button>
        ))}
      </div>

      {/* Filtros */}
      <div className="ap-block__title-row" style={{ marginTop: 28 }}>
        <h3 className="ap-block__title" style={{ margin: 0 }}>Premios registrados ({filtered.length})</h3>
        <div className="ap-prize-filters">
          {[
            { id: 'all',      label: `Todos (${summary.prize_count})` },
            { id: 'pending',  label: `Pendientes (${summary.pending_count})` },
            { id: 'redeemed', label: `Entregados (${summary.redeemed_count})` },
          ].map(f => (
            <button
              key={f.id}
              className={`ap-chip ${filter === f.id ? 'ap-chip--active' : ''}`}
              onClick={() => setFilter(f.id)}
            >{f.label}</button>
          ))}
        </div>
      </div>

      <input
        className="ap-input"
        type="search"
        placeholder="🔍 Buscar por nombre, últimos 3 del DNI o monto..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 14 }}
      />

      {loading ? (
        <p style={{ color: 'var(--ap-muted)' }}>Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="ap-empty">
          <div className="ap-empty__icon">🎫</div>
          <p>No hay premios {filter !== 'all' ? `con estado "${filter}"` : 'todavía'}.</p>
          <p style={{ fontSize: 13, color: 'var(--ap-muted)' }}>Generá los premios al cerrar una fase con los botones de arriba.</p>
        </div>
      ) : (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Fase</th>
                <th>Pos.</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Detalles</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={p.status === 'redeemed' ? 'ap-prize-row--done' : ''}>
                  <td>
                    <strong>{p.playerName}</strong>
                    <div style={{ fontSize: 11, color: 'var(--ap-muted)' }}>***{p.playerDniLast3}</div>
                  </td>
                  <td>{PHASE_LABELS[p.phase] || p.phase}</td>
                  <td>{p.position}°</td>
                  <td><strong>{fmtMoney(p.amount)}</strong></td>
                  <td>
                    {p.status === 'redeemed'
                      ? <span className="ap-pill ap-pill--ok">✓ Entregado</span>
                      : <span className="ap-pill ap-pill--warn">⏳ Pendiente</span>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--ap-muted)' }}>
                    {p.status === 'redeemed' && (
                      <>
                        {p.ticketCode && <div>🎫 {p.ticketCode}</div>}
                        {p.redeemedAt && <div>📅 {new Date(p.redeemedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' })}</div>}
                        {p.notes && <div>📝 {p.notes}</div>}
                      </>
                    )}
                  </td>
                  <td>
                    {p.status === 'pending' ? (
                      <button
                        className="ap-btn ap-btn--primary ap-btn--sm"
                        onClick={() => { setRedeemingId(p.id); setRedeemForm({ ticketCode: '', notes: '' }) }}
                      >Marcar entregado</button>
                    ) : (
                      <button
                        className="ap-btn ap-btn--danger ap-btn--sm"
                        onClick={() => handleRevoke(p.id)}
                      >Anular canje</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de entrega */}
      {redeemingId && (
        <div className="ap-edit-modal" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: 480, width: '90%', zIndex: 100 }}>
          <h4 className="ap-edit-modal__title">🎫 Marcar premio como entregado</h4>
          <p style={{ color: 'var(--ap-muted)', fontSize: 13, marginTop: 0 }}>Quedará registrado quién lo entregó y cuándo. Podés anular el canje después si fue por error.</p>
          <form onSubmit={handleRedeem}>
            <label className="ap-label">Código del ticket Free Play (opcional)</label>
            <input
              className="ap-input"
              value={redeemForm.ticketCode}
              onChange={e => setRedeemForm(f => ({ ...f, ticketCode: e.target.value }))}
              placeholder="Ej: FP-25-000123"
              autoFocus
            />
            <label className="ap-label" style={{ marginTop: 12 }}>Notas (opcional)</label>
            <textarea
              className="ap-input"
              value={redeemForm.notes}
              onChange={e => setRedeemForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Ej: Entregado en mostrador a las 14:30, firmó recibo."
              rows={3}
            />
            <div className="ap-edit-modal__btns" style={{ marginTop: 14 }}>
              <button type="submit" className="ap-btn ap-btn--primary">✓ Confirmar entrega</button>
              <button type="button" className="ap-btn ap-btn--ghost" onClick={() => setRedeemingId(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard (home) ─────────────────────────────────────────────────────────
function Dashboard({ token, admin, onNavigate }) {
  const [stats, setStats] = useState(null)
  const [ga, setGA]       = useState(null)
  const [gaRange, setGaRange] = useState('7d')
  const [gaLoading, setGaLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [snapLabel, setSnapLabel]   = useState('')
  const [snapSaving, setSnapSaving] = useState(false)
  const [snapshots, setSnapshots]   = useState([])
  const [snapLoaded, setSnapLoaded] = useState(false)
  const [cmpA, setCmpA]             = useState('')
  const [cmpB, setCmpB]             = useState('')
  const [cmpResult, setCmpResult]   = useState(null)
  const [cmpLoading, setCmpLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([
      adminDashboardStats(token).catch(() => null),
      adminAnalyticsSnapshot(token, { range: gaRange }).catch(() => null),
    ]).then(([s, g]) => {
      if (!mounted) return
      setStats(s); setGA(g)
    }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Devuelve texto tipo "8 may–14 may · vs 1 may–7 may" para un rango dado.
  function rangeDatesLabel(range) {
    const today = new Date()
    const fmt = d => d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
    function shift(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d }
    if (range === 'today') {
      return `${fmt(today)} · vs ${fmt(shift(today, -1))}`
    }
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7
    const start = shift(today, -(days - 1))
    const prevEnd = shift(start, -1)
    const prevStart = shift(prevEnd, -(days - 1))
    return `${fmt(start)}–${fmt(today)} · vs ${fmt(prevStart)}–${fmt(prevEnd)}`
  }

  // Re-fetch GA cuando cambia el rango (después del mount inicial)
  async function reloadGA(newRange) {
    setGaRange(newRange)
    setGaLoading(true)
    try {
      const g = await adminAnalyticsSnapshot(token, { range: newRange })
      setGA(g)
    } catch {}
    setGaLoading(false)
  }

  async function loadSnapshots() {
    try {
      const r = await adminListAnalyticsSnapshots(token)
      setSnapshots(r.snapshots || [])
      setSnapLoaded(true)
    } catch {}
  }

  async function saveSnap() {
    if (!snapLabel.trim()) return
    setSnapSaving(true)
    try {
      const saved = await adminSaveAnalyticsSnapshot(token, snapLabel.trim())
      setSnapLabel('')
      // Agregar al tope de la lista local — sin re-fetch al servidor para no
      // colgar el botón si Render se duerme entre calls.
      if (saved?.id) {
        setSnapshots(prev => [{ id: String(saved.id), label: saved.label, takenAt: saved.takenAt }, ...prev])
        setSnapLoaded(true)
      }
      toast.show('✓ Snapshot guardado')
    } catch (err) { toast.show(err.message, 'err') }
    setSnapSaving(false)
  }

  async function deleteSnap(id, label) {
    if (!confirm(`¿Borrar snapshot "${label}"?`)) return
    try {
      await adminDeleteAnalyticsSnapshot(token, id)
      await loadSnapshots()
      toast.show('✓ Borrado')
    } catch (err) { toast.show(err.message, 'err') }
  }

  async function compare() {
    if (!cmpA || !cmpB || cmpA === cmpB) return toast.show('Elegí 2 snapshots distintos', 'err')
    setCmpLoading(true); setCmpResult(null)
    try {
      const r = await adminCompareAnalyticsSnapshots(token, cmpA, cmpB)
      setCmpResult(r)
    } catch (err) { toast.show(err.message, 'err') }
    setCmpLoading(false)
  }

  const greet = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 19) return 'Buenas tardes'
    return 'Buenas noches'
  })()
  const firstName = (admin?.email || 'admin').split('@')[0].split('.')[0]
  const niceName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  function trend(now, prev) {
    if (prev === 0 && now === 0) return { kind: 'flat', label: '—' }
    if (prev === 0) return { kind: 'up', label: `+${now}` }
    const diff = now - prev
    if (diff === 0) return { kind: 'flat', label: '=' }
    return { kind: diff > 0 ? 'up' : 'down', label: (diff > 0 ? '+' : '') + diff }
  }

  return (
    <div className="ap-dash">
      <div className="ap-dash__hero">
        <div className="ap-dash__greeting">{greet}, {niceName}</div>
        <h1 className="ap-dash__title">Panel de Sala Crespo</h1>
        <p className="ap-dash__subtitle">{loading ? 'Cargando datos…' : 'Esto es lo que está pasando hoy.'}</p>
      </div>

      {/* KPIs */}
      <div className="ap-kpi-grid">
        {/* Inscriptos Prode hoy */}
        <div className="ap-kpi" onClick={() => onNavigate('prode')}>
          <div className="ap-kpi__icon">⚽</div>
          <div className="ap-kpi__label">Prode · inscriptos hoy</div>
          <div>
            <span className="ap-kpi__value">{stats?.prode?.registeredToday ?? '—'}</span>
            {stats && (() => {
              const t = trend(stats.prode.registeredToday, stats.prode.registeredYesterday)
              return <span className={`ap-kpi__trend ap-kpi__trend--${t.kind}`}>{t.label}</span>
            })()}
          </div>
          <p className="ap-kpi__sub">{stats?.prode?.total ?? 0} totales · {stats?.prode?.active ?? 0} con predicciones</p>
        </div>

        {/* Torneo activo */}
        <div className="ap-kpi" onClick={() => onNavigate('torneos')}>
          <div className="ap-kpi__icon">🎰</div>
          <div className="ap-kpi__label">{stats?.tournament ? 'Torneo · faltan' : 'Torneo'}</div>
          <div>
            {stats?.tournament ? (
              <>
                <span className="ap-kpi__value">{stats.tournament.daysRemaining}</span>
                <span className="ap-kpi__trend ap-kpi__trend--flat">días</span>
              </>
            ) : (
              <span className="ap-kpi__value ap-kpi__value--small">Sin torneo activo</span>
            )}
          </div>
          <p className="ap-kpi__sub">
            {stats?.tournament
              ? `${stats.tournament.registered} inscriptos · ${stats.tournament.registeredToday} hoy`
              : 'Crear un torneo desde la pestaña Torneo Slots'}
          </p>
        </div>

        {/* Players activos del Prode */}
        <div className="ap-kpi" onClick={() => onNavigate('prode')}>
          <div className="ap-kpi__icon">🎯</div>
          <div className="ap-kpi__label">Predicciones cargadas</div>
          <div>
            <span className="ap-kpi__value">{stats?.prode?.active ?? '—'}</span>
            {stats && stats.prode.total > 0 && (
              <span className="ap-kpi__trend ap-kpi__trend--flat">
                {Math.round((stats.prode.active / stats.prode.total) * 100)}%
              </span>
            )}
          </div>
          <p className="ap-kpi__sub">jugadores que ya predijeron al menos 1 partido</p>
        </div>

        {/* Optouts marketing */}
        <div className="ap-kpi" onClick={() => admin?.role === 'superadmin' && onNavigate('email')}>
          <div className="ap-kpi__icon">📧</div>
          <div className="ap-kpi__label">Bajas marketing</div>
          <div>
            <span className="ap-kpi__value ap-kpi__value--small">{stats?.marketing?.optouts ?? '—'}</span>
          </div>
          <p className="ap-kpi__sub">contactos que se dieron de baja del email</p>
        </div>
      </div>

      {/* Google Analytics */}
      {ga && ga.ok && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:12}}>
            <div className="ap-block__subtitle" style={{margin:0}}>
              📈 Tráfico web (Google Analytics)
              <span style={{display:'block',color:'#8B9BB4',fontWeight:400,fontSize:12,marginTop:4}}>
                {rangeDatesLabel(gaRange)}
              </span>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              {gaLoading && <span style={{fontSize:11,color:'#8B9BB4'}}>actualizando…</span>}
              {[
                ['today','Hoy'],
                ['7d','7d'],
                ['30d','30d'],
                ['90d','90d'],
              ].map(([val,lbl]) => (
                <button
                  key={val}
                  onClick={() => reloadGA(val)}
                  disabled={gaLoading}
                  style={{
                    padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',
                    border:`1px solid ${gaRange === val ? '#C9A84C' : '#2a3142'}`,
                    background: gaRange === val ? 'rgba(201,168,76,.18)' : 'transparent',
                    color: gaRange === val ? '#F0D275' : '#C8D2E0',
                  }}
                >{lbl}</button>
              ))}
            </div>
          </div>

          {/* Cards de métricas principales con delta vs período anterior */}
          <div className="ap-kpi-grid">
            {[
              {
                icon: '👥', label: 'Usuarios activos', key: 'activeUsers',
                sub: 'personas distintas que entraron al sitio',
                tip: 'Cantidad de personas únicas que visitaron el sitio en el período. Si la misma persona entra 5 veces, cuenta 1 sola. Es la métrica más "limpia" para medir tamaño de audiencia.',
              },
              {
                icon: '🆕', label: 'Usuarios nuevos', key: 'newUsers',
                sub: 'su primera visita al sitio',
                tip: 'De los usuarios activos, cuántos vinieron por primera vez en su vida al sitio. Si una persona ya visitó hace 6 meses y vuelve hoy, NO se cuenta acá. Es el indicador clave de captación: cuánta gente nueva está llegando.',
              },
              {
                icon: '🔄', label: 'Sesiones', key: 'sessions',
                sub: 'visitas en total al sitio',
                tip: 'Una sesión = una visita al sitio. Si una persona entra a la mañana, cierra el navegador y vuelve a la tarde, son 2 sesiones. Generalmente sesiones > usuarios porque la gente vuelve. Sirve para medir cuánto "engancha" el sitio.',
              },
              {
                icon: '📄', label: 'Vistas de página', key: 'screenPageViews',
                sub: 'clicks de navegación entre pantallas',
                tip: 'Cada vez que alguien abre o cambia de página/sección, cuenta +1. Por ejemplo, abrir el home, después ir al Prode, después al fixture = 3 vistas. Métrica buena para ver qué tan a fondo navegan los visitantes.',
              },
            ].map(({ icon, label, key, sub, tip }) => {
              const m = ga.metrics?.[key]
              const cmp = ga.comparison?.[key]
              return (
                <div key={key} className="ap-kpi" title={tip}>
                  <div className="ap-kpi__icon">{icon}</div>
                  <div className="ap-kpi__label" style={{display:'flex',alignItems:'center',gap:6}}>
                    {label}
                    <span style={{display:'inline-flex',width:14,height:14,borderRadius:999,background:'rgba(201,168,76,.18)',color:'#C9A84C',fontSize:9,alignItems:'center',justifyContent:'center',fontWeight:700,cursor:'help'}}>ⓘ</span>
                  </div>
                  <div>
                    <span className="ap-kpi__value">{m ?? '—'}</span>
                    {cmp && cmp.previous > 0 && (
                      <span style={{marginLeft:8,fontSize:13,fontWeight:700,color: cmp.abs >= 0 ? '#22c55e' : '#ef4444'}}>
                        {cmp.abs >= 0 ? '+' : ''}{cmp.pct}%
                      </span>
                    )}
                  </div>
                  <p className="ap-kpi__sub">{sub}{cmp && cmp.previous > 0 ? ` · antes ${cmp.previous}` : ''}</p>
                </div>
              )
            })}
          </div>

          {/* Cards de calidad de tráfico */}
          <div className="ap-kpi-grid" style={{marginTop:14}}>
            <div className="ap-kpi" title="Porcentaje de sesiones donde la persona hizo algo significativo: estuvo más de 10 segundos, vio más de una pantalla, o disparó un evento (click en botón, scroll profundo, etc). Lo opuesto al rebote. Alto = bueno: el contenido enganchó.">
              <div className="ap-kpi__icon">💚</div>
              <div className="ap-kpi__label" style={{display:'flex',alignItems:'center',gap:6}}>
                Engagement
                <span style={{display:'inline-flex',width:14,height:14,borderRadius:999,background:'rgba(201,168,76,.18)',color:'#C9A84C',fontSize:9,alignItems:'center',justifyContent:'center',fontWeight:700,cursor:'help'}}>ⓘ</span>
              </div>
              <div>
                <span className="ap-kpi__value">{ga.metrics?.engagementRate?.toFixed(1) ?? '—'}<span style={{fontSize:18,opacity:.6}}>%</span></span>
                {ga.comparison?.engagementRate && (
                  <span style={{marginLeft:8,fontSize:13,fontWeight:700,color: ga.comparison.engagementRate.abs >= 0 ? '#22c55e' : '#ef4444'}}>
                    {ga.comparison.engagementRate.abs >= 0 ? '+' : ''}{ga.comparison.engagementRate.abs.toFixed(1)}pp
                  </span>
                )}
              </div>
              <p className="ap-kpi__sub">de las visitas hubo interés genuino · subir es bueno</p>
            </div>
            <div className="ap-kpi" title="Porcentaje de sesiones donde la persona entró y se fue sin hacer nada (no llegó a 10 seg, no scrolleó, no clickeó). Bajo = bueno: la gente se queda y explora. Si tu campaña Meta tiene rebote alto, significa que el público no es el indicado o la página de aterrizaje no engancha.">
              <div className="ap-kpi__icon">🏃</div>
              <div className="ap-kpi__label" style={{display:'flex',alignItems:'center',gap:6}}>
                Rebote
                <span style={{display:'inline-flex',width:14,height:14,borderRadius:999,background:'rgba(201,168,76,.18)',color:'#C9A84C',fontSize:9,alignItems:'center',justifyContent:'center',fontWeight:700,cursor:'help'}}>ⓘ</span>
              </div>
              <div>
                <span className="ap-kpi__value">{ga.metrics?.bounceRate?.toFixed(1) ?? '—'}<span style={{fontSize:18,opacity:.6}}>%</span></span>
                {ga.comparison?.bounceRate && (
                  <span style={{marginLeft:8,fontSize:13,fontWeight:700,color: ga.comparison.bounceRate.abs <= 0 ? '#22c55e' : '#ef4444'}}>
                    {ga.comparison.bounceRate.abs >= 0 ? '+' : ''}{ga.comparison.bounceRate.abs.toFixed(1)}pp
                  </span>
                )}
              </div>
              <p className="ap-kpi__sub">se fue sin enganchar · bajar es bueno</p>
            </div>
            <div className="ap-kpi" title="Tiempo promedio que una persona pasa en el sitio durante UNA visita. Si alguien entra y se va en 5 segundos, baja el promedio. Si alguien navega 10 minutos, lo sube. Sirve para medir profundidad de interés. Para un Prode, valores arriba de 1:30 son muy buenos.">
              <div className="ap-kpi__icon">⏱</div>
              <div className="ap-kpi__label" style={{display:'flex',alignItems:'center',gap:6}}>
                Duración media
                <span style={{display:'inline-flex',width:14,height:14,borderRadius:999,background:'rgba(201,168,76,.18)',color:'#C9A84C',fontSize:9,alignItems:'center',justifyContent:'center',fontWeight:700,cursor:'help'}}>ⓘ</span>
              </div>
              <div>
                <span className="ap-kpi__value">{ga.metrics?.averageSessionDuration ? `${Math.floor(ga.metrics.averageSessionDuration / 60)}:${String(Math.round(ga.metrics.averageSessionDuration % 60)).padStart(2,'0')}` : '—'}</span>
              </div>
              <p className="ap-kpi__sub">tiempo promedio por visita · más es mejor</p>
            </div>
            <div className="ap-kpi" title="Cuántas pantallas distintas ve una persona en promedio en una sola visita. Si vale 1.0, la gente entra y se va sin navegar. Si vale 3+, la gente explora bien. Para el Prode, ideal arriba de 2: significa que después del home van al fixture, a la tabla, etc.">
              <div className="ap-kpi__icon">📑</div>
              <div className="ap-kpi__label" style={{display:'flex',alignItems:'center',gap:6}}>
                Vistas / sesión
                <span style={{display:'inline-flex',width:14,height:14,borderRadius:999,background:'rgba(201,168,76,.18)',color:'#C9A84C',fontSize:9,alignItems:'center',justifyContent:'center',fontWeight:700,cursor:'help'}}>ⓘ</span>
              </div>
              <div>
                <span className="ap-kpi__value">{ga.metrics?.screenPageViewsPerSession?.toFixed(2) ?? '—'}</span>
              </div>
              <p className="ap-kpi__sub">pantallas por visita · más es mejor</p>
            </div>
          </div>

          {/* Devices */}
          {ga.devices && Object.keys(ga.devices).length > 0 && (
            <div className="ap-block" style={{marginTop:14}}>
              <div className="ap-block__subtitle" style={{marginBottom:10}}>📱 Dispositivos</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {Object.entries(ga.devices).map(([dev, n]) => {
                  const total = Object.values(ga.devices).reduce((a,b) => a + b, 0)
                  const pct = total > 0 ? Math.round((n / total) * 100) : 0
                  const icon = dev === 'mobile' ? '📱' : dev === 'desktop' ? '💻' : dev === 'tablet' ? '📱' : '❓'
                  return (
                    <div key={dev} style={{flex:'1 1 140px',padding:'12px 14px',background:'rgba(0,0,0,.25)',border:'1px solid #2a3142',borderRadius:10}}>
                      <div style={{fontSize:11,color:'#8B9BB4',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>{icon} {dev}</div>
                      <div style={{fontSize:20,fontWeight:800,color:'#F0D275'}}>{n}</div>
                      <div style={{fontSize:12,color:'#C8D2E0',marginTop:2}}>{pct}% del tráfico</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top pages list */}
          {ga.topPages?.length > 0 && (
            <div className="ap-block" style={{marginTop:14}}>
              <div className="ap-block__subtitle">Top 5 páginas ({ga.label || 'período'})</div>
              <table className="ap-table" style={{marginTop:8}}>
                <thead><tr><th>Página</th><th style={{textAlign:'right'}}>Visitas</th></tr></thead>
                <tbody>
                  {ga.topPages.map(p => (
                    <tr key={p.path}>
                      <td><code style={{fontSize:13}}>{p.path}</code></td>
                      <td style={{textAlign:'right', fontWeight:700, color:'var(--ap-gold)'}}>{p.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top sources */}
          {ga.topSources?.length > 0 && (
            <div className="ap-block" style={{marginTop:14}}>
              <div className="ap-block__subtitle">Fuentes de tráfico ({ga.label || 'período'})</div>
              <table className="ap-table" style={{marginTop:8}}>
                <thead><tr><th>Origen</th><th style={{textAlign:'right'}}>Usuarios</th></tr></thead>
                <tbody>
                  {ga.topSources.map(s => {
                    const isMeta = /facebook|fb|meta|instagram|ig/i.test(s.source)
                    return (
                      <tr key={s.source} style={isMeta ? {background:'rgba(24,119,242,.10)'} : {}}>
                        <td>{isMeta && '🟦 '}{s.source}</td>
                        <td style={{textAlign:'right', fontWeight:700, color:'var(--ap-gold)'}}>{s.users}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {ga && !ga.ok && ga.unavailable && (
        <div style={{padding:'14px 18px', background:'rgba(255,210,80,.06)', border:'1px solid rgba(201,168,76,.3)', borderRadius:10, fontSize:13, color:'#C9A84C'}}>
          ⚠️ Google Analytics no disponible: <strong>{ga.reason}</strong>
        </div>
      )}

      {/* Analytics Snapshots — baseline de campañas */}
      <div style={{paddingTop:4}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div className="ap-block__subtitle" style={{margin:0}}>📸 Snapshots de Analytics — campañas</div>
          {!snapLoaded && (
            <button
              onClick={loadSnapshots}
              style={{padding:'8px 16px',borderRadius:8,border:'1px solid #C9A84C',background:'rgba(201,168,76,.15)',color:'#F0D275',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}
            >
              📂 Cargar historial
            </button>
          )}
        </div>
        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
          <input
            type="text"
            placeholder='Label, ej: "meta-campaign-start-2026-05-14"'
            value={snapLabel}
            onChange={e => setSnapLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveSnap()}
            style={{flex:1,minWidth:200,padding:'9px 13px',borderRadius:8,border:'1px solid #2a3142',background:'rgba(0,0,0,.3)',color:'#fff',fontSize:13,fontFamily:'inherit'}}
          />
          <button className="ap-btn ap-btn--primary" onClick={saveSnap} disabled={snapSaving || !snapLabel.trim()}>
            {snapSaving ? 'Guardando…' : '📸 Guardar snapshot'}
          </button>
        </div>

        {snapLoaded && snapshots.length === 0 && (
          <p style={{opacity:.6,fontSize:13}}>Sin snapshots guardados todavía.</p>
        )}

        {snapshots.length > 0 && (
          <>
            <div className="ap-table-wrap" style={{marginBottom:16}}>
              <table className="ap-table">
                <thead><tr><th>Label</th><th>Tomado</th><th></th></tr></thead>
                <tbody>
                  {snapshots.map(s => (
                    <tr key={s.id}>
                      <td style={{fontSize:13}}>{s.label}</td>
                      <td style={{fontSize:12,opacity:.7}}>{new Date(s.takenAt).toLocaleString('es-AR')}</td>
                      <td><button className="ap-btn ap-btn--small ap-btn--danger" onClick={() => deleteSnap(s.id, s.label)}>Borrar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{background:'rgba(0,0,0,.2)',border:'1px solid #2a3142',borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:13,fontWeight:600,color:'#C9A84C',marginBottom:10}}>📊 Comparar 2 snapshots</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                <select value={cmpA} onChange={e => setCmpA(e.target.value)} style={{flex:1,minWidth:160,padding:'8px 10px',borderRadius:8,border:'1px solid #2a3142',background:'rgba(0,0,0,.4)',color:'#fff',fontSize:13}}>
                  <option value="">— Baseline —</option>
                  {snapshots.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <span style={{color:'#8B9BB4',fontSize:13}}>vs</span>
                <select value={cmpB} onChange={e => setCmpB(e.target.value)} style={{flex:1,minWidth:160,padding:'8px 10px',borderRadius:8,border:'1px solid #2a3142',background:'rgba(0,0,0,.4)',color:'#fff',fontSize:13}}>
                  <option value="">— Final —</option>
                  {snapshots.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <button className="ap-btn" onClick={compare} disabled={cmpLoading || !cmpA || !cmpB}>{cmpLoading ? '…' : 'Comparar'}</button>
              </div>

              {cmpResult && (
                <div style={{marginTop:14}}>
                  {[
                    ['Usuarios hoy',  cmpResult.metrics.usersToday],
                    ['Usuarios 7d',   cmpResult.metrics.users7d],
                    ['Usuarios 30d',  cmpResult.metrics.users30d],
                    ['Sesiones 7d',   cmpResult.metrics.sessions7d],
                  ].filter(([,m]) => m).map(([label, m]) => (
                    <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)',fontSize:13}}>
                      <span style={{color:'#C8D2E0'}}>{label}</span>
                      <span>
                        <span style={{opacity:.6}}>{m.before ?? '–'} → {m.after ?? '–'}</span>
                        {' '}
                        <strong style={{color: m.abs >= 0 ? '#22c55e' : '#ef4444'}}>
                          {m.abs >= 0 ? '+' : ''}{m.abs} ({m.pct >= 0 ? '+' : ''}{m.pct}%)
                        </strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <div className="ap-block__subtitle" style={{margin:'0 0 12px'}}>Accesos rápidos</div>
        <div className="ap-quick-actions">
          <button className="ap-quick-btn" onClick={() => onNavigate('torneos')}>🎰 Ver inscriptos del torneo</button>
          <button className="ap-quick-btn" onClick={() => onNavigate('prode')}>⚽ Cargar resultado de partido</button>
          {admin?.role === 'superadmin' && (
            <button className="ap-quick-btn" onClick={() => onNavigate('email')}>📧 Mandar email blast</button>
          )}
          <button className="ap-quick-btn" onClick={() => onNavigate('contenido')}>📝 Editar contenido del sitio</button>
        </div>
      </div>
    </div>
  )
}

// ─── Email Blast Admin ────────────────────────────────────────────────────────
function PromoTicketsAdmin({ token, toast }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  // Form crear campaña
  const [name, setName] = useState('')
  const [valuePesos, setValuePesos] = useState('')
  const [validDays, setValidDays] = useState(30)
  const [ticketType, setTicketType] = useState('promo')
  const [creating, setCreating] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewing, setPreviewing] = useState(false)
  // Blast
  const [scope, setScope] = useState('all')
  const [testEmail, setTestEmail] = useState('urieleprieto@gmail.com')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null)       // { campaign, data } del dry-run
  const [lastResult, setLastResult] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const r = await adminPromoCampaigns(token)
      setCampaigns(r.campaigns || [])
    } catch (err) { toast.show(err.message, 'err') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    const value = Number(valuePesos)
    if (name.trim().length < 3) return toast.show('Nombre demasiado corto', 'err')
    if (!Number.isFinite(value) || value <= 0) return toast.show('Valor inválido', 'err')
    setCreating(true)
    try {
      await adminCreatePromoCampaign(token, { name: name.trim(), valuePesos: value, validDays: Number(validDays) || 30, ticketType })
      toast.show('Campaña creada', 'ok')
      setName(''); setValuePesos(''); setValidDays(30); setTicketType('promo')
      await load()
    } catch (err) { toast.show(err.message, 'err') }
    finally { setCreating(false) }
  }

  async function handlePreviewTemplate() {
    setPreviewing(true)
    try {
      const r = await adminPromoPreview(token, { valuePesos: Number(valuePesos) || 10000, ticketType })
      setPreviewHtml(r.html || '')
    } catch (err) { toast.show(err.message, 'err') }
    finally { setPreviewing(false) }
  }

  async function handleTest(camp) {
    if (!testEmail.includes('@')) return toast.show('Email de test inválido', 'err')
    setBusy(true)
    try {
      const r = await adminPromoCampaignBlast(token, camp.id, { testEmail })
      toast.show(r.sent ? `Test enviado a ${testEmail} (${r.code})` : `No se envió: ${r.detail}`, r.sent ? 'ok' : 'err')
    } catch (err) { toast.show(err.message, 'err') }
    finally { setBusy(false) }
  }

  async function handlePreview(camp) {
    setBusy(true); setPreview(null); setLastResult(null)
    try {
      const data = await adminPromoCampaignBlast(token, camp.id, { scope, dryRun: true })
      setPreview({ campaign: camp, data })
    } catch (err) { toast.show(err.message, 'err') }
    finally { setBusy(false) }
  }

  async function handleConfirmBlast() {
    if (!preview) return
    setBusy(true)
    try {
      const r = await adminPromoCampaignBlast(token, preview.campaign.id, { scope, dryRun: false })
      setLastResult(r); setPreview(null)
      toast.show(`Enviados: ${r.sent}. ${r.heldForTomorrow ? `Quedaron ${r.heldForTomorrow} para mañana.` : ''}`, 'ok')
      await load()
    } catch (err) { toast.show(err.message, 'err') }
    finally { setBusy(false) }
  }

  const fmtMoney = (n) => '$' + Number(n || 0).toLocaleString('es-AR')

  return (
    <div className="ap-section">
      <h2 className="ap-section__title">🎁 Campañas de Promo Tickets</h2>
      <p style={{ color: '#8B9BB4', fontSize: 14, margin: '0 0 20px', maxWidth: 720, lineHeight: 1.6 }}>
        Cada destinatario recibe un <strong>ticket único con QR</strong> que canjea en la sala con su DNI.
        Los internos quedan excluidos automáticamente. Respeta el límite diario de mails (Resend) —
        si una campaña supera el cupo del día, manda hasta el límite y el resto queda para mañana
        (re-disparás y solo procesa a los que faltan).
      </p>

      {/* Crear campaña */}
      <form onSubmit={handleCreate} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid #2a3142', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#F0D275' }}>Nueva campaña</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#C8D2E0' }}>
            Nombre
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Cortesía Junio 2026" disabled={creating}
              style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #2a3142', background: 'rgba(0,0,0,.3)', color: '#fff' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#C8D2E0' }}>
            Valor en pesos
            <input type="number" min="1" value={valuePesos} onChange={e => setValuePesos(e.target.value)} placeholder="10000" disabled={creating}
              style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #2a3142', background: 'rgba(0,0,0,.3)', color: '#fff' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#C8D2E0' }}>
            Vigencia (días)
            <input type="number" min="1" max="365" value={validDays} onChange={e => setValidDays(e.target.value)} disabled={creating}
              style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #2a3142', background: 'rgba(0,0,0,.3)', color: '#fff' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#C8D2E0' }}>
            Tipo
            <select value={ticketType} onChange={e => setTicketType(e.target.value)} disabled={creating}
              style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #2a3142', background: 'rgba(0,0,0,.3)', color: '#fff' }}>
              <option value="promo">Promo (tickets en pesos)</option>
              <option value="event">Evento (cortesía especial)</option>
            </select>
          </label>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="submit" disabled={creating}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#C41E3A', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            {creating ? 'Creando…' : 'Crear campaña'}
          </button>
          <button type="button" onClick={handlePreviewTemplate} disabled={previewing}
            style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #2a3142', background: 'transparent', color: '#C8D2E0', fontWeight: 600, cursor: 'pointer' }}>
            {previewing ? 'Generando…' : '👁 Vista previa del mail'}
          </button>
        </div>
      </form>

      {/* Preview del template del mail */}
      {previewHtml && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: '#F0D275' }}>Vista previa del mail (datos de ejemplo)</h3>
            <button onClick={() => setPreviewHtml('')}
              style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #2a3142', background: 'transparent', color: '#8B9BB4', cursor: 'pointer', fontSize: 12 }}>
              Cerrar
            </button>
          </div>
          <iframe
            title="Preview promo ticket"
            srcDoc={previewHtml}
            style={{ width: '100%', height: 720, border: '1px solid #2a3142', borderRadius: 10, background: '#fff' }}
          />
        </div>
      )}

      {/* Scope + test email (compartido para los blasts) */}
      <div style={{ background: 'rgba(0,0,0,.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 14, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#C8D2E0' }}>
            <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} disabled={busy} />
            Toda la base (con email, no internos)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#C8D2E0' }}>
            <input type="radio" checked={scope === 'tournament'} onChange={() => setScope('tournament')} disabled={busy} />
            Solo inscriptos al torneo activo
          </label>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8B9BB4', marginLeft: 'auto' }}>
          Test a:
          <input value={testEmail} onChange={e => setTestEmail(e.target.value)} disabled={busy}
            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #2a3142', background: 'rgba(0,0,0,.3)', color: '#fff', width: 200 }} />
        </label>
      </div>

      {/* Lista de campañas */}
      {loading ? <p style={{ color: '#8B9BB4' }}>Cargando…</p> : campaigns.length === 0 ? (
        <p style={{ color: '#8B9BB4' }}>No hay campañas todavía. Creá una arriba.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campaigns.map(c => (
            <div key={c.id} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid #2a3142', borderRadius: 10, padding: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                  {c.name} {c.ticket_type === 'event' && <span style={{ fontSize: 11, color: '#F0D275', marginLeft: 6 }}>· EVENTO</span>}
                </div>
                <div style={{ fontSize: 13, color: '#8B9BB4', marginTop: 4 }}>
                  {fmtMoney(c.value_pesos)} · vigencia {c.valid_days} días · creada {new Date(c.created_at).toLocaleDateString('es-AR')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleTest(c)} disabled={busy}
                  style={{ padding: '8px 14px', borderRadius: 7, border: '1px solid #2a3142', background: 'transparent', color: '#C8D2E0', cursor: 'pointer', fontSize: 13 }}>
                  Enviar test
                </button>
                <button onClick={() => handlePreview(c)} disabled={busy}
                  style={{ padding: '8px 14px', borderRadius: 7, border: 'none', background: '#C41E3A', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  Preparar blast
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview / confirmación del blast */}
      {preview && (
        <div style={{ marginTop: 20, background: 'rgba(196,30,58,.08)', border: '1px solid rgba(196,30,58,.4)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#F0D275' }}>Confirmar envío · {preview.campaign.name}</h3>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18, color: '#C8D2E0', fontSize: 14, lineHeight: 1.7 }}>
            <li>Destinatarios seleccionados: <strong>{preview.data.totalSelected}</strong></li>
            <li>Se envían <strong>hoy</strong>: <strong style={{ color: '#22c55e' }}>{preview.data.count}</strong></li>
            {preview.data.heldForTomorrow > 0 && (
              <li style={{ color: '#f59e0b' }}>Quedan para mañana (cupo diario): <strong>{preview.data.heldForTomorrow}</strong></li>
            )}
            <li style={{ color: '#8B9BB4', fontSize: 13 }}>
              Cupo blast hoy: {preview.data.quota?.available} disponibles de {preview.data.quota?.effective}
              (ya se enviaron {preview.data.quota?.sentToday})
            </li>
          </ul>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleConfirmBlast} disabled={busy || preview.data.count === 0}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#06240f', fontWeight: 800, cursor: 'pointer' }}>
              {busy ? 'Enviando…' : `Confirmar y enviar ${preview.data.count}`}
            </button>
            <button onClick={() => setPreview(null)} disabled={busy}
              style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #2a3142', background: 'transparent', color: '#C8D2E0', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Resultado del último blast */}
      {lastResult && (
        <div style={{ marginTop: 20, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.4)', borderRadius: 12, padding: 20, fontSize: 14, color: '#C8D2E0', lineHeight: 1.7 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, color: '#22c55e' }}>Blast completado · {lastResult.campaignName}</h3>
          ✅ Enviados: <strong>{lastResult.sent}</strong> ·
          ⏭️ Ya tenían ticket: <strong>{lastResult.alreadyHad || 0}</strong> ·
          ⚠️ Fallidos: <strong>{lastResult.failed}</strong>
          {lastResult.heldForTomorrow > 0 && (
            <div style={{ color: '#f59e0b', marginTop: 6 }}>
              Quedaron <strong>{lastResult.heldForTomorrow}</strong> para mañana — volvé a apretar "Preparar blast" mañana y solo procesa a los que faltan.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmailBlastAdmin({ token, toast }) {
  const [template, setTemplate] = useState('promo')
  const [scope, setScope]       = useState('all')
  const [testEmail, setTestEmail] = useState('urieleprieto@gmail.com')
  const [defaults, setDefaults] = useState(null)
  const [customSubject, setCustomSubject] = useState('')
  const [customIntro,   setCustomIntro]   = useState('')
  const [previewHtml, setPreviewHtml]     = useState('')
  const [previewing, setPreviewing]       = useState(false)
  const [busy, setBusy]         = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [confirmBlast, setConfirmBlast] = useState(false)
  const [excludeRecent, setExcludeRecent] = useState(false)
  const [excludeDays, setExcludeDays] = useState(7)
  // Segmentación específica del template "reminder-predictions": filtra por cantidad
  // de pronósticos cargados. 'all' = sin filtro. Default 30 = solo los que están flojos.
  const [maxPredictions, setMaxPredictions] = useState(30)
  const [unfilteredPredictions, setUnfilteredPredictions] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [campaigns, setCampaigns] = useState([])
  const [campaignDetail, setCampaignDetail] = useState(null)
  // Imagenes custom para template Shows (override de los shows de la base)
  const [customShows, setCustomShows] = useState([
    { imageUrl: '', name: '', dateLabel: '' },
    { imageUrl: '', name: '', dateLabel: '' },
  ])
  const [uploadingIdx, setUploadingIdx] = useState(null)

  async function uploadShowImage(file, idx) {
    if (!file) return
    setUploadingIdx(idx)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const r = await adminUploadImage(token, reader.result, 'sala-crespo/shows-blast')
          setCustomShows(prev => prev.map((s, i) => i === idx ? { ...s, imageUrl: r.url } : s))
          toast.show('Imagen subida', 'ok')
        } catch (err) { toast.show(err.message, 'err') }
        finally { setUploadingIdx(null) }
      }
      reader.readAsDataURL(file)
    } catch (err) { toast.show(err.message, 'err'); setUploadingIdx(null) }
  }
  function updateCustomShow(idx, field, value) {
    setCustomShows(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }
  function clearCustomShow(idx) {
    setCustomShows(prev => prev.map((s, i) => i === idx ? { imageUrl: '', name: '', dateLabel: '' } : s))
  }
  // Lista filtrada (solo las que tienen imagen) que se manda al backend
  const customShowsToSend = customShows.filter(s => s.imageUrl)

  const TEMPLATES = [
    { id: 'promo', title: '🎁 Promo doble (Prode + Torneo)', desc: 'Dos cards: invita al Prode y al torneo activo.', audience: 'Players con email · sin opt-out' },
    { id: 'prode', title: '⚽ Solo Prode', desc: 'Enfocado al Prode. Premios por fase, sin mencionar torneo.', audience: 'Players con email · sin opt-out' },
    { id: 'reminder', title: '⏰ Recordatorio T-1 día', desc: 'Mañana es tu torneo, llegá 30 min antes. Solo a inscriptos al torneo activo.', audience: 'Solo inscriptos al torneo activo (con email)' },
    { id: 'shows',    title: '🎤 Shows del mes', desc: 'Cards visuales con los próximos shows. Trae automáticamente los que están en upcoming.', audience: 'Players con email · sin opt-out' },
    { id: 'courtesy', title: '🎁 Cortesía (bebida 48h)', desc: 'Manda mail con voucher de bebida cortesía válido 48h. Cada destinatario recibe un código único. Excelente excusa para reactivar la base.', audience: 'Players con email · sin opt-out · que no tengan voucher reciente' },
    { id: 'reminder-predictions', title: '⚽ Recordatorio "Cargá tus pronósticos"', desc: 'Mail visual con countdown al Mundial, cómo cargar pronósticos paso a paso, mockup de la app y bombo a mini-ligas. Subject dinámico con días al kickoff. Footer aclara que los premios son tickets promocionales.', audience: 'Inscriptos al Prode con pocos pronósticos cargados (configurable abajo)' },
    { id: 'miniligas', title: '🏆 Mini-ligas privadas', desc: 'Invita a usar la feature de mini-ligas. Explica qué son, ideas de a quién invitar (familia, trabajo, fulbito, club) y los 3 pasos para crear una. Para fomentar el uso entre amigos / grupos.', audience: 'Players con email · sin opt-out' },
  ]
  const selected = TEMPLATES.find(t => t.id === template)

  // Cargar defaults al inicio
  useEffect(() => {
    adminEmailDefaults(token).then(r => setDefaults(r.defaults)).catch(() => {})
  }, [token])

  // Cuando cambia template (o se cargan defaults), precargar inputs con los defaults
  useEffect(() => {
    if (!defaults) return
    const d = defaults[template]
    if (d) { setCustomSubject(d.subject); setCustomIntro(d.intro) }
  }, [template, defaults])

  // Preview con debounce: cuando cambian subject/intro/template/customShows, regenerar HTML
  useEffect(() => {
    if (!customSubject && !customIntro) return
    const t = setTimeout(async () => {
      setPreviewing(true)
      try {
        const body = { template, customSubject, customIntro }
        if (template === 'shows' && customShowsToSend.length > 0) body.customShows = customShowsToSend
        const r = await adminEmailPreview(token, body)
        setPreviewHtml(r.html || '')
      } catch (err) {
        setPreviewHtml(`<p style="color:#c41e3a;padding:20px;">Error: ${err.message}</p>`)
      } finally { setPreviewing(false) }
    }, 350)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, customSubject, customIntro, token, customShows.map(s => s.imageUrl + s.name + s.dateLabel).join('|')])

  function resetToDefault() {
    if (!defaults) return
    const d = defaults[template]
    if (d) { setCustomSubject(d.subject); setCustomIntro(d.intro) }
  }

  // Helper: agrega maxPredictions al body si la plantilla es reminder-predictions.
  function withReminderPredictionsBody(body) {
    if (template === 'reminder-predictions') {
      body.maxPredictions = unfilteredPredictions ? null : Number(maxPredictions)
    }
    return body
  }

  async function sendTest() {
    if (!testEmail || !testEmail.includes('@')) return toast.show('Ingresá un email válido', 'err')
    setBusy(true); setLastResult(null)
    try {
      const body = withReminderPredictionsBody({ template, testEmail, customSubject, customIntro })
      if (template === 'shows' && customShowsToSend.length > 0) body.customShows = customShowsToSend
      await adminEmailBlast(token, body)
      setLastResult({ ok: true, msg: `✅ Test enviado a ${testEmail}. Revisá tu inbox (y carpeta spam por las dudas).` })
      toast.show(`Test enviado a ${testEmail}`, 'ok')
    } catch (err) {
      setLastResult({ ok: false, msg: `❌ ${err.message}` }); toast.show(err.message, 'err')
    } finally { setBusy(false) }
  }

  async function dryRun() {
    setBusy(true); setLastResult(null)
    try {
      const body = withReminderPredictionsBody({ template, scope, dryRun: true })
      if (excludeRecent) body.excludeRecentDays = excludeDays
      const r = await adminEmailBlast(token, body)
      const list = r.recipients || r.sample || []
      const excludedNote = r.excluded ? ` · ${r.excluded} excluidos por haber recibido esta plantilla en los últimos ${excludeDays} días` : ''
      setLastResult({
        ok: true,
        msg: `📋 Se enviaría a ${r.count} destinatarios${excludedNote}:\n\n${list.map(s => `· ${s.name} <${s.email}>`).join('\n')}`,
      })
    } catch (err) {
      setLastResult({ ok: false, msg: `❌ ${err.message}` })
    } finally { setBusy(false) }
  }

  async function blast() {
    setBusy(true); setLastResult(null); setConfirmBlast(false)
    try {
      const body = withReminderPredictionsBody({ template, scope, customSubject, customIntro })
      if (excludeRecent) body.excludeRecentDays = excludeDays
      if (template === 'shows' && customShowsToSend.length > 0) body.customShows = customShowsToSend
      const r = await adminEmailBlast(token, body)
      const excludedNote = r.excluded ? ` · ${r.excluded} excluidos` : ''
      setLastResult({ ok: true, msg: `✅ Enviado a ${r.sent}/${r.total}. Fallidos: ${r.failed}. Skipped: ${r.skipped}.${excludedNote}` })
      toast.show(`Enviado a ${r.sent} destinatarios`, 'ok')
      // refrescar historial si está abierto
      if (showHistory) loadCampaigns()
    } catch (err) {
      setLastResult({ ok: false, msg: `❌ ${err.message}` }); toast.show(err.message, 'err')
    } finally { setBusy(false) }
  }

  async function loadCampaigns() {
    try {
      const r = await adminEmailCampaigns(token)
      setCampaigns(r.campaigns || [])
    } catch (err) { toast.show(err.message, 'err') }
  }
  async function openCampaignDetail(id) {
    try {
      const r = await adminEmailCampaignDetail(token, id)
      setCampaignDetail(r.campaign)
    } catch (err) { toast.show(err.message, 'err') }
  }
  useEffect(() => { if (showHistory) loadCampaigns() }, [showHistory])

  const inputStyle = { width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid var(--ap-border, #2a3142)', background:'rgba(0,0,0,.3)', color:'#fff', fontSize:14, fontFamily:'inherit', boxSizing:'border-box' }

  return (
    <div className="ap-section">
      <h2 className="ap-section__title">📧 Email — Blast a la base</h2>
      <p className="ap-section__sub">Envíos masivos. Editá asunto y mensaje, mirá la preview en vivo, después mandate un test antes de blastear.</p>

      {/* PASO 1: TEMPLATE */}
      <div className="ap-block">
        <h3 className="ap-block__title">1. Elegí la plantilla</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'12px', margin:'12px 0'}}>
          {TEMPLATES.map(t => (
            <button
              key={t.id} type="button"
              onClick={() => setTemplate(t.id)}
              style={{
                textAlign:'left', padding:'16px', borderRadius:'10px',
                border: `2px solid ${template === t.id ? '#C9A84C' : '#2a3142'}`,
                background: template === t.id ? 'rgba(201,168,76,.1)' : 'transparent',
                color: '#fff', cursor: 'pointer', transition: 'all .15s'
              }}
            >
              <div style={{fontWeight:700, fontSize:14, marginBottom:6}}>{t.title}</div>
              <div style={{fontSize:13, color:'#8B9BB4', lineHeight:1.45}}>{t.desc}</div>
              <div style={{fontSize:12, color:'#5BD68F', marginTop:8, fontWeight:600}}>👥 {t.audience}</div>
            </button>
          ))}
        </div>
      </div>

      {/* PASO 2: EDITAR + PREVIEW */}
      <div className="ap-block">
        <h3 className="ap-block__title">2. Editá el contenido y mirá el preview</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start'}}>
          {/* Editor */}
          <div>
            <label style={{display:'block', fontSize:13, color:'#C9A84C', fontWeight:600, marginBottom:6}}>Asunto del mail</label>
            <input
              type="text" value={customSubject}
              onChange={e => setCustomSubject(e.target.value)}
              disabled={busy}
              style={{...inputStyle, marginBottom:14}}
            />
            <label style={{display:'block', fontSize:13, color:'#C9A84C', fontWeight:600, marginBottom:6}}>Mensaje de intro (1° párrafo del cuerpo)</label>
            <textarea
              value={customIntro}
              onChange={e => setCustomIntro(e.target.value)}
              disabled={busy}
              rows={5}
              style={{...inputStyle, resize:'vertical', minHeight:100}}
            />
            <div style={{marginTop:8, fontSize:12, color:'#8B9BB4', lineHeight:1.5}}>
              💡 El resto del mail (cards de premios, footer, etc) viene del template y no se edita acá. Las variables <code style={{background:'rgba(0,0,0,.3)', padding:'1px 5px', borderRadius:3}}>{'{tournamentName}'}</code> en el asunto se reemplazan automático.
            </div>
            <button
              type="button"
              onClick={resetToDefault}
              disabled={busy}
              style={{marginTop:10, padding:'6px 12px', fontSize:12, background:'transparent', border:'1px solid #5d6b80', color:'#8B9BB4', borderRadius:6, cursor:'pointer'}}
            >
              ↻ Restaurar texto original
            </button>

            {/* Imágenes custom (solo template Shows) */}
            {template === 'shows' && (
              <div style={{marginTop:18, paddingTop:18, borderTop:'1px solid var(--ap-border)'}}>
                <label style={{display:'block', fontSize:13, color:'#C9A84C', fontWeight:600, marginBottom:6}}>
                  🖼️ Imágenes custom (opcional, para este envío)
                </label>
                <p style={{fontSize:12, color:'#8B9BB4', margin:'0 0 12px', lineHeight:1.5}}>
                  Si subís imágenes acá, se usan en lugar de los shows de la base. Ideal para flyers que querés enviar UNA vez sin guardar como show.<br/>
                  Si dejás todo vacío, se usan los shows con tipo "upcoming" cargados en la pestaña Shows.
                </p>
                {customShows.map((show, idx) => (
                  <div key={idx} style={{
                    marginBottom:12, padding:14, borderRadius:8, border:'1px dashed var(--ap-border-strong)',
                    background:'rgba(0,0,0,.15)',
                  }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                      <strong style={{fontSize:12, color:'var(--ap-gold)'}}>Imagen {idx + 1}</strong>
                      {show.imageUrl && (
                        <button type="button" onClick={() => clearCustomShow(idx)} style={{background:'none', border:'none', color:'#FF7A8A', fontSize:11, cursor:'pointer'}}>✕ Quitar</button>
                      )}
                    </div>
                    {show.imageUrl ? (
                      <img src={show.imageUrl} alt="" style={{maxWidth:'100%', maxHeight:160, borderRadius:6, marginBottom:10, display:'block'}} />
                    ) : (
                      <input
                        type="file" accept="image/*"
                        disabled={busy || uploadingIdx === idx}
                        onChange={e => uploadShowImage(e.target.files?.[0], idx)}
                        style={{fontSize:12, color:'#C8D2E0', marginBottom:10, display:'block'}}
                      />
                    )}
                    {uploadingIdx === idx && <div style={{fontSize:12, color:'#8B9BB4'}}>Subiendo imagen...</div>}
                    <input
                      type="text" placeholder="Nombre del show (ej: 'Noche de Cumbia')"
                      value={show.name}
                      onChange={e => updateCustomShow(idx, 'name', e.target.value)}
                      disabled={busy}
                      style={{...inputStyle, marginBottom:6, fontSize:13}}
                    />
                    <input
                      type="text" placeholder="Fecha (ej: 'Sábado 17 · 22:30')"
                      value={show.dateLabel}
                      onChange={e => updateCustomShow(idx, 'dateLabel', e.target.value)}
                      disabled={busy}
                      style={{...inputStyle, fontSize:13}}
                    />
                  </div>
                ))}
                {customShowsToSend.length > 0 && (
                  <div style={{fontSize:12, color:'#5BD68F', marginTop:6}}>
                    ✓ {customShowsToSend.length} imagen(es) custom cargada(s) · se van a usar en este blast
                  </div>
                )}
              </div>
            )}

            {/* Segmentación específica del template reminder-predictions */}
            {template === 'reminder-predictions' && (
              <div style={{marginTop:18, paddingTop:18, borderTop:'1px solid var(--ap-border)'}}>
                <label style={{display:'block', fontSize:13, color:'#C9A84C', fontWeight:600, marginBottom:6}}>
                  🎯 Segmentación de destinatarios
                </label>
                <p style={{fontSize:12, color:'#8B9BB4', margin:'0 0 12px', lineHeight:1.5}}>
                  Por default este mail va solo a los inscriptos que están <strong>flojos</strong> (cargaron pocos pronósticos). Ajustá el límite o mandalo a toda la base.
                </p>
                <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:10, flexWrap:'wrap'}}>
                  <label style={{display:'flex', gap:6, alignItems:'center', fontSize:13, color:'#E8EDF5', cursor:'pointer'}}>
                    <input
                      type="checkbox"
                      checked={unfilteredPredictions}
                      onChange={e => setUnfilteredPredictions(e.target.checked)}
                      disabled={busy}
                    />
                    Mandar a TODOS los inscriptos del Prode (sin filtro de pronósticos)
                  </label>
                </div>
                {!unfilteredPredictions && (
                  <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
                    <label style={{fontSize:13, color:'#C8D2E0'}}>Solo a los que cargaron</label>
                    <input
                      type="number" min={0} max={104} step={1}
                      value={maxPredictions}
                      onChange={e => setMaxPredictions(e.target.value)}
                      disabled={busy}
                      style={{...inputStyle, width:80, padding:'8px 10px'}}
                    />
                    <span style={{fontSize:13, color:'#C8D2E0'}}>pronósticos o menos.</span>
                  </div>
                )}
                <div style={{marginTop:10, fontSize:12, color:'#5BD68F', lineHeight:1.5}}>
                  💡 El subject del mail se completa automáticamente con los días que faltan al Mundial. Usá <code style={{background:'rgba(0,0,0,.3)', padding:'1px 5px', borderRadius:3}}>{'{daysToKickoff}'}</code> en el asunto si querés controlarlo manualmente.
                </div>
              </div>
            )}
          </div>

          {/* Preview iframe */}
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
              <label style={{fontSize:13, color:'#C9A84C', fontWeight:600}}>Preview del mail</label>
              {previewing && <span style={{fontSize:12, color:'#8B9BB4'}}>Actualizando...</span>}
            </div>
            <div style={{border:'1px solid #2a3142', borderRadius:10, overflow:'hidden', background:'#0a0d12'}}>
              <iframe
                title="email preview"
                srcDoc={previewHtml || '<p style="color:#8B9BB4;padding:30px;font-family:sans-serif;text-align:center;">Cargando preview...</p>'}
                style={{width:'100%', height:600, border:'none', background:'#0a0d12'}}
              />
            </div>
          </div>
        </div>
      </div>

      {/* PASO 3: TEST */}
      <div className="ap-block">
        <h3 className="ap-block__title">3. Probar antes</h3>
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          <input
            type="email" value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="urieleprieto@gmail.com" disabled={busy}
            style={{flex:'1 1 280px', ...inputStyle, width:'auto'}}
          />
          <button className="ap-btn ap-btn--primary" onClick={sendTest} disabled={busy} style={{padding:'10px 20px'}}>
            {busy ? 'Enviando...' : '✉️ Mandarme test'}
          </button>
        </div>
      </div>

      {/* PASO 4: BLAST */}
      <div className="ap-block">
        <h3 className="ap-block__title">4. Enviar a todos</h3>
        {template !== 'reminder' && (
          <div style={{margin:'0 0 14px', display:'flex', gap:16, fontSize:14, flexWrap:'wrap'}}>
            <label style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer'}}>
              <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} disabled={busy} />
              <span>Todos los players con email</span>
            </label>
            <label style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer'}}>
              <input type="radio" checked={scope === 'tournament'} onChange={() => setScope('tournament')} disabled={busy} />
              <span>Solo inscriptos al torneo activo</span>
            </label>
          </div>
        )}

        {/* Exclude recent */}
        <div style={{margin:'0 0 14px', padding:'10px 14px', background:'rgba(0,0,0,.2)', borderRadius:8, fontSize:13}}>
          <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer'}}>
            <input type="checkbox" checked={excludeRecent} onChange={e => setExcludeRecent(e.target.checked)} disabled={busy} />
            <span>No mandar a quien ya recibió esta plantilla en los últimos</span>
            <input
              type="number" min="1" max="365"
              value={excludeDays}
              onChange={e => setExcludeDays(Math.max(1, parseInt(e.target.value, 10) || 7))}
              disabled={busy || !excludeRecent}
              style={{width:60, padding:'4px 8px', borderRadius:6, border:'1px solid #2a3142', background:'rgba(0,0,0,.3)', color:'#fff', fontSize:13}}
            />
            <span>días</span>
          </label>
        </div>

        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button className="ap-btn" onClick={dryRun} disabled={busy} style={{padding:'10px 20px'}}>
            👁️ Ver lista (dry run)
          </button>
          {!confirmBlast ? (
            <button className="ap-btn ap-btn--danger" onClick={() => setConfirmBlast(true)} disabled={busy} style={{padding:'10px 20px'}}>
              📤 Enviar a todos
            </button>
          ) : (
            <>
              <button className="ap-btn ap-btn--danger" onClick={blast} disabled={busy} style={{padding:'10px 20px', fontWeight:700}}>
                ⚠️ SÍ, ENVIAR AHORA
              </button>
              <button className="ap-btn" onClick={() => setConfirmBlast(false)} disabled={busy} style={{padding:'10px 20px'}}>
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>

      {lastResult && (
        <div style={{
          margin:'14px 0', padding:'14px 18px', borderRadius:8,
          background: lastResult.ok ? 'rgba(0,177,64,.1)' : 'rgba(196,30,58,.1)',
          border: `1px solid ${lastResult.ok ? 'rgba(0,177,64,.4)' : 'rgba(196,30,58,.4)'}`,
          color: '#fff', fontSize:13, whiteSpace:'pre-wrap', lineHeight:1.55,
          maxHeight: 320, overflowY: 'auto',
        }}>
          {lastResult.msg}
        </div>
      )}

      {/* HISTORIAL DE CAMPAÑAS */}
      <div className="ap-block" style={{marginTop:24}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h3 className="ap-block__title" style={{margin:0}}>📜 Historial de campañas</h3>
          <button type="button" className="ap-btn" onClick={() => setShowHistory(s => !s)} style={{padding:'6px 12px', fontSize:12}}>
            {showHistory ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {showHistory && (
          <>
            {campaigns.length === 0 ? (
              <p style={{color:'var(--ap-text-mut)', fontSize:13, margin:'10px 0 0'}}>Todavía no se enviaron campañas.</p>
            ) : (
              <table className="ap-table" style={{marginTop:10}}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Plantilla</th>
                    <th>Asunto</th>
                    <th style={{textAlign:'center'}}>Enviados</th>
                    <th style={{textAlign:'center'}}>Fallidos</th>
                    <th>Admin</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.id}>
                      <td style={{whiteSpace:'nowrap'}}>{new Date(c.sent_at).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'America/Argentina/Buenos_Aires' })}</td>
                      <td><span style={{padding:'2px 8px', background:'rgba(201,168,76,.15)', color:'var(--ap-gold)', borderRadius:4, fontSize:11, fontWeight:700, letterSpacing:1}}>{c.template.toUpperCase()}</span></td>
                      <td style={{fontSize:13, maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.subject}</td>
                      <td style={{textAlign:'center', fontWeight:700, color:'var(--ap-gold)'}}>{c.total_sent}</td>
                      <td style={{textAlign:'center', color: c.total_failed > 0 ? '#FF7A8A' : 'var(--ap-text-mut)'}}>{c.total_failed}</td>
                      <td style={{fontSize:12, color:'var(--ap-text-mut)'}}>{(c.sent_by_admin_email || '').split('@')[0]}</td>
                      <td>
                        <button type="button" className="ap-btn ap-btn--sm" onClick={() => openCampaignDetail(c.id)}>Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* MODAL detalle de campaña */}
      {campaignDetail && (
        <div onClick={() => setCampaignDetail(null)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:'var(--ap-bg-card)', borderRadius:12, padding:24, maxWidth:720, width:'100%',
            maxHeight:'85vh', overflowY:'auto', border:'1px solid var(--ap-border-strong)',
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14}}>
              <div>
                <h3 style={{margin:'0 0 6px', color:'var(--ap-gold-light)', fontFamily:'Playfair Display, serif'}}>{campaignDetail.subject}</h3>
                <div style={{fontSize:12, color:'var(--ap-text-mut)'}}>
                  {new Date(campaignDetail.sent_at).toLocaleString('es-AR', { timeZone:'America/Argentina/Buenos_Aires', hour12:false })} · plantilla <strong>{campaignDetail.template}</strong> · {campaignDetail.total_sent}/{campaignDetail.total_recipients} enviados
                </div>
              </div>
              <button type="button" onClick={() => setCampaignDetail(null)} style={{background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer'}}>✕</button>
            </div>
            <table className="ap-table">
              <thead>
                <tr><th>Nombre</th><th>Email</th><th>Estado</th><th>Hora</th></tr>
              </thead>
              <tbody>
                {(campaignDetail.sends || []).map(s => (
                  <tr key={s.id}>
                    <td style={{fontSize:13}}>{s.name || '—'}</td>
                    <td style={{fontSize:12, color:'var(--ap-text-mut)'}}>{s.email}</td>
                    <td>
                      <span style={{
                        padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:700,
                        background: s.status === 'sent' ? 'rgba(0,177,64,.15)' : 'rgba(196,30,58,.15)',
                        color: s.status === 'sent' ? '#5BD68F' : '#FF7A8A',
                      }}>{s.status}</span>
                    </td>
                    <td style={{fontSize:11, color:'var(--ap-text-mut)', whiteSpace:'nowrap'}}>{new Date(s.sent_at).toLocaleTimeString('es-AR', { timeZone:'America/Argentina/Buenos_Aires', hour12:false })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AdminPanel (main) ────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [token, setToken]   = useState(() => localStorage.getItem('admin_token') || '')
  const [admin, setAdmin]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_info') || 'null') } catch { return null }
  })
  const [verified, setVerified] = useState(false)
  const [tab, setTab]           = useState('dash')
  const toast = useToast()

  useEffect(() => {
    if (!token) { setVerified(false); return }
    adminVerify(token)
      .then(a => { setAdmin(a); setVerified(true) })
      .catch(() => {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_info')
        setToken(''); setAdmin(null); setVerified(false)
      })
  }, [token])

  function handleLogin(t, a) {
    setToken(t)
    setAdmin(a)
    setVerified(true)
  }

  function handleLogout() {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_info')
    setToken(''); setAdmin(null); setVerified(false)
  }

  if (!verified || !token) {
    return <AdminLogin onLogin={handleLogin} />
  }

  const TABS = [
    { id: 'dash',      label: '🏠 Dashboard' },
    { id: 'clientes',  label: '👥 Clientes' },
    { id: 'prode',     label: '⚽ Prode' },
    { id: 'torneos',   label: '🎰 Torneo Slots' },
    ...(admin?.role === 'superadmin' ? [{ id: 'premios', label: '💰 Premios' }] : []),
    { id: 'shows',     label: '🎤 Shows' },
    { id: 'contenido', label: '📝 Contenido' },
    ...(admin?.role === 'superadmin' ? [{ id: 'email',  label: '📧 Email' }] : []),
    ...(admin?.role === 'superadmin' ? [{ id: 'promo',  label: '🎁 Promo Tickets' }] : []),
    ...(admin?.role === 'superadmin' ? [{ id: 'admins', label: '👤 Admins' }] : []),
  ]

  return (
    <div className="ap-page">
      {toast.toast && (
        <Toast
          key={toast.toast.key}
          msg={toast.toast.msg}
          type={toast.toast.type}
          onDone={toast.clear}
        />
      )}

      {/* Header */}
      <header className="ap-header">
        <div className="ap-header__inner">
          <div className="ap-header__brand">
            <span>⚙️</span>
            <div>
              <h1 className="ap-header__title">Panel Admin</h1>
              <p className="ap-header__sub">Sala de Juegos Crespo</p>
            </div>
          </div>
          <div className="ap-header__user">
            <span className="ap-header__email">{admin?.email}</span>
            <span className={`ap-role ap-role--${admin?.role}`}>{admin?.role}</span>
            <button className="ap-header__logout" onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </div>

        <nav className="ap-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`ap-nav__btn ${tab === t.id ? 'ap-nav__btn--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          <Link to="/" className="ap-nav__link">← Ver sitio</Link>
        </nav>
      </header>

      {/* Content */}
      <main className="ap-main">
        {tab === 'dash'      && <Dashboard      token={token} admin={admin} onNavigate={setTab} />}
        {tab === 'clientes'  && <ClientsAdmin   token={token} toast={toast} />}
        {tab === 'prode'     && <ProdeAdmin    token={token} toast={toast} />}
        {tab === 'torneos'   && <TournamentsAdmin token={token} toast={toast} />}
        {tab === 'premios'   && <PrizesAdmin   token={token} toast={toast} />}
        {tab === 'shows'     && <ShowsAdmin    token={token} toast={toast} />}
        {tab === 'contenido' && <ContentAdmin  token={token} toast={toast} />}
        {tab === 'email'     && <EmailBlastAdmin token={token} toast={toast} />}
        {tab === 'promo'     && <PromoTicketsAdmin token={token} toast={toast} />}
        {tab === 'admins'    && <AdminsAdmin   token={token} currentAdmin={admin} toast={toast} />}
      </main>
    </div>
  )
}
