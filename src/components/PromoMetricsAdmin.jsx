import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas-pro'
import { adminPromoMetrics } from '../api/client'
import './PromoMetricsAdmin.css'

const fmt = new Intl.NumberFormat('es-AR')
const money = (n) => `$${fmt.format(Math.round(Number(n) || 0))}`
const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' }) }
  catch { return '' }
}

// Panel de métricas de la promo "Viví Argentina en Sala".
// Card exportable a imagen (html2canvas) + compartir (Web Share API).
export default function PromoMetricsAdmin({ token, toast }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    adminPromoMetrics(token)
      .then(setData)
      .catch((e) => toast?.show?.(e.message || 'Error al cargar métricas', 'err'))
      .finally(() => setLoading(false))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const share = async () => {
    if (!cardRef.current) return
    setBusy(true)
    try {
      if (document.fonts?.ready) { try { await document.fonts.ready } catch {} }
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: '#0a0d14', imageTimeout: 15000 })
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
      const file = new File([blob], 'promo-argentina-resultados.png', { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Resultados · Viví Argentina en Sala' })
      } else {
        const link = document.createElement('a')
        link.download = file.name
        link.href = URL.createObjectURL(blob)
        link.click()
        URL.revokeObjectURL(link.href)
      }
    } catch (e) {
      if (e?.name !== 'AbortError') toast?.show?.('No se pudo generar la imagen: ' + (e?.message || e), 'err')
    } finally { setBusy(false) }
  }

  if (loading) return <div className="pm__loading">Cargando métricas…</div>
  if (!data) return <div className="pm__loading">No se pudieron cargar las métricas.</div>

  const { perMatch = [], totals = {} } = data

  return (
    <div className="pm">
      <div className="pm__bar">
        <h2 className="pm__h">🇦🇷 Promo "Viví Argentina en Sala"</h2>
        <button className="pm__share" onClick={share} disabled={busy}>
          {busy ? 'Generando…' : '📸 Guardar / Compartir imagen'}
        </button>
      </div>

      {/* Card exportable como imagen */}
      <div className="pm__card" ref={cardRef}>
        <div className="pm__card-head">
          <div className="pm__eyebrow">Sala de Juegos Crespo · Mundial 2026</div>
          <div className="pm__title">Viví Argentina <em>en Sala</em></div>
          <div className="pm__sub">Resultados de la promoción</div>
        </div>

        <div className="pm__totals">
          <div className="pm__tot">
            <div className="pm__tot-n">{totals.participants || 0}</div>
            <div className="pm__tot-l">👥 Participantes</div>
          </div>
          <div className="pm__tot pm__tot--gold">
            <div className="pm__tot-n">{money(totals.tickets_delivered)}</div>
            <div className="pm__tot-l">💰 En tickets entregados</div>
          </div>
          <div className="pm__tot pm__tot--green">
            <div className="pm__tot-n">{totals.new_clients || 0}</div>
            <div className="pm__tot-l">🆕 Clientes nuevos a la base</div>
          </div>
          <div className="pm__tot pm__tot--blue">
            <div className="pm__tot-n">{totals.goals || 0}</div>
            <div className="pm__tot-l">⚽ Goles de Argentina</div>
          </div>
        </div>

        {perMatch.length > 0 ? (
          <table className="pm__table">
            <thead>
              <tr>
                <th>Partido</th>
                <th>⚽</th>
                <th>👥 Durante</th>
                <th>🎉 Bono</th>
                <th>💰 Entregado</th>
              </tr>
            </thead>
            <tbody>
              {perMatch.map((m) => (
                <tr key={m.id}>
                  <td className="pm__match">
                    <span className="pm__match-n">{m.label}</span>
                    {m.match_date && <span className="pm__match-d">{fmtDate(m.match_date)}</span>}
                  </td>
                  <td className="pm__c">{m.goals}</td>
                  <td className="pm__c">{m.during_count}</td>
                  <td className="pm__c">{m.post_count}</td>
                  <td className="pm__c pm__money">{money(m.tickets_delivered)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="pm__empty">Todavía no hay partidos de la promo registrados.</div>
        )}

        <div className="pm__foot">saladejuegoscrespo.ar · San Martín 1053, Crespo, Entre Ríos</div>
      </div>
    </div>
  )
}
