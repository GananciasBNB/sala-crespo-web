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
import PromoMundial from '../components/PromoMundial'
import PromoArgentina from '../components/PromoArgentina'
import VozDelBarrio from '../components/VozDelBarrio'
import Top10Prode from '../components/Top10Prode'
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
        {/* Universo Prode: promo + voz del barrio + ranking, todo junto */}
        <PromoMundial />
        {/* Promo presencial de los partidos de Argentina */}
        <PromoArgentina />
        <VozDelBarrio />
        <Top10Prode />
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
