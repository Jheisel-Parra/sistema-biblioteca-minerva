import { useState } from 'react';
import './Libros.css';
import { 
  apiCrearLibro, 
  apiActualizarLibro,
  apiCrearCategoria,
  apiActualizarCategoria,
  apiEliminarCategoria
} from '../../services/api';
import { capitalizarPalabras } from '../../utils/formatoTexto';

const CATEGORIAS_LIBROS = [
  'Novela',
  'Clásico',
  'Ciencia Ficción',
  'Fantasía',
  'Infantil / Juvenil',
  'Misterio / Suspenso',
  'Historia / Biografía',
  'Filosofía',
  'Ciencia / Divulgación',
  'Poesía / Teatro',
  'Autoayuda / Desarrollo Personal',
  'Educación / Texto Escolar',
  'Otro'
];

export default function Libros({ 
  libros: propLibros, 
  setLibros: propSetLibros, 
  distribuidores = [], 
  categorias: propCategorias = [],
  setCategorias: propSetCategorias,
  onLibroCreado,
  rolUsuario = 'admin',
  esAdmin = true,
  onAbrirReporte
}) {
  const [localLibros, setLocalLibros] = useState([
    { 
      id: 1, 
      titulo: 'Cien años de soledad', 
      autor: 'Gabriel García Márquez', 
      isbn: '978-0307474728', 
      categoria: 'Novela', 
      distribuidor: 'Penguin Random House Grupo Editorial',
      precio: 15.00, 
      precioCosto: 9.00,
      ejemplares: 5,
      portada: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=200'
    },
    { 
      id: 2, 
      titulo: 'Don Quijote de la Mancha', 
      autor: 'Miguel de Cervantes', 
      isbn: '978-8424116026', 
      categoria: 'Clásico', 
      distribuidor: 'Grupo Planeta',
      precio: 22.50, 
      precioCosto: 13.50,
      ejemplares: 2,
      portada: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=200'
    },
    { 
      id: 3, 
      titulo: 'El principito', 
      autor: 'Antoine de Saint-Exupéry', 
      isbn: '978-0156013987', 
      categoria: 'Infantil / Juvenil', 
      distribuidor: 'Ediciones Ekaré',
      precio: 10.00, 
      precioCosto: 5.50,
      ejemplares: 4,
      portada: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=200'
    },
    { 
      id: 4, 
      titulo: 'Fahrenheit 451', 
      autor: 'Ray Bradbury', 
      isbn: '978-1451673319', 
      categoria: 'Ciencia Ficción', 
      distribuidor: 'Penguin Random House Grupo Editorial',
      precio: 18.00, 
      precioCosto: 10.50,
      ejemplares: 3,
      portada: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&q=80&w=200'
    },
  ]);

  const libros = propLibros || localLibros;
  const setLibros = propSetLibros || setLocalLibros;

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [errorModalNuevo, setErrorModalNuevo] = useState('');
  const [errorModalEdit, setErrorModalEdit] = useState('');

  const [nuevoLibro, setNuevoLibro] = useState({
    titulo: '',
    autor: '',
    isbn: '',
    categoria: '',
    distribuidor: '',
    precio: '',
    precioCosto: '',
    ejemplares: 1,
    portada: ''
  });

  const [libroAEditar, setLibroAEditar] = useState(null);

  // Estado local de categorías si no vinieran por prop
  const [localCategorias, setLocalCategorias] = useState(
    CATEGORIAS_LIBROS.map((nombre, i) => ({
      id: i + 1,
      nombre,
      totalLibros: 0,
      totalVentas: 0,
      tieneVentas: false,
      sePuedeEditar: true,
      sePuedeEliminar: true
    }))
  );

  const categorias = propCategorias && propCategorias.length > 0 ? propCategorias : localCategorias;
  const setCategorias = propSetCategorias || setLocalCategorias;

  // Estado para Modal de Gestión de Géneros
  const [mostrarModalGeneros, setMostrarModalGeneros] = useState(false);
  const [nuevoGeneroNombre, setNuevoGeneroNombre] = useState('');
  const [generoEnEdicion, setGeneroEnEdicion] = useState(null);
  const [mensajeErrorGenero, setMensajeErrorGenero] = useState('');
  const [mensajeExitoGenero, setMensajeExitoGenero] = useState('');
  const [guardandoGenero, setGuardandoGenero] = useState(false);

  const handleCrearGenero = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const nombreLimpio = nuevoGeneroNombre.trim();
    if (!nombreLimpio) return;

    try {
      setGuardandoGenero(true);
      setMensajeErrorGenero('');
      setMensajeExitoGenero('');

      const res = await apiCrearCategoria({ nombre: nombreLimpio });
      if (res.ok && res.categoria) {
        setCategorias((prev) => [...prev, res.categoria]);
        setMensajeExitoGenero(`¡Género "${res.categoria.nombre}" creado exitosamente!`);
        setNuevoGeneroNombre('');
      }
    } catch (err) {
      setMensajeErrorGenero(err.message || 'Error al registrar el género.');
    } finally {
      setGuardandoGenero(false);
    }
  };

  const handleGuardarEdicionGenero = async (catId) => {
    if (!generoEnEdicion || !generoEnEdicion.nombre.trim()) return;
    const nombreNuevo = generoEnEdicion.nombre.trim();

    try {
      setGuardandoGenero(true);
      setMensajeErrorGenero('');
      setMensajeExitoGenero('');

      const res = await apiActualizarCategoria(catId, { nombre: nombreNuevo });
      if (res.ok && res.categoria) {
        setCategorias((prev) =>
          prev.map((c) => (c.id === catId ? res.categoria : c))
        );
        // Actualizar en libros si alguno tenía ese nombre
        setLibros((prevLibros) =>
          prevLibros.map((l) =>
            l.categoria === generoEnEdicion._nombreAnterior ? { ...l, categoria: nombreNuevo } : l
          )
        );
        setMensajeExitoGenero(`¡Género renombrado a "${nombreNuevo}" exitosamente!`);
        setGeneroEnEdicion(null);
      }
    } catch (err) {
      setMensajeErrorGenero(err.message || 'Error al actualizar el género.');
    } finally {
      setGuardandoGenero(false);
    }
  };

  const handleEliminarGenero = async (cat) => {
    if (cat.tieneVentas) {
      alert(`🔒 No se puede eliminar el género "${cat.nombre}" porque ya cuenta con ventas y facturas registradas.`);
      return;
    }

    const confirmar = window.confirm(`¿Estás seguro de eliminar el género "${cat.nombre}"?`);
    if (!confirmar) return;

    try {
      setGuardandoGenero(true);
      setMensajeErrorGenero('');
      setMensajeExitoGenero('');

      const res = await apiEliminarCategoria(cat.id);
      if (res.ok) {
        setCategorias((prev) => prev.filter((c) => c.id !== cat.id));
        setLibros((prevLibros) =>
          prevLibros.map((l) => (l.categoria === cat.nombre ? { ...l, categoria: 'Otro' } : l))
        );
        setMensajeExitoGenero(res.mensaje || `¡Género "${cat.nombre}" eliminado exitosamente!`);
      }
    } catch (err) {
      setMensajeErrorGenero(err.message || 'Error al eliminar el género.');
    } finally {
      setGuardandoGenero(false);
    }
  };

  const handleChange = (e) => {
    if (errorModalNuevo) setErrorModalNuevo('');
    const { name, value } = e.target;
    let valorLimpio = value;
    if (name === 'autor') valorLimpio = capitalizarPalabras(value.replace(/\d/g, ''), true);
    if (name === 'titulo') valorLimpio = capitalizarPalabras(value, true);
    setNuevoLibro({
      ...nuevoLibro,
      [name]: valorLimpio
    });
  };

  const handleEditChange = (e) => {
    if (errorModalEdit) setErrorModalEdit('');
    const { name, value } = e.target;
    let valorLimpio = value;
    if (name === 'autor') valorLimpio = capitalizarPalabras(value.replace(/\d/g, ''), true);
    if (name === 'titulo') valorLimpio = capitalizarPalabras(value, true);
    setLibroAEditar({
      ...libroAEditar,
      [name]: valorLimpio
    });
  };

  const handleImageFileChange = (e, esEdicion = false) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (esEdicion) {
          setLibroAEditar((prev) => ({ ...prev, portada: reader.result }));
        } else {
          setNuevoLibro((prev) => ({ ...prev, portada: reader.result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLimpiarNuevoLibro = () => {
    setErrorModalNuevo('');
    setNuevoLibro({
      titulo: '',
      autor: '',
      isbn: '',
      categoria: '',
      distribuidor: '',
      precio: '',
      precioCosto: '',
      ejemplares: 1,
      portada: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nuevoLibro.titulo || !nuevoLibro.autor || !nuevoLibro.categoria || !nuevoLibro.precio || !nuevoLibro.distribuidor) return;

    if (/\d/.test(nuevoLibro.autor)) {
      setErrorModalNuevo('El nombre del autor no puede contener números.');
      return;
    }

    try {
      setErrorModalNuevo('');
      const res = await apiCrearLibro({
        titulo: nuevoLibro.titulo.trim(),
        autor: nuevoLibro.autor.trim(),
        isbn: nuevoLibro.isbn.trim(),
        categoria: nuevoLibro.categoria,
        distribuidorNombre: nuevoLibro.distribuidor,
        precio: parseFloat(nuevoLibro.precio),
        precioCosto: nuevoLibro.precioCosto ? parseFloat(nuevoLibro.precioCosto) : 0.0,
        ejemplares: parseInt(nuevoLibro.ejemplares, 10) || 0,
        portada: nuevoLibro.portada
      });

      if (res.ok && res.libro) {
        setLibros([res.libro, ...libros]);
        if (onLibroCreado) {
          onLibroCreado(res.libro, res.entrada);
        }
        setMostrarModal(false);
        handleLimpiarNuevoLibro();
      }
    } catch (err) {
      setErrorModalNuevo(err.message || 'Error al guardar el libro en la base de datos.');
    }
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    if (!libroAEditar || !libroAEditar.titulo || !libroAEditar.autor || !libroAEditar.categoria || !libroAEditar.precio) return;

    if (/\d/.test(libroAEditar.autor)) {
      setErrorModalEdit('El nombre del autor no puede contener números.');
      return;
    }

    try {
      setErrorModalEdit('');
      const res = await apiActualizarLibro(libroAEditar.id, {
        titulo: libroAEditar.titulo.trim(),
        autor: libroAEditar.autor.trim(),
        isbn: libroAEditar.isbn ? libroAEditar.isbn.trim() : undefined,
        categoria: libroAEditar.categoria,
        distribuidorNombre: libroAEditar.distribuidor,
        precio: parseFloat(libroAEditar.precio),
        precioCosto: libroAEditar.precioCosto !== undefined && libroAEditar.precioCosto !== '' ? parseFloat(libroAEditar.precioCosto) : 0.0,
        portada: libroAEditar.portada
      });

      if (res.ok && res.libro) {
        setLibros(
          libros.map((l) =>
            l.id === libroAEditar.id || l.id === res.libro.id || (l.isbn && l.isbn === res.libro.isbn)
              ? res.libro
              : l
          )
        );
        setLibroAEditar(null);
      }
    } catch (err) {
      setErrorModalEdit(err.message || 'Error al actualizar el libro en la base de datos.');
    }
  };

  const librosFiltrados = libros.filter((libro) => {
    const coincideBusqueda = 
      libro.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      libro.autor.toLowerCase().includes(busqueda.toLowerCase()) ||
      libro.isbn.includes(busqueda);

    if (filtroEstado === 'disponibles') return coincideBusqueda && libro.ejemplares > 0;
    if (filtroEstado === 'agotados') return coincideBusqueda && libro.ejemplares <= 0;
    return coincideBusqueda;
  });

  return (
    <div className="page-container">
      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h2>📚 Catálogo de Libros</h2>
          <p>
            {esAdmin 
              ? 'Consulta el catálogo, precios de venta al público, costos de compra a proveedores y administra el inventario.' 
              : 'Consulta el catálogo general de libros, disponibilidad en tienda y precios de venta al público.'}
          </p>
        </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {esAdmin && onAbrirReporte && (
              <>
                <button 
                  type="button" 
                  onClick={() => onAbrirReporte('stock-critico')}
                  style={{ padding: '0.65rem 0.95rem', fontSize: '0.88rem', borderRadius: '8px', cursor: 'pointer', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontWeight: 700 }}
                  title="Generar reporte de libros con stock bajo o agotados"
                >
                  ⚠️ Reporte Stock Crítico
                </button>
                <button 
                  type="button" 
                  onClick={() => onAbrirReporte('catalogo-generos')}
                  style={{ padding: '0.65rem 0.95rem', fontSize: '0.88rem', borderRadius: '8px', cursor: 'pointer', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 700 }}
                  title="Generar catálogo oficial de existencias por género"
                >
                  📚 Reporte Catálogo
                </button>
              </>
            )}
            {esAdmin && (
              <>
                <button 
                  type="button" 
                  className="btn-action-edit-libro"
                  onClick={() => {
                    setMensajeErrorGenero('');
                    setMensajeExitoGenero('');
                    setGeneroEnEdicion(null);
                    setMostrarModalGeneros(true);
                  }}
                  style={{ padding: '0.65rem 1rem', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', fontWeight: 600 }}
                  title="Administrar géneros y categorías literarias"
                >
                  🏷️ Gestionar Géneros
                </button>
                <button className="btn-primary" onClick={() => setMostrarModal(true)}>
                  + Nuevo Libro
                </button>
              </>
            )}
          </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="controls-bar">
        <input 
          type="text" 
          className="input-search"
          placeholder="Buscar libro..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="filter-group">
          <button 
            className={`filter-btn ${filtroEstado === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('todos')}
          >
            Todos
          </button>
          <button 
            className={`filter-btn ${filtroEstado === 'disponibles' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('disponibles')}
          >
            Disponibles
          </button>
          <button 
            className={`filter-btn ${filtroEstado === 'agotados' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('agotados')}
          >
            Agotados
          </button>
        </div>
      </div>

      {/* Tabla de Libros */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>Portada</th>
              <th>Título y Distribuidor</th>
              <th>Autor</th>
              <th>Categoría</th>
              <th>ISBN</th>
              <th>Precio Base ($)</th>
              <th>IVA (16%)</th>
              <th>Total c/IVA ($)</th>
              {esAdmin && <th>Costo Compra ($)</th>}
              {esAdmin && <th>Ganancia Estimada</th>}
              <th>Stock</th>
              <th>Estado</th>
              {esAdmin && <th style={{ textAlign: 'center' }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {librosFiltrados.length > 0 ? (
              librosFiltrados.map((libro) => {
                const estaDisponible = libro.ejemplares > 0;
                const precioBase = Number(libro.precio || 0);
                const montoIva = parseFloat((precioBase * 0.16).toFixed(2));
                const precioConIva = parseFloat((precioBase + montoIva).toFixed(2));

                return (
                  <tr key={libro.id}>
                    <td style={{ textAlign: 'center' }}>
                      {libro.portada ? (
                        <img 
                          src={libro.portada} 
                          alt={libro.titulo} 
                          className="libro-portada-thumb" 
                        />
                      ) : (
                        <div className="libro-portada-placeholder">
                          📖
                        </div>
                      )}
                    </td>
                    <td className="text-bold">
                      <div>{libro.titulo}</div>
                      {libro.distribuidor && (
                        <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 'normal', display: 'block', marginTop: '2px' }}>
                          🏢 {libro.distribuidor}
                        </span>
                      )}
                    </td>
                    <td>{libro.autor}</td>
                    <td>{libro.categoria}</td>
                    <td className="text-muted">{libro.isbn}</td>
                    <td style={{ fontWeight: 600, color: '#334155' }}>
                      ${precioBase.toFixed(2)}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      +${montoIva.toFixed(2)}
                    </td>
                    <td className="text-bold" style={{ color: '#0f766e' }}>
                      ${precioConIva.toFixed(2)}
                    </td>
                    {esAdmin && (
                      <td style={{ color: '#475569', fontWeight: 500 }}>
                        ${Number(libro.precioCosto || 0).toFixed(2)}
                      </td>
                    )}
                    {esAdmin && (
                      <td>
                        {(() => {
                          const venta = Number(libro.precio) || 0;
                          const costo = Number(libro.precioCosto) || 0;
                          const ganancia = venta - costo;
                          const margenPct = venta > 0 ? ((ganancia / venta) * 100).toFixed(1) : '0.0';
                          return (
                            <div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: ganancia >= 0 ? '#16a34a' : '#dc2626' }}>
                                {ganancia >= 0 ? `+$${ganancia.toFixed(2)}` : `-$${Math.abs(ganancia).toFixed(2)}`}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>
                                ({margenPct}%)
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                    )}
                    <td>{libro.ejemplares} uds.</td>
                    <td>
                      <span className={`badge ${estaDisponible ? 'badge-success' : 'badge-danger'}`}>
                        {estaDisponible ? 'Disponible' : 'Agotado'}
                      </span>
                    </td>
                    {esAdmin && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-action-edit-libro"
                          onClick={() => setLibroAEditar({ ...libro, _stockOriginal: Number(libro.ejemplares) || 0 })}
                          title="Editar nombre, portada y datos del libro"
                        >
                          ✏️ Editar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={esAdmin ? 11 : 8} className="table-empty">
                  No se encontraron libros con los criterios seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para agregar libro */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <h3>Registrar Nuevo Libro</h3>

            {errorModalNuevo && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {errorModalNuevo}
              </div>
            )}

            <form onSubmit={handleSubmit} className="form-group">
              <input type="text" name="titulo" placeholder="Título" value={nuevoLibro.titulo} onChange={handleChange} required className="form-input" />
              <input type="text" name="autor" placeholder="Autor" value={nuevoLibro.autor} onChange={handleChange} required className="form-input" />
              <input type="text" name="isbn" placeholder="ISBN" value={nuevoLibro.isbn} onChange={handleChange} className="form-input" />
              
              {/* Selector de Género / Categoría con botón de agregar rápido */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  name="categoria"
                  value={nuevoLibro.categoria}
                  onChange={handleChange}
                  required
                  className="form-input form-select"
                  style={{ flex: 1 }}
                >
                  <option value="">Seleccionar género...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id || cat.nombre} value={cat.nombre}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
                {esAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMensajeErrorGenero('');
                      setMensajeExitoGenero('');
                      setGeneroEnEdicion(null);
                      setMostrarModalGeneros(true);
                    }}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '0.75rem 0.85rem',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.5rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#2563eb',
                      cursor: 'pointer'
                    }}
                    title="Crear un nuevo género literario"
                  >
                    🏷️ + Género
                  </button>
                )}
              </div>

              {/* Selector de Empresa Distribuidora */}
              <select
                name="distribuidor"
                value={nuevoLibro.distribuidor}
                onChange={handleChange}
                required
                className="form-input form-select"
              >
                <option value="">Seleccionar empresa distribuidora *</option>
                {distribuidores.filter((d) => d.estado === 'Activo').map((dist) => (
                  <option key={dist.id} value={dist.nombre}>
                    🏢 {dist.nombre} ({dist.rif})
                  </option>
                ))}
                {distribuidores.filter((d) => d.estado === 'Activo').length === 0 && (
                  <option value="Distribución Directa">Distribución Directa / Editorial Independiente</option>
                )}
              </select>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    Precio Venta ($) *
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    name="precio" 
                    placeholder="0.00" 
                    value={nuevoLibro.precio} 
                    onChange={handleChange} 
                    required 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f766e', marginBottom: '4px', display: 'block' }}>
                    Costo Compra ($) 🔒
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    name="precioCosto" 
                    placeholder="0.00" 
                    value={nuevoLibro.precioCosto} 
                    onChange={handleChange} 
                    className="form-input" 
                    title="Costo de compra al distribuidor (Solo Administrador)"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    Stock Inicial *
                  </label>
                  <input 
                    type="number" 
                    name="ejemplares" 
                    min="0" 
                    placeholder="Cantidad" 
                    value={nuevoLibro.ejemplares} 
                    onChange={handleChange} 
                    required 
                    className="form-input" 
                  />
                </div>
              </div>

              {/* Apartado de Portada / Foto */}
              <div className="portada-upload-section">
                <label className="form-label">🖼️ Foto / Portada del Libro (Opcional):</label>
                <div className="portada-upload-controls">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageFileChange(e, false)} 
                    className="form-input-file"
                    id="file-portada-input"
                  />
                  <label htmlFor="file-portada-input" className="btn-upload-file">
                    📁 Subir Imagen
                  </label>
                  <input 
                    type="url" 
                    name="portada" 
                    placeholder="URL" 
                    value={nuevoLibro.portada} 
                    onChange={handleChange} 
                    className="form-input" 
                    style={{ flex: 1 }}
                  />
                </div>

                {/* Vista previa si hay imagen */}
                {nuevoLibro.portada && (
                  <div className="portada-preview-container">
                    <img src={nuevoLibro.portada} alt="Vista previa" className="portada-preview-img" />
                    <button 
                      type="button" 
                      className="btn-remove-portada" 
                      onClick={() => setNuevoLibro({ ...nuevoLibro, portada: '' })}
                    >
                      ✕ Quitar Foto
                    </button>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-limpiar"
                  onClick={handleLimpiarNuevoLibro}
                  title="Limpiar todos los campos del formulario"
                >
                  🧹 Limpiar Campos
                </button>
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Libro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para EDITAR libro (nombre, portada, datos) */}
      {libroAEditar && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <h3>✏️ Editar Libro: {libroAEditar.titulo}</h3>

            {errorModalEdit && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {errorModalEdit}
              </div>
            )}

            <form onSubmit={handleGuardarEdicion} className="form-group">
              <div>
                <label className="form-label">Título / Nombre del Libro *</label>
                <input 
                  type="text" 
                  name="titulo" 
                  placeholder="Título" 
                  value={libroAEditar.titulo} 
                  onChange={handleEditChange} 
                  required 
                  className="form-input" 
                />
              </div>

              <div>
                <label className="form-label">Autor *</label>
                <input 
                  type="text" 
                  name="autor" 
                  placeholder="Autor" 
                  value={libroAEditar.autor} 
                  onChange={handleEditChange} 
                  required 
                  className="form-input" 
                />
              </div>

              <div>
                <label className="form-label">ISBN</label>
                <input 
                  type="text" 
                  name="isbn" 
                  placeholder="ISBN" 
                  value={libroAEditar.isbn || ''} 
                  onChange={handleEditChange} 
                  className="form-input" 
                />
              </div>

              <div>
                <label className="form-label">Categoría / Género *</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    name="categoria"
                    value={libroAEditar.categoria || ''}
                    onChange={handleEditChange}
                    required
                    className="form-input form-select"
                    style={{ flex: 1 }}
                  >
                    <option value="">Seleccionar género...</option>
                    {categorias.map((cat) => (
                      <option key={cat.id || cat.nombre} value={cat.nombre}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                  {esAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setMensajeErrorGenero('');
                        setMensajeExitoGenero('');
                        setGeneroEnEdicion(null);
                        setMostrarModalGeneros(true);
                      }}
                      style={{
                        whiteSpace: 'nowrap',
                        padding: '0.75rem 0.85rem',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.5rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#2563eb',
                        cursor: 'pointer'
                      }}
                      title="Crear un nuevo género literario"
                    >
                      🏷️ + Género
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label">Empresa Distribuidora / Editorial *</label>
                <select
                  name="distribuidor"
                  value={libroAEditar.distribuidor || ''}
                  onChange={handleEditChange}
                  required
                  className="form-input form-select"
                >
                  <option value="">Seleccionar empresa distribuidora...</option>
                  {distribuidores.map((dist) => (
                    <option key={dist.id} value={dist.nombre}>
                      🏢 {dist.nombre} {dist.estado !== 'Activo' ? '(Inactivo)' : ''}
                    </option>
                  ))}
                  <option value="Distribución Directa">Distribución Directa / Editorial Independiente</option>
                </select>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    Precio Venta ($) *
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    name="precio" 
                    placeholder="0.00" 
                    value={libroAEditar.precio} 
                    onChange={handleEditChange} 
                    required 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f766e', marginBottom: '4px', display: 'block' }}>
                    Costo Compra ($) 🔒
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    name="precioCosto" 
                    placeholder="0.00" 
                    value={libroAEditar.precioCosto !== undefined ? libroAEditar.precioCosto : ''} 
                    onChange={handleEditChange} 
                    className="form-input" 
                    title="Costo de compra al distribuidor (Solo Administrador)"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    Stock Actual 🔒
                  </label>
                  <input 
                    type="text" 
                    name="ejemplares" 
                    value={`${libroAEditar.ejemplares} uds.`} 
                    readOnly
                    disabled
                    className="form-input form-input-readonly" 
                    title="El stock se gestiona a través de Control de Inventario"
                  />
                </div>
              </div>

              {/* Apartado de Edición de Portada / Foto */}
              <div className="portada-upload-section">
                <label className="form-label">🖼️ Foto / Portada del Libro:</label>
                <div className="portada-upload-controls">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageFileChange(e, true)} 
                    className="form-input-file"
                    id="file-edit-portada-input"
                  />
                  <label htmlFor="file-edit-portada-input" className="btn-upload-file">
                    📁 Cambiar Imagen
                  </label>
                  <input 
                    type="url" 
                    name="portada" 
                    placeholder="URL" 
                    value={libroAEditar.portada || ''} 
                    onChange={handleEditChange} 
                    className="form-input" 
                    style={{ flex: 1 }}
                  />
                </div>

                {/* Vista previa de la portada actual/nueva */}
                {libroAEditar.portada && (
                  <div className="portada-preview-container">
                    <img src={libroAEditar.portada} alt="Vista previa" className="portada-preview-img" />
                    <button 
                      type="button" 
                      className="btn-remove-portada" 
                      onClick={() => setLibroAEditar({ ...libroAEditar, portada: '' })}
                    >
                      ✕ Quitar Foto
                    </button>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-limpiar"
                  onClick={() =>
                    setLibroAEditar({
                      ...libroAEditar,
                      titulo: '',
                      autor: '',
                      isbn: '',
                      categoria: '',
                      precio: '',
                      ejemplares: libroAEditar._stockOriginal ?? libroAEditar.ejemplares,
                      portada: ''
                    })
                  }
                  title="Limpiar campos"
                >
                  🧹 Limpiar Campos
                </button>
                <button type="button" className="btn-secondary" onClick={() => setLibroAEditar(null)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para GESTIONAR GÉNEROS */}
      {mostrarModalGeneros && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>🏷️ Gestión de Géneros Literarios</h3>
              <button 
                type="button" 
                onClick={() => setMostrarModalGeneros(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Agrega nuevos géneros o edita sus nombres si hubo un error de escritura. Los géneros que ya tienen ventas registradas quedan protegidos automáticamente para proteger la integridad contable.
            </p>

            {mensajeErrorGenero && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {mensajeErrorGenero}
              </div>
            )}

            {mensajeExitoGenero && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {mensajeExitoGenero}
              </div>
            )}

            {/* Formulario para agregar nuevo género */}
            <form onSubmit={handleCrearGenero} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Nuevo género"
                value={nuevoGeneroNombre}
                onChange={(e) => setNuevoGeneroNombre(e.target.value)}
                className="form-input"
                style={{ flex: 1 }}
                required
              />
              <button
                type="submit"
                disabled={guardandoGenero || !nuevoGeneroNombre.trim()}
                className="btn-primary"
                style={{ whiteSpace: 'nowrap', padding: '0.75rem 1.25rem' }}
              >
                {guardandoGenero ? 'Guardando...' : '+ Agregar Género'}
              </button>
            </form>

            {/* Lista / Tabla de Géneros */}
            <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Nombre del Género</th>
                    <th style={{ textAlign: 'center' }}>Libros</th>
                    <th style={{ textAlign: 'center' }}>Ventas</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((cat) => {
                    const enEdicion = generoEnEdicion?.id === cat.id;

                    return (
                      <tr key={cat.id || cat.nombre}>
                        <td className="text-bold">
                          {enEdicion ? (
                            <input
                              type="text"
                              value={generoEnEdicion.nombre}
                              onChange={(e) =>
                                setGeneroEnEdicion({ ...generoEnEdicion, nombre: e.target.value })
                              }
                              className="form-input"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                              autoFocus
                            />
                          ) : (
                            cat.nombre
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                          <span style={{ color: '#64748b' }}>{cat.totalLibros || 0} uds.</span>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                          {cat.tieneVentas || cat.totalVentas > 0 ? (
                            <span style={{ color: '#0f766e', fontWeight: 600 }}>{cat.totalVentas} ventas</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>0 ventas</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {enEdicion ? (
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => handleGuardarEdicionGenero(cat.id)}
                                disabled={guardandoGenero}
                                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                              >
                                💾 Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setGeneroEnEdicion(null)}
                                style={{ background: '#94a3b8', color: '#fff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : cat.tieneVentas || cat.totalVentas > 0 ? (
                            <span 
                              className="badge badge-danger" 
                              style={{ fontSize: '0.72rem', cursor: 'not-allowed' }}
                              title="Protegido: Este género no puede ser editado ni eliminado porque ya tiene facturas y ventas registradas."
                            >
                              🔒 Bloqueado por Ventas
                            </span>
                          ) : (
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() =>
                                  setGeneroEnEdicion({
                                    id: cat.id,
                                    nombre: cat.nombre,
                                    _nombreAnterior: cat.nombre
                                  })
                                }
                                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}
                                title="Editar nombre del género (antes de su primera venta)"
                              >
                                ✏️ Renombrar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarGenero(cat)}
                                style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}
                                title="Eliminar género"
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn-limpiar"
                onClick={() => setMostrarModalGeneros(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}