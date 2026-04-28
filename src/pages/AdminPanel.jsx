import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  adminLogin, adminVerify, getMatches, getShows, getContent,
  adminSetResult, adminDeleteResult, adminSetTeams, adminGetPlayers, adminDeletePlayer, adminEditPlayer,
  adminCreateShow, adminUpdateShow, adminDeleteShow,
  adminUpdateContent, adminUploadImage,
  adminGetAdmins, adminCreateAdmin, adminDeleteAdmin,
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
function ProdeAdmin({ token, toast }) {
  const [matches, setMatches]   = useState([])
  const [players, setPlayers]   = useState([])
  const [matchId, setMatchId]   = useState('')
  const [home, setHome]         = useState('')
  const [away, setAway]         = useState('')
  const [teamsMatchId, setTeamsMatchId] = useState('')
  const [teamData, setTeamData] = useState({ homeName: '', homeFlag: '', awayName: '', awayFlag: '' })
  const [subtab, setSubtab]     = useState('resultados')
  const [editingPlayer, setEditingPlayer] = useState(null) // { id, name, tel }

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
      await adminEditPlayer(token, editingPlayer.id, { name: editingPlayer.name.trim(), tel: editingPlayer.tel })
      toast.show('Jugador actualizado')
      setEditingPlayer(null)
      adminGetPlayers(token).then(setPlayers)
    } catch (err) {
      toast.show(err.message, 'err')
    }
  }

  const withResults = matches.filter(m => m.result)
  const knockout    = matches.filter(m => !['group'].includes(m.phase))

  return (
    <div className="ap-section">
      <div className="ap-subtabs">
        {['resultados', 'equipos', 'jugadores'].map(s => (
          <button
            key={s}
            className={`ap-subtab ${subtab === s ? 'ap-subtab--active' : ''}`}
            onClick={() => setSubtab(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

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
          <h3 className="ap-block__title">Jugadores registrados ({players.length})</h3>

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
              <div className="ap-edit-modal__btns">
                <button className="ap-btn ap-btn--primary" onClick={handleEditPlayerSave}>Guardar</button>
                <button className="ap-btn" onClick={() => setEditingPlayer(null)}>Cancelar</button>
              </div>
            </div>
          )}

          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr><th>Nombre</th><th>DNI</th><th>Teléfono</th><th>Registrado</th><th></th></tr>
              </thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><code className="ap-code">{p.dni}</code></td>
                    <td>{p.tel || '—'}</td>
                    <td>{new Date(p.createdAt).toLocaleDateString('es-AR')}</td>
                    <td className="ap-table__actions">
                      <button
                        className="ap-btn ap-btn--sm"
                        onClick={() => setEditingPlayer({ id: p.id, name: p.name, tel: p.tel || '' })}
                      >Editar</button>
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
  const [form, setForm]     = useState({ name: '', dateLabel: '', type: 'upcoming', imageUrl: '', imagePosition: 'center center' })
  const [editing, setEditing] = useState(null)
  const fileRef             = useRef(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    getShows().then(setShows).catch(() => {})
  }, [token])

  function resetForm() {
    setForm({ name: '', dateLabel: '', type: 'upcoming', imageUrl: '', imagePosition: 'center center' })
    setEditing(null)
  }

  function startEdit(show) {
    setEditing(show.id)
    setForm({ name: show.name, dateLabel: show.dateLabel, type: show.type, imageUrl: show.imageUrl || '', imagePosition: show.imagePosition || 'center center' })
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
  return ''
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

function ContentField({ field, value, saving, onSave }) {
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])

  // Tipo datetime — date picker + preview del texto generado
  if (field.type === 'datetime') {
    const dtVal = labelToDatetime(val) || ''
    return (
      <div className="ap-content-field">
        <label className="ap-label">{field.label}</label>
        <input
          className="ap-input"
          type="datetime-local"
          value={dtVal}
          onChange={e => {
            const label = datetimeToLabel(e.target.value)
            setVal(label)
          }}
        />
        {val && <p className="ap-field-preview">Se mostrará como: <strong>{val}</strong></p>}
        <button className="ap-btn ap-btn--primary ap-btn--sm" onClick={() => onSave(val)} disabled={saving}>
          {saving ? 'Guardando...' : '✓ Guardar fecha'}
        </button>
      </div>
    )
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
        {tab === 'shows'     && <ShowsAdmin    token={token} toast={toast} />}
        {tab === 'contenido' && <ContentAdmin  token={token} toast={toast} />}
        {tab === 'admins'    && <AdminsAdmin   token={token} currentAdmin={admin} toast={toast} />}
      </main>
    </div>
  )
}
