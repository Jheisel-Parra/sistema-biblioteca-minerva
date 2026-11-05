import './Sidebar.css';
import logo from '../../assets/Logo.png'; 
import Icono from '../Icono/Icono';

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
              <Icono nombre={esAdmin ? 'escudo' : 'usuario'} size={11} style={{ marginRight: '4px' }} />
              {esAdmin ? 'Administrador' : 'Personal'}
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
            <Icono nombre="metricas" size={18} />
            <span>Métricas</span>
          </button>

          <button 
            className={`sidebar-btn ${paginaActual === 'nueva-venta' ? 'active' : ''}`}
            onClick={() => handleNavegar('nueva-venta')}
          >
            <Icono nombre="carrito" size={18} />
            <span>Venta</span>
          </button>

          <button 
            className={`sidebar-btn ${paginaActual === 'historial-ventas' ? 'active' : ''}`}
            onClick={() => handleNavegar('historial-ventas')}
          >
            <Icono nombre="recibo" size={18} />
            <span>Historial de Ventas</span>
          </button>

          <button 
            className={`sidebar-btn ${paginaActual === 'libros' ? 'active' : ''}`}
            onClick={() => handleNavegar('libros')}
          >
            <Icono nombre="libros" size={18} />
            <span>Libros y Catálogo</span>
          </button>

          <button 
            className={`sidebar-btn ${paginaActual === 'usuarios' ? 'active' : ''}`}
            onClick={() => handleNavegar('usuarios')}
          >
            <Icono nombre="usuarios" size={18} />
            <span>Lectores</span>
          </button>

          {/* --- VISTAS EXCLUSIVAS DE ADMINISTRACIÓN --- */}
          {esAdmin && (
            <>
              <div className="sidebar-section-title">ADMINISTRACIÓN</div>

              <button 
                className={`sidebar-btn ${paginaActual === 'centro-reportes' ? 'active' : ''}`}
                onClick={() => handleNavegar('centro-reportes')}
              >
                <Icono nombre="reportes" size={18} />
                <span>Centro de Reportes</span>
              </button>

              <button 
                className={`sidebar-btn ${paginaActual === 'ajustes-inventario' ? 'active' : ''}`}
                onClick={() => handleNavegar('ajustes-inventario')}
              >
                <Icono nombre="caja" size={18} />
                <span>Control de Inventario</span>
              </button>

              <button 
                className={`sidebar-btn ${paginaActual === 'distribuidores' ? 'active' : ''}`}
                onClick={() => handleNavegar('distribuidores')}
              >
                <Icono nombre="edificio" size={18} />
                <span>Distribuidores</span>
              </button>

              <button 
                className={`sidebar-btn ${paginaActual === 'gestion-personal' ? 'active' : ''}`}
                onClick={() => handleNavegar('gestion-personal')}
              >
                <Icono nombre="config" size={18} />
                <span>Gestión de Personal</span>
              </button>

              <button 
                className={`sidebar-btn ${paginaActual === 'bitacora' ? 'active' : ''}`}
                onClick={() => handleNavegar('bitacora')}
              >
                <Icono nombre="escudo" size={18} />
                <span>Bitácora y Seguridad</span>
              </button>
            </>
          )}
        </nav>

        {/* Footer del Sidebar con información de cuenta y botón de Cerrar Sesión */}
        <div className="sidebar-footer">
          <a
            href={
              typeof window !== 'undefined' &&
              window.location.hostname !== 'localhost' &&
              window.location.hostname !== '127.0.0.1'
                ? `${window.location.origin}/catalogo/`
                : 'http://localhost:5174'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-btn"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              marginBottom: '8px',
              background: 'rgba(37, 99, 235, 0.14)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: '#dbeafe'
            }}
          >
            <Icono nombre="globo" size={17} />
            <span>Ver Landing Pública</span>
          </a>
          {usuario?.email && (
            <div className="sidebar-user-info" title={usuario.email}>
              <small className="sidebar-user-email">
                <Icono nombre="correo" size={13} style={{ marginRight: '5px', opacity: 0.8 }} />
                {usuario.email}
              </small>
            </div>
          )}
          <button className="sidebar-btn btn-logout" onClick={handleCerrarSesion}>
            <Icono nombre="salir" size={17} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
