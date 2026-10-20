import { useEffect, useRef, useState } from 'react'

// "Contanos de vos": one question at a time, big buttons, +points per answer.
// Two clearly different exits: "✕ CERRAR" (leave, keep going another day) and
// "OTRA PREGUNTA ›" (skip this one). Skipped questions are not shown again in this
// round; when the round runs out it says how many are left, with a way to see the
// skipped ones again. Typed fields are always optional (contact data we don't have,
// "Otra", a date as day + month).
// columns per number of options so rows look even (3 -> 3, 4 -> 2+2, 7 -> 4+3, 8 -> 4+4, 12 -> 3 per row);
// a shorter last row stretches to the full width (see .kiosk__enc-op flex-grow)
const COLUMNAS = { 1: 1, 2: 2, 3: 3, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 3, 12: 3 }
const columnas = n => COLUMNAS[n] || 4
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** '2503' -> '25/03' (the date field types digits only) */
export const fechaVista = d => (d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2, 4)}` : d)

export default function KioskEncuesta({ estado, texto, setTexto, inputProps, onCampo, onResponder, onCerrar }) {
  const [salteadas, setSalteadas] = useState([])
  const [sel, setSel] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ganado, setGanado] = useState(null)   // "+20 puntos" flash after saving
  const inputRef = useRef(null)

  const pendientes = estado?.preguntas || []
  const q = pendientes.find(x => !salteadas.includes(x.id)) || null
  // the option that opens a field (the first selected one that asks for it)
  const campoDe = (op) => {
    const cfg = q?.texto?.[op]
    if (!cfg) return null
    if (cfg.siFalta === 'email' && estado?.tieneEmail) return null
    if (cfg.siFalta === 'tel' && estado?.tieneTel) return null
    return cfg
  }
  const opTexto = sel.find(op => campoDe(op))
  const campo = opTexto ? campoDe(opTexto) : null

  // tell the kiosk which keyboard to show; focus the field when it appears
  useEffect(() => {
    onCampo(campo)
    if (campo) setTimeout(() => inputRef.current?.focus(), 80)
  }, [campo?.label, campo?.modo]) // eslint-disable-line react-hooks/exhaustive-deps

  function reset() { setSel([]); setTexto(''); setErr(''); onCampo(null) }
  function otra() { if (q) setSalteadas(s => [...s, q.id]); reset() }

  // typed text is optional: empty is fine, something typed must make sense
  function validarTexto() {
    const t = texto.trim()
    if (!campo || !t) return { ok: true, t: null }
    if (campo.modo === 'email') return EMAIL_OK.test(t) ? { ok: true, t: t.toLowerCase() } : { ok: false, msg: 'Revisá el email (ej. nombre@gmail.com) o borralo' }
    if (campo.modo === 'num') { const d = t.replace(/\D/g, ''); return d.length >= 8 && d.length <= 13 ? { ok: true, t: d } : { ok: false, msg: 'Revisá el celular (ej. 343 4123456) o borralo' } }
    if (campo.modo === 'fecha') {
      const dia = Number(t.slice(0, 2)), mes = Number(t.slice(2, 4))
      return t.length === 4 && dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12
        ? { ok: true, t: fechaVista(t) } : { ok: false, msg: 'Poné día y mes, por ejemplo 2503 para el 25 de marzo, o borralo' }
    }
    return { ok: true, t: t.slice(0, 80) }
  }

  async function guardar(valores = sel) {
    if (busy || !q || !valores.length) return
    const v = validarTexto()
    if (!v.ok) { setErr(v.msg); return }
    setBusy(true); setErr('')
    try {
      const r = await onResponder({ id: q.id, valores, texto: v.t })
      setGanado(r?.puntos ?? estado?.puntos ?? 0)
      setTimeout(() => setGanado(null), 1400)
      reset()   // the answered question leaves the pending list: the next one shows up
    } catch (e) {
      setErr(e.message || 'No pudimos guardar tu respuesta. Probá de nuevo.')
    } finally { setBusy(false) }
  }

  function tocar(op) {
    if (busy) return
    setErr('')
    if (q.multi) { setSel(s => (s.includes(op) ? s.filter(x => x !== op) : [...s, op])); return }
    if (campoDe(op)) { setSel([op]); setTexto(''); return }   // opens a field: wait for GUARDAR
    setSel([op]); guardar([op])                                // plain answer: saved on tap
  }

  const total = estado?.total || 0, respondidas = estado?.respondidas || 0
  const quedan = pendientes.length

  return (
    <div className="kiosk__carta kiosk__enc" onClick={onCerrar}>
      <div className="kiosk__carta-panel kiosk__enc-panel" onClick={e => e.stopPropagation()}>
        <div className="kiosk__enc-top">
          <div className="kiosk__enc-kicker">CONTANOS DE VOS · +{estado?.puntos ?? 20} PUNTOS POR RESPUESTA</div>
          <button type="button" className="kiosk__enc-cerrar" onClick={onCerrar}>✕ CERRAR</button>
        </div>
        <div className="kiosk__enc-barra"><i style={{ width: `${total ? Math.round(respondidas / total * 100) : 0}%` }} /></div>
        <div className="kiosk__enc-prog">{respondidas} de {total} respondidas</div>

        {ganado != null && <div className="kiosk__enc-ganado">+{ganado} puntos ✓</div>}

        {!q ? (
          <div className="kiosk__enc-fin">
            {quedan === 0 ? (
              <>
                <div className="kiosk__enc-titulo">¡Gracias! Respondiste todo</div>
                <p className="kiosk__carta-txt">Con esto te vamos a mandar promos que te interesen de verdad.</p>
              </>
            ) : (
              <>
                <div className="kiosk__enc-titulo">¡Listo por ahora!</div>
                <p className="kiosk__carta-txt">
                  Te {quedan === 1 ? 'queda 1 pregunta' : `quedan ${quedan} preguntas`} para responder cuando quieras.
                  Cada una suma {estado?.puntos ?? 20} puntos.
                </p>
                <button type="button" className="kiosk__enc-otra" onClick={() => { setSalteadas([]); reset() }}>VER LAS QUE SALTEÉ</button>
              </>
            )}
            <button type="button" className="kiosk__cta kiosk__cta--hub" onClick={onCerrar}>VOLVER AL CLUB</button>
          </div>
        ) : (
          <>
            <div className="kiosk__enc-titulo">{q.titulo}</div>
            {q.multi && <div className="kiosk__enc-ayuda">Podés marcar varias</div>}
            <div className="kiosk__enc-ops" style={{ '--cols': columnas(q.opciones.length) }}>
              {q.opciones.map(op => (
                <button key={op} type="button" disabled={busy}
                  className={`kiosk__enc-op${sel.includes(op) ? ' on' : ''}`} onClick={() => tocar(op)}>
                  {q.multi && <span className="kiosk__enc-check">{sel.includes(op) ? '✓' : ''}</span>}{op}
                </button>
              ))}
            </div>

            {campo && (
              <label className="kiosk__enc-campo">
                <span>{campo.label}</span>
                <input ref={inputRef} value={campo.modo === 'fecha' ? fechaVista(texto) : texto} placeholder={campo.ph}
                  onChange={e => setTexto(e.target.value)} {...inputProps} />
              </label>
            )}

            {err && <div className="kiosk__err">{err}</div>}

            {(q.multi || campo) && (
              <button type="button" className="kiosk__cta kiosk__cta--hub kiosk__enc-guardar" disabled={busy || !sel.length} onClick={() => guardar()}>
                {busy ? 'Guardando…' : `GUARDAR · +${estado?.puntos ?? 20} PUNTOS`}
              </button>
            )}
            <button type="button" className="kiosk__enc-otra" onClick={otra} disabled={busy}>
              No quiero responder esta · OTRA PREGUNTA ›
            </button>
            <p className="kiosk__cumple-legal">Usamos tus respuestas solo para mandarte promos que te interesen.</p>
          </>
        )}
      </div>
    </div>
  )
}
