import './Sidebar.css';
import logo from '../../assets/Logo.png'; 

export default function Sidebar({ 
  paginaActual, 
  setPaginaActual, 
  rolUsuario = 'admin', 
  usuario = null,
  onCerrarSesion,
  sidebarAbierto = false, 
  setSidebarAbierto 
}) {
  const esAdmin = rolUsuario === 'admin';

  const handleNavegar = (pagina) => {
    setPaginaActual(pagina);
    if (setSidebarAbierto) {
      setSidebarAbierto(false);
    }
  };

  const handleCerrarSesion = () => {
    if (setSidebarAbierto) {
      setSidebarAbierto(false);
    }
    if (onCerrarSesion) {
      onCerrarSesion();
    }
  };

  return (
    <>
      {/* Backdrop oscuro para móviles */}
      {sidebarAbierto && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarAbierto(false)} 
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${sidebarAbierto ? 'sidebar-open' : ''}`}>
        {/* Encabezado con Logo, Título dinámico y botón de cierre móvil */}
        <div className="sidebar-brand">
          <img src={logo} alt="Logo Biblioteca" className="sidebar-logo" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="sidebar-title" title={usuario?.nombre || (esAdmin ? 'Administrador' : 'Personal')}>
              {usuario?.nombre || (esAdmin ? 'Panel Admin' : 'Panel Recepción')}
            </h2>
            <span className={`sidebar-role-badge ${esAdmin ? 'badge-admin' : 'badge-staff'}`}>
              {esAdmin ? '👑 Administrador' : '👤 Personal'}
            </span>
          </div>

          {/* Botón para cerrar menú en móviles */}
          {setSidebarAbierto && (
            <button 
              type="button" 
              className="btn-sidebar-close" 
              onClick={() => setSidebarAbierto(false)}
              aria-label="Cerrar menú"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navegación Principal */}
        <nav className="sidebar-nav">
          {/* --- VISTAS OPERATIVAS (Personal y Admin) --- */}
          <button 
            className={`sidebar-btn ${paginaActual === 'metricas' ? 'active' : ''}`}
            onClick={() => handleNavegar('metricas')}
          >
            📊 Métricas
          </button>

          <button 
            className={`sidebar-btn ${paginaActual === 'nueva-venta' ? 'active' : ''}`}
            onClick={() => handleNavegar('nueva-venta')}
          >
            🛒 Venta
          </button>

          <button 
            className={`sidebar-btn ${paginaActual === 'historial-ventas' ? 'active' : ''}`}
            onClick={() => handleNavegar('historial-ventas')}
          >
            🧾 Historial de Ventas
          </button>

          <button 
            className={`sidebar-btn ${paginaActual === 'libros' ? 'active' : ''}`}
            onClick={() => handleNavegar('libros')}
          >
            📚 Libros y Catálogo
          </button>

          <button 
            className={`sidebar-btn ${paginaActual === 'usuarios' ? 'active' : ''}`}
            onClick={() => handleNavegar('usuarios')}
          >
            👥 Lectores
          </button>

          {/* --- VISTAS EXCLUSIVAS DE ADMINISTRACIÓN --- */}
          {esAdmin && (
            <>
              <div className="sidebar-section-title">ADMINISTRACIÓN</div>

              <button 
                className={`sidebar-btn ${paginaActual === 'centro-reportes' ? 'active' : ''}`}
                onClick={() => handleNavegar('centro-reportes')}
              >
                📑 Centro de Reportes
              </button>

              <button 
                className={`sidebar-btn ${paginaActual === 'ajustes-inventario' ? 'active' : ''}`}
                onClick={() => handleNavegar('ajustes-inventario')}
              >
                📦 Control de Inventario
              </button>

              <button 
                className={`sidebar-btn ${paginaActual === 'distribuidores' ? 'active' : ''}`}
                onClick={() => handleNavegar('distribuidores')}
              >
                🏢 Distribuidores
              </button>

              <button 
                className={`sidebar-btn ${paginaActual === 'gestion-personal' ? 'active' : ''}`}
                onClick={() => handleNavegar('gestion-personal')}
              >
                🛠️ Gestión de Personal
              </button>

              <button 
                className={`sidebar-btn ${paginaActual === 'bitacora' ? 'active' : ''}`}
                onClick={() => handleNavegar('bitacora')}
              >
                🛡️ Bitácora y Seguridad
              </button>
            </>
          )}
        </nav>

        {/* Footer del Sidebar con información de cuenta y botón de Cerrar Sesión */}
        <div className="sidebar-footer">
          {usuario?.email && (
            <div className="sidebar-user-info" title={usuario.email}>
              <small className="sidebar-user-email">📧 {usuario.email}</small>
            </div>
          )}
          <button className="sidebar-btn btn-logout" onClick={handleCerrarSesion}>
            🚪 Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}