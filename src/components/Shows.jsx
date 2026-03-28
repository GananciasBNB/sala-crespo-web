import { useState, useEffect } from 'react'
import { useScrollRevealParent } from '../hooks/useScrollReveal'
import { getShows } from '../api/client'
import { IconCamera, IconMic, IconStar, IconMusic } from './Icons'
import './Shows.css'

export default function Shows() {
  const ref = useScrollRevealParent()
  const [shows, setShows] = useState([])

  useEffect(() => {
    getShows().then(setShows).catch(() => {})
  }, [])

  const pasados  = shows.filter(s => s.type === 'past')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const proximos = shows.filter(s => s.type === 'upcoming')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  return (
    <section id="shows" className="shows" ref={ref}>
      <div className="container">
        <div className="reveal shows__header">
          <span className="eyebrow">Shows en vivo</span>
          <h2 className="section-title">Música y entretenimiento<br /><em>de primer nivel</em></h2>
          <div className="gold-line" />
          <p className="shows__intro">
            Cada mes te sorprendemos con artistas increíbles. La sala se transforma en el mejor escenario de Crespo.
          </p>
        </div>

        <div className="shows__grid">
          {/* Shows pasados */}
          <div className="shows__col">
            <h3 className="shows__col-label"><IconCamera size={16} /> Shows pasados</h3>
            <div className="shows__cards">
              {pasados.length === 0 && (
                <p className="shows__empty">Los shows pasados aparecerán aquí.</p>
              )}
              {pasados.map((s, i) => (
                <div key={s.id} className="shows__card shows__card--past shows__card--loaded" style={{animationDelay:`${i*0.1}s`}}>
                  <div className="shows__card-img">
                    {s.imageUrl
                      ? <img src={s.imageUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: s.imagePosition || 'center center' }} />
                      : <div className="shows__card-placeholder"><IconMic size={32} /></div>
                    }
                  </div>
                  <div className="shows__card-info">
                    <span className="shows__card-tag">Show realizado</span>
                    <h4 className="shows__card-name">{s.name}</h4>
                    {s.dateLabel && <p className="shows__card-date">{s.dateLabel}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shows próximos */}
          <div className="shows__col">
            <h3 className="shows__col-label"><IconStar size={16} /> Próximamente</h3>
            <div className="shows__cards">

              {/* Primer próximo — card destacada */}
              {proximos.length === 0 ? (
                <div className="shows__featured shows__card--loaded">
                  <div className="shows__featured-img">
                    <div className="shows__card-placeholder shows__card-placeholder--pulse"><IconMusic size={48} /></div>
                  </div>
                  <div className="shows__featured-info">
                    <span className="shows__badge-live">Próximamente</span>
                    <h3 className="shows__featured-name">¡Próximo artista por confirmar!</h3>
                    <p className="shows__featured-date">Seguinos en Instagram para enterarte primero</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="shows__featured shows__card--loaded">
                    <div className="shows__featured-img">
                      {proximos[0].imageUrl
                        ? <img src={proximos[0].imageUrl} alt={proximos[0].name} />
                        : <div className="shows__card-placeholder"><IconMusic size={48} /></div>
                      }
                      <div className="shows__featured-overlay" />
                    </div>
                    <div className="shows__featured-info">
                      <span className="shows__badge-live">
                        <span className="shows__badge-dot" />
                        Próximo show
                      </span>
                      <h3 className="shows__featured-name">{proximos[0].name}</h3>
                      {proximos[0].dateLabel && <p className="shows__featured-date">{proximos[0].dateLabel}</p>}
                    </div>
                  </div>
                  {/* Resto de próximos (si hubiera más) */}
                  {proximos.slice(1).map((s, i) => (
                    <div key={s.id} className="shows__card shows__card--next shows__card--loaded" style={{animationDelay:`${(i+1)*0.1}s`}}>
                      <div className="shows__card-img shows__card-img--glow">
                        {s.imageUrl
                          ? <img src={s.imageUrl} alt={s.name} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:s.imagePosition||'center center'}} />
                          : <div className="shows__card-placeholder shows__card-placeholder--pulse"><IconMusic size={32} /></div>
                        }
                      </div>
                      <div className="shows__card-info">
                        <span className="shows__card-tag shows__card-tag--gold">Próximamente</span>
                        <h4 className="shows__card-name">{s.name}</h4>
                        {s.dateLabel && <p className="shows__card-date">{s.dateLabel}</p>}
                      </div>
                    </div>
                  ))}
                </>
              )}

              <div className="shows__more">
                <IconStar size={14} color="#C9A84C" />
                <span>Y muchos más artistas por venir</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="section-divider" />
    </section>
  )
}
