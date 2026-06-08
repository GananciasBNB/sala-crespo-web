import { useEffect, useState, useCallback } from 'react'
import { getLoyaltyMe, getLoyaltyCatalog, redeemLoyaltyReward } from '../api/client'
import './ClubView.css'

// Sala Crespo Club — pestaña dentro de /prode para que el cliente vea su
// balance, canjes pendientes, historial y catálogo de productos canjeables.
// El check-in y la carga de AyB la hace el staff desde el admin (Fase 1A) o
// desde el tótem (Fase 1B).

const CAT_LABELS = {
  sin_alcohol: '🥤 Sin alcohol',
  cerveza:     '🍺 Cervezas',
  trago:       '🍸 Tragos',
  comida:      '🍕 Comidas',
  ticket:      '🎰 Tickets de juego',
}
const CAT_ORDER = ['sin_alcohol', 'cerveza', 'trago', 'comida', 'ticket']

function kindLabel(kind) {
  switch (kind) {
    case 'earn_checkin':      return '🏠 Check-in en sala'
    case 'earn_ayb':          return '🍺 Consumo en barra'
    case 'earn_birthday':     return '🎂 Cumpleaños'
    case 'earn_signup_bonus': return '🎁 Bienvenida'
    case 'earn_manual':       return '🛠 Ajuste'
    case 'redeem':            return '✦ Canje'
    case 'refund':            return '↻ Reintegro'
    case 'expire':            return '⌛ Vencimiento'
    default:                  return kind
  }
}

export default function ClubView({ player }) {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [pending, setPending] = useState([])
  const [history, setHistory] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyReward, setBusyReward] = useState(null)
  const [msg, setMsg] = useState(null)   // { kind: 'ok'|'err', text }

  const reload = useCallback(async () => {
    try {
      const [me, cat] = await Promise.all([
        getLoyaltyMe(player.token),
        getLoyaltyCatalog(),
      ])
      setBalance(me.balance || 0)
      setTransactions(me.transactions || [])
      setPending(me.pending || [])
      setHistory(me.history || [])
      setCatalog(cat.rewards || [])
    } catch (err) {
      setMsg({ kind: 'err', text: err.message })
    } finally {
      setLoading(false)
    }
  }, [player.token])

  useEffect(() => { reload() }, [reload])

  async function handleRedeem(reward) {
    if (balance < reward.points) return
    if (!confirm(`Canjear "${reward.name}" por ${reward.points.toLocaleString('es-AR')} pts?\n\nVas a quedar con ${(balance - reward.points).toLocaleString('es-AR')} pts.`)) return
    setBusyReward(reward.id); setMsg(null)
    try {
      const r = await redeemLoyaltyReward(player.token, reward.id)
      setMsg({ kind: 'ok', text: `¡Canje listo! Acercate a la barra con tu DNI para retirar tu ${r.redemption.reward_name}.` })
      await reload()
    } catch (err) {
      setMsg({ kind: 'err', text: err.message })
    } finally {
      setBusyReward(null)
    }
  }

  if (loading) {
    return <div className="club-loading">Cargando tu cuenta…</div>
  }

  // Agrupar catálogo por categoría
  const byCategory = {}
  for (const r of catalog) {
    if (!byCategory[r.category]) byCategory[r.category] = []
    byCategory[r.category].push(r)
  }

  return (
    <div className="club">
      {/* HERO con balance */}
      <div className="club__hero">
        <div className="club__hero-kicker">★ Sala Crespo Club</div>
        <div className="club__hero-balance">
          {balance.toLocaleString('es-AR')}<span>pts</span>
        </div>
        <div className="club__hero-name">Hola, {player.name.split(' ')[0]}</div>
        <div className="club__hero-help">
          Sumás puntos cada vez que venís y cuando consumís en la barra.
          Canjealos por bebida, comida o tickets de juego.
        </div>
      </div>

      {/* Mensaje toast */}
      {msg && (
        <div className={`club__msg club__msg--${msg.kind}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="club__msg-x">×</button>
        </div>
      )}

      {/* Canjes pendientes (para retirar en barra) */}
      {pending.length > 0 && (
        <div className="club__pending">
          <h3 className="club__h">📦 Para retirar en barra ({pending.length})</h3>
          <p className="club__pending-help">Acercate al mostrador y decí tu DNI ({player.dni}). El cajero te entrega:</p>
          {pending.map(p => (
            <div key={p.id} className="club__pending-item">
              <div>
                <strong>{p.reward_name}</strong>
                {p.promo_code && <span className="club__code"> · {p.promo_code}</span>}
              </div>
              <span className="club__pending-pts">{p.points_used.toLocaleString('es-AR')} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* Catálogo */}
      <div className="club__catalog">
        <h3 className="club__h">🛍 Qué podés canjear</h3>
        {CAT_ORDER.map(cat => byCategory[cat] && (
          <div key={cat} className="club__cat-block">
            <h4 className="club__cat-h">{CAT_LABELS[cat] || cat}</h4>
            <div className="club__cat-grid">
              {byCategory[cat].map(r => {
                const canAfford = balance >= r.points
                return (
                  <button
                    key={r.id}
                    className={`club__reward ${canAfford ? '' : 'club__reward--locked'}`}
                    disabled={!canAfford || busyReward === r.id}
                    onClick={() => handleRedeem(r)}
                  >
                    <div className="club__reward-name">{r.name}</div>
                    <div className="club__reward-pts">
                      {r.points.toLocaleString('es-AR')}<span>pts</span>
                    </div>
                    <div className="club__reward-cta">
                      {busyReward === r.id ? 'Canjeando…' : canAfford ? 'Canjear →' : `Faltan ${(r.points - balance).toLocaleString('es-AR')} pts`}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Historial */}
      {transactions.length > 0 && (
        <div className="club__history">
          <h3 className="club__h">📜 Movimientos recientes</h3>
          {transactions.slice(0, 15).map(t => (
            <div key={t.id} className={`club__tx ${t.points >= 0 ? 'club__tx--earn' : 'club__tx--redeem'}`}>
              <div>
                <div className="club__tx-kind">{kindLabel(t.kind)}</div>
                {t.reason && <div className="club__tx-reason">{t.reason}</div>}
                <div className="club__tx-date">{new Date(t.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div className="club__tx-pts">
                {t.points >= 0 ? '+' : ''}{t.points.toLocaleString('es-AR')}
                <span>pts</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Onboarding cuando todavía no tiene movimientos */}
      {transactions.length === 0 && (
        <div className="club__empty">
          <strong>¡Bienvenido al Sala Crespo Club!</strong>
          <p>Todavía no tenés puntos. Acercate a la sala — cada visita suma 50 pts, y por cada $1.000 que gastes en la barra sumás 50 pts más.</p>
        </div>
      )}
    </div>
  )
}
