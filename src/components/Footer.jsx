import { IconTrophy, IconPin } from './Icons'
import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <img src="/logo-sin-fondo.png" alt="Sala de Juegos Crespo" className="footer__logo" />
          <p className="footer__tagline">La emoción del juego, con estilo.</p>
          <p className="footer__address">San Martín 1053 · Crespo, Entre Ríos</p>
        </div>

        <nav className="footer__nav">
          <h4>La sala</h4>
          <a href="#sala">Slots y Ruletas</a>
          <a href="#ayb">Alimentos y Bebidas</a>
          <a href="#shows">Shows en Vivo</a>
          <a href="#torneos">Torneos</a>
        </nav>

        <nav className="footer__nav">
          <h4>Promos</h4>
          <a href="#prode" style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><IconTrophy size={14} /> Prode Mundial 2026</a>
          <a href="#torneos">Gran Torneo Final</a>
        </nav>

        <nav className="footer__nav">
          <h4>Contacto</h4>
          <a href="https://www.instagram.com/salajuegoscrespo/" target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            Instagram
          </a>
          <a href="#ubicacion" style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><IconPin size={14} /> Cómo llegar</a>
        </nav>
      </div>

      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p>© {year} Sala de Juegos Crespo · Todos los derechos reservados</p>
          <p className="footer__casinos">Operado bajo Casinos de Entre Ríos</p>
        </div>
      </div>
    </footer>
  )
}
