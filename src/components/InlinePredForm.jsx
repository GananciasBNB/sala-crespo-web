import { useState } from 'react'
import { savePrediction } from '../api/client'

// Mini form de carga rápida de pronóstico — usado por TodayMatchesBlock y
// UpcomingMatchesBlock para que el jugador pueda cargar in-place sin ir al
// tab "pronosticos". Inputs 0-30 (mismo rango que el backend acepta).
//
// onSaved(matchId, home, away) lo dispara el padre para actualizar su state
// local de myPreds. Si onSaved no se provee, el form solo deja el feedback
// de "guardado ✓" pero no propaga el cambio.

export default function InlinePredForm({ matchId, token, onSaved, onCancel, compact = false }) {
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  function setNumber(setter) {
    return e => {
      const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2)
      const n = v === '' ? '' : Math.min(30, Math.max(0, parseInt(v, 10)))
      setter(n === '' ? '' : String(n))
    }
  }

  async function handleSave(e) {
    e?.preventDefault?.()
    if (busy) return
    setErr('')
    const h = parseInt(home, 10)
    const a = parseInt(away, 10)
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) {
      setErr('Cargá los dos resultados')
      return
    }
    setBusy(true)
    try {
      await savePrediction(token, matchId, h, a)
      if (onSaved) onSaved(matchId, h, a)
    } catch (e) {
      setErr(e?.message || 'No se pudo guardar')
      setBusy(false)
    }
  }

  return (
    <form
      className={`inline-pred ${compact ? 'inline-pred--compact' : ''}`}
      onSubmit={handleSave}
      noValidate
    >
      <div className="inline-pred__row">
        <input
          className="inline-pred__num"
          type="tel"
          inputMode="numeric"
          maxLength={2}
          value={home}
          placeholder="0"
          onChange={setNumber(setHome)}
          disabled={busy}
          aria-label="Goles local"
        />
        <span className="inline-pred__sep">—</span>
        <input
          className="inline-pred__num"
          type="tel"
          inputMode="numeric"
          maxLength={2}
          value={away}
          placeholder="0"
          onChange={setNumber(setAway)}
          disabled={busy}
          aria-label="Goles visitante"
        />
        <button type="submit" className="inline-pred__save" disabled={busy}>
          {busy ? '…' : 'Guardar'}
        </button>
        {onCancel && (
          <button
            type="button"
            className="inline-pred__cancel"
            onClick={onCancel}
            disabled={busy}
            aria-label="Cancelar"
          >×</button>
        )}
      </div>
      {err && <div className="inline-pred__err">{err}</div>}
    </form>
  )
}
