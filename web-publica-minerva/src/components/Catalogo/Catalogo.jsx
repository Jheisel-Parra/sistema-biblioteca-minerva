import TarjetaLibro from './TarjetaLibro';
import './Catalogo.css';

export default function Catalogo({
  librosFiltrados,
  categorias,
  busqueda,
  onCambiarBusqueda,
  categoriaActiva,
  onCambiarCategoria,
  soloDisponibles,
  onCambiarSoloDisponibles,
  onResetearFiltros,
  onSeleccionarLibro,
  tasaBCV
}) {
  return (
    <section id="catalogo" className="catalogo-section">
      <div className="container">
        <div className="section-header">
          <div>
            <span className="section-eyebrow">NUESTRA COLECCIÓN</span>
            <h2>Libros Disponibles y Precios</h2>
            <p>
              Selecciona cualquier obra para conocer su disponibilidad y adquirirla en nuestra
              sede física o vía WhatsApp.
            </p>
          </div>
        </div>

        <div className="catalogo-filters-bar">
          <div className="search-input-wrap">
            <input
              type="text"
              placeholder="Buscar por título, autor o ISBN..."
              value={busqueda}
              onChange={(e) => onCambiarBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => onCambiarBusqueda('')}
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="category-pills">
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`cat-pill ${categoriaActiva === cat ? 'active' : ''}`}
                onClick={() => onCambiarCategoria(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <label className="stock-toggle-label">
            <input
              type="checkbox"
              checked={soloDisponibles}
              onChange={(e) => onCambiarSoloDisponibles(e.target.checked)}
            />
            <span>Mostrar solo disponibles</span>
          </label>
        </div>

        {librosFiltrados.length === 0 ? (
          <div className="empty-catalogo-box">
            <h3>No se encontraron libros con ese criterio</h3>
            <p>Prueba buscando otro título, autor o selecciona "Todas" las categorías.</p>
            <button
              type="button"
              className="btn-reset-filters"
              onClick={onResetearFiltros}
            >
              Mostrar todos los libros
            </button>
          </div>
        ) : (
          <div className="libros-grid">
            {librosFiltrados.map((libro) => (
              <TarjetaLibro
                key={libro.id || libro.isbn}
                libro={libro}
                tasaBCV={tasaBCV}
                onSeleccionarLibro={onSeleccionarLibro}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
