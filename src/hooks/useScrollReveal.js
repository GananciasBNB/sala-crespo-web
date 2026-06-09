import { useEffect, useRef } from 'react'

// Aplica 'visible' cuando el elemento entra en el viewport (react-best-practices: primitivas, no dependencias pesadas)
export function useScrollReveal(threshold = 0.05) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); observer.unobserve(el) } },
      { threshold, rootMargin: '0px 0px 80px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return ref
}

// Para animar múltiples hijos de un contenedor.
// `dep` opcional: si el contenido del parent llega después del mount (ej. tras
// un fetch), pasá un flag/booleano que cambie cuando el contenido aparezca.
// Sin él, el querySelectorAll se evalúa una sola vez al mount: si en ese
// momento no había .reveal children, la nodeList queda vacía y aunque el
// observer dispare, no agrega .visible a nadie.
export function useScrollRevealParent(threshold = 0.05, dep = null) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Re-query dentro del callback para capturar los .reveal que existan
          // al momento de dispararse — no los del mount inicial.
          el.querySelectorAll('.reveal').forEach(c => c.classList.add('visible'))
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin: '0px 0px 80px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, dep])
  return ref
}
