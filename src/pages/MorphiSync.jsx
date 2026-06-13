import { useEffect, useState, useCallback, useMemo } from 'react'
import { morphiPending, morphiMarkSynced, morphiMarkSyncedMany, morphiMarkUnsynced } from '../api/client'
import './MorphiSync.css'

const fmt = new Intl.NumberFormat('es-AR')
const money = (n) => `$${fmt.format(Math.round(Number(n) || 0))}`

// Checklist para la cajera: ve los cambios de precio agrupados por sección.
// Al tildar "✓ Cargado" el ítem NO se borra: queda en verde con opción de
// deshacer (evita perder de vista lo que ya cargó). Acceso con ?k=CODE.
export default function MorphiSync() {
  const k = new URLSearchParams(window.location.search).get('k') || ''
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [busyCat, setBusyCat] = useState(null)
  const [open, setOpen] = useState(() => new Set()) // secciones expandidas

  const load = useCallback(async () => {
    if (!k) { setError('Falta el código de acceso en el link.'); return }
    try { const d = await morphiPending(k); setPending(d.pending || []); setError('') }
    catch (e) { setError(e.status === 401 ? 'Código inválido. Pedí el link correcto.' : (e.message || 'Error al cargar')) }
  }, [k])

  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id) }, [load])

  // Actualiza un ítem en el estado local sin recargar (para tildar/deshacer al toque).
  const patch = (itemId, synced) => setPending((p) =>
    (p || []).map((x) => String(x.item_id) === String(itemId) ? { ...x, synced } : x))

  // Agrupa por sección, conservando el orden del backend.
  const groups = useMemo(() => {
    const map = new Map()
    for (const it of (pending || [])) {
      const cat = it.category_name || 'Otros'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(it)
    }
    return Array.from(map, ([name, items]) => ({
      name, items,
      left: items.filter((i) => !i.synced).length, // pendientes en la sección
    }))
  }, [pending])

  const toggle = (cat) => setOpen((s) => { const n = new Set(s); n.has(cat) ? n.delete(cat) : n.add(cat); return n })

  const markDone = async (itemId) => {
    setBusyId(itemId); patch(itemId, true)
    try { await morphiMarkSynced(k, itemId) }
    catch (e) { setError(e.message || 'No se pudo guardar'); patch(itemId, false) }
    finally { setBusyId(null) }
  }
  const undo = async (itemId) => {
    setBusyId(itemId); patch(itemId, false)
    try { await morphiMarkUnsynced(k, itemId) }
    catch (e) { setError(e.message || 'No se pudo deshacer'); patch(itemId, true) }
    finally { setBusyId(null) }
  }
  const markCat = async (cat, items) => {
    setBusyCat(cat)
    const ids = items.filter((x) => !x.synced).map((x) => x.item_id)
    if (!ids.length) { setBusyCat(null); return }
    ids.forEach((id) => patch(id, true))
    try { await morphiMarkSyncedMany(k, ids) }
    catch (e) { setError(e.message || 'No se pudo guardar'); ids.forEach((id) => patch(id, false)) }
    finally { setBusyCat(null) }
  }

  const total = pending?.length || 0
  const left = (pending || []).filter((i) => !i.synced).length

  return (
    <div className="morphi">
      <header className="morphi__head">
        <img src="https://www.saladejuegoscrespo.ar/logo-sin-fondo.png" alt="" className="morphi__logo" />
        <h1>Precios para cargar en Morphi</h1>
        <p>Cargá cada precio en Morphi y tocá <b>“✓ Cargado”</b>. Quedan marcados en verde; si te equivocás, tocá <b>“Deshacer”</b>.</p>
      </header>

      {error && <p className="morphi__error">{error}</p>}
      {!pending && !error && <p className="morphi__loading">Cargando…</p>}

      {pending?.length === 0 && (
        <div className="morphi__empty">
          <span className="morphi__empty-icon">✅</span>
          <p className="morphi__empty-title">¡Todo al día!</p>
          <span>No hay precios pendientes de cargar.</span>
        </div>
      )}

      {total > 0 && (
        <>
          <div className="morphi__summary">
            <span className="morphi__count">{left} pendiente{left !== 1 ? 's' : ''}</span>
            {total - left > 0 && <span className="morphi__count morphi__count--done">{total - left} cargado{total - left !== 1 ? 's' : ''}</span>}
            <span className="morphi__count-cats">{groups.length} sección{groups.length !== 1 ? 'es' : ''}</span>
          </div>

          {/* Chips de salto rápido por sección */}
          <div className="morphi__chips">
            {groups.map((g) => (
              <button key={g.name} className={`morphi__chip ${open.has(g.name) ? 'is-open' : ''} ${g.left === 0 ? 'is-done' : ''}`} onClick={() => toggle(g.name)}>
                {g.name} <b>{g.left === 0 ? '✓' : g.left}</b>
              </button>
            ))}
          </div>

          <div className="morphi__groups">
            {groups.map((g) => {
              const isOpen = open.has(g.name)
              return (
                <section key={g.name} className={`morphi__group ${isOpen ? 'is-open' : ''} ${g.left === 0 ? 'is-done' : ''}`}>
                  <button className="morphi__group-head" onClick={() => toggle(g.name)}>
                    <span className="morphi__group-name">{g.name}</span>
                    <span className={`morphi__group-badge ${g.left === 0 ? 'is-done' : ''}`}>{g.left === 0 ? '✓' : g.left}</span>
                    <span className="morphi__group-arrow">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {isOpen && (
                    <>
                      <ul className="morphi__list">
                        {g.items.map((it) => (
                          <li key={it.item_id} className={`morphi__item ${busyId === it.item_id ? 'is-busy' : ''} ${it.synced ? 'is-done' : ''}`}>
                            <div className="morphi__info">
                              <span className="morphi__name">{it.item_name}</span>
                              <span className="morphi__prices">
                                <span className="morphi__old">{money(it.old_price)}</span>
                                <span className="morphi__arrow">→</span>
                                <span className="morphi__new">{money(it.new_price)}</span>
                              </span>
                            </div>
                            {it.synced ? (
                              <button className="morphi__undo" onClick={() => undo(it.item_id)} disabled={busyId === it.item_id}>
                                ↩ Deshacer
                              </button>
                            ) : (
                              <button className="morphi__done" onClick={() => markDone(it.item_id)} disabled={busyId === it.item_id}>
                                ✓ Cargado
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                      {g.left > 0 && (
                        <button className="morphi__group-all" onClick={() => markCat(g.name, g.items)} disabled={busyCat === g.name}>
                          {busyCat === g.name ? 'Guardando…' : `✓ Marcar toda la sección (${g.left})`}
                        </button>
                      )}
                    </>
                  )}
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
