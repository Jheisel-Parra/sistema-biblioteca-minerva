import { useState, useEffect } from 'react';
import './App.css';

// Componentes
import Sidebar from './components/Sidebar/Sidebar';

// Páginas / Vistas
import Login from './pages/Login/Login';
import CambioPasswordObligatorio from './pages/CambioPasswordObligatorio/CambioPasswordObligatorio';
import Metricas from './pages/Metricas/Metricas';
import NuevaVenta from './pages/NuevaVenta/NuevaVenta';
import HistorialVentas from './pages/HistorialVentas/HistorialVentas';
import Libros from './pages/Libros/Libros';
import Usuarios from './pages/Usuarios/Usuarios';
import AjustesInventario from './pages/AjustesInventario/AjustesInventario';
import GestionPersonal from './pages/GestionPersonal/GestionPersonal';
import Distribuidores from './pages/Distribuidores/Distribuidores';
import Bitacora from './pages/Bitacora/Bitacora';
import CentroReportes from './pages/CentroReportes/CentroReportes';
import ModalReporte from './components/ModalReporte/ModalReporte';

// Servicios de API
import {
  getUsuarioGuardado,
  getToken,
  cerrarSesionStorage,
  apiLogout,
  apiGetLibros,
  apiGetLectores,
  apiGetDistribuidores,
  apiGetVentas,
  apiGetHistorialEntradas,
  apiGetHistorialBajas,
  apiGetCategorias,
  apiGetMetodosPago,
  apiCrearMetodoPago,
  apiToggleEstadoMetodoPago,
  apiEliminarMetodoPago,
  apiRegistrarVenta,
  apiRegistrarEntrada,
  apiRegistrarBaja
} from './services/api';

const METODOS_PAGO_INICIALES = [
  { id: 1, nombre: 'Punto de Venta', etiqueta: 'Punto de Venta', icono: '💳', requiereReferencia: true, esBase: true, activo: true },
  { id: 2, nombre: 'Pago Móvil', etiqueta: 'Pago Móvil', icono: '📱', requiereReferencia: true, esBase: true, activo: true },
  { id: 3, nombre: 'Transferencia Bancaria', etiqueta: 'Transferencia', icono: '🏦', requiereReferencia: true, esBase: true, activo: true },
  { id: 4, nombre: 'Efectivo', etiqueta: 'Efectivo ($ / Bs)', icono: '💵', requiereReferencia: false, esBase: true, activo: true }
];

