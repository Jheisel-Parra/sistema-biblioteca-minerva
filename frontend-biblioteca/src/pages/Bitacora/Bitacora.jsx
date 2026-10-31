import { useState, useEffect, useCallback, useRef } from 'react';
import './Bitacora.css';
import { 
  apiGetBitacora, 
  apiGetSesionesBitacora, 
  apiGetResumenBitacora,
  apiForzarCierreSesion,
  apiGetEstadoSeguridad,
  apiDescargarBackupSqlite,
  apiDescargarBackupJson,
  apiRestaurarBackup
} from '../../services/api';

export default function Bitacora({ esAdmin = true, onAbrirReporte }) {
  // Pestaña activa ('actividades' | 'sesiones' | 'seguridad')
  const [tabActiva, setTabActiva] = useState('actividades');

  // Estados de datos
  const [eventos, setEventos] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [resumen, setResumen] = useState({
    totalEventos: 0,
    eventosHoy: 0,
    sesionesActivas: 0,
    totalSesiones: 0
  });
  const [estadoSeguridad, setEstadoSeguridad] = useState(null);
  const [descargandoBackup, setDescargandoBackup] = useState(false);
  const [restaurandoBackup, setRestaurandoBackup] = useState(false);
  const [mensajeBackup, setMensajeBackup] = useState('');
  const inputRestoreRef = useRef(null);

  // Filtros de búsqueda para actividades
  const [filtroModulo, setFiltroModulo] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  // Filtro de sesiones
  const [filtroSesionEstado, setFiltroSesionEstado] = useState('TODAS');

  // Estados de carga
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Modal para ver detalles ampliados de un evento
  const [eventoDetalle, setEventoDetalle] = useState(null);

  // Cargar datos principales
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError('');

      const [resBitacora, resSesiones, resResumen, resSeguridad] = await Promise.all([
        apiGetBitacora({
          modulo: filtroModulo !== 'TODOS' ? filtroModulo : undefined,
          q: busqueda.trim() || undefined,
          fecha: filtroFecha || undefined,
          limit: 150
        }).catch((err) => ({ ok: false, error: err.message })),
        apiGetSesionesBitacora({
          activo: filtroSesionEstado === 'ACTIVAS' ? 'true' : (filtroSesionEstado === 'FINALIZADAS' ? 'false' : undefined),
          limit: 100
        }).catch((err) => ({ ok: false, error: err.message })),
        apiGetResumenBitacora().catch(() => null),
        apiGetEstadoSeguridad().catch(() => null)
      ]);

      if (resBitacora.ok) {
        setEventos(resBitacora.eventos || []);
      } else if (resBitacora.error) {
        setError(resBitacora.error);
      }

      if (resSesiones.ok) {
        setSesiones(resSesiones.sesiones || []);
      }

      if (resResumen?.ok && resResumen.resumen) {
        setResumen(resResumen.resumen);
      }

      if (resSeguridad?.ok && resSeguridad.seguridad) {
        setEstadoSeguridad(resSeguridad.seguridad);
      }
    } catch (err) {
      console.error('Error cargando bitácora:', err);
      setError('Error al sincronizar la bitácora con el servidor.');
    } finally {
      setCargando(false);
    }
  }, [filtroModulo, busqueda, filtroFecha, filtroSesionEstado]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Manejar cierre forzado de sesión
  const handleForzarCierre = async (sesion) => {
    const confirmar = window.confirm(
      `¿Deseas desconectar forzosamente la sesión activa del usuario "${sesion.usuarioNombre}"?`
    );
    if (!confirmar) return;

    try {
      const res = await apiForzarCierreSesion(sesion.id);
      if (res.ok) {
        alert(res.mensaje || 'Sesión finalizada.');
        cargarDatos();
      }
    } catch (err) {
      alert(err.message || 'Error al forzar el cierre de sesión.');
    }
  };

  // Manejar descarga de copia de seguridad SQLite (.db)
  const handleDescargarSqlite = async () => {
    if (!esAdmin) return;
    try {
      setDescargandoBackup(true);
      setError('');
      setMensajeBackup('');
      const res = await apiDescargarBackupSqlite();
      if (res.ok) {
        setMensajeBackup(`Copia de seguridad SQLite (${res.archivo}) descargada correctamente.`);
        cargarDatos();
      }
    } catch (err) {
      setError(err.message || 'No se pudo descargar la copia de seguridad SQLite.');
    } finally {
      setDescargandoBackup(false);
    }
  };

  // Manejar descarga de respaldo JSON (.json)
  const handleDescargarJson = async () => {
    if (!esAdmin) return;
    try {
      setDescargandoBackup(true);
      setError('');
      setMensajeBackup('');
      const res = await apiDescargarBackupJson();
      if (res.ok) {
        setMensajeBackup(`Respaldo estructurado JSON (${res.archivo}) descargado correctamente.`);
        cargarDatos();
      }
    } catch (err) {
      setError(err.message || 'No se pudo exportar el respaldo en formato JSON.');
    } finally {
      setDescargandoBackup(false);
    }
  };

  // Manejar carga / restauración de una base de datos descargada (.db o .json)
  const handleRestaurarArchivoBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!esAdmin) return;

    const confirmar = window.confirm(
      `¿Estás seguro de cargar y restaurar la copia de seguridad "${file.name}"?\n\nLos datos contenidos en este respaldo se cargarán en la base de datos del sistema.`
    );
    if (!confirmar) return;

    try {
      setRestaurandoBackup(true);
      setError('');
      setMensajeBackup('');

      const res = await apiRestaurarBackup(file);
      if (res.ok) {
        setMensajeBackup(res.mensaje || `Base de datos restaurada exitosamente desde "${file.name}".`);
        await cargarDatos();
      }
    } catch (err) {
      setError(err.message || 'No se pudo restaurar el archivo de copia de seguridad seleccionado.');
    } finally {
      setRestaurandoBackup(false);
    }
  };

  // Helper para asignar clase de color por módulo
  const getBadgeModuloClass = (modulo) => {
    switch (modulo) {
      case 'VENTAS': return 'badge-modulo-ventas';
      case 'INVENTARIO': return 'badge-modulo-inventario';
      case 'LIBROS': return 'badge-modulo-libros';
      case 'GENEROS': return 'badge-modulo-generos';
      case 'USUARIOS': return 'badge-modulo-usuarios';
      case 'AUTH': return 'badge-modulo-auth';
      default: return 'badge-modulo-auth';
    }
  };

  // Helper para icono de módulo
  const getModuloIcon = (modulo) => {
    switch (modulo) {
      case 'VENTAS': return '🛒';
      case 'INVENTARIO': return '📦';
      case 'LIBROS': return '📚';
      case 'GENEROS': return '🏷️';
      case 'USUARIOS': return '👥';
      case 'AUTH': return '🔐';
      default: return '📋';
    }
  };

  // Helper para clase de acción
  const getAccionClass = (accion) => {
    switch (accion) {
      case 'CREAR': return 'accion-crear';
      case 'EDITAR': return 'accion-editar';
      case 'ELIMINAR': return 'accion-eliminar';
      case 'VENTA': return 'accion-venta';
      case 'ENTRADA_STOCK': return 'accion-entrada';
      case 'BAJA_STOCK': return 'accion-baja';
      case 'LOGIN': return 'accion-login';
      case 'LOGOUT': return 'accion-logout';
      case 'RESET_PASSWORD': return 'accion-editar';
      case 'ESTADO_USUARIO': return 'accion-editar';
      case 'FORCE_LOGOUT': return 'accion-eliminar';
      default: return 'accion-default';
    }
  };

  // Filtrar sesiones activas para el recuadro superior
  const sesionesActivasLista = sesiones.filter((s) => s.activo);

  return (
    <div className="bitacora-container">
      {/* Encabezado */}
      <div className="bitacora-header">
        <div className="bitacora-title-section">
          <h1>🛡️ Bitácora, Seguridad y Respaldo</h1>
          <p>Supervisión de operaciones, control de sesiones activas y copias de seguridad de la base de datos SQLite</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {onAbrirReporte && (
            <button 
              type="button" 
              onClick={() => onAbrirReporte('trazabilidad-horarios')}
              style={{
                background: '#1e3a8a',
                color: 'white',
                border: 'none',
                padding: '0.65rem 1.1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 8px rgba(30, 58, 138, 0.25)'
              }}
              title="Generar reporte de auditoría de conexiones y horarios"
            >
              ⏱️ Reporte Horarios (PDF)
            </button>
          )}
          <button 
            type="button" 
            className="btn-refresh-bitacora" 
            onClick={cargarDatos}
            disabled={cargando}
          >
            🔄 {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Alerta de Éxito de Backup */}
      {mensajeBackup && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '0.9rem 1.2rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✅ {mensajeBackup}</span>
          <button type="button" onClick={() => setMensajeBackup('')} style={{ background: 'transparent', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Alerta de Error si ocurre */}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '0.9rem 1.2rem', borderRadius: '10px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tarjetas de Métricas de Auditoría */}
      <div className="bitacora-stats-grid">
        <div className="bitacora-stat-card">
          <div className="bitacora-stat-icon stat-icon-blue">⚡</div>
          <div className="bitacora-stat-info">
            <h3>{resumen.eventosHoy}</h3>
            <span>Acciones Registradas Hoy</span>
          </div>
        </div>

        <div className="bitacora-stat-card">
          <div className="bitacora-stat-icon stat-icon-green">
            <span className="pulse-online" style={{ width: '16px', height: '16px' }}></span>
          </div>
          <div className="bitacora-stat-info">
            <h3>{resumen.sesionesActivas}</h3>
            <span>Usuarios Conectados Ahora</span>
          </div>
        </div>

        <div className="bitacora-stat-card">
          <div className="bitacora-stat-icon stat-icon-purple">📜</div>
          <div className="bitacora-stat-info">
            <h3>{resumen.totalEventos}</h3>
            <span>Total Acciones en Bitácora</span>
          </div>
        </div>

        <div className="bitacora-stat-card">
          <div className="bitacora-stat-icon stat-icon-amber">⏱️</div>
          <div className="bitacora-stat-info">
            <h3>{resumen.totalSesiones}</h3>
            <span>Sesiones Registradas</span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="bitacora-tabs">
        <button 
          type="button"
          className={`bitacora-tab-btn ${tabActiva === 'actividades' ? 'active' : ''}`}
          onClick={() => setTabActiva('actividades')}
        >
          📜 Registro de Actividades
          <span className="tab-badge">{eventos.length}</span>
        </button>

        <button 
          type="button"
          className={`bitacora-tab-btn ${tabActiva === 'sesiones' ? 'active' : ''}`}
          onClick={() => setTabActiva('sesiones')}
        >
          ⏱️ Conexiones y Horarios
          <span className={`tab-badge ${resumen.sesionesActivas > 0 ? 'tab-badge-active' : ''}`}>
            {resumen.sesionesActivas} en línea
          </span>
        </button>

        {esAdmin && (
          <button 
            type="button"
            className={`bitacora-tab-btn ${tabActiva === 'seguridad' ? 'active' : ''}`}
            onClick={() => setTabActiva('seguridad')}
          >
            🛡️ Seguridad y Respaldo (Backup)
            <span className="tab-badge">SQLite</span>
          </button>
        )}
      </div>

      {/* CONTENIDO PESTAÑA 1: HISTORIAL DE ACTIVIDADES */}
      {tabActiva === 'actividades' && (
        <>
          {/* Barra de Filtros */}
          <div className="bitacora-filters-card">
            <div className="filters-left">
              <input
                type="text"
                className="filter-input-search"
                placeholder="Buscar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />

              <select 
                className="filter-select"
                value={filtroModulo}
                onChange={(e) => setFiltroModulo(e.target.value)}
              >
                <option value="TODOS">📁 Todos los Módulos</option>
                <option value="VENTAS">🛒 Ventas</option>
                <option value="INVENTARIO">📦 Inventario</option>
                <option value="LIBROS">📚 Libros y Catálogo</option>
                <option value="GENEROS">🏷️ Géneros</option>
                <option value="USUARIOS">👥 Gestión Personal</option>
                <option value="AUTH">🔐 Seguridad y Sesiones</option>
              </select>

              <input
                type="date"
                className="filter-date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                title="Filtrar por fecha específica"
              />
            </div>

            {(busqueda || filtroModulo !== 'TODOS' || filtroFecha) && (
              <button 
                type="button" 
                className="btn-clear-filters"
                onClick={() => {
                  setBusqueda('');
                  setFiltroModulo('TODOS');
                  setFiltroFecha('');
                }}
              >
                ✕ Limpiar Filtros
              </button>
            )}
          </div>

          {/* Tabla de Bitácora */}
          <div className="bitacora-table-wrapper">
            <table className="bitacora-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Usuario Responsable</th>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th>Descripción del Evento</th>
                  <th style={{ textAlign: 'center' }}>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {eventos.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state-bitacora">
                        <h3>No hay registros de bitácora que coincidan</h3>
                        <p>Los eventos realizados por administradores y personal se reflejarán automáticamente aquí.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  eventos.map((ev) => (
                    <tr key={ev.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong>{ev.fecha}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{ev.hora}</div>
                      </td>

                      <td>
                        <div className="user-cell">
                          <span className="user-cell-name">{ev.usuarioNombre}</span>
                          <span className="user-cell-role">
                            {ev.usuarioRol === 'admin' ? '👑 Administrador' : '👤 Personal'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className={`badge-modulo ${getBadgeModuloClass(ev.modulo)}`}>
                          {getModuloIcon(ev.modulo)} {ev.modulo}
                        </span>
                      </td>

                      <td>
                        <span className={`badge-accion ${getAccionClass(ev.accion)}`}>
                          {ev.accion}
                        </span>
                      </td>

                      <td style={{ maxWidth: '420px', lineHeight: '1.4' }}>
                        {ev.descripcion}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {ev.detalles ? (
                          <button 
                            type="button" 
                            className="btn-view-details"
                            onClick={() => setEventoDetalle(ev)}
                            title="Ver datos detallados"
                          >
                            🔍 Ver datos
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CONTENIDO PESTAÑA 2: CONEXIONES Y HORARIOS */}
      {tabActiva === 'sesiones' && (
        <>
          {/* Tarjeta de Usuarios en Línea Ahora */}
          <div className="active-sessions-section">
            <h2 className="active-sessions-title">
              <span className="pulse-online"></span>
              Personal y Administradores Conectados en este Momento ({sesionesActivasLista.length})
            </h2>

            {sesionesActivasLista.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                No hay usuarios con sesión activa reportada en este momento.
              </p>
            ) : (
              <div className="active-sessions-grid">
                {sesionesActivasLista.map((s) => (
                  <div key={s.id} className="session-live-card">
                    <div className="session-live-header">
                      <span className="session-user-name">{s.usuarioNombre}</span>
                      <span className="badge-online">
                        <span className="pulse-online"></span> En Línea
                      </span>
                    </div>

                    <div className="session-detail-line">
                      <span>Rol de Usuario:</span>
                      <strong>{s.usuarioRol === 'admin' ? '👑 Admin' : '👤 Personal'}</strong>
                    </div>

                    <div className="session-detail-line">
                      <span>Hora de Ingreso:</span>
                      <span>{s.fechaInicio} a las {s.horaInicio}</span>
                    </div>

                    <div className="session-detail-line">
                      <span>Tiempo Conectado:</span>
                      <strong style={{ color: '#16a34a' }}>{s.duracion}</strong>
                    </div>

                    <div className="session-detail-line">
                      <span>Dirección IP:</span>
                      <span>{s.ip || '127.0.0.1'}</span>
                    </div>

                    <button 
                      type="button" 
                      className="btn-force-logout"
                      onClick={() => handleForzarCierre(s)}
                    >
                      🛑 Finalizar Sesión Administrativamente
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filtro de Historial de Sesiones */}
          <div className="bitacora-filters-card" style={{ marginBottom: '1rem' }}>
            <div className="filters-left">
              <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                Filtrar historial de conexiones:
              </span>
              <select 
                className="filter-select"
                value={filtroSesionEstado}
                onChange={(e) => setFiltroSesionEstado(e.target.value)}
              >
                <option value="TODAS">Todas las Sesiones</option>
                <option value="ACTIVAS">🟢 Solo Conectados (Activas)</option>
                <option value="FINALIZADAS">⚪ Sesiones Desconectadas</option>
              </select>
            </div>
          </div>

          {/* Tabla de Historial de Conexiones */}
          <div className="bitacora-table-wrapper">
            <table className="bitacora-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Fecha y Hora de Conexión</th>
                  <th>Fecha y Hora de Desconexión</th>
                  <th>Tiempo en Línea</th>
                  <th>IP / Terminal</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sesiones.length === 0 ? (
                  <tr>
                    <td colSpan="8">
                      <div className="empty-state-bitacora">
                        <h3>No hay registros de sesiones</h3>
                        <p>Cada vez que un usuario inicie o cierre sesión quedará registrado aquí.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sesiones.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.usuarioNombre}</strong>
                        {s.usuario?.email && (
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{s.usuario.email}</div>
                        )}
                      </td>

                      <td>
                        <span className={`sidebar-role-badge ${s.usuarioRol === 'admin' ? 'badge-admin' : 'badge-staff'}`}>
                          {s.usuarioRol === 'admin' ? '👑 Admin' : '👤 Personal'}
                        </span>
                      </td>

                      <td>
                        <strong>{s.fechaInicio}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{s.horaInicio}</div>
                      </td>

                      <td>
                        {s.activo ? (
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>Sesión en Curso 🟢</span>
                        ) : (
                          <>
                            <strong>{s.fechaFin || s.fechaInicio}</strong>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{s.horaFin || 'Desconectado'}</div>
                          </>
                        )}
                      </td>

                      <td>
                        <strong>{s.duracion}</strong>
                      </td>

                      <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                        {s.ip || '127.0.0.1'}
                      </td>

                      <td>
                        {s.activo ? (
                          <span className="badge-online">
                            <span className="pulse-online"></span> En Línea
                          </span>
                        ) : (
                          <span className="badge-offline">Finalizada</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {s.activo ? (
                          <button 
                            type="button" 
                            className="btn-force-logout"
                            style={{ margin: 0, padding: '0.25rem 0.6rem' }}
                            onClick={() => handleForzarCierre(s)}
                          >
                            🛑 Desconectar
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CONTENIDO PESTAÑA 3: SEGURIDAD Y RESPALDO DE BASE DE DATOS (EXCLUSIVO ADMIN) */}
      {tabActiva === 'seguridad' && esAdmin && (
        <div className="seguridad-panel-grid">
          {/* Tarjeta Principal de Copia de Seguridad SQLite */}
          <div className="seguridad-card seguridad-card-featured">
            <div className="seguridad-card-header">
              <div className="seguridad-icon-box">💾</div>
              <div>
                <h2>Copia de Seguridad de la Base de Datos SQLite</h2>
                <p>Descarga una copia íntegra y portable del archivo <code>dev.db</code> con todos los registros actuales del sistema.</p>
              </div>
            </div>

            <div className="seguridad-db-meta-grid">
              <div className="seguridad-meta-item">
                <span>Motor de Base de Datos</span>
                <strong>{estadoSeguridad?.motor || 'SQLite 3 (dev.db)'}</strong>
              </div>
              <div className="seguridad-meta-item">
                <span>Tamaño Actual del Archivo</span>
                <strong>{estadoSeguridad?.tamanoFormateado || 'Calculando...'}</strong>
              </div>
              <div className="seguridad-meta-item">
                <span>Última Modificación</span>
                <strong>
                  {estadoSeguridad?.ultimaModificacion
                    ? new Date(estadoSeguridad.ultimaModificacion).toLocaleString('es-VE')
                    : 'Sincronizado'}
                </strong>
              </div>
              <div className="seguridad-meta-item">
                <span>Estado de Integridad</span>
                <strong style={{ color: '#059669' }}>Óptimo y Protegido</strong>
              </div>
            </div>

            <div className="seguridad-actions-row">
              <button
                type="button"
                className="btn-backup-sqlite"
                onClick={handleDescargarSqlite}
                disabled={descargandoBackup || restaurandoBackup}
              >
                💾 {descargandoBackup ? 'Generando Copia...' : 'Descargar Copia de Seguridad SQLite (.db)'}
              </button>

              <button
                type="button"
                className="btn-backup-json"
                onClick={handleDescargarJson}
                disabled={descargandoBackup || restaurandoBackup}
              >
                📄 Exportar Respaldo Completo (.json)
              </button>

              <input
                ref={inputRestoreRef}
                type="file"
                accept=".db,.sqlite,.sqlite3,.json"
                style={{ display: 'none' }}
                onChange={handleRestaurarArchivoBackup}
              />

              <button
                type="button"
                className="btn-backup-sqlite"
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                }}
                onClick={() => inputRestoreRef.current?.click()}
                disabled={descargandoBackup || restaurandoBackup}
                title="Seleccionar un archivo .db o .json de tu computadora para restaurar la base de datos"
              >
                📂 {restaurandoBackup ? 'Restaurando Base de Datos...' : 'Cargar / Restaurar Base de Datos (.db / .json)'}
              </button>
            </div>

            <div className="seguridad-restore-tip">
              <strong>¿Cómo restaurar un backup descargado?</strong> Haz clic en el botón verde <strong>"📂 Cargar / Restaurar Base de Datos"</strong>, selecciona tu archivo <code>.db</code> o <code>.json</code> desde tu carpeta y el sistema cargará todos tus datos automáticamente.
            </div>
          </div>

          {/* Tarjeta de Conteo de Registros Respaldados y Políticas de Seguridad */}
          <div className="seguridad-two-col">
            <div className="seguridad-card">
              <h3>📊 Registros Almacenados en la Base de Datos</h3>
              <p className="seguridad-sub">Resumen de las tablas protegidas dentro del archivo SQLite actual:</p>
              <div className="seguridad-counts-grid">
                <div className="seguridad-count-pill">
                  <span>Libros en Catálogo</span>
                  <strong>{estadoSeguridad?.conteos?.libros ?? 0}</strong>
                </div>
                <div className="seguridad-count-pill">
                  <span>Ventas y Facturas</span>
                  <strong>{estadoSeguridad?.conteos?.ventas ?? 0}</strong>
                </div>
                <div className="seguridad-count-pill">
                  <span>Lectores Registrados</span>
                  <strong>{estadoSeguridad?.conteos?.lectores ?? 0}</strong>
                </div>
                <div className="seguridad-count-pill">
                  <span>Distribuidores</span>
                  <strong>{estadoSeguridad?.conteos?.distribuidores ?? 0}</strong>
                </div>
                <div className="seguridad-count-pill">
                  <span>Compras de Stock</span>
                  <strong>{estadoSeguridad?.conteos?.entradas ?? 0}</strong>
                </div>
                <div className="seguridad-count-pill">
                  <span>Bajas de Inventario</span>
                  <strong>{estadoSeguridad?.conteos?.bajas ?? 0}</strong>
                </div>
                <div className="seguridad-count-pill">
                  <span>Usuarios / Personal</span>
                  <strong>{estadoSeguridad?.conteos?.usuarios ?? 0}</strong>
                </div>
                <div className="seguridad-count-pill">
                  <span>Eventos en Bitácora</span>
                  <strong>{estadoSeguridad?.conteos?.bitacora ?? resumen.totalEventos}</strong>
                </div>
              </div>
            </div>

            <div className="seguridad-card">
              <h3>🔒 Políticas y Controles de Seguridad Activos</h3>
              <p className="seguridad-sub">Medidas de protección aplicadas en el sistema:</p>
              <ul className="seguridad-policies-list">
                <li>
                  <strong>Acceso Exclusivo de Administrador (RBAC):</strong> La descarga de copias de seguridad, reportes gerenciales, gestión de personal y creación/inhabilitación de métodos de pago están restringidos estrictamente al rol <code>admin</code>.
                </li>
                <li>
                  <strong>Protección de Integridad Histórica:</strong> Los géneros literarios y métodos de pago que ya registran ventas no pueden ser eliminados de la base de datos (solo inhabilitados), garantizando la trazabilidad contable.
                </li>
                <li>
                  <strong>Encriptación de Credenciales:</strong> Todas las contraseñas de usuarios se almacenan cifradas con hash <code>bcrypt</code> y sesiones firmadas con tokens <code>JWT</code>.
                </li>
                <li>
                  <strong>Auditoría Inmutable:</strong> Cada descarga de backup, inicio de sesión, venta o ajuste de stock queda registrado con fecha, hora y usuario responsable.
                </li>
              </ul>
            </div>
          </div>

          {/* Historial de Copias de Seguridad Generadas */}
          <div className="seguridad-card">
            <h3>🕒 Historial de Copias de Seguridad Descargadas</h3>
            <p className="seguridad-sub">Registro de respaldos emitidos por los administradores:</p>
            <div className="bitacora-table-wrapper" style={{ marginTop: '0.75rem' }}>
              <table className="bitacora-table">
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Administrador Responsable</th>
                    <th>Formato de Respaldo</th>
                    <th>Archivo Generado</th>
                    <th>Tamaño</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {estadoSeguridad?.historialBackups?.length > 0 ? (
                    estadoSeguridad.historialBackups.map((bk) => (
                      <tr key={bk.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <strong>{bk.fecha}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{bk.hora}</div>
                        </td>
                        <td>
                          <strong>{bk.usuarioNombre}</strong>
                        </td>
                        <td>
                          <span className="badge-modulo badge-modulo-auth">{bk.formato}</span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{bk.archivo}</td>
                        <td>{bk.tamano}</td>
                        <td>{bk.descripcion}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Aún no se han descargado copias de seguridad en esta sesión. Haz clic en <strong>Descargar Copia de Seguridad SQLite (.db)</strong> arriba para generar el primer respaldo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Evento */}
      {eventoDetalle && (
        <div className="modal-detalles-overlay" onClick={() => setEventoDetalle(null)}>
          <div className="modal-detalles-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-detalles-header">
              <h3>🔍 Datos Registrados del Evento #{eventoDetalle.id}</h3>
              <button 
                type="button" 
                className="btn-modal-close"
                onClick={() => setEventoDetalle(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-detalles-body">
              <div>
                <strong>Módulo:</strong> {eventoDetalle.modulo} &nbsp;|&nbsp; 
                <strong> Acción:</strong> {eventoDetalle.accion}
              </div>

              <div>
                <strong>Responsable:</strong> {eventoDetalle.usuarioNombre} ({eventoDetalle.usuarioRol})
              </div>

              <div>
                <strong>Fecha y Hora:</strong> {eventoDetalle.fecha} a las {eventoDetalle.hora}
              </div>

              <div>
                <strong>Descripción:</strong>
                <p style={{ margin: '0.3rem 0 0 0', color: '#1e293b' }}>{eventoDetalle.descripcion}</p>
              </div>

              <div>
                <strong>Carga de Datos (Detalles JSON):</strong>
                <pre className="detalles-raw-json">
                  {typeof eventoDetalle.detalles === 'object' 
                    ? JSON.stringify(eventoDetalle.detalles, null, 2)
                    : String(eventoDetalle.detalles)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
