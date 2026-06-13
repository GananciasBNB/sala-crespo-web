import { useEffect, useMemo, useRef, useState } from 'react'
import {
  adminLogin, adminGetMenu,
  adminCreateMenuCategory, adminUpdateMenuCategory, adminDeleteMenuCategory, adminReorderMenuCategories,
  adminCreateMenuItem, adminUpdateMenuItem, adminDeleteMenuItem, adminReorderMenuItems, adminMoveMenuItem,
  adminMenuBulkPrice, adminMenuBatchPrices, adminMenuSetCost, adminMenuPriceHistory,
  adminUploadImage, morphiPending, morphiMarkAllSynced,
  adminMenuSnapshots, adminMenuSnapshotCreate, adminMenuSnapshotRestore, adminMenuSnapshotDelete,
  adminIngredients, adminIngredientCreate, adminIngredientUpdate, adminIngredientDelete,
  adminGetRecipe, adminSetRecipe,
} from '../api/client'
import html2canvas from 'html2canvas-pro'
import './CartaAdmin.css'

// Código de acceso de la cajera al checklist /morphi (default del backend).
// Si cambiás MORPHI_KEY en Render, actualizá también esta constante.
const MORPHI_K = 'caja-crespo'
const MORPHI_LINK = `https://www.saladejuegoscrespo.ar/morphi?k=${MORPHI_K}`

const fmt = new Intl.NumberFormat('es-AR')
const money = (n) => `$${fmt.format(Math.round(Number(n) || 0))}`
const ICONS = ['🍔', '⭐', '🍟', '☕', '🥤', '🍺', '🍻', '🍷', '🥂', '🍾', '🥃', '🍸', '🧊', '🍕', '🌭', '🍰', '🥩', '🍤']

const BADGE_PRESETS = ['Promo', 'Ticket promocional de regalo', 'Nuevo', 'Tiempo limitado', 'Recomendado', 'Más pedido']
const BADGE_COLORS = {
  'promo': '#c1272d', 'ticket promocional de regalo': '#0e7490', 'nuevo': '#16a34a',
  'tiempo limitado': '#d97706', 'recomendado': '#caa14e', 'más pedido': '#7c3aed',
}
const badgeColor = (label) => BADGE_COLORS[(label || '').toLowerCase()] || '#caa14e'
const asArray = (b) => (Array.isArray(b) ? b : [])

const GROUPS = [
  { key: 'menu', label: 'MENÚ', hint: 'Comida (con fotos)' },
  { key: 'bebidas', label: 'BEBIDAS', hint: 'Bebidas (lista)' },
]

