import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'
import { captureUtmsFromUrl } from './lib/utmAttribution'

// Persist UTMs / fbclid / gclid the very first thing we do, so any later
// registration (even after refresh) carries the campaign that brought the
// user in.
captureUtmsFromUrl()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
