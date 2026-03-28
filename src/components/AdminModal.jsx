import { useNavigate } from 'react-router-dom'

export default function AdminModal({ onClose }) {
  const navigate = useNavigate()

  function handleEnter() {
    navigate('/admin')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
      zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--dark2)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 48, maxWidth: 420, width: '90%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔑</div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', marginBottom: 8 }}>
          Panel Administración
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
          Acceso exclusivo. Necesitás tus credenciales de admin.
        </p>
        <button
          onClick={handleEnter}
          style={{
            display: 'block', width: '100%', padding: '14px',
            background: 'var(--crimson)', color: 'white', borderRadius: 8,
            border: 'none', cursor: 'pointer', marginBottom: 12, fontWeight: 500,
            fontSize: 15,
          }}
        >
          Ingresar al Admin →
        </button>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
