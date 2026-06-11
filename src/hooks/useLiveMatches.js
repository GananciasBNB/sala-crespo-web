import { useEffect, useState, useRef } from 'react'
import { getLiveMatches } from '../api/client'

// Polla /api/prode/live cada `intervalMs` (default 60s) y devuelve un mapa
// `byAbbr` indexado por "HOMEABBR-AWAYABBR" para que cualquier componente
// pueda mirar si tiene live data para un partido del fixture local.
//
// Para conservar batería + ESPN/Neon, los polls se pausan cuando la pestaña
// está inactiva (visibilitychange). Cuando vuelve al foco, refetch inmediato.

export function useLiveMatches({ enabled = true, intervalMs = 60000 } = {}) {
  const [byAbbr, setByAbbr] = useState({})
  const [matches, setMatches] = useState([])
  const timer = useRef(null)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    if (!enabled) return () => { mounted.current = false }

    async function fetchOnce() {
      try {
        const r = await getLiveMatches()
        if (!mounted.current) return
        const list = Array.isArray(r?.matches) ? r.matches : []
        const map = {}
        for (const m of list) {
          if (m.homeAbbr && m.awayAbbr) {
            map[`${m.homeAbbr}-${m.awayAbbr}`] = m
          }
        }
        setByAbbr(map)
        setMatches(list)
      } catch {
        // Silent fail — los componentes consumen byAbbr y simplemente no
        // muestran nada si no hay data. No queremos cortar render por esto.
      }
    }

    // Primer fetch
    fetchOnce()

    function start() {
      if (timer.current) clearInterval(timer.current)
      timer.current = setInterval(fetchOnce, intervalMs)
    }
    function stop() {
      if (timer.current) { clearInterval(timer.current); timer.current = null }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        fetchOnce()
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      mounted.current = false
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs])

  return { byAbbr, matches }
}
