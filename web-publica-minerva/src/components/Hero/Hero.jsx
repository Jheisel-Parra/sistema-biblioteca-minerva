import { UBICACION_NOMBRE } from '../../constants/config';
import './Hero.css';

export default function Hero({ busqueda, onCambiarBusqueda }) {
  return (
    <section id="inicio" className="hero-minerva">
      <div className="container hero-centered">
        <span className="hero-badge">LIBRERÍA & CENTRO CULTURAL MINERVA</span>
        <h1>Descubre tu próxima gran lectura</h1>
        <p>
          Explora nuestro catálogo de obras literarias, consulta precios y verifica los
          ejemplares disponibles. Adquiere tus libros visitándonos en el{' '}
          <strong>{UBICACION_NOMBRE}</strong> o solicítalos directamente por nuestro WhatsApp.
        </p>

        <div className="hero-search-box">
          <input
            type="text"
            placeholder="Buscar libro por título, autor o género..."
            value={busqueda}
            onChange={(e) => onCambiarBusqueda(e.target.value)}
            aria-label="Buscar libros"
          />
          <a href="#catalogo" className="btn-hero-search">
            Buscar
          </a>
        </div>

        <div className="hero-quick-actions">
          <a href="#catalogo" className="btn-primary-gold">
            Ver Libros Disponibles
          </a>
          <a href="#ubicacion" className="btn-outline-light">
            Nuestra Sede en C.C. Arca
          </a>
        </div>
      </div>
    </section>
  );
}
