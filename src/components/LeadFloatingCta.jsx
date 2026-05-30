import { useEffect, useState } from 'react'
import './LeadFloatingCta.css'

// FAB que apunta a la sección #suscripcion. Aparece después de scrollear más
// allá del hero y se oculta cuando esa sección ya entró en viewport (para no
// estorbar mientras el usuario está completando el form).
export default function LeadFloatingCta() {
  const [visible, setVisible] = useState(false)
  const [sectionInView, setSectionInView] = useState(false)

  // Mostrar después de scrollear ~600px (pasar el hero)
  useEffect(() => {
    function onScroll() { setVisible(window.scrollY > 600) }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Esconder cuando la sección de suscripción está visible
  useEffect(() => {
    const el = document.getElementById('suscripcion')
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => setSectionInView(e.isIntersecting)),
      { threshold: 0.2 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  function handleClick() {
    const el = document.getElementById('suscripcion')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const show = visible && !sectionInView

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`lead-fab ${show ? 'lead-fab--show' : ''}`}
      aria-label="Suscribirme a las promos"
    >
      <span className="lead-fab__icon">🎁</span>
      <span className="lead-fab__text">Dejá tus datos y recibí promociones exclusivas</span>
    </button>
  )
}
