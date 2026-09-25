// Panel del bot de WhatsApp: el interruptor, las conversaciones y el libreto.
import { useState, useEffect } from 'react'
import {
  adminWaOverview, adminWaToggle, adminWaUpdateBot,
  adminWaConversation, adminWaSetConversation, adminWaReply,
} from '../../api/client'

export default function WhatsAppAdmin({ token, toast }) {
  const [d, setD] = useState(null)
  const [abierta, setAbierta] = useState(null)
  const [editandoBot, setEditandoBot] = useState(false)
  const [libreto, setLibreto] = useState('')

  async function cargar() {
    try {
      const r = await adminWaOverview(token)
      setD(r)
      if (r.bots?.[0]) setLibreto(r.bots[0].system_prompt || '')
    } catch (err) { toast.show(err.message, 'err') }
  }
  useEffect(() => {
    cargar()
    // las conversaciones entran solas: refrescamos cada 20s mientras esté abierto
    const t = setInterval(cargar, 20000)
    return () => clearInterval(t)
  }, [])

  async function togglear() {
    try { await adminWaToggle(token, !d.activo); await cargar() }
    catch (err) { toast.show(err.message, 'err') }
  }
  async function guardarLibreto() {
    try {
      await adminWaUpdateBot(token, d.bots[0].id, { systemPrompt: libreto })
      setEditandoBot(false); await cargar(); toast.show('Libreto guardado')
    } catch (err) { toast.show(err.message, 'err') }
  }

  if (!d) return <p className="ca__cargando">Cargando…</p>
  if (abierta) return <Conversacion id={abierta} token={token} toast={toast} onVolver={() => { setAbierta(null); cargar() }} />

  const pendientes = d.conversaciones.filter(c => c.needs_human)
  const bot = d.bots?.[0]

  return (
    <>
      {!d.configurado && (
        <div className="ca__alerta" style={{ cursor: 'default', borderColor: 'rgba(242,112,111,.5)' }}>
          <strong style={{ color: '#f2706f' }}>Falta conectar WhatsApp</strong>
          <span>
            Cargá en Render: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN,
            WHATSAPP_APP_SECRET y ANTHROPIC_API_KEY.
          </span>
        </div>
      )}

      <section className="ca__bloque">
        <h2 className="ca__bloque-tit">El bot</h2>
        <div className={`ca__nw ca__nw--${d.activo ? 'ok' : 'nd'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ fontSize: 21, color: d.activo ? 'var(--ok)' : 'var(--txt2)', fontFamily: "'Playfair Display', Georgia, serif" }}>
                {d.activo ? 'Atendiendo' : 'Apagado'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 4, lineHeight: 1.5 }}>
                {d.activo
                  ? 'Contesta solo los mensajes que entran. Si no sabe algo, te avisa por Telegram.'
                  : 'Los mensajes se guardan igual, pero nadie contesta automáticamente.'}
              </div>
            </div>
            <button className={`ca__btn ${d.activo ? '' : 'ca__btn--ok'}`} onClick={togglear} disabled={!d.configurado}>
              {d.activo ? 'Apagar el bot' : 'Prender el bot'}
            </button>
          </div>
        </div>
      </section>

      {pendientes.length > 0 && (
        <section className="ca__bloque">
          <h2 className="ca__bloque-tit">Esperando respuesta tuya</h2>
          <div className="ca__lista">
            {pendientes.map(c => (
              <button key={c.id} className="ca__fila" onClick={() => setAbierta(c.id)}
                style={{ cursor: 'pointer', textAlign: 'left', border: '1px solid rgba(240,210,117,.45)', fontFamily: 'inherit' }}>
                <span className="ca__fila-nom">
                  {c.socio || c.name || c.wa_id}
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--txt2)', marginTop: 2 }}>
                    {(c.ultimo || '').slice(0, 70)}
                  </span>
                </span>
                <span className="ca__fila-n" style={{ color: 'var(--oro-luz)' }}>responder</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="ca__bloque">
        <h2 className="ca__bloque-tit">Conversaciones</h2>
        {d.conversaciones.length === 0 ? (
          <p style={{ color: 'var(--txt2)', fontSize: 14 }}>Todavía no escribió nadie.</p>
        ) : (
          <div className="ca__lista">
            {d.conversaciones.map(c => (
              <button key={c.id} className="ca__fila" onClick={() => setAbierta(c.id)}
                style={{ cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                <span className="ca__fila-nom">
                  {c.socio || c.name || c.wa_id}
                  {c.socio && <span style={{ fontSize: 11, color: 'var(--oro)', marginLeft: 6 }}>socio</span>}
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--txt2)', marginTop: 2 }}>
                    {(c.ultimo || '').slice(0, 70)}
                  </span>
                </span>
                <span className="ca__fila-pts">{c.mensajes} msj</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {bot && (
        <section className="ca__bloque">
          <h2 className="ca__bloque-tit">Qué sabe el bot</h2>
          {editandoBot ? (
            <>
              <textarea value={libreto} onChange={e => setLibreto(e.target.value)} rows={18}
                style={{
                  width: '100%', padding: 14, borderRadius: 10, fontSize: 13, lineHeight: 1.6,
                  border: '1px solid var(--borde)', background: 'rgba(0,0,0,.35)',
                  color: 'var(--crema)', fontFamily: 'ui-monospace, monospace',
                }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="ca__btn ca__btn--ok" onClick={guardarLibreto}>Guardar</button>
                <button className="ca__btn" onClick={() => { setEditandoBot(false); setLibreto(bot.system_prompt || '') }}>Cancelar</button>
              </div>
            </>
          ) : (
            <>
              <pre style={{
                whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.6, color: 'var(--txt2)',
                background: 'var(--panel)', border: '1px solid var(--borde)', borderRadius: 10,
                padding: 14, margin: '0 0 10px', maxHeight: 280, overflow: 'auto',
              }}>{bot.system_prompt}</pre>
              <button className="ca__btn" onClick={() => setEditandoBot(true)}>Editar lo que sabe</button>
              <p style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 10, lineHeight: 1.6 }}>
                Los horarios de torneos y shows los toma solo de la base, no hace falta cargarlos acá.
                Todo lo que el bot no sepa te lo deriva a vos.
              </p>
            </>
          )}
        </section>
      )}
    </>
  )
}

function Conversacion({ id, token, toast, onVolver }) {
  const [c, setC] = useState(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function cargar() {
    try { setC(await adminWaConversation(token, id)) }
    catch (err) { toast.show(err.message, 'err') }
  }
  useEffect(() => { cargar() }, [id])

  async function responder() {
    if (!texto.trim()) return
    setEnviando(true)
    try {
      await adminWaReply(token, id, texto.trim())
      setTexto(''); await cargar(); toast.show('Enviado')
    } catch (err) { toast.show(err.message, 'err') } finally { setEnviando(false) }
  }
  async function cambiar(campo, valor) {
    try { await adminWaSetConversation(token, id, { [campo]: valor }); await cargar() }
    catch (err) { toast.show(err.message, 'err') }
  }

  if (!c) return <p className="ca__cargando">Cargando…</p>

  return (
    <>
      <button className="ca__btn" onClick={onVolver} style={{ marginBottom: 16 }}>← Volver</button>

      <section className="ca__bloque">
        <h2 className="ca__bloque-tit">{c.socio || c.name || c.wa_id}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button className="ca__btn" onClick={() => cambiar('botEnabled', !c.bot_enabled)}>
            {c.bot_enabled ? 'Silenciar el bot acá' : 'Que el bot vuelva a contestar'}
          </button>
          {c.needs_human && (
            <button className="ca__btn ca__btn--ok" onClick={() => cambiar('needsHuman', false)}>
              Marcar como resuelta
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflow: 'auto', padding: 4 }}>
          {c.mensajes.map(m => (
            <div key={m.id} style={{
              alignSelf: m.direction === 'in' ? 'flex-start' : 'flex-end',
              maxWidth: '82%', padding: '9px 13px', borderRadius: 12, fontSize: 14, lineHeight: 1.5,
              background: m.direction === 'in' ? 'rgba(255,255,255,.06)' : 'rgba(201,168,76,.16)',
              border: `1px solid ${m.direction === 'in' ? 'rgba(255,255,255,.08)' : 'rgba(201,168,76,.3)'}`,
              color: 'var(--crema)', whiteSpace: 'pre-wrap',
            }}>
              {m.body}
              <div style={{ fontSize: 10.5, color: 'var(--txt2)', marginTop: 5 }}>
                {m.direction === 'out' && (m.from_bot ? 'bot · ' : 'vos · ')}
                {new Date(m.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <input value={texto} onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && responder()}
            placeholder="Escribí tu respuesta…"
            style={{
              flex: 1, minWidth: 0, padding: '11px 14px', borderRadius: 9, fontSize: 15,
              border: '1px solid var(--borde)', background: 'rgba(0,0,0,.35)', color: 'var(--crema)',
              fontFamily: 'inherit',
            }} />
          <button className="ca__btn ca__btn--ok" onClick={responder} disabled={enviando}>
            {enviando ? '…' : 'Enviar'}
          </button>
        </div>
      </section>
    </>
  )
}
