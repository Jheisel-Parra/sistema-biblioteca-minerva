const logo = './Logo.png';
import IconoWhatsApp from '../IconoWhatsApp/IconoWhatsApp';
import { UBICACION_NOMBRE, construirLinkWhatsApp } from '../../constants/config';
import './Navbar.css';

export default function Navbar({ tasaBCV }) {
  return (
    <>
      <div className="top-announcement-bar">
        <div className="container top-announcement-inner">
          <span>
            <strong>Ubicación:</strong> {UBICACION_NOMBRE} (Estado Lara)
          </span>
          <div className="top-announcement-right">
            <span>Horario: Lunes a Sábado (9:00 AM - 6:00 PM)</span>
            <span>Tasa BCV del Día: Bs. {tasaBCV.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <header className="navbar-minerva">
        <div className="container navbar-inner">
          <a href="#inicio" className="brand-link">
            <img src={logo} alt="Logo Librería Minerva" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-title">LIBRERÍA MINERVA</span>
              <span className="brand-subtitle">Espacio del Conocimiento y la Sabiduría</span>
            </div>
          </a>

          <nav className="nav-links">
            <a href="#inicio">Inicio</a>
            <a href="#catalogo">Catálogo de Libros</a>
            <a href="#como-comprar">¿Cómo Comprar?</a>
            <a href="#ubicacion">Ubicación</a>
          </nav>

          <div className="nav-cta">
            <a
              href={construirLinkWhatsApp(null, tasaBCV)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp-header"
            >
              <IconoWhatsApp size={18} />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </header>
    </>
  );
}
