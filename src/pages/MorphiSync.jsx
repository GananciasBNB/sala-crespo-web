import { useEffect, useState, useCallback, useMemo } from 'react'
import { morphiPending, morphiMarkSynced, morphiMarkSyncedMany } from '../api/client'
import './MorphiSync.css'

const fmt = new Intl.NumberFormat('es-AR')
const money = (n) => `$${fmt.format(Math.round(Number(n) || 0))}`

// Checklist para la cajera: ve los cambios de precio pendientes de cargar en
// Morphi, agrupados por sección, y los tilda de a uno o por sección entera.
// Acceso con ?k=CODE (sin login).
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

  // Agrupa los pendientes por sección, conservando el orden que llega del backend.
  const groups = useMemo(() => {
    const map = new Map()
    for (const it of (pending || [])) {
      const cat = it.category_name || 'Otros'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(it)
    }
    return Array.from(map, ([name, items]) => ({ name, items }))
  }, [pending])

  const toggle = (cat) => setOpen((s) => { const n = new Set(s); n.has(cat) ? n.delete(cat) : n.add(cat); return n })

  const markDone = async (itemId) => {
    setBusyId(itemId)
    try { await morphiMarkSynced(k, itemId); setPending((p) => p.filter((x) => String(x.item_id) !== String(itemId))) }
    catch (e) { setError(e.message || 'No se pudo guardar'); setBusyId(null) }
  }

  const markCat = async (cat, items) => {
    setBusyCat(cat)
    const ids = items.map((x) => x.item_id)
    try {
      await morphiMarkSyncedMany(k, ids)
      const idSet = new Set(ids.map(String))
      setPending((p) => p.filter((x) => !idSet.has(String(x.item_id))))
    } catch (e) { setError(e.message || 'No se pudo guardar') }
    finally { setBusyCat(null) }
  }

  const total = pending?.length || 0

  return (
    <div className="morphi">
      <header className="morphi__head">
        <img src="https://www.saladejuegoscrespo.ar/logo-sin-fondo.png" alt="" className="morphi__logo" />
        <h1>Precios para cargar en Morphi</h1>
        <p>Cargá cada precio en Morphi y tocá <b>“✓ Cargado”</b>. Podés marcar una sección entera de una. La lista se actualiza sola.</p>
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
            <span className="morphi__count">{total} pendiente{total > 1 ? 's' : ''}</span>
            <span className="morphi__count-cats">{groups.length} sección{groups.length > 1 ? 'es' : ''}</span>
          </div>

          {/* Chips de salto rápido por sección */}
          <div className="morphi__chips">
            {groups.map((g) => (
              <button key={g.name} className={`morphi__chip ${open.has(g.name) ? 'is-open' : ''}`} onClick={() => toggle(g.name)}>
                {g.name} <b>{g.items.length}</b>
              </button>
            ))}
          </div>

          <div className="morphi__groups">
            {groups.map((g) => {
              const isOpen = open.has(g.name)
              return (
                <section key={g.name} className={`morphi__group ${isOpen ? 'is-open' : ''}`}>
                  <button className="morphi__group-head" onClick={() => toggle(g.name)}>
                    <span className="morphi__group-name">{g.name}</span>
                    <span className="morphi__group-badge">{g.items.length}</span>
                    <span className="morphi__group-arrow">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {isOpen && (
                    <>
                      <ul className="morphi__list">
                        {g.items.map((it) => (
                          <li key={it.item_id} className={`morphi__item ${busyId === it.item_id ? 'is-busy' : ''}`}>
                            <div className="morphi__info">
                              <span className="morphi__name">{it.item_name}</span>
                              <span className="morphi__prices">
                                <span className="morphi__old">{money(it.old_price)}</span>
                                <span className="morphi__arrow">→</span>
                                <span className="morphi__new">{money(it.new_price)}</span>
                              </span>
                            </div>
                            <button className="morphi__done" onClick={() => markDone(it.item_id)} disabled={busyId === it.item_id}>
                              ✓ Cargado
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button className="morphi__group-all" onClick={() => markCat(g.name, g.items)} disabled={busyCat === g.name}>
                        {busyCat === g.name ? 'Guardando…' : `✓ Marcar toda la sección (${g.items.length})`}
                      </button>
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
