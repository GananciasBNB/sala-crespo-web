// La Gran Pesca: the night's sequence of jumps, shared by the game and the server.
// The backend keeps an IDENTICAL copy (prode-mundial/pesca-plan.js) to reject impossible
// scores: if you change this file, copy it there too (pesca-verificar.mjs checks they match).
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica()
  else raiz.PescaPlan = fabrica()
})(typeof self !== 'undefined' ? self : this, function () {
  const PUNTOS = { comun: 10, plateado: 25, dorado: 100, legendario: 250, botella: -30, bota: -30, rama: -30 }
  const BASURA = ['botella', 'bota', 'rama']
  // geometry the jumps are aimed at (logical screen 1280 wide, boat range, net offset)
  const GEO = { W: 1280, minX: 330, maxX: 1280 - 92.96 - 90, aroX: 92.96 }

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }

  function planDeLaNoche(semilla, dur, geo = GEO) {
    const { W, minX, maxX, aroX } = geo
    const rnd = mulberry32(semilla), ev = []
    let t = 1.0, legendarios = 0
    while (t < dur - 1.4) {
      const k = t / dur
      const fase = k < 1 / 3 ? 0 : k < 2 / 3 ? 1 : 2
      const r = rnd()
      let tipo
      if (fase === 0) tipo = r < .66 ? 'comun' : r < .93 ? 'plateado' : 'dorado'
      else if (fase === 1) tipo = r < .5 ? 'comun' : r < .74 ? 'plateado' : r < .84 ? 'dorado' : BASURA[Math.floor(rnd() * 3)]
      else tipo = r < .44 ? 'comun' : r < .66 ? 'plateado' : r < .78 ? 'dorado' : BASURA[Math.floor(rnd() * 3)]
      // one legendary around the middle, another chance near the end
      if (legendarios === 0 && t > dur * .5) { tipo = 'legendario'; legendarios++ }
      else if (legendarios === 1 && t > dur * .86 && rnd() < .5) { tipo = 'legendario'; legendarios++ }
      const g = [1050, 1200, 1350][fase]
      const y0 = 800 + rnd() * 120
      const apex = (fase === 2 ? 300 : 260) + rnd() * 190
      const vy0 = Math.sqrt(2 * g * (y0 - apex)), vuelo = 2 * vy0 / g
      const x0 = 200 + rnd() * (W - 320)
      let xFin = x0 + (rnd() - .5) * 760
      xFin = Math.max(minX + aroX + 10, Math.min(maxX + aroX - 10, xFin))
      ev.push({ t, tipo, x0, y0, apex, g, vx: (xFin - x0) / vuelo })
      const hueco = [0.95, 0.66, 0.46][fase]
      t += hueco * (0.75 + rnd() * 0.5)
      // pairs in the last third: two at once
      // (the second fish of a pair must also land within the net's reach)
      if (fase === 2 && rnd() < .3) {
        const x2 = 200 + rnd() * (W - 320), tipo2 = rnd() < .8 ? 'comun' : 'plateado', y2 = 800 + rnd() * 120, apex2 = 320 + rnd() * 150, vx2 = (rnd() - .5) * 260
        const vuelo2 = 2 * Math.sqrt(2 * g * (y2 - apex2)) / g
        const fin2 = Math.max(minX + aroX + 10, Math.min(maxX + aroX - 10, x2 + vx2 * vuelo2))
        ev.push({ t: t - .12, tipo: tipo2, x0: x2, y0: y2, apex: apex2, g, vx: (fin2 - x2) / vuelo2 })
      }
    }
    if (semilla >= CUOTA_DESDE) cuotaDeBasura(ev, rnd)
    return ev
  }

  // The random draw alone gave anything from 1 to 10 junk items a day (17/10 had a single boot).
  // From this seed on: 6 to 8 per day, at least 2 of each kind, never before second 8.
  // Only common/silver fish turn into junk (or junk back into common fish), so the gold and
  // legendary fish of the day stay where they were.
  const CUOTA_DESDE = 20261018
  function cuotaDeBasura(ev, rnd) {
    const objetivo = 6 + Math.floor(rnd() * 3)
    const esBasura = e => BASURA.includes(e.tipo)
    let basura = ev.filter(esBasura)
    // too many: the latest extra junk becomes common fish
    for (let i = basura.length - 1; basura.length > objetivo && i >= 0; i--) { basura[i].tipo = 'comun'; basura = ev.filter(esBasura) }
    // too few: common/silver fish after second 8 become junk, spread over the candidates
    const candidatos = ev.filter(e => e.t >= 8 && (e.tipo === 'comun' || e.tipo === 'plateado'))
    while (basura.length < objetivo && candidatos.length) {
      const e = candidatos.splice(Math.floor(rnd() * candidatos.length), 1)[0]
      e.tipo = 'botella'; basura = ev.filter(esBasura)
    }
    // at least 2 of each kind: deal the kinds over the junk in time order
    basura.sort((x, y) => x.t - y.t).forEach((e, i) => { e.tipo = BASURA[(i + Math.floor(rnd() * 3)) % 3] })
    const cuenta = k => basura.filter(e => e.tipo === k).length
    for (const k of BASURA) {
      while (cuenta(k) < 2) {
        const sobra = BASURA.find(o => cuenta(o) > 2)
        if (!sobra) break
        basura.find(e => e.tipo === sobra).tipo = k
      }
    }
  }

  // Highest score anyone could make with that sequence: every fish caught at x3 streak,
  // doubled in the last 10 seconds. Anything above this is not a real game.
  function puntajeMaximo(semilla, dur) {
    return planDeLaNoche(semilla, dur).reduce((suma, e) => {
      const p = PUNTOS[e.tipo]
      return p > 0 ? suma + p * 3 * (e.t >= dur - 10 ? 2 : 1) : suma
    }, 0)
  }

  return { PUNTOS, BASURA, GEO, mulberry32, planDeLaNoche, puntajeMaximo }
})