export default function CartaAdmin() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '')
  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [view, setView] = useState('board') // 'board' | 'prices' | 'recipes'
  const [bulkOpen, setBulkOpen] = useState(false)
  const [itemModal, setItemModal] = useState(null)
  const [catModal, setCatModal] = useState(null)
  const drag = useRef({ id: null, from: null })
  const [overCat, setOverCat] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const flash = (msg, kind = 'ok') => { setToast({ msg, kind }); setTimeout(() => setToast(null), 2400) }

  const load = async (t = token) => {
    if (!t) return
    setLoading(true)
    try { const d = await adminGetMenu(t); setMenu(d.menu || []) }
    catch (e) {
      if (e.status === 401) { localStorage.removeItem('admin_token'); setToken('') }
      else flash(e.message || 'Error al cargar', 'err')
    } finally { setLoading(false) }
  }
  useEffect(() => { if (token) load(token) }, [token]) // eslint-disable-line

  const stats = useMemo(() => {
    if (!menu) return { cats: 0, items: 0, active: 0, off: 0 }
    let items = 0, active = 0
    menu.forEach((c) => c.items.forEach((i) => { items++; if (i.is_active) active++ }))
    return { cats: menu.length, items, active, off: items - active }
  }, [menu])

  const clearDrag = () => { drag.current = { id: null, from: null }; setOverCat(null); setOverIdx(null) }

  const onDrop = async (destCatId) => {
    const { id, from } = drag.current
    if (id == null) return clearDrag()
    const idx = overIdx
    clearDrag()
    const next = menu.map((c) => ({ ...c, items: [...c.items] }))
    const src = next.find((c) => String(c.id) === String(from))
    const dest = next.find((c) => String(c.id) === String(destCatId))
    if (!src || !dest) return
    const pos = src.items.findIndex((i) => String(i.id) === String(id))
    if (pos < 0) return
    const [moved] = src.items.splice(pos, 1)
    let insertAt = idx == null ? dest.items.length : idx
    if (String(src.id) === String(dest.id) && idx != null && idx > pos) insertAt -= 1
    dest.items.splice(insertAt, 0, moved)
    moved.category_id = dest.id
    setMenu(next)
    try {
      const reorder = dest.items.map((it, i) => ({ id: it.id, sortOrder: i }))
      await adminMoveMenuItem(token, moved.id, { categoryId: dest.id, sortOrder: insertAt, reorder })
      if (String(src.id) !== String(dest.id)) await adminReorderMenuItems(token, src.items.map((it, i) => ({ id: it.id, sortOrder: i })))
    } catch (e) { flash('No se pudo mover', 'err'); load() }
  }

  // Subir / bajar una tarjeta dentro de su columna (sin drag, cómodo en mobile)
  const moveItem = async (catId, itemId, dir) => {
    const next = menu.map((c) => ({ ...c, items: [...c.items] }))
    const cat = next.find((c) => String(c.id) === String(catId))
    if (!cat) return
    const idx = cat.items.findIndex((i) => String(i.id) === String(itemId))
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= cat.items.length) return
    ;[cat.items[idx], cat.items[j]] = [cat.items[j], cat.items[idx]]
    setMenu(next)
    try { await adminReorderMenuItems(token, cat.items.map((it, i) => ({ id: it.id, sortOrder: i }))) }
    catch { flash('No se pudo reordenar', 'err'); load() }
  }

  if (!token) return <Login onLogin={(t) => { localStorage.setItem('admin_token', t); setToken(t) }} />

  const colsByGroup = (g) => (menu || []).filter((c) => (c.food_group || 'bebidas') === g)

  return (
    <div className="ca">
      <Header stats={stats} view={view} setView={setView} onNewCat={() => setCatModal({})} onReload={() => load()} />

      {loading && !menu && <p className="ca__loading">Cargando carta…</p>}

      {menu && view === 'prices' && <PricesView menu={menu} token={token} flash={flash} reload={load} />}

      {menu && view === 'recipes' && <RecipesView menu={menu} token={token} flash={flash} reload={load} />}

      {menu && view === 'board' && (
        <div className="ca__kanban">
          {GROUPS.map((g) => (
            <div key={g.key} className="ca__group">
              <div className="ca__group-bar">
                <h2>{g.label}</h2>
                <span>{g.hint}</span>
              </div>
              <div className="ca__cols">
                {colsByGroup(g.key).map((cat, ci, arr) => (
                  <Column
                    key={cat.id}
                    cat={cat}
                    isFirst={ci === 0}
                    isLast={ci === arr.length - 1}
                    token={token}
                    flash={flash}
                    reload={load}
                    drag={drag}
                    overCat={overCat}
                    overIdx={overIdx}
                    setOver={(c, i) => { setOverCat(c); setOverIdx(i) }}
                    onDrop={onDrop}
                    onEditCat={() => setCatModal({ category: cat })}
                    onAddItem={() => setItemModal({ categoryId: cat.id })}
                    onEditItem={(item) => setItemModal({ categoryId: cat.id, item })}
                    onMoveItem={(itemId, dir) => moveItem(cat.id, itemId, dir)}
                    onPatchItem={(itemId, patch) => setMenu((m) => m.map((c) => c.id === cat.id ? { ...c, items: c.items.map((x) => x.id === itemId ? { ...x, ...patch } : x) } : c))}
                    onRemoveItem={(itemId) => setMenu((m) => m.map((c) => c.id === cat.id ? { ...c, items: c.items.filter((x) => x.id !== itemId) } : c))}
                    moveCat={async (dir) => {
                      const groupCols = colsByGroup(g.key)
                      const j = ci + dir
                      if (j < 0 || j >= groupCols.length) return
                      const reordered = [...groupCols]
                      ;[reordered[ci], reordered[j]] = [reordered[j], reordered[ci]]
                      const otherGroup = menu.filter((c) => (c.food_group || 'bebidas') !== g.key)
                      const merged = g.key === 'menu' ? [...reordered, ...otherGroup] : [...otherGroup, ...reordered]
                      setMenu(merged)
                      try { await adminReorderMenuCategories(token, merged.map((c, idx) => ({ id: c.id, sortOrder: idx }))) }
                      catch { flash('No se pudo reordenar', 'err'); load() }
                    }}
                  />
                ))}
                <button className="ca__add-col" onClick={() => setCatModal({ presetGroup: g.key })}>+ Sección</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {itemModal && <ItemModal token={token} data={itemModal} categories={menu} onClose={() => setItemModal(null)} onSaved={() => { setItemModal(null); load(); flash('Producto guardado ✓') }} />}
      {catModal && <CategoryModal token={token} data={catModal} onClose={() => setCatModal(null)} onSaved={() => { setCatModal(null); load(); flash('Sección guardada ✓') }} />}

      {toast && <div className={`ca__toast ca__toast--${toast.kind}`}>{toast.msg}</div>}
    </div>
  )
}

/* ─────────── Header ─────────── */
function Header({ stats, view, setView, onNewCat, onReload }) {
  return (
    <header className="ca__header">
      <div className="ca__header-top">
        <div className="ca__brand">
          <span className="ca__brand-icon">🍺</span>
          <div><h1>Carta — {view === 'prices' ? 'Precios' : view === 'recipes' ? 'Recetas' : 'Tablero'}</h1><p>Sala Crespo Bar</p></div>
        </div>
        <a className="ca__view-public" href="/carta" target="_blank" rel="noreferrer">Ver carta ↗</a>
      </div>
      <div className="ca__stats">
        <Stat label="Secciones" value={stats.cats} />
        <Stat label="Productos" value={stats.items} />
        <Stat label="Activos" value={stats.active} accent="green" />
        <Stat label="Apagados" value={stats.off} accent={stats.off ? 'red' : ''} />
      </div>
      <div className="ca__toolbar">
        <div className="ca__viewtabs">
          <button className={view === 'board' ? 'is-on' : ''} onClick={() => setView('board')}>🗂️ Tablero</button>
          <button className={view === 'prices' ? 'is-on' : ''} onClick={() => setView('prices')}>💲 Precios</button>
          <button className={view === 'recipes' ? 'is-on' : ''} onClick={() => setView('recipes')}>🍹 Recetas</button>
        </div>
        {view === 'board' && <button className="ca__btn" onClick={onNewCat}><span>＋</span> Nueva sección</button>}
        <button className="ca__btn ca__btn--ghost" onClick={onReload}><span>↻</span> Refrescar</button>
      </div>
    </header>
  )
}
function Stat({ label, value, accent }) {
  return <div className={`ca__stat ${accent ? `ca__stat--${accent}` : ''}`}><span className="ca__stat-value">{value}</span><span className="ca__stat-label">{label}</span></div>
}

/* ─────────── Columna (categoría) ─────────── */
function Column({ cat, isFirst, isLast, token, flash, reload, drag, overCat, overIdx, setOver, onDrop, onEditCat, onAddItem, onEditItem, onMoveItem, onPatchItem, onRemoveItem, moveCat }) {
  const isOver = String(overCat) === String(cat.id)
  const toggleActive = async () => {
    try { await adminUpdateMenuCategory(token, cat.id, { isActive: cat.is_active === false }); reload() }
    catch (e) { flash(e.message || 'Error', 'err') }
  }
  return (
    <section
      className={`ca__col ${!cat.is_active ? 'is-off' : ''} ${isOver ? 'is-drop' : ''}`}
      onDragOver={(e) => { if (drag.current.id != null) { e.preventDefault(); if (!isOver || overIdx == null) setOver(cat.id, cat.items.length) } }}
      onDrop={(e) => { e.preventDefault(); onDrop(cat.id) }}
    >
      <div className="ca__col-head">
        <span className="ca__col-icon">{cat.icon || '🍽️'}</span>
        <div className="ca__col-title">
          <h3>{cat.name}</h3>
          <span>{cat.items.filter((i) => i.is_active).length}/{cat.items.length}</span>
        </div>
        <div className="ca__col-actions">
          <label className="ca__switch ca__col-switch" title={cat.is_active === false ? 'Sección oculta en la carta' : 'Sección visible'}>
            <input type="checkbox" checked={cat.is_active !== false} onChange={toggleActive} /><span />
          </label>
          <button className="ca__ico" disabled={isFirst} onClick={() => moveCat(-1)} title="Mover izquierda">‹</button>
          <button className="ca__ico" disabled={isLast} onClick={() => moveCat(1)} title="Mover derecha">›</button>
          <button className="ca__ico" onClick={onEditCat} title="Editar sección">✎</button>
        </div>
      </div>

      <div className="ca__col-body">
        {cat.items.map((it, idx) => (
          <Card
            key={it.id}
            item={it}
            catId={cat.id}
            token={token}
            flash={flash}
            drag={drag}
            isFirst={idx === 0}
            isLast={idx === cat.items.length - 1}
            showLine={isOver && overIdx === idx}
            onDragEnterCard={() => setOver(cat.id, idx)}
            onEdit={() => onEditItem(it)}
            onMove={(dir) => onMoveItem(it.id, dir)}
            onPatch={(patch) => onPatchItem(it.id, patch)}
            onRemove={() => onRemoveItem(it.id)}
          />
        ))}
        {isOver && overIdx === cat.items.length && <div className="ca__drop-line" />}
        {cat.items.length === 0 && <div className="ca__col-empty">Soltá productos acá</div>}
        <button className="ca__add-card" onClick={onAddItem}>＋ Producto</button>
      </div>
    </section>
  )
}

/* ─────────── Tarjeta (producto) ─────────── */
function Card({ item, catId, token, flash, drag, isFirst, isLast, showLine, onDragEnterCard, onEdit, onMove, onPatch, onRemove }) {
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceVal, setPriceVal] = useState(String(Math.round(item.price)))
  const [busy, setBusy] = useState(false)
  const badges = asArray(item.badges)

  const savePrice = async () => {
    const n = Number(priceVal)
    if (!Number.isFinite(n) || n < 0) { flash('Precio inválido', 'err'); return }
    setEditingPrice(false)
    if (n === Math.round(item.price)) return
    setBusy(true)
    try { await adminUpdateMenuItem(token, item.id, { price: n }); onPatch({ price: n }); flash('Precio actualizado ✓') }
    catch (e) { flash(e.message || 'Error', 'err') } finally { setBusy(false) }
  }
  const toggleActive = async () => {
    setBusy(true)
    try { await adminUpdateMenuItem(token, item.id, { isActive: !item.is_active }); onPatch({ is_active: !item.is_active }) }
    catch (e) { flash(e.message || 'Error', 'err') } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!confirm(`¿Eliminar "${item.name}"?\n(Para sacarlo solo por hoy, apagalo con el switch.)`)) return
    setBusy(true)
    try { await adminDeleteMenuItem(token, item.id); onRemove() } catch (e) { flash(e.message || 'Error', 'err'); setBusy(false) }
  }

  return (
    <>
      {showLine && <div className="ca__drop-line" />}
      <article
        className={`ca__card ${!item.is_active ? 'is-off' : ''} ${busy ? 'is-busy' : ''}`}
        draggable={!editingPrice}
        onDragStart={(e) => { drag.current = { id: item.id, from: catId }; e.dataTransfer.effectAllowed = 'move' }}
        onDragEnd={() => { drag.current = { id: null, from: null } }}
        onDragOver={(e) => { if (drag.current.id != null) { e.preventDefault(); onDragEnterCard() } }}
      >
        <div className="ca__card-move">
          <button className="ca__move-btn" disabled={isFirst} onClick={onMove ? () => onMove(-1) : undefined} title="Subir">↑</button>
          <span className="ca__grip" aria-hidden title="Arrastrar entre secciones">⋮⋮</span>
          <button className="ca__move-btn" disabled={isLast} onClick={onMove ? () => onMove(1) : undefined} title="Bajar">↓</button>
        </div>
        {item.photo_url && <img className="ca__card-pic" src={item.photo_url} alt="" />}
        <div className="ca__card-main">
          <div className="ca__card-name">{item.name}</div>
          {badges.length > 0 && (
            <div className="ca__card-badges">
              {badges.map((b) => <span key={b} className="ca__badge" style={{ background: badgeColor(b) }}>{b}</span>)}
            </div>
          )}
          {item.description && <div className="ca__card-desc">{item.description}</div>}
        </div>
        <div className="ca__card-side">
          {editingPrice ? (
            <span className="ca__price-edit"><span>$</span>
              <input autoFocus type="number" value={priceVal} onChange={(e) => setPriceVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') savePrice(); if (e.key === 'Escape') setEditingPrice(false) }} onBlur={savePrice} />
            </span>
          ) : (
            <button className="ca__price" onClick={() => { setPriceVal(String(Math.round(item.price))); setEditingPrice(true) }} title="Editar precio">{money(item.price)}</button>
          )}
          <div className="ca__card-tools">
            <label className="ca__switch" title={item.is_active ? 'En carta' : 'Apagado'}>
              <input type="checkbox" checked={item.is_active} onChange={toggleActive} disabled={busy} /><span /></label>
            <button className="ca__ico ca__ico--sm" onClick={onEdit} title="Editar">✎</button>
            <button className="ca__ico ca__ico--sm ca__ico--danger" onClick={remove} title="Eliminar">🗑</button>
          </div>
        </div>
      </article>
    </>
  )
}

/* ─────────── Modal producto (con badges) ─────────── */
function ItemModal({ token, data, categories, onClose, onSaved }) {
  const editing = !!data.item
  const it = data.item || {}
  const [form, setForm] = useState({
    categoryId: data.categoryId || it.category_id || categories?.[0]?.id || '',
    name: it.name || '', description: it.description || '',
    price: it.price != null ? String(Math.round(it.price)) : '',
    promoNote: it.promo_note || '', photoUrl: it.photo_url || '',
    badges: asArray(it.badges),
  })
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [uploading, setUploading] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setErr('')
    try {
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file) })
      const { url } = await adminUploadImage(token, dataUrl, 'menu')
      set('photoUrl', url)
    } catch (e2) { setErr(e2.message || 'No se pudo subir la foto') } finally { setUploading(false); e.target.value = '' }
  }
  const toggleBadge = (b) => setForm((f) => ({ ...f, badges: f.badges.includes(b) ? f.badges.filter((x) => x !== b) : [...f.badges, b] }))
  const addCustom = () => { const v = custom.trim(); if (v && !form.badges.includes(v)) set('badges', [...form.badges, v]); setCustom('') }

  const save = async () => {
    if (!form.name.trim()) { setErr('El nombre es obligatorio.'); return }
    if (form.price !== '' && !Number.isFinite(Number(form.price))) { setErr('Precio inválido.'); return }
    setBusy(true); setErr('')
    const body = {
      categoryId: Number(form.categoryId), name: form.name.trim(),
      description: form.description.trim() || null, price: Number(form.price) || 0,
      isPromo: form.badges.includes('Promo'),
      promoNote: form.promoNote.trim() || null, photoUrl: form.photoUrl.trim() || null,
      badges: form.badges,
    }
    try { if (editing) await adminUpdateMenuItem(token, it.id, body); else await adminCreateMenuItem(token, body); onSaved() }
    catch (e) { setErr(e.message || 'Error'); setBusy(false) }
  }

  return (
    <Modal onClose={onClose} title={editing ? 'Editar producto' : 'Nuevo producto'}>
      <div className="ca__form">
        <Field label="Sección">
          <select className="ca__input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </Field>
        <Field label="Nombre"><input className="ca__input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Hamburguesa completa" autoFocus /></Field>
        <Field label="Descripción (opcional)"><input className="ca__input" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Ej. c/ papas fritas" /></Field>
        <Field label="Precio ($)"><input className="ca__input" type="number" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="9000" /></Field>

        <Field label="Etiquetas destacadas">
          <div className="ca__badge-picker">
            {BADGE_PRESETS.map((b) => (
              <button key={b} type="button" className={`ca__badge-opt ${form.badges.includes(b) ? 'is-on' : ''}`}
                style={form.badges.includes(b) ? { background: badgeColor(b), borderColor: badgeColor(b), color: '#fff' } : {}}
                onClick={() => toggleBadge(b)}>{b}</button>
            ))}
          </div>
          <div className="ca__badge-custom">
            <input className="ca__input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Etiqueta propia…"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }} />
            <button type="button" className="ca__btn ca__btn--ghost" onClick={addCustom}>Agregar</button>
          </div>
          {form.badges.filter((b) => !BADGE_PRESETS.includes(b)).length > 0 && (
            <div className="ca__badge-picker">
              {form.badges.filter((b) => !BADGE_PRESETS.includes(b)).map((b) => (
                <button key={b} type="button" className="ca__badge-opt is-on" style={{ background: badgeColor(b), borderColor: badgeColor(b), color: '#fff' }} onClick={() => toggleBadge(b)}>{b} ✕</button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Foto del producto (opcional)">
          {form.photoUrl && <img className="ca__photo-preview" src={form.photoUrl} alt="" />}
          <div className="ca__photo-actions">
            <label className={`ca__btn ca__btn--ghost ca__upload-btn ${uploading ? 'is-busy' : ''}`}>
              {uploading ? 'Subiendo…' : '📷 Subir foto'}
              <input type="file" accept="image/*" onChange={onFile} disabled={uploading} hidden />
            </label>
            {form.photoUrl && <button type="button" className="ca__btn ca__btn--danger-ghost" onClick={() => set('photoUrl', '')}>Quitar</button>}
          </div>
          <input className="ca__input" value={form.photoUrl} onChange={(e) => set('photoUrl', e.target.value)} placeholder="…o pegá una URL" />
        </Field>

        {err && <p className="ca__form-err">{err}</p>}
        <div className="ca__form-actions">
          <button className="ca__btn ca__btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="ca__btn ca__btn--gold" onClick={save} disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar' : 'Crear'}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────── Modal sección (con grupo MENÚ/BEBIDAS) ─────────── */
function CategoryModal({ token, data, onClose, onSaved }) {
  const editing = !!data.category
  const c = data.category || {}
  const [name, setName] = useState(c.name || '')
  const [icon, setIcon] = useState(c.icon || '🍽️')
  const [group, setGroup] = useState(c.food_group || data.presetGroup || 'bebidas')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (!name.trim()) { setErr('El nombre es obligatorio.'); return }
    setBusy(true); setErr('')
    try {
      if (editing) await adminUpdateMenuCategory(token, c.id, { name: name.trim(), icon, foodGroup: group })
      else await adminCreateMenuCategory(token, { name: name.trim(), icon, foodGroup: group })
      onSaved()
    } catch (e) { setErr(e.message || 'Error'); setBusy(false) }
  }
  const remove = async () => {
    if (!confirm(`¿Eliminar la sección "${c.name}" y todos sus productos?`)) return
    setBusy(true)
    try { await adminDeleteMenuCategory(token, c.id); onSaved() } catch (e) { setErr(e.message || 'Error'); setBusy(false) }
  }

  return (
    <Modal onClose={onClose} title={editing ? 'Editar sección' : 'Nueva sección'}>
      <div className="ca__form">
        <Field label="Nombre"><input className="ca__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Tragos" autoFocus /></Field>
        <Field label="Grupo">
          <div className="ca__seg">
            {GROUPS.map((g) => (
              <button key={g.key} type="button" className={`ca__seg-btn ${group === g.key ? 'is-on' : ''}`} onClick={() => setGroup(g.key)}>{g.label}</button>
            ))}
          </div>
        </Field>
        <Field label="Ícono">
          <div className="ca__icon-grid">
            {ICONS.map((ic) => <button key={ic} type="button" className={`ca__icon-pick ${icon === ic ? 'is-on' : ''}`} onClick={() => setIcon(ic)}>{ic}</button>)}
          </div>
        </Field>
        {err && <p className="ca__form-err">{err}</p>}
        <div className="ca__form-actions">
          {editing && <button className="ca__btn ca__btn--danger-ghost" onClick={remove} disabled={busy}>Eliminar</button>}
          <span style={{ flex: 1 }} />
          <button className="ca__btn ca__btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="ca__btn ca__btn--gold" onClick={save} disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar' : 'Crear'}</button>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────── Aumento masivo ─────────── */
function BulkPriceModal({ token, menu, onClose, onApplied }) {
  const [scope, setScope] = useState('all')
  const [categoryId, setCategoryId] = useState(menu?.[0]?.id || '')
  const [mode, setMode] = useState('percent')
  const [value, setValue] = useState('15')
  const [roundTo, setRoundTo] = useState('500')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const body = (apply) => ({ scope, categoryId: scope === 'category' ? Number(categoryId) : null, mode, value: Number(value), roundTo: Number(roundTo), apply })
  const doPreview = async () => { setErr(''); if (!Number.isFinite(Number(value))) { setErr('Número inválido.'); return } setBusy(true); try { setPreview(await adminMenuBulkPrice(token, body(false))) } catch (e) { setErr(e.message) } finally { setBusy(false) } }
  const doApply = async () => { setBusy(true); try { const d = await adminMenuBulkPrice(token, body(true)); onApplied(d.count) } catch (e) { setErr(e.message); setBusy(false) } }

  return (
    <Modal onClose={onClose} title="📈 Aumentar precios" wide>
      <div className="ca__form">
        <Field label="Alcance">
          <div className="ca__seg">
            {[['all', 'Toda la carta'], ['category', 'Una sección']].map(([v, l]) => (
              <button key={v} type="button" className={`ca__seg-btn ${scope === v ? 'is-on' : ''}`} onClick={() => { setScope(v); setPreview(null) }}>{l}</button>
            ))}
          </div>
        </Field>
        {scope === 'category' && (
          <Field label="Sección"><select className="ca__input" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPreview(null) }}>{menu?.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></Field>
        )}
        <div className="ca__bulk-row">
          <Field label="Tipo"><div className="ca__seg">{[['percent', '%'], ['fixed', '$ fijo']].map(([v, l]) => <button key={v} type="button" className={`ca__seg-btn ${mode === v ? 'is-on' : ''}`} onClick={() => { setMode(v); setPreview(null) }}>{l}</button>)}</div></Field>
          <Field label={mode === 'percent' ? 'Aumento (%)' : 'Aumento ($)'}><input className="ca__input" type="number" value={value} onChange={(e) => { setValue(e.target.value); setPreview(null) }} /></Field>
        </div>
        <Field label="Redondeo">
          <div className="ca__seg ca__seg--wrap">{[['0', 'Sin'], ['100', '$100'], ['500', '$500'], ['1000', '$1.000']].map(([v, l]) => <button key={v} type="button" className={`ca__seg-btn ${roundTo === v ? 'is-on' : ''}`} onClick={() => { setRoundTo(v); setPreview(null) }}>{l}</button>)}</div>
        </Field>
        {err && <p className="ca__form-err">{err}</p>}
        {!preview && <button className="ca__btn ca__btn--gold ca__btn--block" onClick={doPreview} disabled={busy}>{busy ? 'Calculando…' : 'Ver previsualización'}</button>}
      </div>
      {preview && (
        <div className="ca__preview">
          <div className="ca__preview-head"><span><strong>{preview.count}</strong> cambian</span><button className="ca__link" onClick={() => setPreview(null)}>← Ajustar</button></div>
          {preview.count === 0 ? <p className="ca__preview-empty">Ningún precio cambia.</p> : (
            <>
              <div className="ca__preview-list">{preview.preview.map((p) => <div key={p.id} className="ca__preview-row"><span className="ca__preview-name">{p.name}</span><span className="ca__preview-old">{money(p.oldPrice)}</span><span className="ca__preview-arrow">→</span><span className="ca__preview-new">{money(p.newPrice)}</span></div>)}</div>
              <button className="ca__btn ca__btn--apply ca__btn--block" onClick={doApply} disabled={busy}>{busy ? 'Aplicando…' : `✓ Aplicar a ${preview.count}`}</button>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}

/* ─────────── Pantalla de Precios (tabla editable + costo/margen + historial) ─────────── */
const roundUp = (n, r) => (r > 0 ? Math.ceil(n / r) * r : Math.round(n))
const QUICK_PCTS = [5, 10, 15, 20]

/* ─────────── Recetas (insumos + composición → costo automático) ─────────── */
const UNITS = [
  { v: 'medida', label: 'medida (50ml)' },
  { v: 'ml', label: 'ml' },
  { v: 'unidad', label: 'unidad' },
]
const unitLabel = (u) => (UNITS.find((x) => x.v === u)?.label || u)

function RecipesView({ menu, token, flash, reload }) {
  const [tab, setTab] = useState('recipes') // 'recipes' | 'ingredients'
  const [ings, setIngs] = useState(null)

  const loadIngs = async () => {
    try { const d = await adminIngredients(token); setIngs(d.ingredients || []) }
    catch (e) { flash(e.message || 'Error', 'err') }
  }
  useEffect(() => { loadIngs() }, []) // eslint-disable-line

  return (
    <div className="ca__recipes">
      <div className="ca__rtabs">
        <button className={tab === 'recipes' ? 'is-on' : ''} onClick={() => setTab('recipes')}>🍹 Tragos y medidas</button>
        <button className={tab === 'ingredients' ? 'is-on' : ''} onClick={() => setTab('ingredients')}>🧴 Insumos {ings ? `(${ings.length})` : ''}</button>
      </div>
      <p className="ca__rhint">El costo de cada trago se calcula solo: <b>suma de (cantidad × costo del insumo)</b>. Cambiás el costo de un insumo y se actualizan todos los tragos que lo usan.</p>
      {tab === 'ingredients'
        ? <IngredientsPanel ings={ings} token={token} flash={flash} reload={loadIngs} reloadMenu={reload} />
        : <RecipesPanel menu={menu} ings={ings || []} token={token} flash={flash} reloadMenu={reload} />}
    </div>
  )
}

function IngredientsPanel({ ings, token, flash, reload, reloadMenu }) {
  const [nw, setNw] = useState({ name: '', unit: 'medida', unitCost: '' })
  const [busy, setBusy] = useState(false)

  const saveField = async (id, body) => {
    try {
      const d = await adminIngredientUpdate(token, id, body)
      const n = d.ingredient?.recalculated?.filter((r) => r.hasRecipe).length || 0
      flash(n ? `Guardado · ${n} trago(s) recalculados` : 'Guardado ✓')
      reload(); if (n) reloadMenu()
    } catch (e) { flash(e.message || 'Error', 'err') }
  }
  const add = async () => {
    if (!nw.name.trim()) { flash('Poné un nombre', 'err'); return }
    setBusy(true)
    try {
      await adminIngredientCreate(token, { name: nw.name.trim(), unit: nw.unit, unitCost: Number(nw.unitCost) || 0 })
      setNw({ name: '', unit: 'medida', unitCost: '' }); flash('Insumo agregado ✓'); reload()
    } catch (e) { flash(e.message || 'Error', 'err') } finally { setBusy(false) }
  }
  const del = async (id, name) => {
    if (!window.confirm(`¿Borrar el insumo "${name}"? Se quita de las recetas que lo usan y esos tragos se recalculan.`)) return
    try { await adminIngredientDelete(token, id); flash('Insumo borrado'); reload(); reloadMenu() }
    catch (e) { flash(e.message || 'Error', 'err') }
  }

  if (!ings) return <p className="ca__loading">Cargando insumos…</p>

  return (
    <div className="ca__ingredients">
      <div className="ca__ing-head">
        <span>Insumo</span><span>Unidad</span><span className="ca__col-num">Costo x unidad</span><span className="ca__col-num">Usado en</span><span />
      </div>
      {ings.map((i) => (
        <div key={i.id} className="ca__ing-row">
          <input className="ca__input" defaultValue={i.name} onBlur={(e) => e.target.value.trim() && e.target.value !== i.name && saveField(i.id, { name: e.target.value.trim() })} />
          <select className="ca__input" defaultValue={i.unit} onChange={(e) => saveField(i.id, { unit: e.target.value })}>
            {UNITS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
          </select>
          <span className="ca__ing-costbox">$<input className="ca__input ca__input--num" type="number" defaultValue={Math.round(i.unit_cost)} onBlur={(e) => Number(e.target.value) !== Math.round(i.unit_cost) && saveField(i.id, { unitCost: Number(e.target.value) || 0 })} /></span>
          <span className="ca__col-num ca__ing-used">{i.used_in || 0}</span>
          <button className="ca__ing-del" onClick={() => del(i.id, i.name)} title="Borrar insumo">✕</button>
        </div>
      ))}
      <div className="ca__ing-row ca__ing-row--new">
        <input className="ca__input" placeholder="Nuevo insumo (ej. Gin Heredero)" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <select className="ca__input" value={nw.unit} onChange={(e) => setNw({ ...nw, unit: e.target.value })}>
          {UNITS.map((u) => <option key={u.v} value={u.v}>{u.label}</option>)}
        </select>
        <span className="ca__ing-costbox">$<input className="ca__input ca__input--num" type="number" placeholder="0" value={nw.unitCost} onChange={(e) => setNw({ ...nw, unitCost: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} /></span>
        <span />
        <button className="ca__btn ca__btn--gold" onClick={add} disabled={busy}>＋</button>
      </div>
    </div>
  )
}

function RecipesPanel({ menu, ings, token, flash, reloadMenu }) {
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)
  const [showFood, setShowFood] = useState(false) // por defecto solo bebidas
  const q = search.trim().toLowerCase()
  const items = menu
    .filter((c) => showFood || c.food_group !== 'menu') // 'menu' = comida; el resto = bebidas
    .flatMap((c) => (c.items || []).map((i) => ({ ...i, catName: c.name, foodGroup: c.food_group })))
    .filter((i) => !q || i.name.toLowerCase().includes(q) || i.catName.toLowerCase().includes(q))

  if (!ings.length) {
    return <p className="ca__rempty">Primero cargá insumos en la pestaña <b>Insumos</b> para armar recetas.</p>
  }

  return (
    <div className="ca__rpanel">
      <div className="ca__rpanel-bar">
        <input className="ca__input ca__search" placeholder="🔍 Buscar trago o producto…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="ca__rfood"><input type="checkbox" checked={showFood} onChange={(e) => setShowFood(e.target.checked)} /> Mostrar comida</label>
      </div>
      <div className="ca__rlist">
        {items.map((it) => {
          const isOpen = openId === it.id
          const price = Math.round(Number(it.price))
          const cost = it.cost != null ? Math.round(Number(it.cost)) : null
          const margin = cost != null && price > 0 ? Math.round(((price - cost) / price) * 100) : null
          return (
            <div key={it.id} className={`ca__ritem ${isOpen ? 'is-open' : ''}`}>
              <button className="ca__ritem-head" onClick={() => setOpenId(isOpen ? null : it.id)}>
                <span className="ca__ritem-name">{it.name}<i>{it.catName}</i></span>
                <span className="ca__ritem-nums">
                  <span className="ca__ritem-cost">{cost != null ? `costo ${money(cost)}` : 'sin receta'}</span>
                  {margin != null && <span className={`ca__ritem-margin ${margin < 0 ? 'neg' : ''}`}>{margin}%</span>}
                  <span className="ca__ritem-arrow">{isOpen ? '▲' : '▼'}</span>
                </span>
              </button>
              {isOpen && <RecipeEditor item={it} ings={ings} token={token} flash={flash} reloadMenu={reloadMenu} />}
            </div>
          )
        })}
        {items.length === 0 && <p className="ca__loading">Nada coincide con la búsqueda.</p>}
      </div>
    </div>
  )
}

function RecipeEditor({ item, ings, token, flash, reloadMenu }) {
  const [lines, setLines] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      try { const d = await adminGetRecipe(token, item.id); setLines((d.recipe || []).map((r) => ({ ingredient_id: String(r.ingredient_id), quantity: String(r.quantity) }))) }
      catch (e) { flash(e.message || 'Error', 'err'); setLines([]) }
    })()
  }, [item.id]) // eslint-disable-line

  if (!lines) return <div className="ca__recipe"><p className="ca__loading">Cargando receta…</p></div>

  const ingOf = (id) => ings.find((i) => String(i.id) === String(id))
  const total = lines.reduce((s, l) => { const ing = ingOf(l.ingredient_id); return s + (ing ? Number(ing.unit_cost) * (Number(l.quantity) || 0) : 0) }, 0)
  const price = Math.round(Number(item.price))
  const margin = price > 0 ? Math.round(((price - total) / price) * 100) : null

  const setLine = (idx, patch) => setLines((ls) => ls.map((l, i) => i === idx ? { ...l, ...patch } : l))
  const addLine = () => setLines((ls) => [...ls, { ingredient_id: String(ings[0]?.id || ''), quantity: '1' }])
  const delLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx))

  const save = async () => {
    setSaving(true)
    try {
      const payload = lines.filter((l) => l.ingredient_id && Number(l.quantity) > 0).map((l) => ({ ingredientId: Number(l.ingredient_id), quantity: Number(l.quantity) }))
      const d = await adminSetRecipe(token, item.id, payload)
      flash(d.hasRecipe ? `Receta guardada · costo ${money(d.cost || 0)}` : 'Receta vaciada')
      reloadMenu()
    } catch (e) { flash(e.message || 'Error', 'err') } finally { setSaving(false) }
  }

  return (
    <div className="ca__recipe">
      {lines.map((l, idx) => {
        const ing = ingOf(l.ingredient_id)
        const lineCost = ing ? Number(ing.unit_cost) * (Number(l.quantity) || 0) : 0
        return (
          <div key={idx} className="ca__rline">
            <select className="ca__input" value={l.ingredient_id} onChange={(e) => setLine(idx, { ingredient_id: e.target.value })}>
              {ings.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <span className="ca__rline-qty">
              <input className="ca__input ca__input--num" type="number" step="0.1" min="0" value={l.quantity} onChange={(e) => setLine(idx, { quantity: e.target.value })} />
              <i>{ing ? unitLabel(ing.unit).split(' ')[0] : ''}</i>
            </span>
            <span className="ca__rline-cost">{money(lineCost)}</span>
            <button className="ca__rline-del" onClick={() => delLine(idx)} title="Quitar">✕</button>
          </div>
        )
      })}
      <button className="ca__rline-add" onClick={addLine}>＋ Agregar insumo</button>

      <div className="ca__recipe-foot">
        <div className="ca__recipe-totals">
          <span className="ca__recipe-total">Costo: <b>{money(total)}</b></span>
          <span className="ca__recipe-sale">Venta: {money(price)}</span>
          {margin != null && <span className={`ca__recipe-margin ${margin < 0 ? 'neg' : ''}`}>Margen {margin}%</span>}
        </div>
        <button className="ca__btn ca__btn--apply" onClick={save} disabled={saving}>{saving ? 'Guardando…' : '✓ Guardar receta'}</button>
      </div>
    </div>
  )
}

function PricesView({ menu, token, flash, reload }) {
  const [draft, setDraft] = useState({})        // { id: newPriceString }
  const [costDraft, setCostDraft] = useState({}) // { id: costString }
  const [excluded, setExcluded] = useState(() => new Set()) // productos excluidos del aumento (destildados)
  const [catPct, setCatPct] = useState({})      // { catId: pctString } — aumento por categoría
  const [roundTo, setRoundTo] = useState('0')   // default: sin redondeo
  const [pctInput, setPctInput] = useState('')
  const [search, setSearch] = useState('')
  const [hiddenCats, setHiddenCats] = useState(() => new Set()) // secciones ocultas del filtro
  const [saving, setSaving] = useState(false)
  const [histOpen, setHistOpen] = useState(false)
  const [morphiOpen, setMorphiOpen] = useState(false)
  const [snapOpen, setSnapOpen] = useState(false)

  // Filtro: secciones visibles + búsqueda por nombre
  const q = search.trim().toLowerCase()
  const filtered = menu
    .filter((c) => !hiddenCats.has(c.id))
    .map((c) => ({ ...c, items: q ? c.items.filter((it) => it.name.toLowerCase().includes(q)) : c.items }))
    .filter((c) => c.items.length > 0)
  const visibleItems = filtered.flatMap((c) => c.items)

  // El aumento aplica a los productos INCLUIDOS (los destildados quedan afuera)
  const incl = (i) => !excluded.has(i.id)
  const applyToItems = (items, pct) => {
    if (!Number.isFinite(pct) || pct === 0) return
    const nd = { ...draft }
    items.filter(incl).forEach((i) => { nd[i.id] = String(roundUp(Number(i.price) * (1 + pct / 100), Number(roundTo))) })
    setDraft(nd)
  }
  const applyGlobal = (pct) => applyToItems(visibleItems, pct)
  const applyCat = (cat) => applyToItems(cat.items, Number(catPct[cat.id]))

  const toggleExcl = (id) => setExcluded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleCatExcl = (cat) => setExcluded((s) => {
    const n = new Set(s); const ids = cat.items.map((i) => i.id)
    const anyIncl = ids.some((id) => !n.has(id)) // si hay alguno incluido → excluir todos; si todos excluidos → incluir todos
    ids.forEach((id) => anyIncl ? n.add(id) : n.delete(id)); return n
  })
  const toggleCatVisible = (id) => setHiddenCats((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const clearAll = () => { setDraft({}); setExcluded(new Set()); setCatPct({}) }

  const pending = menu.flatMap((c) => c.items).filter((i) => draft[i.id] != null && draft[i.id] !== '' && Number(draft[i.id]) !== Math.round(Number(i.price)))
  const save = async () => {
    if (!pending.length) { flash('No hay cambios de precio', 'err'); return }
    setSaving(true)
    try {
      const r = await adminMenuBatchPrices(token, pending.map((i) => ({ id: i.id, price: Number(draft[i.id]) })))
      setDraft({}); setExcluded(new Set()); setCatPct({}); flash(`${r.changed} precios guardados ✓`); reload()
    } catch (e) { flash(e.message || 'Error', 'err') } finally { setSaving(false) }
  }
  const saveCost = async (id, val) => {
    const num = val === '' ? null : Number(val)
    if (val !== '' && !Number.isFinite(num)) return
    try { await adminMenuSetCost(token, id, num); flash('Costo guardado ✓') }
    catch (e) { flash(e.message || 'Error', 'err') }
  }
  const scope = excluded.size ? `toda la carta · ${excluded.size} excluido(s)` : (q || hiddenCats.size ? 'lo filtrado' : 'toda la carta')

  return (
    <div className="ca__prices">
      <div className="ca__prices-bar">
        {/* Aumento global */}
        <div className="ca__ctl-row">
          <span className="ca__ctl-lbl">Aumento general <b>{scope}</b></span>
          <div className="ca__pct-apply">
            <span className="ca__pct-field">+<input className="ca__input" type="number" placeholder="0" value={pctInput}
              onChange={(e) => setPctInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') applyGlobal(Number(pctInput)) }} />%</span>
            <button className="ca__btn ca__btn--gold" onClick={() => applyGlobal(Number(pctInput))} disabled={!pctInput}>Aplicar</button>
            <span className="ca__pct-quick">{QUICK_PCTS.map((p) => <button key={p} onClick={() => { setPctInput(String(p)); applyGlobal(p) }}>{p}</button>)}</span>
          </div>
        </div>
        {/* Redondeo */}
        <div className="ca__ctl-row">
          <span className="ca__ctl-lbl">Redondeo</span>
          <div className="ca__seg">
            {['0', '100', '500', '1000'].map((v) => <button key={v} className={`ca__seg-btn ${roundTo === v ? 'is-on' : ''}`} onClick={() => setRoundTo(v)}>{v === '0' ? 'No' : `$${Number(v).toLocaleString('es-AR')}`}</button>)}
          </div>
        </div>
        {/* Filtros */}
        <div className="ca__ctl-row">
          <span className="ca__ctl-lbl">Filtrar</span>
          <input className="ca__input ca__search" placeholder="🔍 Buscar producto…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="ca__btn ca__btn--ghost" onClick={() => setHistOpen(true)}>🕓 Historial</button>
          <button className="ca__btn ca__btn--ghost" onClick={() => setSnapOpen(true)}>💾 Versiones</button>
          <button className="ca__btn ca__btn--gold" onClick={() => setMorphiOpen(true)}>📋 Para Morphi</button>
        </div>
        <div className="ca__fchips">
          {hiddenCats.size > 0 && <button className="ca__fchip-all" onClick={() => setHiddenCats(new Set())}>Ver todas</button>}
          {menu.map((c) => (
            <button key={c.id} className={`ca__fchip ${hiddenCats.has(c.id) ? 'is-off' : 'is-on'}`} onClick={() => toggleCatVisible(c.id)}>
              {hiddenCats.has(c.id) ? '○' : '✓'} {c.name}
            </button>
          ))}
        </div>
        <p className="ca__prices-hint">Tip: destildá un producto para que NO entre en el aumento de su sección.</p>
      </div>

      {/* Encabezados de columna */}
      <div className="ca__ptable-head">
        <span />
        <span>Producto</span>
        <span className="ca__col-num">Actual</span>
        <span className="ca__col-num">Nuevo</span>
        <span className="ca__col-num">%</span>
        <span className="ca__col-num">Costo</span>
        <span className="ca__col-num">Margen</span>
      </div>

      <div className="ca__ptable">
        {filtered.map((cat) => {
          const allIncl = cat.items.every(incl)
          return (
            <div key={cat.id} className="ca__pgroup">
              <div className="ca__pgroup-head">
                <label className="ca__check"><input type="checkbox" checked={allIncl} onChange={() => toggleCatExcl(cat)} /><span>{cat.name}</span></label>
                <div className="ca__catpct">
                  <span className="ca__catpct-field">+<input type="number" placeholder="%" value={catPct[cat.id] || ''}
                    onChange={(e) => setCatPct((p) => ({ ...p, [cat.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') applyCat(cat) }} /></span>
                  <button className="ca__catpct-btn" onClick={() => applyCat(cat)} disabled={!catPct[cat.id]}>Aumentar sección</button>
                </div>
              </div>
              {cat.items.map((it) => {
                const cur = Math.round(Number(it.price))
                const next = draft[it.id] != null && draft[it.id] !== '' ? Number(draft[it.id]) : cur
                const pct = cur > 0 ? Math.round(((next - cur) / cur) * 100) : 0
                const changed = next !== cur
                const isExcl = excluded.has(it.id)
                const costVal = costDraft[it.id] != null ? costDraft[it.id] : (it.cost != null ? String(Math.round(it.cost)) : '')
                const costNum = costVal === '' ? null : Number(costVal)
                const margin = costNum != null && next > 0 ? Math.round(((next - costNum) / next) * 100) : null
                return (
                  <div key={it.id} className={`ca__prow ${changed ? 'is-changed' : ''} ${isExcl ? 'is-excl' : ''}`}>
                    <label className="ca__check ca__prow-check" title={isExcl ? 'Excluido del aumento' : 'Entra en el aumento'}><input type="checkbox" checked={!isExcl} onChange={() => toggleExcl(it.id)} /></label>
                    <span className="ca__prow-name">{it.name}</span>
                    <span className="ca__pcell"><i className="ca__plabel">Actual</i><span className="ca__prow-cur">{money(cur)}</span></span>
                    <span className="ca__pcell"><i className="ca__plabel">Nuevo</i><span className="ca__prow-newbox">$<input className="ca__prow-input" type="number" value={draft[it.id] != null ? draft[it.id] : ''} placeholder={String(cur)}
                      onChange={(e) => setDraft((d) => ({ ...d, [it.id]: e.target.value }))} /></span></span>
                    <span className="ca__pcell"><i className="ca__plabel">%</i><span className={`ca__prow-pct ${pct > 0 ? 'up' : pct < 0 ? 'down' : ''}`}>{changed ? `${pct > 0 ? '+' : ''}${pct}%` : '—'}</span></span>
                    <span className="ca__pcell"><i className="ca__plabel">Costo</i><span className="ca__prow-costbox">$<input className="ca__prow-input ca__prow-input--cost" type="number" value={costVal} placeholder="—"
                      onChange={(e) => setCostDraft((d) => ({ ...d, [it.id]: e.target.value }))} onBlur={(e) => saveCost(it.id, e.target.value)} /></span></span>
                    <span className="ca__pcell"><i className="ca__plabel">Margen</i><span className="ca__prow-marginval">{margin != null ? `${margin}%` : '—'}</span></span>
                  </div>
                )
              })}
            </div>
          )
        })}
        {filtered.length === 0 && <p className="ca__loading">Nada coincide con el filtro.</p>}
      </div>

      <div className="ca__prices-foot">
        <button className="ca__btn ca__btn--ghost" onClick={clearAll} disabled={!pending.length && !excluded.size}>Descartar</button>
        <span className="ca__prices-count">{pending.length ? `${pending.length} con precio nuevo` : 'Sin cambios'}</span>
        <button className="ca__btn ca__btn--apply" onClick={save} disabled={saving || !pending.length}>{saving ? 'Guardando…' : `✓ Guardar ${pending.length || ''}`}</button>
      </div>

      {histOpen && <PriceHistoryModal token={token} onClose={() => setHistOpen(false)} />}
      {morphiOpen && <MorphiModal onClose={() => setMorphiOpen(false)} flash={flash} />}
      {snapOpen && <SnapshotsModal token={token} flash={flash} reload={reload} onClose={() => setSnapOpen(false)} />}
    </div>
  )
}

/* ─────────── Versiones de precios (guardar / restaurar) ─────────── */
function SnapshotsModal({ token, flash, reload, onClose }) {
  const [snaps, setSnaps] = useState(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = () => adminMenuSnapshots(token).then((d) => setSnaps(d.snapshots || [])).catch((e) => setErr(e.message || 'Error'))
  useEffect(() => { load() }, []) // eslint-disable-line

  const save = async () => {
    if (!name.trim()) { setErr('Poné un nombre (ej. "Lista junio 2026").'); return }
    setBusy(true); setErr('')
    try { await adminMenuSnapshotCreate(token, name.trim()); setName(''); flash('Versión guardada ✓'); load() }
    catch (e) { setErr(e.message || 'Error') } finally { setBusy(false) }
  }
  const restore = async (s) => {
    if (!confirm(`¿Restaurar la versión "${s.name}"?\n\nTodos los precios vuelven al estado de esa versión. Los cambios quedan registrados para Morphi.`)) return
    setBusy(true)
    try { const r = await adminMenuSnapshotRestore(token, s.id); flash(`${r.changed} precios restaurados ✓`); reload(); onClose() }
    catch (e) { setErr(e.message || 'Error'); setBusy(false) }
  }
  const remove = async (s) => {
    if (!confirm(`¿Borrar la versión "${s.name}"? (no afecta los precios actuales)`)) return
    try { await adminMenuSnapshotDelete(token, s.id); load() } catch (e) { setErr(e.message || 'Error') }
  }
  const fmtDate = (s) => { try { return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return s } }

  return (
    <Modal onClose={onClose} title="💾 Versiones de precios" wide>
      <p className="ca__morphi-intro">Guardá el estado actual de TODOS los precios con un nombre. Si después cambiás y te arrepentís, restaurás esa versión y vuelve todo de un toque.</p>
      <div className="ca__snap-save">
        <input className="ca__input" placeholder='Nombre de la versión (ej. "Lista pre-aumento")' value={name}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save() }} />
        <button className="ca__btn ca__btn--gold" onClick={save} disabled={busy}>💾 Guardar actual</button>
      </div>
      {err && <p className="ca__form-err">{err}</p>}

      {!snaps && <p className="ca__loading">Cargando…</p>}
      {snaps?.length === 0 && <p className="ca__morphi-empty">Todavía no guardaste ninguna versión.</p>}
      {snaps?.length > 0 && (
        <div className="ca__snap-list">
          {snaps.map((s) => (
            <div key={s.id} className="ca__snap-row">
              <div className="ca__snap-info">
                <span className="ca__snap-name">{s.name}</span>
                <span className="ca__snap-meta">{fmtDate(s.created_at)} · {s.items_count} productos</span>
              </div>
              <div className="ca__snap-actions">
                <button className="ca__btn ca__btn--apply" onClick={() => restore(s)} disabled={busy}>↩ Restaurar</button>
                <button className="ca__ico ca__ico--danger" onClick={() => remove(s)} title="Borrar versión">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

/* ─────────── Cambios para Morphi (imagen + link cajera) ─────────── */
function MorphiModal({ onClose, flash }) {
  const [pending, setPending] = useState(null)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const sheetRef = useRef(null)
  const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  useEffect(() => {
    morphiPending(MORPHI_K).then((d) => setPending(d.pending || [])).catch((e) => setErr(e.message || 'Error'))
  }, [])

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(MORPHI_LINK); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch {}
  }
  const exportImg = async () => {
    if (!sheetRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(sheetRef.current, { backgroundColor: '#0c1f17', scale: 2 })
      const link = document.createElement('a')
      link.download = `precios-morphi-${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch { flash?.('No se pudo generar la imagen', 'err') } finally { setExporting(false) }
  }

  return (
    <Modal onClose={onClose} title="📋 Cambios para Morphi" wide>
      <p className="ca__morphi-intro">Estos precios cambiaron y faltan cargar en Morphi. Pasale la imagen a la cajera o el link para que vaya tildando.</p>

      <div className="ca__morphi-actions">
        <button className="ca__btn ca__btn--gold" onClick={exportImg} disabled={exporting || !pending?.length}>{exporting ? 'Generando…' : '📸 Descargar imagen'}</button>
        <button className="ca__btn ca__btn--ghost" onClick={copyLink}>{copied ? '✓ Link copiado' : '🔗 Copiar link de la cajera'}</button>
      </div>
      <p className="ca__morphi-link">{MORPHI_LINK}</p>

      {err && <p className="ca__form-err">{err}</p>}
      {!pending && !err && <p className="ca__loading">Cargando…</p>}
      {pending?.length === 0 && <p className="ca__morphi-empty">✅ Todo al día — no hay cambios pendientes.</p>}

      {pending?.length > 0 && (
        <div ref={sheetRef} className="ca__morphi-sheet">
          <div className="ca__morphi-sheet-head">
            <span className="ca__morphi-sheet-title">Cambios de precio — Sala Crespo Bar</span>
            <span className="ca__morphi-sheet-date">{today}</span>
          </div>
          {pending.map((it) => (
            <div key={it.item_id} className="ca__morphi-row">
              <span className="ca__morphi-row-name">{it.item_name}</span>
              <span className="ca__morphi-row-prices">
                <span className="ca__morphi-old">{money(it.old_price)}</span>
                <span className="ca__morphi-arrow">→</span>
                <span className="ca__morphi-new">{money(it.new_price)}</span>
              </span>
            </div>
          ))}
          <div className="ca__morphi-sheet-foot">Cargar estos precios nuevos en Morphi · {pending.length} producto{pending.length > 1 ? 's' : ''}</div>
        </div>
      )}
    </Modal>
  )
}

function PriceHistoryModal({ token, onClose }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    adminMenuPriceHistory(token, { limit: 150 }).then((d) => setRows(d.history || [])).catch((e) => setErr(e.message || 'Error'))
  }, [token])
  const SRC = { manual: 'Manual', bulk: 'Masivo', edit: 'Edición' }
  const fmtDate = (s) => { try { return new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return s } }
  return (
    <Modal onClose={onClose} title="🕓 Historial de precios" wide>
      {err && <p className="ca__form-err">{err}</p>}
      {!rows && !err && <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>Cargando…</p>}
      {rows && rows.length === 0 && <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>Todavía no hay cambios registrados.</p>}
      {rows && rows.length > 0 && (
        <div className="ca__hist">
          {rows.map((h) => (
            <div key={h.id} className="ca__hist-row">
              <div className="ca__hist-main">
                <span className="ca__hist-name">{h.item_name || `#${h.item_id}`}</span>
                <span className="ca__hist-prices">{money(h.old_price)} → <strong>{money(h.new_price)}</strong>
                  {h.pct != null && <span className={`ca__hist-pct ${h.pct > 0 ? 'up' : 'down'}`}>{h.pct > 0 ? '+' : ''}{h.pct}%</span>}
                </span>
              </div>
              <div className="ca__hist-meta"><span className="ca__hist-src">{SRC[h.source] || h.source}</span><span>{fmtDate(h.created_at)}</span></div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

/* ─────────── Shared ─────────── */
function Modal({ title, children, onClose, wide }) {
  return (
    <div className="ca__overlay" onClick={onClose}>
      <div className={`ca__modal ${wide ? 'ca__modal--wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="ca__modal-head"><h3>{title}</h3><button className="ca__modal-close" onClick={onClose}>✕</button></div>
        <div className="ca__modal-body">{children}</div>
      </div>
    </div>
  )
}
function Field({ label, children }) {
  return <label className="ca__field"><span className="ca__field-label">{label}</span>{children}</label>
}
function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { const r = await adminLogin(email, pass); localStorage.setItem('admin_info', JSON.stringify(r.admin)); onLogin(r.token) }
    catch (e2) { setErr(e2.message || 'Error'); setBusy(false) }
  }
  return (
    <div className="ca ca--login">
      <form className="ca__login-card" onSubmit={submit}>
        <span className="ca__login-icon">🍺</span>
        <h1>Carta — Tablero</h1><p>Ingresá con tu cuenta de administrador</p>
        <input className="ca__input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <input className="ca__input" type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)} />
        {err && <p className="ca__form-err">{err}</p>}
        <button className="ca__btn ca__btn--gold ca__btn--block" disabled={busy}>{busy ? 'Ingresando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}
