import { useScrollRevealParent } from '../hooks/useScrollReveal'
import './PromoMundial.css'

export default function PromoMundial() {
  const ref = useScrollRevealParent()
  return (
    <section id="prode" className="prode" ref={ref}>
      <div className="container">
        <div className="reveal prode__card">
          <div className="prode__content">
            <div className="prode__flags">
              <img src="/icons/flag-ar.svg" alt="Argentina" width="72" height="50" />
              <img src="/icons/globe.svg"   alt="Mundial"   width="52" height="52" />
              <img src="/icons/trophy.svg"  alt="Trofeo"    width="52" height="52" />
            </div>
            <span className="eyebrow">Promoción Especial</span>
            <h2 className="section-title prode__title">
              Prode Sala Crespo<br /><em>Mundial 2026</em>
            </h2>
            <div className="gold-line" />
            <p className="prode__desc">
              Pronosticá los 104 partidos del Mundial y competí con los clientes de la sala.
              Hay premios para los mejores de <strong>cada fase</strong> y un gran ganador final.
            </p>
            <ul className="prode__features">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F6B40E" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Resultado exacto: <strong>10 puntos</strong>
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Ganador o empate correcto: <strong>5 puntos</strong>
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B8FA8" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Total de goles correcto: <strong>1 punto</strong>
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C41E3A" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M8 8l8 8M16 8l-8 8"/></svg>
                Partidos de Argentina: <strong>puntos dobles</strong>
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F6B40E" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                3 ganadores: <strong>Fase de Grupos · Fase Final · Gran Campeón</strong>
              </li>
            </ul>
            <a href="/prode" className="btn-primary prode__cta">
              ¡Quiero jugar el Prode! →
            </a>

            {/* Premios concretos */}
            <div className="prode__prizes">
              <div className="prode__prizes-title">💰 Premios reales en tickets promocionales</div>
              <div className="prode__prizes-grid">
                <div className="prode__prize">
                  <div className="prode__prize-label">🏅 Fase de Grupos</div>
                  <div className="prode__prize-row"><span>🥇</span><strong>$75.000</strong></div>
                  <div className="prode__prize-row"><span>🥈</span><strong>$50.000</strong></div>
                  <div className="prode__prize-row"><span>🥉</span><strong>$25.000</strong></div>
                </div>
                <div className="prode__prize">
                  <div className="prode__prize-label">🔥 16avos de Final</div>
                  <div className="prode__prize-row"><span>🥇</span><strong>$75.000</strong></div>
                  <div className="prode__prize-row"><span>🥈</span><strong>$50.000</strong></div>
                  <div className="prode__prize-row"><span>🥉</span><strong>$25.000</strong></div>
                </div>
                <div className="prode__prize prode__prize--featured">
                  <div className="prode__prize-label">🏆 Gran Premio Final</div>
                  <div className="prode__prize-row"><span>🥇</span><strong>$100.000</strong></div>
                  <div className="prode__prize-row"><span>🥈</span><strong>$75.000</strong></div>
                  <div className="prode__prize-row"><span>🥉</span><strong>$50.000</strong></div>
                  <div className="prode__prize-star">★ GRAN PREMIO</div>
                </div>
              </div>
              <div className="prode__prizes-total">Total comprometido: <strong>$525.000</strong> en Free Play</div>
            </div>
          </div>

          <div className="prode__deco" aria-hidden="true">
            <div className="prode__deco-ball">⚽</div>
            <div className="prode__deco-ring" />
          </div>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
