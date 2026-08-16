import { useState } from 'react'
import { promoLookupDni, promoDeliverFreeplay } from '../api/client'
import './FreePlayMode.css'

// Pantalla para la barra / promotora: entregar el ticket FÍSICO de Free Play de $5.000.
// Flujo: DNI → busca en la base (completa datos si faltan, o crea si es nueva) → registra
// la entrega → la operadora le da el ticket físico en mano. Uno por persona (por DNI).
// SIN mail: las clientas son mayores y no tienen email; solo teléfono.
const VALUE = '$5.000'

export default function FreePlayMode({ onExit }) {
  const [step, setStep] = useState('dni')   // dni | form | success | already
  const [dni, setDni] = useState('')
  const [player, setPlayer] = useState(null)
  const [name, setName] = useState('')
  const [tel, setTel] = useState('')
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  function reset() {
    setStep('dni'); setDni(''); setPlayer(null); setName(''); setTel(''); setResult(null); setErr('')
  }

  async function lookup() {
    setErr('')
    if (!/^\d{7,8}$/.test(dni.trim())) { setErr('Ingresá un DNI válido (7 u 8 dígitos).'); return }
    setBusy(true)
    try {
      const r = await promoLookupDni(dni.trim())
      if (r.exists && r.player) {
        setPlayer(r.player); setName(r.player.name || ''); setTel(r.player.tel || '')
      } else {
        setPlayer(null); setName(''); setTel('')
      }
      setStep('form')
    } catch (e) { setErr(e.message || 'No se pudo buscar el DNI.') }
    finally { setBusy(false) }
  }

  async function deliver() {
    setErr('')
    if (!player && name.trim().length < 3) { setErr('El nombre es obligatorio.'); return }
    if (tel.replace(/\D/g, '').length < 6) { setErr('Cargá el teléfono de la clienta.'); return }
    setBusy(true)
    try {
      const r = await promoDeliverFreeplay({ dni: dni.trim(), name: name.trim(), tel: tel.trim() })
      setResult(r); setStep('success')
    } catch (e) {
      if (e.body?.alreadyIssued || e.status === 409) setStep('already')
      else setErr(e.message || 'No se pudo registrar la entrega.')
    } finally { setBusy(false) }
  }

  return (
    <div className="fp">
      <div className="fp__bg" aria-hidden="true" />
      <button className="fp__exit" onClick={onExit} aria-label="Salir">✕</button>

      <div className="fp__card">
        <div className="fp__head">
          <div className="fp__kicker">Sala de Juegos Crespo</div>
          <h1 className="fp__title">Free Play <b>{VALUE}</b></h1>
          <p className="fp__sub">Entregá el ticket a la clienta</p>
        </div>

        {step === 'dni' && (
          <div className="fp__step">
            <label className="fp__label">DNI de la clienta</label>
            <input
              className="fp__input fp__input--dni" inputMode="numeric" value={dni}
              onChange={e => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
              onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="Sin puntos" autoFocus
            />
            {err && <div className="fp__err">{err}</div>}
            <button className="fp__btn" onClick={lookup} disabled={busy}>{busy ? 'Buscando…' : 'Buscar →'}</button>
          </div>
        )}

        {step === 'form' && (
          <div className="fp__step">
            <div className={`fp__status ${player ? 'fp__status--found' : 'fp__status--new'}`}>
              {player ? `✓ Clienta en la base: ${player.name}` : '🆕 Clienta nueva — completá los datos'}
            </div>
            {!player && (
              <>
                <label className="fp__label">Nombre y apellido</label>
                <input className="fp__input" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" autoFocus />
              </>
            )}
            <label className="fp__label">Teléfono</label>
            <input className="fp__input" inputMode="tel" value={tel}
              onChange={e => setTel(e.target.value)} placeholder="Celular de contacto"
              autoFocus={!!player} />
            {err && <div className="fp__err">{err}</div>}
            <div className="fp__row">
              <button className="fp__btn fp__btn--ghost" onClick={reset}>← Otro DNI</button>
              <button className="fp__btn" onClick={deliver} disabled={busy}>{busy ? 'Registrando…' : `Entregar ${VALUE} →`}</button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="fp__done">
            <div className="fp__check">✓</div>
            <h2 className="fp__done-title">¡Registrado!</h2>
            <p className="fp__done-sub">Entregale el ticket físico de<br /><b>{VALUE} de Free Play</b><br />a {result?.name}</p>
            <div className="fp__handover">🎫 Dale un ticket del pilón</div>
            <button className="fp__btn" onClick={reset}>Siguiente clienta →</button>
          </div>
        )}

        {step === 'already' && (
          <div className="fp__done">
            <div className="fp__check fp__check--warn">!</div>
            <h2 className="fp__done-title">Ya lo recibió</h2>
            <p className="fp__done-sub">Esta clienta ya retiró su Free Play.<br />Es uno por persona.</p>
            <button className="fp__btn" onClick={reset}>Entendido · otro DNI →</button>
          </div>
        )}
      </div>
    </div>
  )
}
