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
          <a href="https://wa.me/5493434259136" target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
            WhatsApp
          </a>
          <a href="mailto:info@saladejuegoscrespo.ar" style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
            info@saladejuegoscrespo.ar
          </a>
          <a href="https://www.instagram.com/salajuegoscrespo/" target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            Instagram
          </a>
          <a href="https://www.facebook.com/profile.php?id=61583318054058" target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </a>
          <a href="#ubicacion" style={{display:'inline-flex',alignItems:'center',gap:'6px'}}><IconPin size={14} /> Cómo llegar</a>
          <a href="/contacto" style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Dudas, sugerencias, reclamos
          </a>
        </nav>

        <nav className="footer__nav">
          <h4>Legales</h4>
          <a href="/legal/01-aviso-legal.html" target="_blank" rel="noopener noreferrer">Aviso legal</a>
          <a href="/legal/02-terminos-web.html" target="_blank" rel="noopener noreferrer">Términos y condiciones</a>
          <a href="/legal/03-politica-privacidad.html" target="_blank" rel="noopener noreferrer">Política de privacidad</a>
          <a href="/legal/04-politica-cookies.html" target="_blank" rel="noopener noreferrer">Política de cookies</a>
          <a href="/legal/05-bases-prode-publico.html" target="_blank" rel="noopener noreferrer">Bases del Prode Mundial 2026</a>
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
