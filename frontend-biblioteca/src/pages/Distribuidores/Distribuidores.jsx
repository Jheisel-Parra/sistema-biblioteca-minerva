import { useState } from 'react';
import './Distribuidores.css';
import {
  apiCrearDistribuidor,
  apiActualizarDistribuidor,
  apiToggleEstadoDistribuidor
} from '../../services/api';
import { capitalizarPalabras } from '../../utils/formatoTexto';

export default function Distribuidores({ 
  distribuidores: propDistribuidores, 
  setDistribuidores: propSetDistribuidores, 
  libros = [],
  rolUsuario = 'admin',
  onAbrirReporte
}) {
  const [localDistribuidores, setLocalDistribuidores] = useState([
    {
      id: 1,
      nombre: 'Penguin Random House Grupo Editorial',
      rif: 'J-30589123-4',
      contacto: 'Laura Martínez',
      correo: 'ventas@penguinrandomhouse.com',
      telefono: '0212-9012345',
      direccion: 'Av. Francisco de Miranda, Edif. Parque Cristal, Caracas',
      estado: 'Activo'
    },
    {
      id: 2,
      nombre: 'Grupo Planeta',
      rif: 'J-30812456-7',
      contacto: 'Roberto Gómez',
      correo: 'pedidos@planeta.com.ve',
      telefono: '0212-7894561',
      direccion: 'Centro Empresarial Las Mercedes, Piso 5, Caracas',
      estado: 'Activo'
    },
    {
      id: 3,
      nombre: 'Ediciones Ekaré',
      rif: 'J-00124589-2',
      contacto: 'Carmen Elena',
      correo: 'contacto@ekare.com.ve',
      telefono: '0212-2647890',
      direccion: 'Los Palos Grandes, 4ta Avenida, Caracas',
      estado: 'Activo'
    },
    {
      id: 4,
      nombre: 'Editorial Santillana',
      rif: 'J-00349812-5',
      contacto: 'Felipe Vargas',
      correo: 'atencion@santillana.com.ve',
      telefono: '0212-3216549',
      direccion: 'Boleíta Norte, Calle 3, Caracas',
      estado: 'Activo'
    }
  ]);

  const distribuidores = propDistribuidores || localDistribuidores;
  const setDistribuidores = propSetDistribuidores || setLocalDistribuidores;

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [distribuidorAEditar, setDistribuidorAEditar] = useState(null);
  const [distribuidorVerCatalogo, setDistribuidorVerCatalogo] = useState(null);
  const [errorModalNuevo, setErrorModalNuevo] = useState('');

  const [nuevoDistribuidor, setNuevoDistribuidor] = useState({
    nombre: '',
    rif: '',
    contacto: '',
    correo: '',
    telefono: '',
    direccion: '',
    estado: 'Activo'
  });

  // Si no es admin, bloquear acceso
  if (rolUsuario !== 'admin') {
    return (
      <div className="page-container">
        <div className="alert-warning-distribuidor">
          <h3>🔒 Acceso Restringido</h3>
          <p>El módulo de Distribuidores y Proveedores es de acceso exclusivo para Administradores.</p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    if (errorModalNuevo) setErrorModalNuevo('');
    const { name, value } = e.target;
    let valorLimpio = value;
    if (name === 'contacto') valorLimpio = capitalizarPalabras(value.replace(/\d/g, ''), true);
    if (name === 'nombre' || name === 'direccion') valorLimpio = capitalizarPalabras(value, true);
    setNuevoDistribuidor({
      ...nuevoDistribuidor,
      [name]: valorLimpio
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    let valorLimpio = value;
    if (name === 'contacto') valorLimpio = capitalizarPalabras(value.replace(/\d/g, ''), true);
    if (name === 'nombre' || name === 'direccion') valorLimpio = capitalizarPalabras(value, true);
    setDistribuidorAEditar({
      ...distribuidorAEditar,
      [name]: valorLimpio
    });
  };

  const handleLimpiarNuevo = () => {
    setErrorModalNuevo('');
    setNuevoDistribuidor({
      nombre: '',
      rif: '',
      contacto: '',
      correo: '',
      telefono: '',
      direccion: '',
      estado: 'Activo'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !nuevoDistribuidor.nombre.trim() ||
      !nuevoDistribuidor.rif.trim() ||
      !nuevoDistribuidor.contacto.trim() ||
      !nuevoDistribuidor.correo.trim() ||
      !nuevoDistribuidor.telefono.trim()
    ) {
      return;
    }

    if (/\d/.test(nuevoDistribuidor.contacto)) {
      setErrorModalNuevo('El nombre de la persona de contacto no puede contener números.');
      return;
    }

    try {
      setErrorModalNuevo('');
      const res = await apiCrearDistribuidor({
        nombre: nuevoDistribuidor.nombre.trim(),
        rif: nuevoDistribuidor.rif.trim(),
        contacto: nuevoDistribuidor.contacto.trim(),
        correo: nuevoDistribuidor.correo.trim(),
        telefono: nuevoDistribuidor.telefono.trim(),
        direccion: nuevoDistribuidor.direccion ? nuevoDistribuidor.direccion.trim() : 'Caracas, Venezuela',
      });

      if (res.ok && res.distribuidor) {
        setDistribuidores([res.distribuidor, ...distribuidores]);
        setMostrarModalNuevo(false);
        handleLimpiarNuevo();
      }
    } catch (err) {
      setErrorModalNuevo(err.message || 'Error al guardar la distribuidora en la base de datos.');
    }
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    if (
      !distribuidorAEditar ||
      !distribuidorAEditar.nombre.trim() ||
      !distribuidorAEditar.contacto.trim() ||
      !distribuidorAEditar.correo.trim() ||
      !distribuidorAEditar.telefono.trim()
    ) {
      return;
    }

    if (/\d/.test(distribuidorAEditar.contacto)) {
      alert('El nombre de la persona de contacto no puede contener números.');
      return;
    }

    try {
      const res = await apiActualizarDistribuidor(distribuidorAEditar.id, {
        nombre: distribuidorAEditar.nombre.trim(),
        contacto: distribuidorAEditar.contacto.trim(),
        correo: distribuidorAEditar.correo.trim(),
        telefono: distribuidorAEditar.telefono.trim(),
        direccion: distribuidorAEditar.direccion ? distribuidorAEditar.direccion.trim() : '',
        estado: distribuidorAEditar.estado
      });

      if (res.ok && res.distribuidor) {
        setDistribuidores(distribuidores.map((d) => (d.id === res.distribuidor.id ? res.distribuidor : d)));
        setDistribuidorAEditar(null);
      }
    } catch (err) {
      alert(err.message || 'Error al actualizar distribuidor.');
    }
  };

  const toggleEstadoDistribuidor = async (id) => {
    try {
      const res = await apiToggleEstadoDistribuidor(id);
      if (res.ok && res.distribuidor) {
        setDistribuidores(
          distribuidores.map((d) => (d.id === id ? res.distribuidor : d))
        );
      }
    } catch (err) {
      alert(err.message || 'Error al cambiar estado del distribuidor.');
    }
  };

  // Obtener libros suministrados por un distribuidor
  const obtenerLibrosPorDistribuidor = (nombreDistribuidor) => {
    if (!nombreDistribuidor) return [];
    return libros.filter(
      (l) => l.distribuidor && l.distribuidor.toLowerCase() === nombreDistribuidor.toLowerCase()
    );
  };

  // Métricas del Dashboard de Distribuidores
  const totalDistribuidores = distribuidores.length;
  const distribuidoresActivos = distribuidores.filter((d) => d.estado === 'Activo').length;
  
  // Calcular total de libros y ejemplares suministrados por todos los distribuidores registrados
  const nombresDistribuidores = distribuidores.map((d) => d.nombre.toLowerCase());
  const librosConDistribuidor = libros.filter(
    (l) => l.distribuidor && nombresDistribuidores.includes(l.distribuidor.toLowerCase())
  );
  const totalTitulosSuministrados = librosConDistribuidor.length;
  const totalEjemplaresSuministrados = librosConDistribuidor.reduce(
    (acc, l) => acc + (Number(l.ejemplares) || 0),
    0
  );

  // Filtrado de distribuidores
  const distribuidoresFiltrados = distribuidores.filter((d) => {
    const query = busqueda.toLowerCase();
    const coincideTexto =
      d.nombre.toLowerCase().includes(query) ||
      d.rif.toLowerCase().includes(query) ||
      d.contacto.toLowerCase().includes(query) ||
      d.correo.toLowerCase().includes(query);

    if (filtroEstado === 'activos') return coincideTexto && d.estado === 'Activo';
    if (filtroEstado === 'inactivos') return coincideTexto && d.estado === 'Inactivo';
    return coincideTexto;
  });

  return (
    <div className="page-container">
      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h2>🏢 Empresas Distribuidoras y Proveedores</h2>
          <p>Gestión de casas editoriales y empresas distribuidoras asociadas al inventario de libros.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {onAbrirReporte && (
            <button
              type="button"
              onClick={() => onAbrirReporte('compras-distribuidores')}
              style={{
                background: '#1e3a8a',
                color: 'white',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 700,
                padding: '0.65rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(30, 58, 138, 0.25)'
              }}
              title="Generar balance oficial de compras e inversión por distribuidor"
            >
              🏢 Reporte Compras (PDF)
            </button>
          )}
          <button className="btn-primary" onClick={() => setMostrarModalNuevo(true)}>
            + Registrar Distribuidor
          </button>
        </div>
      </div>

      {/* DASHBOARD / KPIs DE DISTRIBUIDORES */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>🏢</div>
          <div className="metric-data">
            <span className="metric-title">Empresas Registradas</span>
            <span className="metric-value">{totalDistribuidores}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>✅</div>
          <div className="metric-data">
            <span className="metric-title">Distribuidores Activos</span>
            <span className="metric-value" style={{ color: '#16a34a' }}>{distribuidoresActivos}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fdf4ff', color: '#a855f7' }}>📚</div>
          <div className="metric-data">
            <span className="metric-title">Títulos Suministrados</span>
            <span className="metric-value">{totalTitulosSuministrados}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>📦</div>
          <div className="metric-data">
            <span className="metric-title">Ejemplares en Stock</span>
            <span className="metric-value" style={{ color: '#0f766e' }}>{totalEjemplaresSuministrados} uds.</span>
          </div>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <div className="controls-bar" style={{ marginTop: '0.5rem' }}>
        <input
          type="text"
          className="input-search"
          placeholder="Buscar distribuidor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="filter-group">
          <button
            className={`filter-btn ${filtroEstado === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('todos')}
          >
            Todos ({distribuidores.length})
          </button>
          <button
            className={`filter-btn ${filtroEstado === 'activos' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('activos')}
          >
            Activos
          </button>
          <button
            className={`filter-btn ${filtroEstado === 'inactivos' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('inactivos')}
          >
            Inactivos
          </button>
        </div>
      </div>

      {/* TABLA DE EMPRESAS DISTRIBUIDORAS */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Empresa / Razón Social</th>
              <th>RIF / ID Fiscal</th>
              <th>Contacto / Asesor</th>
              <th>Correo y Teléfono</th>
              <th style={{ textAlign: 'center' }}>Libros Suministrados</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {distribuidoresFiltrados.length > 0 ? (
              distribuidoresFiltrados.map((d) => {
                const librosSuministrados = obtenerLibrosPorDistribuidor(d.nombre);
                const totalEjemplares = librosSuministrados.reduce(
                  (acc, l) => acc + (Number(l.ejemplares) || 0),
                  0
                );
                const esActivo = d.estado === 'Activo';

                return (
                  <tr key={d.id}>
                    <td>
                      <div className="text-bold">{d.nombre}</div>
                      {d.direccion && (
                        <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}>
                          📍 {d.direccion}
                        </span>
                      )}
                    </td>
                    <td className="text-muted" style={{ fontFamily: 'monospace' }}>{d.rif}</td>
                    <td>{d.contacto}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{d.correo}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>📞 {d.telefono}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge-libros-distribuidor">
                        📚 {librosSuministrados.length} títulos ({totalEjemplares} uds.)
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${esActivo ? 'badge-success' : 'badge-danger'}`}>
                        {d.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="distribuidores-actions-group">
                        <button
                          type="button"
                          className="btn-action-edit-distribuidor"
                          onClick={() => setDistribuidorAEditar({ ...d })}
                          title="Editar datos del distribuidor"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          className="btn-action-catalogo"
                          onClick={() => setDistribuidorVerCatalogo(d)}
                          title="Ver libros suministrados por esta empresa"
                        >
                          👁️ Libros ({librosSuministrados.length})
                        </button>
                        <button
                          type="button"
                          className={`btn-action-status ${esActivo ? 'btn-deactivate' : 'btn-activate'}`}
                          onClick={() => toggleEstadoDistribuidor(d.id)}
                          title={esActivo ? 'Desactivar distribuidor' : 'Activar distribuidor'}
                        >
                          {esActivo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="table-empty">
                  No se encontraron empresas distribuidoras con el criterio de búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: REGISTRAR NUEVO DISTRIBUIDOR */}
      {mostrarModalNuevo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <h3>🏢 Registrar Empresa Distribuidora</h3>

            {errorModalNuevo && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {errorModalNuevo}
              </div>
            )}

            <form onSubmit={handleSubmit} className="form-group">
              <div>
                <label className="form-label">Nombre de la Empresa / Editorial *</label>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Empresa"
                  value={nuevoDistribuidor.nombre}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">RIF / Identificación Fiscal *</label>
                <input
                  type="text"
                  name="rif"
                  placeholder="RIF"
                  value={nuevoDistribuidor.rif}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Persona de Contacto *</label>
                  <input
                    type="text"
                    name="contacto"
                    placeholder="Contacto"
                    value={nuevoDistribuidor.contacto}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Teléfono *</label>
                  <input
                    type="text"
                    name="telefono"
                    placeholder="Teléfono"
                    value={nuevoDistribuidor.telefono}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Correo Electrónico *</label>
                <input
                  type="email"
                  name="correo"
                  placeholder="Correo"
                  value={nuevoDistribuidor.correo}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Dirección / Ciudad (Opcional)</label>
                <input
                  type="text"
                  name="direccion"
                  placeholder="Dirección"
                  value={nuevoDistribuidor.direccion}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-limpiar"
                  onClick={handleLimpiarNuevo}
                  title="Limpiar campos"
                >
                  🧹 Limpiar Campos
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setMostrarModalNuevo(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Distribuidor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR DISTRIBUIDOR */}
      {distribuidorAEditar && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <h3>✏️ Editar Distribuidor</h3>
            <form onSubmit={handleGuardarEdicion} className="form-group">
              <div>
                <label className="form-label">Nombre de la Empresa / Editorial *</label>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Empresa"
                  value={distribuidorAEditar.nombre}
                  onChange={handleEditChange}
                  required
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">RIF / Identificación Fiscal (No editable) 🔒</label>
                <input
                  type="text"
                  name="rif"
                  value={distribuidorAEditar.rif}
                  readOnly
                  disabled
                  className="form-input form-input-readonly"
                  title="El RIF es el identificador fiscal único y no se puede modificar"
                />
                <span className="field-hint">🔒 El RIF es la identificación fiscal única de la empresa distribuidora.</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Persona de Contacto *</label>
                  <input
                    type="text"
                    name="contacto"
                    placeholder="Contacto"
                    value={distribuidorAEditar.contacto}
                    onChange={handleEditChange}
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Teléfono *</label>
                  <input
                    type="text"
                    name="telefono"
                    placeholder="Teléfono"
                    value={distribuidorAEditar.telefono}
                    onChange={handleEditChange}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Correo Electrónico *</label>
                <input
                  type="email"
                  name="correo"
                  placeholder="Correo"
                  value={distribuidorAEditar.correo}
                  onChange={handleEditChange}
                  required
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Dirección / Ciudad (Opcional)</label>
                <input
                  type="text"
                  name="direccion"
                  placeholder="Dirección"
                  value={distribuidorAEditar.direccion || ''}
                  onChange={handleEditChange}
                  className="form-input"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-limpiar"
                  onClick={() =>
                    setDistribuidorAEditar({
                      ...distribuidorAEditar,
                      nombre: '',
                      contacto: '',
                      correo: '',
                      telefono: '',
                      direccion: ''
                    })
                  }
                  title="Limpiar campos editables"
                >
                  🧹 Limpiar Campos
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDistribuidorAEditar(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FICHA Y LIBROS SUMINISTRADOS POR LA EMPRESA */}
      {distribuidorVerCatalogo && (
        <div className="modal-overlay">
          <div className="modal-content modal-distribuidor-catalogo">
            <h3>🏢 Ficha de Distribuidor: {distribuidorVerCatalogo.nombre}</h3>
            
            <div className="distribuidor-info-box">
              <div className="distribuidor-info-row">
                <span>RIF Fiscal:</span>
                <strong style={{ fontFamily: 'monospace' }}>{distribuidorVerCatalogo.rif}</strong>
              </div>
              <div className="distribuidor-info-row">
                <span>Contacto:</span>
                <strong>{distribuidorVerCatalogo.contacto}</strong>
              </div>
              <div className="distribuidor-info-row">
                <span>Correo:</span>
                <span>{distribuidorVerCatalogo.correo}</span>
              </div>
              <div className="distribuidor-info-row">
                <span>Teléfono:</span>
                <span>{distribuidorVerCatalogo.telefono}</span>
              </div>
              {distribuidorVerCatalogo.direccion && (
                <div className="distribuidor-info-row" style={{ gridColumn: '1 / -1' }}>
                  <span>Dirección:</span>
                  <span>{distribuidorVerCatalogo.direccion}</span>
                </div>
              )}
            </div>

            <h4 className="distribuidor-libros-title">
              📚 Títulos Suministrados en el Inventario
            </h4>

            {(() => {
              const librosEmpresa = obtenerLibrosPorDistribuidor(distribuidorVerCatalogo.nombre);
              if (librosEmpresa.length > 0) {
                return (
                  <div className="distribuidor-libros-grid">
                    {librosEmpresa.map((libro) => (
                      <div key={libro.id} className="libro-suministrado-card">
                        {libro.portada ? (
                          <img src={libro.portada} alt={libro.titulo} className="libro-suministrado-thumb" />
                        ) : (
                          <div className="libro-suministrado-placeholder">📖</div>
                        )}
                        <div className="libro-suministrado-data">
                          <div className="libro-suministrado-title">{libro.titulo}</div>
                          <div className="text-muted" style={{ fontSize: '0.775rem' }}>{libro.autor} • {libro.categoria}</div>
                          <div className="libro-suministrado-meta">
                            <span className="badge-precio-mini">${Number(libro.precio).toFixed(2)}</span>
                            <span className="badge-stock-mini">{libro.ejemplares} en stock</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="distribuidor-libros-empty">
                  <p>Actualmente no hay libros asociados a este distribuidor en el catálogo.</p>
                  <small>Al registrar nuevos libros en el catálogo podrás seleccionar "{distribuidorVerCatalogo.nombre}" como proveedor.</small>
                </div>
              );
            })()}

            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDistribuidorVerCatalogo(null)}
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
