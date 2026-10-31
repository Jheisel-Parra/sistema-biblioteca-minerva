import { useState } from 'react';
import './Usuarios.css';
import { apiCrearLector, apiActualizarLector } from '../../services/api';
import { capitalizarPalabras } from '../../utils/formatoTexto';

const formatearCedula = (str, prefijoForzado = null) => {
  if (!str) return '';
  const texto = str.toString().trim();
  const primerCaracter = texto.charAt(0).toUpperCase();
  const esExtranjero = prefijoForzado ? prefijoForzado === 'E' : primerCaracter === 'E';
  const soloDigitos = texto.replace(/\D/g, '');
  if (!soloDigitos) return '';
  return `${esExtranjero ? 'E' : 'V'}-${soloDigitos}`;
};

const calcularEdad = (fechaStr) => {
  if (!fechaStr) return null;
  const partes = String(fechaStr).split('-');
  if (partes.length !== 3) return null;
  const anio = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);
  const hoy = new Date();
  let edad = hoy.getFullYear() - anio;
  const m = hoy.getMonth() - mes;
  if (m < 0 || (m === 0 && hoy.getDate() < dia)) {
    edad--;
  }
  return edad >= 0 && edad < 130 ? edad : null;
};

export default function Usuarios({ usuarios: propUsuarios, setUsuarios: propSetUsuarios, ventas = [] }) {
  // Lista de lectores registrados
  const [localUsuarios, setLocalUsuarios] = useState([
    {
      id: 1,
      nombre: 'Carlos Mendoza',
      cedula: 'V-26890123',
      correo: 'carlos.mendoza@email.com',
      telefono: '0414-1234567'
    },
    {
      id: 2,
      nombre: 'María Delgado',
      cedula: 'V-28112344',
      correo: 'maria.delgado@email.com',
      telefono: '0424-9876543'
    },
    {
      id: 3,
      nombre: 'Andrés López',
      cedula: 'V-25443122',
      correo: 'andres.lopez@email.com',
      telefono: '0412-5554321'
    },
  ]);

  const usuarios = propUsuarios || localUsuarios;
  const setUsuarios = propSetUsuarios || setLocalUsuarios;

  // Estados para búsqueda y modales
  const [busqueda, setBusqueda] = useState('');
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [lectorAEditar, setLectorAEditar] = useState(null);
  const [errorModalNuevo, setErrorModalNuevo] = useState('');

  // Estado para el formulario de nuevo usuario
  const [tipoCedulaNuevo, setTipoCedulaNuevo] = useState('V'); // 'V' | 'E'
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    cedula: '',
    fechaNacimiento: '',
    correo: '',
    telefono: '',
  });

  const handleChange = (e) => {
    if (errorModalNuevo) setErrorModalNuevo('');
    const { name, value } = e.target;
    let valorLimpio = value;
    if (name === 'nombre') valorLimpio = capitalizarPalabras(value.replace(/\d/g, ''), true);
    if (name === 'cedula') valorLimpio = value.replace(/\D/g, '');
    setNuevoUsuario({
      ...nuevoUsuario,
      [name]: valorLimpio,
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    const valorLimpio = name === 'nombre' ? capitalizarPalabras(value.replace(/\d/g, ''), true) : value;
    setLectorAEditar({
      ...lectorAEditar,
      [name]: valorLimpio,
    });
  };

  const handleLimpiarNuevoUsuario = () => {
    setErrorModalNuevo('');
    setTipoCedulaNuevo('V');
    setNuevoUsuario({ nombre: '', cedula: '', fechaNacimiento: '', correo: '', telefono: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nuevoUsuario.nombre.trim() || !nuevoUsuario.cedula.trim() || !nuevoUsuario.correo.trim()) return;

    if (/\d/.test(nuevoUsuario.nombre)) {
      setErrorModalNuevo('El nombre del lector no puede contener números.');
      return;
    }

    const cedulaFormateada = formatearCedula(nuevoUsuario.cedula, tipoCedulaNuevo);

    try {
      setErrorModalNuevo('');
      const res = await apiCrearLector({
        nombre: capitalizarPalabras(nuevoUsuario.nombre, false),
        cedula: cedulaFormateada,
        fechaNacimiento: nuevoUsuario.fechaNacimiento || null,
        correo: nuevoUsuario.correo.trim(),
        telefono: nuevoUsuario.telefono.trim(),
      });

      if (res.ok && res.lector) {
        setUsuarios([res.lector, ...usuarios]);
        setMostrarModalNuevo(false);
        handleLimpiarNuevoUsuario();
      }
    } catch (err) {
      setErrorModalNuevo(err.message || 'Error al registrar al lector en la base de datos.');
    }
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    if (!lectorAEditar || !lectorAEditar.nombre.trim() || !lectorAEditar.correo.trim()) return;

    if (/\d/.test(lectorAEditar.nombre)) {
      alert('El nombre del lector no puede contener números.');
      return;
    }

    try {
      const res = await apiActualizarLector(lectorAEditar.id, {
        nombre: capitalizarPalabras(lectorAEditar.nombre, false),
        fechaNacimiento: lectorAEditar.fechaNacimiento || null,
        correo: lectorAEditar.correo.trim(),
        telefono: lectorAEditar.telefono ? lectorAEditar.telefono.trim() : '',
      });

      if (res.ok && res.lector) {
        setUsuarios(usuarios.map((u) => (u.id === res.lector.id ? res.lector : u)));
        setLectorAEditar(null);
      }
    } catch (err) {
      alert(err.message || 'Error al actualizar información del lector.');
    }
  };

  // Filtrado de la lista por nombre, cédula o correo
  const usuariosFiltrados = usuarios.filter((u) => {
    const query = busqueda.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(query) ||
      u.cedula.toLowerCase().includes(query) ||
      (u.correo && u.correo.toLowerCase().includes(query))
    );
  });

  // Obtener compras asociadas a un lector
  const obtenerComprasDeLector = (lector) => {
    if (!lector) return [];
    return ventas.filter(
      (v) => v.cliente && (v.cliente.id === lector.id || v.cliente.cedula === lector.cedula)
    );
  };

  return (
    <div className="page-container">
      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h2>👥 Lectores</h2>
          <p>Consulta lectores registrados, agrega nuevos lectores, edita sus datos y revisa su historial de compras de libros.</p>
        </div>
        <button className="btn-primary" onClick={() => setMostrarModalNuevo(true)}>
          + Registrar Lector
        </button>
      </div>

      {/* Controles de Búsqueda */}
      <div className="controls-bar">
        <input
          type="text"
          className="input-search"
          placeholder="Buscar lector..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Tabla de Usuarios */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Cédula / Identificación</th>
              <th>Fecha de Nacimiento</th>
              <th>Correo Electrónico</th>
              <th>Teléfono</th>
              <th style={{ textAlign: 'center' }}>Compras Realizadas</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.length > 0 ? (
              usuariosFiltrados.map((u) => {
                const compras = obtenerComprasDeLector(u);
                const edad = calcularEdad(u.fechaNacimiento);
                return (
                  <tr key={u.id}>
                    <td className="text-bold">{u.nombre}</td>
                    <td className="text-muted">{u.cedula}</td>
                    <td>
                      {u.fechaNacimiento ? (
                        <div>
                          <span>{u.fechaNacimiento}</span>
                          {edad !== null && (
                            <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                              ({edad} años)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{u.correo || '—'}</td>
                    <td>{u.telefono || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge-compras-count">
                        🛒 {compras.length} {compras.length === 1 ? 'compra' : 'compras'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="btn-action-edit-lector"
                          onClick={() => setLectorAEditar({ ...u })}
                          title="Editar información del lector"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          className="btn-action-info"
                          onClick={() => setUsuarioSeleccionado(u)}
                          title="Ver ficha e historial de compras"
                        >
                          📄 Compras
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="table-empty">
                  No se encontraron lectores registrados con ese criterio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal 1: Registrar Nuevo Lector */}
      {mostrarModalNuevo && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Registrar Nuevo Lector</h3>

            {errorModalNuevo && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {errorModalNuevo}
              </div>
            )}

            <form onSubmit={handleSubmit} className="form-group">
              <div>
                <label className="form-label">Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Nombre completo"
                  value={nuevoUsuario.nombre}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Cédula de Identidad (Clic en {tipoCedulaNuevo}- para cambiar V/E) *</label>
                <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'stretch' }}>
                  <button
                    type="button"
                    onClick={() => setTipoCedulaNuevo((prev) => (prev === 'V' ? 'E' : 'V'))}
                    title={tipoCedulaNuevo === 'V' ? 'Venezolano (Clic para cambiar a Extranjero E-)' : 'Extranjero (Clic para cambiar a Venezolano V-)'}
                    style={{
                      minWidth: '58px',
                      padding: '0 0.75rem',
                      borderRadius: '8px',
                      border: tipoCedulaNuevo === 'V' ? '1.5px solid #2563eb' : '1.5px solid #d97706',
                      backgroundColor: tipoCedulaNuevo === 'V' ? '#eff6ff' : '#fffbeb',
                      color: tipoCedulaNuevo === 'V' ? '#1d4ed8' : '#b45309',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tipoCedulaNuevo}-
                  </button>
                  <input
                    type="text"
                    name="cedula"
                    inputMode="numeric"
                    placeholder="Ej: 26890123"
                    value={nuevoUsuario.cedula}
                    onChange={handleChange}
                    required
                    className="form-input"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Fecha de Nacimiento *</label>
                <input
                  type="date"
                  name="fechaNacimiento"
                  value={nuevoUsuario.fechaNacimiento}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Correo Electrónico *</label>
                <input
                  type="email"
                  name="correo"
                  placeholder="Correo electrónico"
                  value={nuevoUsuario.correo}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Teléfono de Contacto *</label>
                <input
                  type="text"
                  name="telefono"
                  placeholder="Teléfono"
                  value={nuevoUsuario.telefono}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-limpiar"
                  onClick={handleLimpiarNuevoUsuario}
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
                  Guardar Lector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: EDITAR Datos del Lector (Cédula protegida e inmutable) */}
      {lectorAEditar && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>✏️ Editar Lector</h3>
            <form onSubmit={handleGuardarEdicion} className="form-group">
              <div>
                <label className="form-label">Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Nombre"
                  value={lectorAEditar.nombre}
                  onChange={handleEditChange}
                  required
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Cédula / Documento de Identidad (No editable) 🔒</label>
                <input
                  type="text"
                  name="cedula"
                  value={lectorAEditar.cedula}
                  readOnly
                  disabled
                  className="form-input form-input-readonly"
                  title="La cédula no se puede modificar por integridad de los registros"
                />
                <span className="field-hint">🔒 La cédula es el identificador único del lector y no se puede modificar.</span>
              </div>

              <div>
                <label className="form-label">Fecha de Nacimiento</label>
                <input
                  type="date"
                  name="fechaNacimiento"
                  value={lectorAEditar.fechaNacimiento || ''}
                  onChange={handleEditChange}
                  max={new Date().toISOString().split('T')[0]}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Correo Electrónico *</label>
                <input
                  type="email"
                  name="correo"
                  placeholder="Correo"
                  value={lectorAEditar.correo || ''}
                  onChange={handleEditChange}
                  required
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Teléfono de Contacto (Opcional)</label>
                <input
                  type="text"
                  name="telefono"
                  placeholder="Teléfono"
                  value={lectorAEditar.telefono || ''}
                  onChange={handleEditChange}
                  className="form-input"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-limpiar"
                  onClick={() => setLectorAEditar({ ...lectorAEditar, nombre: '', correo: '', telefono: '' })}
                  title="Limpiar campos editables"
                >
                  🧹 Limpiar Campos
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setLectorAEditar(null)}
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

      {/* Modal 3: Ficha e Historial de Compras del Usuario */}
      {usuarioSeleccionado && (
        <div className="modal-overlay">
          <div className="modal-content modal-ficha-content">
            <h3>👤 Ficha del Lector</h3>
            <div className="ficha-lector-header">
              <div className="ficha-dato-row">
                <span>Nombre:</span>
                <strong>{usuarioSeleccionado.nombre}</strong>
              </div>
              <div className="ficha-dato-row">
                <span>Cédula:</span>
                <strong>{usuarioSeleccionado.cedula}</strong>
              </div>
              <div className="ficha-dato-row">
                <span>Fecha de Nacimiento:</span>
                <span>
                  {usuarioSeleccionado.fechaNacimiento
                    ? `${usuarioSeleccionado.fechaNacimiento}${calcularEdad(usuarioSeleccionado.fechaNacimiento) !== null ? ` (${calcularEdad(usuarioSeleccionado.fechaNacimiento)} años)` : ''}`
                    : 'No registrada'}
                </span>
              </div>
              <div className="ficha-dato-row">
                <span>Correo:</span>
                <span>{usuarioSeleccionado.correo || 'No registrado'}</span>
              </div>
              <div className="ficha-dato-row">
                <span>Teléfono:</span>
                <span>{usuarioSeleccionado.telefono || 'No registrado'}</span>
              </div>
            </div>

            <h4 className="ficha-compras-title">
              🧾 Historial de Compras y Facturas
            </h4>

            {(() => {
              const comprasLector = obtenerComprasDeLector(usuarioSeleccionado);
              if (comprasLector.length > 0) {
                return (
                  <div className="compras-lector-list">
                    {comprasLector.map((compra) => (
                      <div key={compra.id} className="compra-lector-card">
                        <div className="compra-card-top">
                          <div>
                            <span className="compra-nro-factura">{compra.nroFactura}</span>
                            <span className="compra-fecha">{compra.fecha} • {compra.hora}</span>
                          </div>
                          <span className="compra-total-badge">${Number(compra.total).toFixed(2)}</span>
                        </div>

                        <div className="compra-items-list">
                          {compra.items && compra.items.map((item, idx) => (
                            <div key={idx} className="compra-item-line">
                              <span>📖 {item.titulo}</span>
                              <span className="text-muted">x{item.cantidad} (${Number(item.precio).toFixed(2)})</span>
                            </div>
                          ))}
                        </div>

                        <div className="compra-card-bottom">
                          <span className="badge-metodo-mini">💳 {compra.metodoPago}</span>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                            Atendido por: {compra.atendidoPor || 'Recepción'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="compras-empty-box">
                  <p>Este lector no registra compras facturadas aún.</p>
                </div>
              );
            })()}

            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                className="btn-secondary"
                onClick={() => setUsuarioSeleccionado(null)}
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