import { useEffect, useRef } from 'react'
import './HeroCanvas.css'

// Paleta de colores del casino
const GOLD    = { r: 201, g: 168, b: 76  }
const CRIMSON = { r: 196, g: 30,  b: 58  }
const CREAM   = { r: 245, g: 236, b: 215 }

function rgba(c, a) {
  return `rgba(${c.r},${c.g},${c.b},${a})`
}

function lerp(a, b, t) { return a + (b - a) * t }

// ── Monedas flotantes ────────────────────────────────────────────
class Coin {
  constructor(w, h) { this.reset(w, h, true) }

  reset(w, h, initial = false) {
    this.x     = Math.random() * w
    this.y     = initial ? Math.random() * h : h + 20
    this.r     = 4 + Math.random() * 8          // radio 4-12 px
    this.vx    = (Math.random() - 0.5) * 0.4
    this.vy    = -(0.3 + Math.random() * 0.5)   // sube lentamente
    this.angle = Math.random() * Math.PI * 2
    this.spin  = (Math.random() - 0.5) * 0.04
    this.alpha = 0.1 + Math.random() * 0.3
    // pulso
    this.pulsePhase = Math.random() * Math.PI * 2
    this.pulseSpeed = 0.02 + Math.random() * 0.02
    // variante de color (gold puro vs gold-rojizo)
    this.colorMix = Math.random() // 0=gold, 1=crimson-tinted
  }

  update(w, h) {
    this.x     += this.vx
    this.y     += this.vy
    this.angle += this.spin
    this.pulsePhase += this.pulseSpeed
    if (this.y < -20) this.reset(w, h)
  }

  draw(ctx) {
    const pulse    = 0.8 + 0.2 * Math.sin(this.pulsePhase)
    const alpha    = this.alpha * pulse
    // Aplanar la moneda para simular rotación (scaleX oscila)
    const scaleX   = Math.abs(Math.cos(this.angle))
    const minScale = 0.15

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.scale(Math.max(scaleX, minScale), 1)

    // Cara visible: gradiente gold
    const grad = ctx.createRadialGradient(-this.r * 0.3, -this.r * 0.3, 0, 0, 0, this.r)
    const cr   = Math.round(lerp(GOLD.r, CRIMSON.r, this.colorMix * 0.3))
    const cg   = Math.round(lerp(GOLD.g, CRIMSON.g, this.colorMix * 0.3))
    const cb   = Math.round(lerp(GOLD.b, CRIMSON.b, this.colorMix * 0.3))
    grad.addColorStop(0, `rgba(255,230,120,${alpha})`)
    grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${alpha})`)
    grad.addColorStop(1, `rgba(100,70,10,${alpha * 0.7})`)

    ctx.beginPath()
    ctx.arc(0, 0, this.r, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()

    // Borde dorado
    ctx.beginPath()
    ctx.arc(0, 0, this.r, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,220,80,${alpha * 0.6})`
    ctx.lineWidth   = 0.8
    ctx.stroke()

