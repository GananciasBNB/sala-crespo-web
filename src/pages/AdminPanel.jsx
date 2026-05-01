import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  adminLogin, adminVerify, getMatches, getShows, getContent,
  adminSetResult, adminDeleteResult, adminSetTeams, adminSyncTeamsFromFixture, adminGetPlayers, adminDeletePlayer, adminEditPlayer, adminResetPin, adminInvitePlayer, adminTogglePlayerEmployee,
  adminCreateShow, adminUpdateShow, adminDeleteShow,
  adminUpdateContent, adminUploadImage,
  adminGetAdmins, adminCreateAdmin, adminDeleteAdmin,
  adminGetPrizes, adminGetPrizesSummary, adminGeneratePrizes, adminRedeemPrize, adminRevokePrize,
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
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires'
  }) + ' hs'
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
    adminGetPlayers(token).then(setPlayers).catch(() => {})
  }, [token])

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
      adminGetPlayers(token).then(setPlayers)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  async function handleEditPlayerSave() {
    if (!editingPlayer.name.trim()) return toast.show('El nombre no puede estar vacío.', 'err')
    try {
      await adminEditPlayer(token, editingPlayer.id, {
        name: editingPlayer.name.trim(),
        tel: editingPlayer.tel,
        email: editingPlayer.email || null,
      })
      toast.show('Jugador actualizado')
      setEditingPlayer(null)
      adminGetPlayers(token).then(setPlayers)
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
      adminGetPlayers(token).then(setPlayers)
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
      adminGetPlayers(token).then(setPlayers)
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
                    hour: '2-digit', minute: '2-digit',
                    timeZone: 'America/Argentina/Buenos_Aires'
                  })} hs
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
            <h3 className="ap-block__title" style={{ margin: 0 }}>Jugadores registrados ({players.length})</h3>
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
                className="ap-btn ap-btn--primary"
                onClick={() => setInvitingPlayer({ name: '', dni: '', tel: '', email: '', isEmployee: false })}
              >+ Invitar jugador</button>
            </div>
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
                    </td>
                    <td><code className="ap-code">{p.dni}</code></td>
                    <td>{p.tel || '—'}</td>
                    <td>{p.email ? <span title={p.email}>{p.email.length > 22 ? p.email.slice(0,20) + '…' : p.email}</span> : <span className="ap-muted">—</span>}</td>
                    <td>{new Date(p.createdAt).toLocaleDateString('es-AR')}</td>
                    <td className="ap-table__actions">
                      <button
                        className="ap-btn ap-btn--sm"
                        onClick={() => setEditingPlayer({ id: p.id, name: p.name, tel: p.tel || '', email: p.email || '' })}
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

// ─── AdminPanel (main) ────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [token, setToken]   = useState(() => localStorage.getItem('admin_token') || '')
  const [admin, setAdmin]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_info') || 'null') } catch { return null }
  })
  const [verified, setVerified] = useState(false)
  const [tab, setTab]           = useState('prode')
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
    { id: 'prode',    label: '⚽ Prode' },
    ...(admin?.role === 'superadmin' ? [{ id: 'premios', label: '💰 Premios' }] : []),
    { id: 'shows',    label: '🎤 Shows' },
    { id: 'contenido', label: '📝 Contenido' },
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
        {tab === 'prode'     && <ProdeAdmin    token={token} toast={toast} />}
        {tab === 'premios'   && <PrizesAdmin   token={token} toast={toast} />}
        {tab === 'shows'     && <ShowsAdmin    token={token} toast={toast} />}
        {tab === 'contenido' && <ContentAdmin  token={token} toast={toast} />}
        {tab === 'admins'    && <AdminsAdmin   token={token} currentAdmin={admin} toast={toast} />}
      </main>
    </div>
  )
}
