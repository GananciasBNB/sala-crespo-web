import { useState } from 'react'
import ProdeBanner from '../components/ProdeBanner'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import PropuestaValor from '../components/PropuestaValor'
import LaSala from '../components/LaSala'
import AyB from '../components/AyB'
import Shows from '../components/Shows'
import Torneos from '../components/Torneos'
import PromoMundial from '../components/PromoMundial'
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
        <LaSala />
        <AyB />
        <Shows />
        <Torneos />
        <PromoMundial />
        <Ubicacion />
      </main>
      <Footer />
      {adminOpen && <AdminModal onClose={() => setAdminOpen(false)} />}
    </>
  )
}
