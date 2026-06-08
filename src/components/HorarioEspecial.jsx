import { useEffect, useState } from 'react'
import { getContent } from '../api/client'
import './HorarioEspecial.css'

// Card del horario especial (Junio · Julio) que se muestra dentro del Hero.
// Lee de content.horario_especial — Pacha lo edita desde el panel admin
// (Contenido → Horario Especial). El toggle "activo" controla si se ve o no.
// Si no hay nada cargado en DB, usa los defaults.

const DEFAULTS = {
  activo: 'false',                            // OFF por default — el admin lo prende
  kicker: 'Atención · Junio y Julio',
  titulo: 'Nuevo horario',
  titulo_em: 'de apertura',
  hora: '12:00',
  hora_sub: 'Apertura',
  dias: 'Viernes,Sábados,Domingos,Feriados',
  pie: '',                                    // opcional — texto chico al pie
}

export default function HorarioEspecial() {
  const [content, setContent] = useState(null)

  useEffect(() => {
    let cancelled = false
    getContent()
      .then(c => { if (!cancelled) setContent(c?.horario_especial || {}) })
      .catch(() => { if (!cancelled) setContent({}) })
    return () => { cancelled = true }
  }, [])

  if (content === null) return null
  const v = { ...DEFAULTS, ...content }
  if (v.activo !== 'true') return null

  const dias = String(v.dias || '').split(',').map(d => d.trim()).filter(Boolean)
  const hora = String(v.hora || '').trim()

  return (
    <div className="horario">
      <div className="horario__inner">
        <div className="horario__kicker">{v.kicker}</div>
        <h2 className="horario__title">
          {v.titulo}
          {v.titulo_em && <> <em>{v.titulo_em}</em></>}
        </h2>
        <div className="horario__hour">
          {hora.replace(/\s*hs?\s*$/i, '')}
          <span className="horario__hour-suffix">HS</span>
        </div>
        {v.hora_sub && (
          <div className="horario__hour-sub">
            <span>—</span> {v.hora_sub} <span>—</span>
          </div>
        )}
        {dias.length > 0 && (
          <div className="horario__pills">
            {dias.map(d => (
              <span key={d} className="horario__pill">{d}</span>
            ))}
          </div>
        )}
        {v.pie && <p className="horario__pie">{v.pie}</p>}
      </div>
    </div>
  )
}
