import { useEffect, useState, useCallback } from 'react'
import { morphiPending, morphiMarkSynced } from '../api/client'
import './MorphiSync.css'

const fmt = new Intl.NumberFormat('es-AR')
const money = (n) => `$${fmt.format(Math.round(Number(n) || 0))}`

// Checklist para la cajera: ve los cambios de precio pendientes de cargar en
// Morphi y los tilda a medida que los hace. Acceso con ?k=CODE (sin login).
export default function MorphiSync() {
  const k = new URLSearchParams(window.location.search).get('k') || ''
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!k) { setError('Falta el código de acceso en el link.'); return }
    try { const d = await morphiPending(k); setPending(d.pending || []); setError('') }
    catch (e) { setError(e.status === 401 ? 'Código inválido. Pedí el link correcto.' : (e.message || 'Error al cargar')) }
  }, [k])

  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id) }, [load])

  const markDone = async (itemId) => {
    setBusyId(itemId)
    try { await morphiMarkSynced(k, itemId); setPending((p) => p.filter((x) => String(x.item_id) !== String(itemId))) }
    catch (e) { setError(e.message || 'No se pudo guardar'); setBusyId(null) }
  }

  return (
    <div className="morphi">
      <header className="morphi__head">
        <img src="https://www.saladejuegoscrespo.ar/logo-sin-fondo.png" alt="" className="morphi__logo" />
        <h1>Precios para cargar en Morphi</h1>
        <p>Cargá cada precio nuevo en Morphi y tocá <b>“✓ Cargado”</b>. La lista se actualiza sola.</p>
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

      {pending?.length > 0 && (
        <>
          <div className="morphi__count">{pending.length} pendiente{pending.length > 1 ? 's' : ''}</div>
          <ul className="morphi__list">
            {pending.map((it) => (
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
        </>
      )}
    </div>
  )
}