    // Brillo interior (destello)
    if (scaleX > 0.5) {
      ctx.beginPath()
      ctx.arc(-this.r * 0.25, -this.r * 0.25, this.r * 0.3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,200,${alpha * 0.5})`
      ctx.fill()
    }

    ctx.restore()
  }
}

// ── Rayos de luz ─────────────────────────────────────────────────
class LightRay {
  constructor(w, h, index) {
    this.w     = w
    this.h     = h
    this.index = index
    // Origen: esquinas superiores
    this.fromLeft = index < 2
    this.ox       = this.fromLeft ? -50 : w + 50
    this.oy       = -30
    // Ángulo base y oscilación
    this.baseAngle = this.fromLeft
      ? 30 + index * 20         // deg desde la izquierda
      : 210 - index * 20        // deg desde la derecha
    this.angleOffset = 0
    this.sweepSpeed  = 0.003 + Math.random() * 0.002
    this.sweepPhase  = Math.random() * Math.PI * 2
    this.alpha       = 0.03 + Math.random() * 0.025
    this.width       = 60 + Math.random() * 80  // grosor del rayo
  }

  update() {
    this.sweepPhase  += this.sweepSpeed
    this.angleOffset  = Math.sin(this.sweepPhase) * 8  // ±8 grados de barrido
  }

  draw(ctx) {
    const angleDeg = this.baseAngle + this.angleOffset
    const angleRad = (angleDeg * Math.PI) / 180
    const length   = Math.max(this.w, this.h) * 2

    const ex = this.ox + Math.cos(angleRad) * length
    const ey = this.oy + Math.sin(angleRad) * length

    // Rayo principal como gradiente lineal desde el origen
    const perpAngle = angleRad + Math.PI / 2
    const hw = this.width / 2

    const x1 = this.ox + Math.cos(perpAngle) * hw
    const y1 = this.oy + Math.sin(perpAngle) * hw
    const x2 = this.ox - Math.cos(perpAngle) * hw
    const y2 = this.oy - Math.sin(perpAngle) * hw

    const grad = ctx.createLinearGradient(x1, y1, x2, y2)
    const c    = GOLD
    grad.addColorStop(0,   `rgba(${c.r},${c.g},${c.b},0)`)
    grad.addColorStop(0.5, `rgba(${c.r},${c.g},${c.b},${this.alpha})`)
    grad.addColorStop(1,   `rgba(${c.r},${c.g},${c.b},0)`)

    ctx.save()
    ctx.globalAlpha = 1

    // Trazar el triángulo del rayo
    ctx.beginPath()
    ctx.moveTo(this.ox, this.oy)
    ctx.lineTo(
      ex + Math.cos(perpAngle) * hw * 3,
      ey + Math.sin(perpAngle) * hw * 3
    )
    ctx.lineTo(
      ex - Math.cos(perpAngle) * hw * 3,
      ey - Math.sin(perpAngle) * hw * 3
    )
    ctx.closePath()

    ctx.fillStyle = grad
    ctx.fill()
    ctx.restore()
  }
}

// ── Destellos / chispas ──────────────────────────────────────────
class Sparkle {
  constructor(w, h) { this.reset(w, h) }

  reset(w, h) {
    this.x      = Math.random() * w
    this.y      = Math.random() * h
    this.life   = 0
    this.maxLife = 60 + Math.random() * 80  // frames
    this.size   = 2 + Math.random() * 5
    // Color aleatorio: gold o cream
    this.isGold  = Math.random() > 0.3
    this.color   = this.isGold ? GOLD : CREAM
    this.arms    = Math.random() > 0.5 ? 4 : 6  // estrella de 4 o 6 brazos
    this.rotation = Math.random() * Math.PI
  }

  update(w, h) {
    this.life++
    if (this.life >= this.maxLife) this.reset(w, h)
  }

  draw(ctx) {
    const t     = this.life / this.maxLife
    // Fade in (0-0.3), hold (0.3-0.7), fade out (0.7-1)
    let alpha
    if (t < 0.3)      alpha = t / 0.3
    else if (t < 0.7) alpha = 1
    else              alpha = (1 - t) / 0.3

    alpha *= this.isGold ? 0.35 : 0.25
    const c = this.color

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation + this.life * 0.01)
    ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`
    ctx.lineWidth   = 1

    // Dibujar estrella de N brazos
    const s = this.size * (1 + 0.15 * Math.sin(this.life * 0.2))
    for (let i = 0; i < this.arms; i++) {
      const a = (i / this.arms) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s)
      ctx.stroke()
    }

    // Punto central brillante
    ctx.beginPath()
    ctx.arc(0, 0, 1.2, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,240,180,${alpha * 1.5})`
    ctx.fill()

    ctx.restore()
  }
}

// ── Componente principal ─────────────────────────────────────────
export default function HeroCanvas() {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Ajustar tamaño al contenedor
    const resize = () => {
      const rect  = canvas.parentElement.getBoundingClientRect()
      canvas.width  = rect.width  || window.innerWidth
      canvas.height = rect.height || window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Instanciar partículas
    const W = () => canvas.width
    const H = () => canvas.height

    const coins    = Array.from({ length: 35 }, () => new Coin(W(), H()))
    const rays     = Array.from({ length: 5  }, (_, i) => new LightRay(W(), H(), i))
    const sparkles = Array.from({ length: 25 }, () => new Sparkle(W(), H()))

    // Dar vida distinta a las chispas desde el inicio
    sparkles.forEach(s => { s.life = Math.floor(Math.random() * s.maxLife) })

    const render = () => {
      const w = W()
      const h = H()

      ctx.clearRect(0, 0, w, h)

      // Rayos de luz (van primero, debajo de todo)
      rays.forEach(r => { r.update(); r.draw(ctx) })

      // Monedas
      coins.forEach(c => { c.update(w, h); c.draw(ctx) })

      // Chispas (van arriba de todo)
      sparkles.forEach(s => { s.update(w, h); s.draw(ctx) })

      rafRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />
}
