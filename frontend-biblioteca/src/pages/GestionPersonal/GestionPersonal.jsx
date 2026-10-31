import { useState, useEffect } from 'react';
import './GestionPersonal.css';
import {
  apiGetUsuarios,
  apiCrearUsuario,
  apiActualizarUsuario,
  apiToggleEstadoUsuario,
  apiResetearPassword,
  apiObtenerQRUsuario,
  apiRegenerarQRUsuario,
  apiDesbloquearUsuario
} from '../../services/api';
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

export default function GestionPersonal({ onAbrirReporte }) {
  const [personal, setPersonal] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [pestañaActiva, setPestañaActiva] = useState('lista'); // 'lista' | 'crear'
  const [mensajeExito, setMensajeExito] = useState('');
  const [errorFormulario, setErrorFormulario] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  
  const [tipoCedulaNuevo, setTipoCedulaNuevo] = useState('V'); // 'V' | 'E'
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    cedula: '',
    fechaNacimiento: '',
    email: '',
    rol: 'staff',
    password: ''
  });

  // Modal para restablecer contraseña
  const [usuarioResetPassword, setUsuarioResetPassword] = useState(null);
  const [nuevaPasswordAdmin, setNuevaPasswordAdmin] = useState('');
  const [guardandoReset, setGuardandoReset] = useState(false);
  const [errorReset, setErrorReset] = useState('');

  // Modal para editar datos del trabajador
  const [usuarioAEditar, setUsuarioAEditar] = useState(null);
  const [formEditar, setFormEditar] = useState({ nombre: '', fechaNacimiento: '', email: '', rol: 'staff' });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorModalEdit, setErrorModalEdit] = useState('');

  // Modal para visualizar o regenerar Código QR 2FA (Google Authenticator)
  const [modalQRUsuario, setModalQRUsuario] = useState(null);
  const [datosQR, setDatosQR] = useState({ qrSvg: '', secretManual: '', totpHabilitado: false });
  const [cargandoQR, setCargandoQR] = useState(false);
  const [regenerandoQR, setRegenerandoQR] = useState(false);

  useEffect(() => {
    let montado = true;

    const cargarPersonal = async () => {
      try {
        const res = await apiGetUsuarios();
        if (montado && res.ok && Array.isArray(res.usuarios)) {
          setPersonal(res.usuarios);
        }
      } catch (err) {
        console.error('Error al cargar personal:', err);
      } finally {
        if (montado) {
          setCargando(false);
        }
      }
    };

    cargarPersonal();

    return () => {
      montado = false;
    };
  }, []);

  const handleChange = (e) => {
    if (errorFormulario) setErrorFormulario('');
    const { name, value } = e.target;
    let valorLimpio = value;
    if (name === 'nombre') valorLimpio = capitalizarPalabras(value.replace(/\d/g, ''), true);
    if (name === 'cedula') valorLimpio = value.replace(/\D/g, '');
    setNuevoUsuario({
      ...nuevoUsuario,
      [name]: valorLimpio
    });
  };

  const handleLimpiarNuevoTrabajador = () => {
    setErrorFormulario('');
    setTipoCedulaNuevo('V');
    setNuevoUsuario({ nombre: '', cedula: '', fechaNacimiento: '', email: '', rol: 'staff', password: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nuevoUsuario.nombre || !nuevoUsuario.email || !nuevoUsuario.cedula || !nuevoUsuario.password) {
      setErrorFormulario('Por favor, completa todos los campos obligatorios.');
      return;
    }

    if (/\d/.test(nuevoUsuario.nombre)) {
      setErrorFormulario('El nombre del trabajador no puede contener números.');
      return;
    }

    try {
      setGuardando(true);
      setErrorFormulario('');

      const datosEnviar = {
        nombre: capitalizarPalabras(nuevoUsuario.nombre, false),
        cedula: formatearCedula(nuevoUsuario.cedula, tipoCedulaNuevo),
        fechaNacimiento: nuevoUsuario.fechaNacimiento || null,
        email: nuevoUsuario.email.trim().toLowerCase(),
        rol: nuevoUsuario.rol,
        password: nuevoUsuario.password
      };

      // Guardar en la base de datos SQLite a través del Backend
      const res = await apiCrearUsuario(datosEnviar);

      if (res.ok && res.usuario) {
        setPersonal([res.usuario, ...personal]);
        handleLimpiarNuevoTrabajador();
        setMensajeExito(`¡Usuario "${res.usuario.nombre}" registrado! Deberá definir su contraseña privada al iniciar sesión.`);
        setPestañaActiva('lista');

        setTimeout(() => {
          setMensajeExito('');
        }, 4000);
      }
    } catch (err) {
      setErrorFormulario(err.message || 'Error al guardar el nuevo trabajador en la base de datos.');
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (id) => {
    try {
      const res = await apiToggleEstadoUsuario(id);
      if (res.ok && res.usuario) {
        setPersonal(personal.map((u) => (u.id === id ? res.usuario : u)));
        setMensajeExito(res.mensaje || 'Estado actualizado.');
        setTimeout(() => setMensajeExito(''), 3000);
      }
    } catch (err) {
      alert(err.message || 'Error al cambiar el estado del trabajador.');
    }
  };

  const handleAbrirModalReset = (usuario) => {
    setUsuarioResetPassword(usuario);
    setNuevaPasswordAdmin('');
    setErrorReset('');
  };

  const handleCerrarModalReset = () => {
    setUsuarioResetPassword(null);
    setNuevaPasswordAdmin('');
    setErrorReset('');
  };

  const handleGenerarPasswordRapida = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNuevaPasswordAdmin(pass);
    setErrorReset('');
  };

  const handleGuardarResetPassword = async (e) => {
    e.preventDefault();
    if (!usuarioResetPassword || !nuevaPasswordAdmin.trim()) return;

    if (nuevaPasswordAdmin.trim().length < 6) {
      setErrorReset('La contraseña temporal debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setGuardandoReset(true);
      setErrorReset('');

      const res = await apiResetearPassword(usuarioResetPassword.id, nuevaPasswordAdmin.trim());

      if (res.ok && res.usuario) {
        setPersonal(personal.map((u) => (u.id === res.usuario.id ? res.usuario : u)));
        setMensajeExito(`🔑 Contraseña temporal asignada a "${res.usuario.nombre}". Se le solicitará cambiarla en su siguiente acceso.`);
        handleCerrarModalReset();

        setTimeout(() => setMensajeExito(''), 5000);
      }
    } catch (err) {
      setErrorReset(err.message || 'Error al restablecer la contraseña.');
    } finally {
      setGuardandoReset(false);
    }
  };

  const handleAbrirModalEditar = (usuario) => {
    setUsuarioAEditar(usuario);
    setFormEditar({
      nombre: usuario.nombre || '',
      fechaNacimiento: usuario.fechaNacimiento || '',
      email: usuario.email || '',
      rol: usuario.rol || 'staff'
    });
    setErrorModalEdit('');
  };

  const handleCerrarModalEditar = () => {
    setUsuarioAEditar(null);
    setFormEditar({ nombre: '', fechaNacimiento: '', email: '', rol: 'staff' });
    setErrorModalEdit('');
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    if (!usuarioAEditar) return;
    if (!formEditar.nombre.trim() || !formEditar.email.trim()) {
      setErrorModalEdit('El nombre completo y el correo electrónico son obligatorios.');
      return;
    }

    if (/\d/.test(formEditar.nombre)) {
      setErrorModalEdit('El nombre del trabajador no puede contener números.');
      return;
    }

    try {
      setGuardandoEdicion(true);
      setErrorModalEdit('');

      const res = await apiActualizarUsuario(usuarioAEditar.id, {
        nombre: capitalizarPalabras(formEditar.nombre, false),
        fechaNacimiento: formEditar.fechaNacimiento || null,
        email: formEditar.email.trim().toLowerCase(),
        rol: formEditar.rol
      });

      if (res.ok && res.usuario) {
        setPersonal(personal.map((u) => (u.id === res.usuario.id ? res.usuario : u)));
        setMensajeExito(`✏️ Datos de "${res.usuario.nombre}" actualizados exitosamente.`);
        handleCerrarModalEditar();
        setTimeout(() => setMensajeExito(''), 4000);
      }
    } catch (err) {
      setErrorModalEdit(err.message || 'Error al actualizar los datos del trabajador.');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // Abrir modal con el código QR de Google Authenticator para un trabajador
  const handleAbrirModalQR = async (usuario) => {
    setModalQRUsuario(usuario);
    setDatosQR({ qrSvg: '', secretManual: '', totpHabilitado: Boolean(usuario.totpHabilitado) });
    setCargandoQR(true);
    try {
      const res = await apiObtenerQRUsuario(usuario.id);
      if (res.ok) {
        setDatosQR({
          qrSvg: res.qrSvg || '',
          secretManual: res.secretManual || '',
          totpHabilitado: Boolean(res.totpHabilitado)
        });
      }
    } catch (err) {
      alert(err.message || 'Error al obtener el código QR del trabajador.');
    } finally {
      setCargandoQR(false);
    }
  };

  const handleRegenerarQR = async () => {
    if (!modalQRUsuario) return;
    const confirmar = window.confirm(
      `¿Deseas generar un NUEVO código QR para "${modalQRUsuario.nombre}"?\n\nEl código anterior dejará de funcionar y el trabajador deberá escanear este nuevo QR en su teléfono.`
    );
    if (!confirmar) return;

    try {
      setRegenerandoQR(true);
      const res = await apiRegenerarQRUsuario(modalQRUsuario.id);
      if (res.ok) {
        setDatosQR({
          qrSvg: res.qrSvg || '',
          secretManual: res.secretManual || '',
          totpHabilitado: false
        });
        if (res.usuario) {
          setPersonal(personal.map((u) => (u.id === res.usuario.id ? res.usuario : u)));
          setModalQRUsuario(res.usuario);
        }
        setMensajeExito(`📱 Nuevo código QR 2FA generado para "${modalQRUsuario.nombre}".`);
        setTimeout(() => setMensajeExito(''), 4500);
      }
    } catch (err) {
      alert(err.message || 'Error al regenerar el código QR.');
    } finally {
      setRegenerandoQR(false);
    }
  };

  const handleDesbloquearCuenta = async (usuario) => {
    try {
      const res = await apiDesbloquearUsuario(usuario.id);
      if (res.ok && res.usuario) {
        setPersonal(personal.map((u) => (u.id === res.usuario.id ? res.usuario : u)));
        setMensajeExito(res.mensaje || `🔓 Cuenta de "${usuario.nombre}" desbloqueada.`);
        setTimeout(() => setMensajeExito(''), 4000);
      }
    } catch (err) {
      alert(err.message || 'Error al desbloquear la cuenta del trabajador.');
    }
  };

  // Filtrado combinado por búsqueda, rol y estado
  const personalFiltrado = personal.filter((u) => {
    const coincideTexto = 
      (u.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (u.cedula || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(busqueda.toLowerCase());
    
    const coincideRol = filtroRol === 'todos' || u.rol === filtroRol;
    const coincideEstado = filtroEstado === 'todos' || u.estado === filtroEstado;

    return coincideTexto && coincideRol && coincideEstado;
  });

  return (
    <div className="page-container">
      {/* Encabezado */}
      <div className="page-header">
        <div>
          <h2>🛠️ Gestión y Registro de Personal</h2>
          <p>Administra las cuentas, restablece contraseñas y registra a los trabajadores que operan el sistema de biblioteca.</p>
        </div>
        <div className="tab-buttons">
          <button 
            className={`btn-tab ${pestañaActiva === 'lista' ? 'active' : ''}`}
            onClick={() => setPestañaActiva('lista')}
          >
            📋 Lista de Personal ({personal.length})
          </button>
          <button 
            className={`btn-tab ${pestañaActiva === 'crear' ? 'active' : ''}`}
            onClick={() => setPestañaActiva('crear')}
          >
            ➕ Registrar Nuevo Trabajador
          </button>
          {onAbrirReporte && (
            <button
              type="button"
              className="btn-tab"
              onClick={() => onAbrirReporte('rendimiento-personal')}
              style={{ background: '#ede9fe', border: '1px solid #ddd6fe', color: '#6d28d9', fontWeight: 700 }}
              title="Generar reporte de productividad y ventas por personal"
            >
              👤 Reporte Rendimiento (PDF)
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Éxito */}
      {mensajeExito && (
        <div className="alert-success">
          <span>{mensajeExito}</span>
          <button className="alert-close-btn" onClick={() => setMensajeExito('')}>✕</button>
        </div>
      )}

      {/* VISTA 1: FORMULARIO PARA REGISTRAR TRABAJADOR */}
      {pestañaActiva === 'crear' && (
        <div className="create-user-card">
          <div className="create-user-header">
            <h3>👤 Registrar Nuevo Trabajador del Sistema</h3>
            <p>Completa los datos para crear la cuenta. Por seguridad, el trabajador deberá definir su contraseña privada al iniciar sesión.</p>
          </div>

          {errorFormulario && (
            <div style={{ backgroundColor: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: 500 }}>
              {errorFormulario}
            </div>
          )}

          <form onSubmit={handleSubmit} className="worker-form">
            <div className="form-grid">
              {/* Nombre Completo */}
              <div className="form-field">
                <label className="form-label" htmlFor="nombre">Nombre Completo *</label>
                <input
                  id="nombre"
                  type="text"
                  name="nombre"
                  className="form-input"
                  placeholder="Nombre"
                  value={nuevoUsuario.nombre}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Cédula / ID con botón conmutable V- / E- */}
              <div className="form-field">
                <label className="form-label" htmlFor="cedula">
                  Cédula / Documento de Identidad (Clic en {tipoCedulaNuevo}- para cambiar V/E) *
                </label>
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
                    id="cedula"
                    type="text"
                    name="cedula"
                    inputMode="numeric"
                    className="form-input"
                    placeholder="Ej: 26890123"
                    value={nuevoUsuario.cedula}
                    onChange={handleChange}
                    required
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              {/* Fecha de Nacimiento */}
              <div className="form-field">
                <label className="form-label" htmlFor="fechaNacimiento">Fecha de Nacimiento *</label>
                <input
                  id="fechaNacimiento"
                  type="date"
                  name="fechaNacimiento"
                  className="form-input"
                  value={nuevoUsuario.fechaNacimiento}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {/* Correo Electrónico */}
              <div className="form-field">
                <label className="form-label" htmlFor="email">Correo Electrónico Institucional *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="Correo"
                  value={nuevoUsuario.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Rol Asignado */}
              <div className="form-field">
                <label className="form-label" htmlFor="rol">Rol de Acceso al Sistema *</label>
                <select
                  id="rol"
                  name="rol"
                  className="form-input form-select"
                  value={nuevoUsuario.rol}
                  onChange={handleChange}
                  required
                >
                  <option value="staff">Personal / Recepción (Acceso a Catálogo, Ventas y Lectores)</option>
                  <option value="admin">Administrador (Acceso Total y Configuración)</option>
                </select>
              </div>

              {/* Contraseña Inicial */}
              <div className="form-field full-width">
                <label className="form-label" htmlFor="password">Contraseña Temporal de Acceso *</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="Contraseña temporal"
                  value={nuevoUsuario.password}
                  onChange={handleChange}
                  required
                />
                <span className="field-hint">🔐 El trabajador usará esta clave temporal para ingresar y el sistema le pedirá crear su clave personal definitiva.</span>
              </div>
            </div>

            <div className="form-footer-actions">
              <button
                type="button"
                className="btn-limpiar"
                onClick={handleLimpiarNuevoTrabajador}
                title="Limpiar campos del formulario"
                disabled={guardando}
              >
                🧹 Limpiar Campos
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPestañaActiva('lista')}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={guardando}>
                {guardando ? 'Guardando en Base de Datos...' : 'Guardar y Habilitar Acceso 💾'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VISTA 2: LISTA Y GESTIÓN DE PERSONAL */}
      {pestañaActiva === 'lista' && (
        <>
          {/* Barra de Búsqueda y Filtros */}
          <div className="filters-bar">
            <div className="search-box">
              <input
                type="text"
                className="form-input"
                placeholder="Buscar trabajador..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            
            <div className="filter-box">
              <select
                className="form-input form-select"
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
              >
                <option value="todos">Todos los roles</option>
                <option value="admin">Administrador</option>
                <option value="staff">Personal / Recepción</option>
              </select>
            </div>

            <div className="filter-box">
              <select
                className="form-input form-select"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          {/* Tabla de Usuarios del Sistema */}
          <div className="table-container">
            {cargando ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                Cargando personal desde la base de datos...
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>TRABAJADOR</th>
                    <th>CÉDULA / ID</th>
                    <th>FECHA NACIMIENTO</th>
                    <th>CORREO ELECTRÓNICO</th>
                    <th>ROL DE ACCESO</th>
                    <th>ESTADO</th>
                    <th>SEGURIDAD</th>
                    <th>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {personalFiltrado.length > 0 ? (
                    personalFiltrado.map((u) => {
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
                                <span style={{ marginLeft: '0.35rem', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                                  ({edad} años)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${u.rol === 'admin' ? 'badge-admin' : 'badge-staff'}`}>
                            {u.rol === 'admin' ? '👑 Administrador' : '👤 Personal'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.estado === 'Activo' ? 'badge-success' : 'badge-danger'}`}>
                            {u.estado}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem', alignItems: 'flex-start' }}>
                            {u.debeCambiarPassword ? (
                              <span className="badge-pwd-pending" title="Debe cambiar contraseña al iniciar sesión">
                                ⏳ Clave Temporal
                              </span>
                            ) : (
                              <span className="badge-pwd-ok" title="Contraseña privada configurada">
                                ✓ Clave Personal
                              </span>
                            )}
                            {u.totpHabilitado ? (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '999px'
                                }}
                                title="Segundo factor Google Authenticator vinculado"
                              >
                                🛡️ 2FA Vinculado
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  backgroundColor: '#f8fafc',
                                  color: '#64748b',
                                  border: '1px solid #cbd5e1',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '999px'
                                }}
                                title="Se vinculará al escanear el código QR en su próximo inicio de sesión"
                              >
                                📲 QR Pendiente
                              </span>
                            )}
                            {u.bloqueadoHasta && new Date(u.bloqueadoHasta) > new Date() && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '999px'
                                }}
                                title="Cuenta bloqueada temporalmente por intentos fallidos"
                              >
                                🔒 Bloqueado (3 fallos)
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn-action-edit"
                              onClick={() => handleAbrirModalEditar(u)}
                              title="Editar datos del trabajador (Nombre, Correo, Rol)"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              className="btn-action-pwd"
                              onClick={() => handleAbrirModalQR(u)}
                              style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                              title="Ver o regenerar código QR de Google Authenticator (2FA)"
                            >
                              📱 QR 2FA
                            </button>
                            <button
                              type="button"
                              className="btn-action-pwd"
                              onClick={() => handleAbrirModalReset(u)}
                              title="Restablecer o asignar nueva contraseña temporal"
                            >
                              🔑 Clave
                            </button>
                            {u.bloqueadoHasta && new Date(u.bloqueadoHasta) > new Date() && (
                              <button
                                type="button"
                                className="btn-action-status btn-activate"
                                onClick={() => handleDesbloquearCuenta(u)}
                                title="Desbloquear cuenta inmediatamente"
                              >
                                🔓 Desbloquear
                              </button>
                            )}
                            <button 
                              className={`btn-action-status ${u.estado === 'Activo' ? 'btn-deactivate' : 'btn-activate'}`}
                              onClick={() => toggleEstado(u.id)}
                              title={u.estado === 'Activo' ? 'Desactivar acceso' : 'Activar acceso'}
                            >
                              {u.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="table-empty-message">
                        No se encontró ningún trabajador con los criterios aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* MODAL PARA EDITAR DATOS DEL TRABAJADOR */}
      {usuarioAEditar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>✏️ Editar Datos del Trabajador</h3>
              <button type="button" className="btn-modal-close" onClick={handleCerrarModalEditar}>✕</button>
            </div>

            <p className="modal-desc">
              Modifica el nombre, correo electrónico o rol de <strong>{usuarioAEditar.nombre}</strong>. La cédula es un identificador único y no puede alterarse.
            </p>

            {errorModalEdit && (
              <div className="modal-alert-error">
                ⚠️ {errorModalEdit}
              </div>
            )}

            <form onSubmit={handleGuardarEdicion} className="modal-form">
              {/* Cédula (Solo Lectura / No Editable) */}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-cedula">
                  Cédula / Documento de Identidad (Inmutable)
                </label>
                <input
                  id="edit-cedula"
                  type="text"
                  className="form-input"
                  value={usuarioAEditar.cedula}
                  disabled
                  readOnly
                  style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                />
                <span className="field-hint">🔒 La cédula no puede modificarse una vez registrada en el sistema.</span>
              </div>

              {/* Nombre Completo */}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-nombre">
                  Nombre Completo *
                </label>
                <input
                  id="edit-nombre"
                  type="text"
                  className="form-input"
                  value={formEditar.nombre}
                  onChange={(e) => {
                    setFormEditar({ ...formEditar, nombre: capitalizarPalabras(e.target.value.replace(/\d/g, ''), true) });
                    if (errorModalEdit) setErrorModalEdit('');
                  }}
                  required
                  autoFocus
                />
              </div>

              {/* Fecha de Nacimiento */}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-fechaNacimiento">
                  Fecha de Nacimiento
                </label>
                <input
                  id="edit-fechaNacimiento"
                  type="date"
                  className="form-input"
                  value={formEditar.fechaNacimiento}
                  onChange={(e) => setFormEditar({ ...formEditar, fechaNacimiento: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Correo Electrónico */}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-email">
                  Correo Electrónico *
                </label>
                <input
                  id="edit-email"
                  type="email"
                  className="form-input"
                  value={formEditar.email}
                  onChange={(e) => {
                    setFormEditar({ ...formEditar, email: e.target.value });
                    if (errorModalEdit) setErrorModalEdit('');
                  }}
                  required
                />
              </div>

              {/* Rol Asignado */}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-rol">
                  Rol de Acceso al Sistema *
                </label>
                <select
                  id="edit-rol"
                  className="form-input form-select"
                  value={formEditar.rol}
                  onChange={(e) => setFormEditar({ ...formEditar, rol: e.target.value })}
                  required
                >
                  <option value="staff">Personal / Recepción (Acceso a Catálogo, Ventas y Lectores)</option>
                  <option value="admin">Administrador (Acceso Total y Configuración)</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCerrarModalEditar}
                  disabled={guardandoEdicion}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={guardandoEdicion}
                >
                  {guardandoEdicion ? 'Actualizando...' : 'Guardar Cambios 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA RESTABLECER CONTRASEÑA POR EL ADMINISTRADOR */}
      {usuarioResetPassword && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>🔑 Restablecer Contraseña</h3>
              <button type="button" className="btn-modal-close" onClick={handleCerrarModalReset}>✕</button>
            </div>

            <p className="modal-desc">
              Asigna una contraseña temporal para <strong>{usuarioResetPassword.nombre}</strong> ({usuarioResetPassword.email}).
            </p>

            {errorReset && (
              <div className="modal-alert-error">
                ⚠️ {errorReset}
              </div>
            )}

            <form onSubmit={handleGuardarResetPassword} className="modal-form">
              <div className="form-field">
                <label className="form-label" htmlFor="nuevaPasswordAdmin">
                  Nueva Contraseña Temporal *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="nuevaPasswordAdmin"
                    type="text"
                    className="form-input"
                    placeholder="Nueva contraseña"
                    value={nuevaPasswordAdmin}
                    onChange={(e) => {
                      setNuevaPasswordAdmin(e.target.value);
                      if (errorReset) setErrorReset('');
                    }}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleGenerarPasswordRapida}
                    title="Generar contraseña segura aleatoria"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    🎲 Generar
                  </button>
                </div>
                <span className="field-hint">
                  ℹ️ Al iniciar sesión con esta clave, el sistema le pedirá obligatoriamente crear su contraseña personal.
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCerrarModalReset}
                  disabled={guardandoReset}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={guardandoReset || !nuevaPasswordAdmin.trim()}
                >
                  {guardandoReset ? 'Guardando...' : 'Restablecer y Asignar 🔑'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA VER O REGENERAR EL CÓDIGO QR DE GOOGLE AUTHENTICATOR (2FA) */}
      {modalQRUsuario && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3>📱 Código QR 2FA (Google Authenticator)</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setModalQRUsuario(null)}
              >
                ✕
              </button>
            </div>

            <p className="modal-desc" style={{ marginBottom: '0.75rem' }}>
              Autenticador de segundo factor para <strong>{modalQRUsuario.nombre}</strong> ({modalQRUsuario.email}).
            </p>

            {cargandoQR ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                Generando código QR...
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.85rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.15rem'
                }}
              >
                <span
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    backgroundColor: datosQR.totpHabilitado ? '#dcfce7' : '#dbeafe',
                    color: datosQR.totpHabilitado ? '#166534' : '#1e40af'
                  }}
                >
                  {datosQR.totpHabilitado
                    ? '🛡️ Dispositivo ya vinculado y activo'
                    : '📲 Pendiente de primer escaneo al iniciar sesión'}
                </span>

                {datosQR.qrSvg && (
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      padding: '0.65rem',
                      borderRadius: '12px',
                      border: '2px solid #cbd5e1',
                      boxShadow: '0 4px 10px rgba(15, 23, 42, 0.06)'
                    }}
                    dangerouslySetInnerHTML={{ __html: datosQR.qrSvg }}
                  />
                )}

                {datosQR.secretManual && (
                  <div
                    style={{
                      width: '100%',
                      backgroundColor: '#ffffff',
                      border: '1px dashed #94a3b8',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.2rem' }}>
                      Clave Manual (si no puede usar la cámara):
                    </div>
                    <code
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        letterSpacing: '0.05em',
                        userSelect: 'all'
                      }}
                    >
                      {datosQR.secretManual}
                    </code>
                  </div>
                )}

                <p style={{ fontSize: '0.78rem', color: '#475569', textAlign: 'center', margin: 0, lineHeight: 1.4 }}>
                  El trabajador puede escanear este QR desde aquí con <strong>Google Authenticator</strong> o directamente en su pantalla la primera vez que inicie sesión.
                </p>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1.15rem', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRegenerarQR}
                disabled={cargandoQR || regenerandoQR}
                style={{ color: '#b45309', borderColor: '#fcd34d', backgroundColor: '#fffbeb' }}
                title="Invalidar el QR anterior y generar uno nuevo (útil si el trabajador cambió de teléfono)"
              >
                {regenerandoQR ? 'Regenerando...' : '🔄 Regenerar Nuevo QR'}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setModalQRUsuario(null)}
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