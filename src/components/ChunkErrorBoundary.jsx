import { Component } from 'react'

// Catches the specific class of errors thrown by React.lazy() when a chunk
// file can't be downloaded — typically because a new deploy invalidated the
// hashed filenames the open tab was holding. We reload once (guarded with a
// sessionStorage flag to avoid infinite loops) so the user lands on the new
// build and the chunk resolves.

const RELOAD_FLAG = 'chunk_reload_attempted_v1'

function isChunkLoadError(err) {
  if (!err) return false
  const message = String(err.message || err)
  return (
    err.name === 'ChunkLoadError' ||
    /Loading chunk [\d]+ failed/.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  )
}

export default class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, didReload: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error) {
    if (!isChunkLoadError(error)) return
    let alreadyReloaded = false
    try {
      alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'
    } catch {}
    if (alreadyReloaded) {
      this.setState({ didReload: true })
      return
    }
    try {
      sessionStorage.setItem(RELOAD_FLAG, '1')
    } catch {}
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      // Once a render succeeds we can clear the reload flag for next time.
      try { sessionStorage.removeItem(RELOAD_FLAG) } catch {}
      return this.props.children
    }
    if (isChunkLoadError(this.state.error) && !this.state.didReload) {
      // We triggered a reload; show nothing while the page unloads.
      return null
    }
    // Either non-chunk error or reload already attempted — show a minimal
    // fallback so the user isn't stuck on a blank screen.
    return (
      <div style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        textAlign: 'center',
        color: '#C8D2E0',
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}>
        <div>
          <p style={{ fontSize: 16, marginBottom: 12 }}>
            No pudimos cargar esta sección.
          </p>
          <button
            onClick={() => { try { sessionStorage.removeItem(RELOAD_FLAG) } catch {}; window.location.reload() }}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: '1px solid #C9A84C',
              background: 'transparent',
              color: '#F0D275',
              fontFamily: 'inherit',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }
}
