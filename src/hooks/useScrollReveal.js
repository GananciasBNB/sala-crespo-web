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

// Para animar múltiples hijos de un contenedor
export function useScrollRevealParent(threshold = 0.05) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const children = el.querySelectorAll('.reveal')
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          children.forEach(c => c.classList.add('visible'))
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin: '0px 0px 80px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return ref
}
