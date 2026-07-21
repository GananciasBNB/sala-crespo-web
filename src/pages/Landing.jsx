import { useState } from 'react'
import ProdeBanner from '../components/ProdeBanner'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import PropuestaValor from '../components/PropuestaValor'
import LaSala from '../components/LaSala'
import AyB from '../components/AyB'
import VeniALaSala from '../components/VeniALaSala'
import Shows from '../components/Shows'
import Torneos from '../components/Torneos'
// import PromoMundial from '../components/PromoMundial' // oculto: Mundial terminó, reactivar al definir el nuevo Prode
import PromoArgentina from '../components/PromoArgentina'
// import VozDelBarrio from '../components/VozDelBarrio' // oculto: testimonios del Prode terminado
// import Top10Prode from '../components/Top10Prode' // oculto: "van ganando" en presente, Mundial terminó
import LeadCapture from '../components/LeadCapture'
import LeadFloatingCta from '../components/LeadFloatingCta'
import Ubicacion from '../components/Ubicacion'
import Footer from '../components/Footer'
import AdminModal from '../components/AdminModal'

export default function Landing() {
  const [adminOpen, setAdminOpen] = useState(false)

  return (
    <>
      <ProdeBanner />
      <Navbar onAdminUnlock={() => setAdminOpen(true)} />
      <main>
        <Hero />
        <PropuestaValor />
        {/* Bloque mundialero: anuncio del primer piso + carta de A&B */}
        <VeniALaSala />
        <LaSala />
        {/* Promo presencial de los partidos de Argentina (va arriba del Prode) */}
        <PromoArgentina />
        {/* Universo Prode oculto: el Mundial terminó. Reactivar <PromoMundial /> <VozDelBarrio /> <Top10Prode /> al definir el nuevo Prode. */}
        <AyB />
        <Shows />
        <Torneos />
        <LeadCapture />
        <Ubicacion />
      </main>
      <Footer />
      <LeadFloatingCta />
      {adminOpen && <AdminModal onClose={() => setAdminOpen(false)} />}
    </>
  )
}
