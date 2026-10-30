import './kiosk-superclasico.css'

// Superclásico pop-up: shown once per member per day at login until kickoff.
// One-off campaign; it switches itself off at KICKOFF, nothing to undo.
const KICKOFF = Date.parse('2026-11-01T18:00:00Z')   // Sunday 1/11, 15:00 Argentina

function storageKey(dni) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
  return `kiosk_superclasico_${dni}_${today}`
}

// Marks it as seen on the way out, so asking twice the same day says no
export function debeVerSuperclasico(dni) {
  if (Date.now() >= KICKOFF) return false
  try {
    const key = storageKey(dni)
    if (localStorage.getItem(key)) return false
    localStorage.setItem(key, '1')
  } catch (err) {
    console.warn('superclasico storage:', err.message)   // without storage it just shows again
  }
  return true
}

const COLORES = ['#F0D275', '#C9A84C', '#ffd75a', '#fdf6e6', '#21488c', '#c8141f']
const PAPELITOS = Array.from({ length: 46 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  width: `${0.7 + (i % 3) * 0.4}vh`,
  height: `${1.2 + (i % 4) * 0.4}vh`,
  background: COLORES[i % COLORES.length],
  animationDuration: `${5 + (i % 6)}s`,
  animationDelay: `${-((i * 1.3) % 10)}s`,
}))

export default function KioskSuperclasico({ onContinuar }) {
  return (
    <div className="ksuper">
      <div className="ksuper__papelitos">{PAPELITOS.map((s, i) => <i key={i} style={s} />)}</div>
      <div className="ksuper__tarjeta">
        <img className="ksuper__logo" src="/jackpoints/logo.webp" alt="Jackpoints" />
        <div className="ksuper__kicker">EN NUESTRO ESPACIO DEPORTIVO · PRIMER PISO</div>
        <h1 className="ksuper__tit">El Superclásico se grita acá</h1>
        <div className="ksuper__cruce">
          <div className="ksuper__sash" />
          <div className="ksuper__boca" />
          <div className="ksuper__linea" />
          <div className="ksuper__nombre ksuper__nombre--b">BOCA</div>
          <div className="ksuper__nombre ksuper__nombre--r">RIVER</div>
          <div className="ksuper__vs">VS</div>
        </div>
        <div className="ksuper__fecha">Domingo 1/11 · 15 hs</div>
        <p className="ksuper__txt">Ponete la camiseta y vení a verlo con nosotros. Slots, bar y cocina abiertos.</p>
        <button className="ksuper__cta" type="button" onClick={onContinuar}>CONTINUAR</button>
      </div>
    </div>
  )
}
