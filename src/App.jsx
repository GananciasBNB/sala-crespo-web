import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Landing from './pages/Landing'
import ProdeApp from './pages/ProdeApp'
import ChunkErrorBoundary from './components/ChunkErrorBoundary'
import BusinessSchema from './components/BusinessSchema'
import InstallAppBanner from './components/InstallAppBanner'

// Lazy-load routes that ad traffic never lands on, so /, /prode and /torneo
// don't pay the cost of downloading admin / tournament-landing / contacto code.
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const Contacto = lazy(() => import('./pages/Contacto'))
const TournamentLanding = lazy(() => import('./pages/TournamentLanding'))
const Club = lazy(() => import('./pages/Club'))
const CartaPublica = lazy(() => import('./pages/CartaPublica'))
const CartaAdmin = lazy(() => import('./pages/CartaAdmin'))
const MorphiSync = lazy(() => import('./pages/MorphiSync'))

function RouteFallback() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'grid',
      placeItems: 'center',
      color: '#C8D2E0',
      fontFamily: 'DM Sans, system-ui, sans-serif',
      fontSize: 14,
      letterSpacing: '0.04em',
    }}>
      Cargando…
    </div>
  )
}

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
  // La carta tiene su propia barra inferior fija → ahí el banner global se pisa.
  const { pathname } = useLocation()
  const hideInstallBanner = pathname.startsWith('/carta')
  return (
    <>
      <BusinessSchema />
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
      <Route path="/torneo" element={
        <>
          <PageHead
            title="Torneo de Slots — Inscripción Gratuita | Sala Crespo"
            description="Inscribite gratis al próximo Torneo de Slots de Sala Crespo. Premios en tickets promocionales. San Martín 1053, Crespo, Entre Ríos."
            path="/torneo"
          />
          <ChunkErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <TournamentLanding />
            </Suspense>
          </ChunkErrorBoundary>
        </>
      } />
      <Route path="/contacto" element={
        <>
          <PageHead
            title="Contacto — Sala de Juegos Crespo (San Martín 1053)"
            description="WhatsApp, email y formulario de contacto. Respondemos a la brevedad. San Martín 1053, Crespo, Entre Ríos."
            path="/contacto"
          />
          <ChunkErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Contacto />
            </Suspense>
          </ChunkErrorBoundary>
        </>
      } />
      <Route path="/admin" element={
        <>
          <PageHead title="Admin" description="" path="/admin" noindex />
          <ChunkErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <AdminPanel />
            </Suspense>
          </ChunkErrorBoundary>
        </>
      } />
      <Route path="/club" element={
        <>
          <PageHead title="Sala Crespo Club" description="" path="/club" noindex />
          <ChunkErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Club />
            </Suspense>
          </ChunkErrorBoundary>
        </>
      } />
      <Route path="/carta" element={
        <>
          <PageHead
            title="Carta — Sala de Juegos Crespo (Bar)"
            description="Carta del bar de Sala de Juegos Crespo: minutas, cervezas, vinos, tragos y más. San Martín 1053, Crespo, Entre Ríos."
            path="/carta"
          />
          <ChunkErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <CartaPublica />
            </Suspense>
          </ChunkErrorBoundary>
        </>
      } />
      <Route path="/admin/carta" element={
        <>
          <PageHead title="Gestión de Carta" description="" path="/admin/carta" noindex />
          <ChunkErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <CartaAdmin />
            </Suspense>
          </ChunkErrorBoundary>
        </>
      } />
      <Route path="/morphi" element={
        <>
          <PageHead title="Precios para Morphi" description="" path="/morphi" noindex />
          <ChunkErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <MorphiSync />
            </Suspense>
          </ChunkErrorBoundary>
        </>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
    {/* Banner global "Instalá la app" — en todas las páginas salvo la carta (tiene barra propia) */}
    {!hideInstallBanner && <InstallAppBanner />}
    </>
  )
}