function App() {
  // Estado de sesión y autenticación
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(getUsuarioGuardado());
  const [token, setToken] = useState(getToken());

  const rolUsuario = usuarioAutenticado?.rol || 'staff';
  const esAdmin = rolUsuario === 'admin';

  const [paginaActual, setPaginaActual] = useState('metricas');
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [reporteActivo, setReporteActivo] = useState(null); // ID del reporte activo para visualización / PDF
  const [rangoReporteActivo, setRangoReporteActivo] = useState({ fechaInicio: '', fechaFin: '', filtroMetodoPago: 'todos' });

  // Estados de datos principales
  const [distribuidores, setDistribuidores] = useState([]);
  const [libros, setLibros] = useState([]);
  const [usuarios, setUsuarios] = useState([]); // Lectores / Clientes
  const [ventas, setVentas] = useState([]);
  const [historialAjustes, setHistorialAjustes] = useState([]);
  const [historialEntradas, setHistorialEntradas] = useState([]);
  const [categorias, setCategorias] = useState([]);

  // Métodos de pago dinámicos sincronizados con la base de datos SQLite y localStorage
  const [metodosPagoRaw, setMetodosPago] = useState(() => {
    try {
      const guardados = localStorage.getItem('biblioteca_metodos_pago');
      if (guardados) {
        const parsed = JSON.parse(guardados);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error leyendo métodos de pago guardados:', e);
    }
    return METODOS_PAGO_INICIALES;
  });

  // Enriquecer cada método de pago con su conteo de ventas en tiempo real
  // Si un método tiene al menos 1 venta, NO se puede eliminar de la BD (solo inhabilitar).
  const metodosPago = metodosPagoRaw.map((m) => {
    const ventasEnMemoria = ventas.filter(
      (v) => (v.metodoPago || '').trim().toLowerCase() === (m.nombre || '').trim().toLowerCase()
    ).length;
    const totalVentas = Math.max(Number(m.totalVentas || 0), ventasEnMemoria);
    const tieneVentas = totalVentas > 0;
    const activo = m.activo !== false;

    return {
      ...m,
      activo,
      totalVentas,
      tieneVentas,
      sePuedeEliminar: !m.esBase && !tieneVentas
    };
  });

  const handleAgregarMetodoPago = async (nuevoMetodo) => {
    if (!esAdmin) {
      throw new Error('Acceso restringido: Solo los administradores pueden agregar métodos de pago.');
    }
    const nombreLimpio = (nuevoMetodo.nombre || '').trim();
    if (!nombreLimpio) return null;

    const existente = metodosPago.find(
      (m) => m.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (existente) {
      if (!existente.activo) {
        throw new Error(`El método "${existente.nombre}" ya existe en la base de datos y está inhabilitado. Puedes habilitarlo nuevamente en la sección de métodos inactivos.`);
      }
      throw new Error(`El método de pago "${existente.nombre}" ya está registrado.`);
    }

    try {
      const res = await apiCrearMetodoPago({
        nombre: nombreLimpio,
        etiqueta: (nuevoMetodo.etiqueta || nombreLimpio).trim(),
        icono: nuevoMetodo.icono || '💸',
        requiereReferencia: nuevoMetodo.requiereReferencia !== undefined ? Boolean(nuevoMetodo.requiereReferencia) : true
      });
      if (res?.ok && res.metodoPago) {
        const actualizados = [...metodosPagoRaw, res.metodoPago];
        setMetodosPago(actualizados);
        localStorage.setItem('biblioteca_metodos_pago', JSON.stringify(actualizados));
        return res.metodoPago;
      }
    } catch (err) {
      // Si el error viene de validación del servidor, propagarlo
      if (err.message && (err.message.includes('existe') || err.message.includes('restringido') || err.message.includes('obligatorio'))) {
        throw err;
      }
      console.warn('Guardando método en caché local:', err.message);
    }

    const itemCreado = {
      id: Date.now(),
      nombre: nombreLimpio,
      etiqueta: (nuevoMetodo.etiqueta || nombreLimpio).trim(),
      icono: nuevoMetodo.icono || '💸',
      requiereReferencia: nuevoMetodo.requiereReferencia !== undefined ? Boolean(nuevoMetodo.requiereReferencia) : true,
      esBase: false,
      activo: true,
      totalVentas: 0,
      tieneVentas: false,
      sePuedeEliminar: true
    };

    const actualizados = [...metodosPagoRaw, itemCreado];
    setMetodosPago(actualizados);
    localStorage.setItem('biblioteca_metodos_pago', JSON.stringify(actualizados));
    return itemCreado;
  };

  const handleToggleEstadoMetodoPago = async (idMetodo) => {
    if (!esAdmin) {
      throw new Error('Solo los administradores pueden habilitar o inhabilitar métodos de pago.');
    }

    const objetivo = metodosPago.find((m) => String(m.id) === String(idMetodo));
    if (!objetivo) return null;

    try {
      if (typeof objetivo.id === 'number') {
        const res = await apiToggleEstadoMetodoPago(objetivo.id);
        if (res?.ok && res.metodoPago) {
          const actualizados = metodosPagoRaw.map((m) =>
            String(m.id) === String(idMetodo) ? res.metodoPago : m
          );
          setMetodosPago(actualizados);
          localStorage.setItem('biblioteca_metodos_pago', JSON.stringify(actualizados));
          return res.metodoPago;
        }
      }
    } catch (err) {
      console.warn('Actualizando estado de método de pago localmente:', err.message);
    }

    const actualizados = metodosPagoRaw.map((m) =>
      String(m.id) === String(idMetodo) ? { ...m, activo: m.activo === false ? true : false } : m
    );
    setMetodosPago(actualizados);
    localStorage.setItem('biblioteca_metodos_pago', JSON.stringify(actualizados));
    return actualizados.find((m) => String(m.id) === String(idMetodo));
  };

  const handleEliminarMetodoPago = async (idMetodo) => {
    if (!esAdmin) {
      throw new Error('Solo los administradores pueden eliminar métodos de pago.');
    }

    const objetivo = metodosPago.find((m) => String(m.id) === String(idMetodo));
    if (!objetivo) return false;

    if (objetivo.esBase) {
      throw new Error(`El método "${objetivo.nombre}" es base del sistema y no se puede eliminar.`);
    }

    if (objetivo.tieneVentas) {
      throw new Error(
        `No se puede eliminar "${objetivo.nombre}" porque ya registra ${objetivo.totalVentas} venta(s) en la base de datos. Solo puedes inhabilitarlo para ocultarlo de nuevas ventas.`
      );
    }

    try {
      if (typeof objetivo.id === 'number') {
        await apiEliminarMetodoPago(objetivo.id);
      }
    } catch (err) {
      if (err.message && err.message.includes('No se puede eliminar')) {
        throw err;
      }
      console.warn('Eliminando método sin ventas en caché local:', err.message);
    }

    const actualizados = metodosPagoRaw.filter((m) => String(m.id) !== String(idMetodo));
    setMetodosPago(actualizados);
    localStorage.setItem('biblioteca_metodos_pago', JSON.stringify(actualizados));
    return true;
  };

  // Función global para abrir un reporte con rango de fechas opcional o libre (Exclusivo Administradores)
  const handleAbrirReporte = (tipo, opciones = {}) => {
    if (!esAdmin) return;
    setReporteActivo(tipo);
    setRangoReporteActivo({
      fechaInicio: opciones.fechaInicio !== undefined ? opciones.fechaInicio : '',
      fechaFin: opciones.fechaFin !== undefined ? opciones.fechaFin : '',
      filtroMetodoPago: opciones.filtroMetodoPago || 'todos'
    });
  };

  // Cargar datos sincronizados desde el Backend SQLite
  useEffect(() => {
    let montado = true;

    const fetchDatos = async () => {
      try {
        const [resLibros, resLectores, resDist, resVentas, resEntradas, resBajas, resCats, resMetodos] = await Promise.all([
          apiGetLibros().catch(() => null),
          apiGetLectores().catch(() => null),
          apiGetDistribuidores().catch(() => null),
          apiGetVentas().catch(() => null),
          apiGetHistorialEntradas().catch(() => null),
          apiGetHistorialBajas().catch(() => null),
          apiGetCategorias().catch(() => null),
          apiGetMetodosPago().catch(() => null)
        ]);

        if (montado) {
          if (resLibros?.ok) setLibros(resLibros.libros);
          if (resLectores?.ok) setUsuarios(resLectores.lectores);
          if (resDist?.ok) setDistribuidores(resDist.distribuidores);
          if (resVentas?.ok) setVentas(resVentas.ventas);
          if (resEntradas?.ok) setHistorialEntradas(resEntradas.entradas);
          if (resBajas?.ok) setHistorialAjustes(resBajas.bajas);
          if (resCats?.ok) setCategorias(resCats.categorias);
          if (resMetodos?.ok && Array.isArray(resMetodos.metodosPago) && resMetodos.metodosPago.length > 0) {
            setMetodosPago(resMetodos.metodosPago);
            localStorage.setItem('biblioteca_metodos_pago', JSON.stringify(resMetodos.metodosPago));
          }
        }
      } catch (err) {
        console.warn('Error sincronizando datos con el backend:', err);
      }
    };

    if (usuarioAutenticado && token) {
      fetchDatos();
    }

    return () => {
      montado = false;
    };
  }, [usuarioAutenticado, token]);

  // Manejar Login Exitoso
  const handleLoginExitoso = (usuario, nuevoToken) => {
    setUsuarioAutenticado(usuario);
    setToken(nuevoToken);
    setPaginaActual('metricas');
  };

  // Manejar Cierre de Sesión
  const handleCerrarSesion = async () => {
    await apiLogout();
    setUsuarioAutenticado(null);
    setToken(null);
    setPaginaActual('metricas');
  };

  // Manejar actualización obligatoria de contraseña
  const handlePasswordActualizada = (usuarioActualizado) => {
    setUsuarioAutenticado(usuarioActualizado);
    setPaginaActual('metricas');
  };

  // Si no está autenticado, renderizar la pantalla de Login
  if (!usuarioAutenticado || !token) {
    return <Login onLoginExitoso={handleLoginExitoso} />;
  }

  // Si el usuario debe cambiar su contraseña obligatoriamente por primer inicio
  if (usuarioAutenticado.debeCambiarPassword) {
    return (
      <CambioPasswordObligatorio 
        usuario={usuarioAutenticado} 
        onPasswordActualizada={handlePasswordActualizada}
        onCerrarSesion={handleCerrarSesion}
      />
    );
  }

  const handleVentaProcesada = async (nuevaVenta) => {
    try {
      const res = await apiRegistrarVenta({
        clienteId: nuevaVenta.cliente?.id,
        items: nuevaVenta.items,
        metodoPago: nuevaVenta.metodoPago,
        referenciaPago: nuevaVenta.referenciaPago,
        tasaCambio: nuevaVenta.tasaCambio
      });
      if (res.ok && res.venta) {
        setVentas((prev) => [res.venta, ...prev]);
        const resLibros = await apiGetLibros();
        if (resLibros.ok) setLibros(resLibros.libros);
        return res.venta;
      }
    } catch (err) {
      console.warn('Registro local de venta:', err.message);
    }

    setVentas((prev) => [nuevaVenta, ...prev]);
    setLibros((prevLibros) =>
      prevLibros.map((libro) => {
        const itemComprado = nuevaVenta.items.find((i) => i.id === libro.id);
        if (itemComprado) {
          const nuevoStock = Math.max(0, libro.ejemplares - itemComprado.cantidad);
          return { ...libro, ejemplares: nuevoStock };
        }
        return libro;
      })
    );
    return nuevaVenta;
  };

  // Al registrar un ajuste / baja de inventario: descuenta stock del libro y añade al historial
  const handleAjusteInventario = async (nuevoAjuste) => {
    try {
      const res = await apiRegistrarBaja({
        libroId: nuevoAjuste.libroId,
        cantidadDescontada: nuevoAjuste.cantidadDescontada,
        motivo: nuevoAjuste.motivo,
        observaciones: nuevoAjuste.observaciones
      });
      if (res.ok && res.baja) {
        setHistorialAjustes((prev) => [res.baja, ...prev]);
        const resLibros = await apiGetLibros();
        if (resLibros.ok) setLibros(resLibros.libros);
        return;
      }
    } catch (err) {
      console.warn('Registro local de baja:', err.message);
    }

    setHistorialAjustes((prev) => [nuevoAjuste, ...prev]);
    setLibros((prevLibros) =>
      prevLibros.map((libro) => {
        if (libro.id === nuevoAjuste.libroId) {
          const nuevoStock = Math.max(0, libro.ejemplares - nuevoAjuste.cantidadDescontada);
          return { ...libro, ejemplares: nuevoStock };
        }
        return libro;
      })
    );
  };

  // Al registrar una entrada / reabastecimiento: suma stock al libro y añade al historial de entradas
  const handleRegistrarEntrada = async (nuevaEntrada) => {
    try {
      const res = await apiRegistrarEntrada({
        libroId: nuevaEntrada.libroId,
        distribuidorNombre: nuevaEntrada.distribuidor,
        cantidadIngresada: nuevaEntrada.cantidadIngresada,
        costoUnitario: nuevaEntrada.costoUnitario || 0,
        nroFacturaProveedor: nuevaEntrada.nroFacturaProveedor || `FAC-${Date.now()}`,
        observaciones: nuevaEntrada.observaciones
      });
      if (res.ok && res.entrada) {
        setHistorialEntradas((prev) => [res.entrada, ...prev]);
        const resLibros = await apiGetLibros();
        if (resLibros.ok) setLibros(resLibros.libros);
        return;
      }
    } catch (err) {
      console.warn('Registro local de entrada:', err.message);
    }

    setHistorialEntradas((prev) => [nuevaEntrada, ...prev]);
    setLibros((prevLibros) =>
      prevLibros.map((libro) => {
        if (libro.id === nuevaEntrada.libroId) {
          const nuevoStock = (Number(libro.ejemplares) || 0) + Number(nuevaEntrada.cantidadIngresada);
          return { 
            ...libro, 
            ejemplares: nuevoStock,
            ...(nuevaEntrada.costoUnitario > 0 ? { precioCosto: Number(nuevaEntrada.costoUnitario) } : {})
          };
        }
        return libro;
      })
    );
  };

  // Al crear un nuevo libro con stock inicial: sincroniza la entrada en el historial de inventario
  const handleLibroCreado = async (nuevoLibro, nuevaEntrada) => {
    if (nuevaEntrada) {
      setHistorialEntradas((prev) => [nuevaEntrada, ...prev]);
    } else {
      try {
        const resEntradas = await apiGetHistorialEntradas();
        if (resEntradas?.ok) setHistorialEntradas(resEntradas.entradas);
      } catch (err) {
        console.warn('Error refrescando historial de entradas:', err);
      }
    }
  };

  const renderPagina = () => {
    switch (paginaActual) {
      case 'metricas':
        return (
          <Metricas 
            ventas={ventas} 
            libros={libros} 
            usuarios={usuarios} 
            esAdmin={esAdmin} 
            onAbrirReporte={handleAbrirReporte} 
          />
        );
      case 'nueva-venta':
        return (
          <NuevaVenta 
            libros={libros} 
            usuarios={usuarios} 
            onVentaProcesada={handleVentaProcesada} 
            rolUsuario={rolUsuario}
            esAdmin={esAdmin}
            metodosPago={metodosPago}
            onAgregarMetodoPago={esAdmin ? handleAgregarMetodoPago : undefined}
            onToggleEstadoMetodoPago={esAdmin ? handleToggleEstadoMetodoPago : undefined}
            onEliminarMetodoPago={esAdmin ? handleEliminarMetodoPago : undefined}
          />
        );
      case 'historial-ventas':
        return (
          <HistorialVentas 
            ventas={ventas} 
            onAbrirReporte={handleAbrirReporte} 
            esAdmin={esAdmin}
            metodosPago={metodosPago}
          />
        );
      case 'libros':
        return (
          <Libros 
            libros={libros} 
            setLibros={setLibros} 
            distribuidores={distribuidores} 
            categorias={categorias}
            setCategorias={setCategorias}
            onLibroCreado={handleLibroCreado}
            rolUsuario={rolUsuario}
            esAdmin={esAdmin}
            onAbrirReporte={handleAbrirReporte}
          />
        );
      case 'usuarios':
        return <Usuarios usuarios={usuarios} setUsuarios={setUsuarios} ventas={ventas} />;
      case 'ajustes-inventario':
        if (!esAdmin) {
          return (
            <div className="card-alerta-restringido">
              <h2>🔒 Acceso Restringido</h2>
              <p>El módulo de Control de Inventario solo está disponible para usuarios con rol de Administrador.</p>
            </div>
          );
        }
        return (
          <AjustesInventario 
            libros={libros} 
            historialAjustes={historialAjustes} 
            historialEntradas={historialEntradas}
            onRegistrarAjuste={handleAjusteInventario} 
            onRegistrarEntrada={handleRegistrarEntrada}
            distribuidores={distribuidores}
            rolUsuario={rolUsuario}
            onAbrirReporte={handleAbrirReporte}
          />
        );
      case 'distribuidores':
        if (!esAdmin) {
          return (
            <div className="card-alerta-restringido">
              <h2>🔒 Acceso Restringido</h2>
              <p>El módulo de Distribuidores y Proveedores solo está disponible para Administradores.</p>
            </div>
          );
        }
        return (
          <Distribuidores 
            distribuidores={distribuidores} 
            setDistribuidores={setDistribuidores} 
            libros={libros}
            rolUsuario={rolUsuario}
            onAbrirReporte={handleAbrirReporte}
          />
        );
      case 'gestion-personal':
        if (!esAdmin) {
          return (
            <div className="card-alerta-restringido">
              <h2>🔒 Acceso Restringido</h2>
              <p>La Gestión de Personal y Trabajadores es un módulo exclusivo de Administradores.</p>
            </div>
          );
        }
        return (
          <GestionPersonal 
            onAbrirReporte={handleAbrirReporte} 
          />
        );
      case 'bitacora':
        if (!esAdmin) {
          return (
            <div className="card-alerta-restringido">
              <h2>🔒 Acceso Restringido</h2>
              <p>La Bitácora del Sistema y Control de Conexiones es un módulo exclusivo de Administradores.</p>
            </div>
          );
        }
        return (
          <Bitacora 
            esAdmin={esAdmin} 
            onAbrirReporte={handleAbrirReporte} 
          />
        );
      case 'centro-reportes':
        if (!esAdmin) {
          return (
            <div className="card-alerta-restringido">
              <h2>🔒 Acceso Restringido</h2>
              <p>El Centro de Reportes y Documentos Oficiales es un módulo exclusivo de Administradores.</p>
            </div>
          );
        }
        return (
          <CentroReportes 
            esAdmin={esAdmin} 
            onAbrirReporte={handleAbrirReporte} 
            metodosPago={metodosPago}
          />
        );
      default:
        return <Metricas ventas={ventas} libros={libros} usuarios={usuarios} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar con el usuario autenticado, rol y botón de Cerrar Sesión */}
      <Sidebar 
        paginaActual={paginaActual} 
        setPaginaActual={setPaginaActual} 
        rolUsuario={rolUsuario}
        usuario={usuarioAutenticado}
        onCerrarSesion={handleCerrarSesion}
        sidebarAbierto={sidebarAbierto}
        setSidebarAbierto={setSidebarAbierto}
      />
      
      <main className="main-content">
        {/* Barra superior visible en móviles para abrir el menú */}
        <div className="mobile-topbar">
          <button 
            type="button" 
            className="btn-menu-toggle" 
            onClick={() => setSidebarAbierto(true)}
            aria-label="Abrir menú de navegación"
          >
            ☰
          </button>
          <div className="mobile-topbar-brand">
            <span className="mobile-title">Librería Minerva</span>
            <span className="mobile-role-tag">{esAdmin ? 'Admin' : 'Personal'}</span>
          </div>
        </div>

        {/* Barra informativa de usuario y rol conectado */}
        <div className="user-session-bar">
          <div className="user-session-info">
            <span className="user-avatar-badge">{esAdmin ? '👑' : '👤'}</span>
            <div>
              <strong>{usuarioAutenticado.nombre}</strong> ({usuarioAutenticado.email}) &bull;{' '}
              <span className={`user-role-pill ${esAdmin ? 'role-admin' : 'role-staff'}`}>
                {esAdmin ? 'Administrador' : 'Personal / Recepción'}
              </span>
            </div>
          </div>
        </div>

        {renderPagina()}

        {/* Modal Dinámico de Emisión de Reportes PDF Minerva (Exclusivo Administradores) */}
        {reporteActivo && esAdmin && (
          <ModalReporte
            tipoReporte={reporteActivo}
            onClose={() => setReporteActivo(null)}
            usuarioActual={usuarioAutenticado}
            ventas={ventas}
            libros={libros}
            distribuidores={distribuidores}
            historialEntradas={historialEntradas}
            historialAjustes={historialAjustes}
            fechaInicioProp={rangoReporteActivo.fechaInicio}
            fechaFinProp={rangoReporteActivo.fechaFin}
            filtroMetodoPagoProp={rangoReporteActivo.filtroMetodoPago}
            metodosPago={metodosPago}
          />
        )}
      </main>
    </div>
  );
}

export default App;