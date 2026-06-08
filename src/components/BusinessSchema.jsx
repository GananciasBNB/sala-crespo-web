import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { getContent } from '../api/client'

// JSON-LD del LocalBusiness + WebSite. Lee content.horario_especial.activo y
// genera el openingHoursSpecification correcto: durante el horario especial
// (Jun-Jul 2026) la sala abre 12:00 los Vie/Sáb/Dom/Feriados y cierra a las
// horas habituales (03/04 según el día); Lun-Jue queda cerrada. Cuando el
// toggle está OFF, vuelve al horario habitual.
//
// Por qué runtime y no estático: el horario cambia y se controla desde el
// admin con un toggle. Googlebot ejecuta JS desde 2019 — el JSON-LD inyectado
// por Helmet llega al crawler. El index.html no incluye más el JSON-LD
// (lo hacía con datos hardcodeados que se desactualizaban).

const SITE = 'https://www.saladejuegoscrespo.ar'

const HOURS_REGULAR = [
  { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday','Monday','Tuesday','Wednesday','Thursday'], opens: '15:00', closes: '03:00' },
  { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Friday','Saturday','PublicHolidays'], opens: '15:00', closes: '04:00' },
]
const HOURS_SPECIAL = [
  // Vie y Sáb abren 12:00 y cierran 04:00; Dom abre 12:00 y cierra 03:00; Feriados igual que Dom.
  { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Friday','Saturday'], opens: '12:00', closes: '04:00' },
  { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday','PublicHolidays'], opens: '12:00', closes: '03:00' },
  // Lun-Jue cerrado durante el especial (no se declara — la ausencia = cerrado)
]

export default function BusinessSchema() {
  const [special, setSpecial] = useState(false)

  useEffect(() => {
    let cancelled = false
    getContent()
      .then(c => { if (!cancelled) setSpecial(c?.horario_especial?.activo === 'true') })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'EntertainmentBusiness',
    '@id': `${SITE}/#business`,
    name: 'Sala de Juegos Crespo',
    alternateName: 'Sala Crespo',
    url: `${SITE}/`,
    logo: `${SITE}/logo-light.jpg`,
    image: `${SITE}/logo-light.jpg`,
    description: 'Sala de juegos en Crespo, Entre Ríos. 160 slots, ruletas, shows en vivo, torneos y buffet. Prode Mundial 2026 con premios reales.',
    telephone: '+5493434259136',
    email: 'info@saladejuegoscrespo.ar',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'San Martín 1053',
      addressLocality: 'Crespo',
      addressRegion: 'Entre Ríos',
      postalCode: '3116',
      addressCountry: 'AR',
    },
    geo: { '@type': 'GeoCoordinates', latitude: -32.0306, longitude: -60.3133 },
    openingHoursSpecification: special ? HOURS_SPECIAL : HOURS_REGULAR,
    sameAs: [
      'https://www.instagram.com/salajuegoscrespo/',
      'https://www.facebook.com/profile.php?id=61583318054058',
    ],
  }
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sala de Juegos Crespo',
    url: `${SITE}/`,
    publisher: { '@id': `${SITE}/#business` },
    inLanguage: 'es-AR',
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(localBusiness)}</script>
      <script type="application/ld+json">{JSON.stringify(website)}</script>
    </Helmet>
  )
}
