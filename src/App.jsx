import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import ProdeApp from './pages/ProdeApp'
import AdminPanel from './pages/AdminPanel'
import Contacto from './pages/Contacto'

export default function App() {
  return (
    <Routes>
      <Route path="/"         element={<Landing />} />
      <Route path="/prode"    element={<ProdeApp />} />
      <Route path="/admin"    element={<AdminPanel />} />
      <Route path="/contacto" element={<Contacto />} />
      <Route path="*"         element={<Landing />} />
    </Routes>
  )
}
