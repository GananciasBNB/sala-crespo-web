import { Routes, Route } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Landing from './pages/Landing'
import ProdeApp from './pages/ProdeApp'
import AdminPanel from './pages/AdminPanel'
import Contacto from './pages/Contacto'

const SITE_URL = 'https://www.saladejuegoscrespo.ar'

function PageHead({ title, description, path = '/', noindex = false }) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`${SITE_URL}${path}`} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`${SITE_URL}${path}`} />
    </Helmet>
  )
}

function NotFound() {
  return (
    <>
      <PageHead
        title="Página no encontrada — Sala de Juegos Crespo"
        description="La página que buscás no existe."
        path="/"
        noindex
      />
      <Landing />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={
        <>
          <PageHead
            title="Sala de Juegos Crespo — Casino, Slots y Shows en Entre Ríos"
            description="Sala de juegos en Crespo, Entre Ríos. 160 slots, ruletas, shows en vivo, torneos y buffet. San Martín 1053."
            path="/"
          />
          <Landing />
        </>
      } />
      <Route path="/prode" element={
        <>
          <PageHead
            title="Prode Mundial 2026 — Concurso Gratis con Premios | Sala Crespo"
            description="Pronosticá los partidos del Mundial 2026, jugá gratis y ganá Free Play en Sala de Juegos Crespo. Registro en 1 minuto."
            path="/prode"
          />
          <ProdeApp />
        </>
      } />
      <Route path="/contacto" element={
        <>
          <PageHead
            title="Contacto — Sala de Juegos Crespo (San Martín 1053)"
            description="WhatsApp, email y formulario de contacto. Respondemos a la brevedad. San Martín 1053, Crespo, Entre Ríos."
            path="/contacto"
          />
          <Contacto />
        </>
      } />
      <Route path="/admin" element={
        <>
          <PageHead title="Admin" description="" path="/admin" noindex />
          <AdminPanel />
        </>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
