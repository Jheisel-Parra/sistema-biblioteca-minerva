import { useState } from 'react';
import './NuevaVenta.css';
import ModalFactura from '../../components/ModalFactura/ModalFactura';
import { apiConsultarTasaBCV } from '../../services/api';
import { capitalizarPalabras } from '../../utils/formatoTexto';

function crearObjetoVenta({ clienteData, carrito, metodoPago, referenciaPago, subtotalBase, montoIva, totalPagar, totalArticulos, rolUsuario, tasaCambio }) {
  const timestamp = Date.now();
  const fechaActual = new Date(timestamp);
  const fechaFormateada = fechaActual.toISOString().split('T')[0];
  const horaFormateada = fechaActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const nroFactura = `FAC-${randomSuffix}`;
  const tasa = Number(tasaCambio) || 36.50;
  const sub = Number(subtotalBase) || 0;
  const iva = Number(montoIva) !== undefined ? Number(montoIva) : parseFloat((sub * 0.16).toFixed(2));
  const tot = Number(totalPagar) || parseFloat((sub + iva).toFixed(2));
  const totalBs = parseFloat((tot * tasa).toFixed(2));

  return {
    id: timestamp,
    nroFactura: nroFactura,
    fecha: fechaFormateada,
    hora: horaFormateada,
    cliente: clienteData,
    items: carrito,
    metodoPago: metodoPago,
    referenciaPago: referenciaPago,
    subtotal: sub,
    porcentajeIva: 16,
    montoIva: iva,
    total: tot,
    tasaCambio: tasa,
    subtotalBs: parseFloat((sub * tasa).toFixed(2)),
    montoIvaBs: parseFloat((iva * tasa).toFixed(2)),
    totalBs: totalBs,
    totalArticulos: totalArticulos,
    atendidoPor: rolUsuario === 'admin' ? 'Administrador' : 'Recepción'
  };
}

const METODOS_PAGO_DEFAULT = [
  { id: 'punto-venta', nombre: 'Punto de Venta', etiqueta: 'Punto de Venta', icono: '💳', requiereReferencia: true, esBase: true },
  { id: 'pago-movil', nombre: 'Pago Móvil', etiqueta: 'Pago Móvil', icono: '📱', requiereReferencia: true, esBase: true },
  { id: 'transferencia', nombre: 'Transferencia Bancaria', etiqueta: 'Transferencia', icono: '🏦', requiereReferencia: true, esBase: true },
  { id: 'efectivo', nombre: 'Efectivo', etiqueta: 'Efectivo ($ / Bs)', icono: '💵', requiereReferencia: false, esBase: true }
];

const ICONOS_METODO_SUGERIDOS = ['💸', '🪙', '💳', '📱', '🏦', '💵', '🌐'];

export default function NuevaVenta({
  libros = [],
  usuarios = [],
  onVentaProcesada,
  rolUsuario = 'staff',
  esAdmin: propEsAdmin,
  metodosPago: propMetodosPago,
  onAgregarMetodoPago,
  onToggleEstadoMetodoPago,
  onEliminarMetodoPago
}) {
  const esAdmin = propEsAdmin !== undefined ? propEsAdmin : rolUsuario === 'admin';
  const todosLosMetodos = propMetodosPago && propMetodosPago.length > 0 ? propMetodosPago : METODOS_PAGO_DEFAULT;
  const metodosDisponibles = todosLosMetodos.filter((m) => m.activo !== false);
  const metodosInhabilitados = todosLosMetodos.filter((m) => m.activo === false);
  // Modo de cliente: 'registrado' o 'general'
  const [tipoCliente, setTipoCliente] = useState('registrado');
  
  // Búsqueda y selección de Lector
  const [busquedaLector, setBusquedaLector] = useState('');
  const [mostrarDropdownLector, setMostrarDropdownLector] = useState(false);
  const [lectorSeleccionado, setLectorSeleccionado] = useState(null);

  // Cliente general manual (inicia vacío con placeholders)
  const [tipoCedulaGeneral, setTipoCedulaGeneral] = useState('V'); // 'V' | 'E'
  const [clienteGeneral, setClienteGeneral] = useState({
    nombre: '',
    cedula: '',
    correo: ''
  });

  // Búsqueda y selección de Libro
  const [busquedaLibro, setBusquedaLibro] = useState('');
  const [mostrarDropdownLibro, setMostrarDropdownLibro] = useState(false);
  const [libroSeleccionado, setLibroSeleccionado] = useState(null);
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1);

  // Tasa de cambio oficial / del día (persistente en localStorage para soporte offline)
  const [tasaDelDia, setTasaDelDia] = useState(() => {
    const saved = localStorage.getItem('biblioteca_tasa_bcv');
    return saved ? parseFloat(saved) : 36.50;
  });
  const [consultandoTasa, setConsultandoTasa] = useState(false);

  const handleSincronizarTasaBCV = async () => {
    try {
      setConsultandoTasa(true);
      setErrorMensaje('');
      const res = await apiConsultarTasaBCV();
      if (res.ok && res.tasa) {
        setTasaDelDia(res.tasa);
        localStorage.setItem('biblioteca_tasa_bcv', res.tasa.toString());
      }
    } catch (err) {
      setErrorMensaje(err.message || 'No fue posible sincronizar la tasa en línea. Puedes ingresarla manualmente.');
    } finally {
      setConsultandoTasa(false);
    }
  };

  // Carrito de compras / orden
  const [carrito, setCarrito] = useState([]);

  // Método de pago
  const [metodoPago, setMetodoPago] = useState('Punto de Venta'); // 'Efectivo', 'Pago Móvil', 'Punto de Venta', 'Zelle', etc.
  const [referenciaPago, setReferenciaPago] = useState('');

  // Estado para agregar nuevo método de pago (ej. Zelle, Binance, etc.)
  const [mostrarFormMetodo, setMostrarFormMetodo] = useState(false);
  const [nuevoMetodoNombre, setNuevoMetodoNombre] = useState('');
  const [nuevoMetodoIcono, setNuevoMetodoIcono] = useState('💸');
  const [nuevoMetodoRequiereRef, setNuevoMetodoRequiereRef] = useState(true);
  const [errorMetodo, setErrorMetodo] = useState('');

  const metodoSeleccionadoObj = metodosDisponibles.find((m) => m.nombre === metodoPago);
  const mostrarCampoReferencia = metodoSeleccionadoObj ? metodoSeleccionadoObj.requiereReferencia : metodoPago !== 'Efectivo';

  const handleCrearNuevoMetodo = async (e) => {
    e.preventDefault();
    setErrorMetodo('');
    if (!esAdmin) {
      setErrorMetodo('Solo los administradores pueden agregar métodos de pago.');
      return;
    }
    const nombreLimpio = nuevoMetodoNombre.trim();
    if (!nombreLimpio) {
      setErrorMetodo('Ingresa el nombre del método de pago.');
      return;
    }

    try {
      if (onAgregarMetodoPago) {
        const creado = await onAgregarMetodoPago({
          nombre: nombreLimpio,
          etiqueta: nombreLimpio,
          icono: nuevoMetodoIcono,
          requiereReferencia: nuevoMetodoRequiereRef
        });
        if (creado) {
          setMetodoPago(creado.nombre);
        }
      }
      setNuevoMetodoNombre('');
      setNuevoMetodoIcono('💸');
      setNuevoMetodoRequiereRef(true);
      setMostrarFormMetodo(false);
    } catch (err) {
      setErrorMetodo(err.message || 'No se pudo agregar el método de pago.');
    }
  };

  const handleQuitarOInhabilitarMetodo = async (e, m) => {
    e.stopPropagation();
    setErrorMensaje('');
    if (!esAdmin) return;

    try {
      // Si el método ya tuvo ventas, NO se puede eliminar de la BD: solo se inhabilita
      if (m.tieneVentas) {
        if (onToggleEstadoMetodoPago) {
          if (metodoPago === m.nombre) {
            const otroActivo = metodosDisponibles.find((item) => item.nombre !== m.nombre);
            setMetodoPago(otroActivo ? otroActivo.nombre : 'Punto de Venta');
          }
          await onToggleEstadoMetodoPago(m.id);
        }
        return;
      }

      // Si NO ha tenido ventas, sí se puede eliminar de la base de datos
      if (onEliminarMetodoPago) {
        if (metodoPago === m.nombre) {
          const otroActivo = metodosDisponibles.find((item) => item.nombre !== m.nombre);
          setMetodoPago(otroActivo ? otroActivo.nombre : 'Punto de Venta');
        }
        await onEliminarMetodoPago(m.id);
      }
    } catch (err) {
      setErrorMensaje(err.message || 'No se pudo modificar el método de pago.');
    }
  };

  const handleReactivarMetodo = async (m) => {
    setErrorMensaje('');
    if (!esAdmin || !onToggleEstadoMetodoPago) return;
    try {
      await onToggleEstadoMetodoPago(m.id);
      setMetodoPago(m.nombre);
    } catch (err) {
      setErrorMensaje(err.message || 'No se pudo habilitar el método de pago.');
    }
  };

  // Factura generada y modal
  const [ventaGenerada, setVentaGenerada] = useState(null);
  const [mostrarModalFactura, setMostrarModalFactura] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState('');

  // Filtrado en vivo de Lectores (por nombre, cédula o correo)
  const lectoresFiltrados = usuarios.filter((u) => {
    if (!busquedaLector.trim()) return true;
    const query = busquedaLector.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(query) ||
      u.cedula.toLowerCase().includes(query) ||
      (u.correo && u.correo.toLowerCase().includes(query))
    );
  });

  // Filtrado en vivo de Libros Disponibles (por título, autor o ISBN)
  const librosDisponibles = libros.filter((l) => l.ejemplares > 0);
  const librosFiltrados = librosDisponibles.filter((l) => {
    if (!busquedaLibro.trim()) return true;
    const query = busquedaLibro.toLowerCase();
    return (
      l.titulo.toLowerCase().includes(query) ||
      l.autor.toLowerCase().includes(query) ||
      (l.isbn && l.isbn.toLowerCase().includes(query))
    );
  });

  // Manejar selección de lector desde el autocomplete
  const handleSeleccionarLector = (lector) => {
    setLectorSeleccionado(lector);
    setMostrarDropdownLector(false);
    setBusquedaLector('');
    setErrorMensaje('');
  };

  // Manejar selección de libro desde el autocomplete
  const handleSeleccionarLibro = (libro) => {
    setLibroSeleccionado(libro);
    setCantidadSeleccionada(1);
    setMostrarDropdownLibro(false);
    setBusquedaLibro('');
    setErrorMensaje('');
  };

  // Manejar adición de libro al carrito
  const handleAgregarAlCarrito = () => {
    if (!libroSeleccionado) return;
    setErrorMensaje('');

    const cantidad = Number(cantidadSeleccionada);
    if (cantidad <= 0) return;

    // Verificar si ya está en el carrito
    const itemExistente = carrito.find((item) => item.id === libroSeleccionado.id);
    const cantidadEnCarrito = itemExistente ? itemExistente.cantidad : 0;

    if (cantidadEnCarrito + cantidad > libroSeleccionado.ejemplares) {
      setErrorMensaje(`No hay suficiente stock. Disponible: ${libroSeleccionado.ejemplares} (Ya tienes ${cantidadEnCarrito} en la orden).`);
      return;
    }

    if (itemExistente) {
      setCarrito(
        carrito.map((item) =>
          item.id === libroSeleccionado.id
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        )
      );
    } else {
      setCarrito([
        ...carrito,
        {
          id: libroSeleccionado.id,
          titulo: libroSeleccionado.titulo,
          autor: libroSeleccionado.autor,
          portada: libroSeleccionado.portada,
          precio: Number(libroSeleccionado.precio || 0),
          cantidad: cantidad,
          stockMax: libroSeleccionado.ejemplares
        }
      ]);
    }

    // Reset selección para que el usuario pueda buscar el siguiente libro rápidamente
    setLibroSeleccionado(null);
    setCantidadSeleccionada(1);
    setBusquedaLibro('');
  };

  // Modificar cantidad en carrito
  const handleCambiarCantidad = (id, delta) => {
    setCarrito(
      carrito
        .map((item) => {
          if (item.id === id) {
            const nuevaCantidad = item.cantidad + delta;
            if (nuevaCantidad > item.stockMax) {
              setErrorMensaje(`Stock máximo alcanzado para "${item.titulo}" (${item.stockMax} disponibles).`);
              return item;
            }
            if (nuevaCantidad <= 0) return null;
            return { ...item, cantidad: nuevaCantidad };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Eliminar item del carrito
  const handleEliminarItem = (id) => {
    setCarrito(carrito.filter((item) => item.id !== id));
  };

  // Cálculo de totales con IVA (16% Venezuela)
  const totalArticulos = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  const subtotalBase = parseFloat(
    carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0).toFixed(2)
  );
  const montoIva = parseFloat((subtotalBase * 0.16).toFixed(2));
  const totalPagar = parseFloat((subtotalBase + montoIva).toFixed(2));

  // Procesar venta
  const handleProcesarVenta = async (e) => {
    e.preventDefault();
    if (carrito.length === 0) {
      setErrorMensaje('Agrega al menos un libro para procesar la venta.');
      return;
    }

    // Determinar datos del lector
    let clienteData;
    if (tipoCliente === 'registrado') {
      if (!lectorSeleccionado) {
        setErrorMensaje('Por favor busca y selecciona un lector registrado o cambia a Lector General / Mostrador.');
        return;
      }
      clienteData = {
        id: lectorSeleccionado.id,
        nombre: lectorSeleccionado.nombre,
        cedula: lectorSeleccionado.cedula,
        correo: lectorSeleccionado.correo
      };
    } else {
      const digitosCedula = (clienteGeneral.cedula || '').replace(/\D/g, '');
      clienteData = {
        nombre: (clienteGeneral.nombre && clienteGeneral.nombre.trim()) || 'Lector Mostrador',
        cedula: digitosCedula ? `${tipoCedulaGeneral}-${digitosCedula}` : `${tipoCedulaGeneral}-00000000`,
        correo: (clienteGeneral.correo && clienteGeneral.correo.trim()) || ''
      };
    }

    const nuevaVenta = crearObjetoVenta({
      clienteData,
      carrito,
      metodoPago,
      referenciaPago,
      subtotalBase,
      montoIva,
      totalPagar,
      totalArticulos,
      rolUsuario,
      tasaCambio: tasaDelDia
    });

    let ventaFinal = nuevaVenta;
    if (onVentaProcesada) {
      const resVenta = await onVentaProcesada(nuevaVenta);
      if (resVenta) ventaFinal = resVenta;
    }

    // Guardar para modal y abrir recibo
    setVentaGenerada(ventaFinal);
    setMostrarModalFactura(true);

    // Resetear orden
    setCarrito([]);
    setLectorSeleccionado(null);
    setLibroSeleccionado(null);
    setClienteGeneral({ nombre: '', cedula: '', correo: '' });
    setReferenciaPago('');
    setErrorMensaje('');
  };

  return (
    <div className="page-container nueva-venta-container">
      {/* Encabezado con Widget de Tasa del Día */}
      <div className="page-header pos-header-flex">
        <div>
          <h2>🛒 Venta de Libros</h2>
          <p>Punto de venta directo con conversión automática a Bolívares (Bs.).</p>
        </div>

        {/* Widget de Tasa del Día en POS */}
        <div className="tasa-cambio-widget">
          <div className="tasa-display-box">
            <span className="tasa-label">💵 Tasa Oficial BCV:</span>
            <strong className="tasa-valor">Bs. {tasaDelDia.toFixed(2)} / $</strong>
            <button 
              type="button" 
              className="btn-sincronizar-tasa" 
              onClick={handleSincronizarTasaBCV}
              disabled={consultandoTasa}
              title="Consultar y sincronizar tasa oficial en vivo desde la API de BCV (requiere internet)"
            >
              {consultandoTasa ? '⏳ Sincronizando...' : '🔄 Sincronizar BCV'}
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Error si la hay */}
      {errorMensaje && (
        <div className="alert-warning-venta">
          <span>⚠️ {errorMensaje}</span>
          <button onClick={() => setErrorMensaje('')}>✕</button>
        </div>
      )}

      <div className="pos-layout-grid">
        {/* COLUMNA IZQUIERDA: CONFIGURACIÓN DE VENTA & SELECCIÓN */}
        <div className="pos-left-column">
          
          {/* PASO 1: VINCULAR LECTOR (CON BUSCADOR AUTOCOMPLETE) */}
          <div className="pos-card">
            <div className="pos-card-header">
              <span className="step-badge">1</span>
              <h3>Vincular Lector</h3>
            </div>

            <div className="tipo-cliente-selector">
              <button
                type="button"
                className={`btn-toggle-cliente ${tipoCliente === 'registrado' ? 'active' : ''}`}
                onClick={() => {
                  setTipoCliente('registrado');
                  setErrorMensaje('');
                }}
              >
                👥 Lector Registrado
              </button>
              <button
                type="button"
                className={`btn-toggle-cliente ${tipoCliente === 'general' ? 'active' : ''}`}
                onClick={() => {
                  setTipoCliente('general');
                  setErrorMensaje('');
                }}
              >
                👤 Lector General / Mostrador
              </button>
            </div>

            {tipoCliente === 'registrado' ? (
              <div className="autocomplete-wrapper" style={{ marginTop: '0.875rem' }}>
                {!lectorSeleccionado ? (
                  <div className="search-input-container">
                    <label className="form-label">Buscar lector por nombre, cédula o correo:</label>
                    <div className="search-input-field-box">
                      <input
                        type="text"
                        className="form-input search-autocomplete-input"
                        placeholder="Buscar lector..."
                        value={busquedaLector}
                        onChange={(e) => {
                          setBusquedaLector(e.target.value);
                          setMostrarDropdownLector(true);
                        }}
                        onFocus={() => setMostrarDropdownLector(true)}
                      />
                      {busquedaLector && (
                        <button
                          type="button"
                          className="btn-clear-search"
                          onClick={() => setBusquedaLector('')}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Menú flotante de resultados de lectores */}
                    {mostrarDropdownLector && (
                      <div className="autocomplete-dropdown">
                        {lectoresFiltrados.length > 0 ? (
                          lectoresFiltrados.slice(0, 10).map((lector) => (
                            <div
                              key={lector.id}
                              className="autocomplete-item"
                              onClick={() => handleSeleccionarLector(lector)}
                            >
                              <div className="item-main-info">
                                <span className="item-title">{lector.nombre}</span>
                                <span className="item-sub">Cédula: {lector.cedula}</span>
                              </div>
                              {lector.correo && (
                                <span className="item-tag">{lector.correo}</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="autocomplete-empty">
                            No se encontró ningún lector con "{busquedaLector}".
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Tarjeta de Lector Seleccionado */
                  <div className="item-seleccionado-card">
                    <div className="seleccionado-icon">👤</div>
                    <div className="seleccionado-info">
                      <div className="seleccionado-title">{lectorSeleccionado.nombre}</div>
                      <div className="seleccionado-detail">
                        <span>Cédula: <strong>{lectorSeleccionado.cedula}</strong></span>
                        {lectorSeleccionado.correo && <span> • {lectorSeleccionado.correo}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary btn-cambiar"
                      onClick={() => setLectorSeleccionado(null)}
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="cliente-general-grid">
                <div className="form-field">
                  <label className="form-label">Nombre del Lector:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nombre"
                    value={clienteGeneral.nombre}
                    onChange={(e) => setClienteGeneral({ ...clienteGeneral, nombre: capitalizarPalabras(e.target.value.replace(/\d/g, ''), true) })}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Cédula / Documento (Clic en {tipoCedulaGeneral}- para V/E):</label>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'stretch' }}>
                    <button
                      type="button"
                      onClick={() => setTipoCedulaGeneral((prev) => (prev === 'V' ? 'E' : 'V'))}
                      title={tipoCedulaGeneral === 'V' ? 'Venezolano (Clic para cambiar a Extranjero E-)' : 'Extranjero (Clic para cambiar a Venezolano V-)'}
                      style={{
                        minWidth: '52px',
                        padding: '0 0.65rem',
                        borderRadius: '8px',
                        border: tipoCedulaGeneral === 'V' ? '1.5px solid #2563eb' : '1.5px solid #d97706',
                        backgroundColor: tipoCedulaGeneral === 'V' ? '#eff6ff' : '#fffbeb',
                        color: tipoCedulaGeneral === 'V' ? '#1d4ed8' : '#b45309',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {tipoCedulaGeneral}-
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-input"
                      placeholder="Ej: 26890123"
                      value={clienteGeneral.cedula}
                      onChange={(e) => setClienteGeneral({ ...clienteGeneral, cedula: e.target.value.replace(/\D/g, '') })}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PASO 2: AGREGAR LIBROS AL CARRITO (CON BUSCADOR AUTOCOMPLETE) */}
          <div className="pos-card">
            <div className="pos-card-header">
              <span className="step-badge">2</span>
              <h3>Selección y Búsqueda de Libros</h3>
            </div>

            {/* Buscador de libros si no hay uno seleccionado */}
            {!libroSeleccionado ? (
              <div className="search-input-container">
                <label className="form-label">Buscar libro por título, autor o ISBN:</label>
                <div className="search-input-field-box">
                  <input
                    type="text"
                    className="form-input search-autocomplete-input"
                    placeholder="Buscar libro..."
                    value={busquedaLibro}
                    onChange={(e) => {
                      setBusquedaLibro(e.target.value);
                      setMostrarDropdownLibro(true);
                    }}
                    onFocus={() => setMostrarDropdownLibro(true)}
                  />
                  {busquedaLibro && (
                    <button
                      type="button"
                      className="btn-clear-search"
                      onClick={() => setBusquedaLibro('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Menú flotante de resultados de libros */}
                {mostrarDropdownLibro && (
                  <div className="autocomplete-dropdown">
                    {librosFiltrados.length > 0 ? (
                      librosFiltrados.slice(0, 10).map((libro) => (
                        <div
                          key={libro.id}
                          className="autocomplete-item libro-item"
                          onClick={() => handleSeleccionarLibro(libro)}
                        >
                          {libro.portada ? (
                            <img src={libro.portada} alt={libro.titulo} className="libro-dropdown-thumb" />
                          ) : (
                            <div className="libro-dropdown-placeholder">📖</div>
                          )}
                          <div className="item-main-info" style={{ flex: 1 }}>
                            <span className="item-title">{libro.titulo}</span>
                            <span className="item-sub">{libro.autor} • {libro.categoria}</span>
                          </div>
                          <div className="item-price-stock">
                            <span className="item-price">${Number(libro.precio).toFixed(2)}</span>
                            <span className="item-stock">{libro.ejemplares} disponibles</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="autocomplete-empty">
                        No se encontraron libros disponibles con "{busquedaLibro}".
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Tarjeta de Libro Seleccionado listo para añadir */
              <div className="libro-seleccionado-box">
                <div className="libro-seleccionado-info">
                  {libroSeleccionado.portada ? (
                    <img src={libroSeleccionado.portada} alt={libroSeleccionado.titulo} className="libro-selected-thumb" />
                  ) : (
                    <div className="libro-dropdown-placeholder">📖</div>
                  )}
                  <div>
                    <div className="seleccionado-title">{libroSeleccionado.titulo}</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{libroSeleccionado.autor}</div>
                    <div className="libro-meta-tags">
                      <span className="badge-precio">${Number(libroSeleccionado.precio).toFixed(2)}</span>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>Stock: {libroSeleccionado.ejemplares} uds.</span>
                    </div>
                  </div>
                </div>

                <div className="libro-seleccionado-actions">
                  <div className="qty-picker">
                    <label className="form-label" style={{ margin: 0 }}>Cant:</label>
                    <div className="qty-controls">
                      <button
                        type="button"
                        className="btn-qty"
                        onClick={() => setCantidadSeleccionada(Math.max(1, cantidadSeleccionada - 1))}
                        disabled={cantidadSeleccionada <= 1}
                      >
                        -
                      </button>
                      <span className="qty-number">{cantidadSeleccionada}</span>
                      <button
                        type="button"
                        className="btn-qty"
                        onClick={() => setCantidadSeleccionada(Math.min(libroSeleccionado.ejemplares, cantidadSeleccionada + 1))}
                        disabled={cantidadSeleccionada >= libroSeleccionado.ejemplares}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary btn-add-cart"
                    onClick={handleAgregarAlCarrito}
                  >
                    + Añadir a la Orden
                  </button>

                  <button
                    type="button"
                    className="btn-secondary btn-cambiar"
                    onClick={() => setLibroSeleccionado(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* TABLA DE DETALLE DE LA ORDEN / CARRITO */}
            <div className="carrito-table-wrapper" style={{ marginTop: '1.25rem' }}>
              <table className="data-table carrito-table">
                <thead>
                  <tr>
                    <th>Libro</th>
                    <th style={{ textAlign: 'center' }}>Precio ($)</th>
                    <th style={{ textAlign: 'center' }}>Cantidad</th>
                    <th style={{ textAlign: 'right' }}>Subtotal ($)</th>
                    <th style={{ textAlign: 'center', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {carrito.length > 0 ? (
                    carrito.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            {item.portada ? (
                              <img src={item.portada} alt={item.titulo} className="libro-cart-thumb" />
                            ) : (
                              <div className="libro-cart-placeholder">📖</div>
                            )}
                            <div>
                              <div className="text-bold">{item.titulo}</div>
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>{item.autor}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          ${Number(item.precio).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="qty-controls">
                            <button
                              type="button"
                              className="btn-qty"
                              onClick={() => handleCambiarCantidad(item.id, -1)}
                            >
                              -
                            </button>
                            <span className="qty-number">{item.cantidad}</span>
                            <button
                              type="button"
                              className="btn-qty"
                              onClick={() => handleCambiarCantidad(item.id, 1)}
                              disabled={item.cantidad >= item.stockMax}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }} className="text-bold">
                          ${(item.precio * item.cantidad).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-remove-item"
                            onClick={() => handleEliminarItem(item.id)}
                            title="Eliminar de la orden"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="table-empty" style={{ padding: '2rem 1rem' }}>
                        No has añadido ningún libro a la orden todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: MÉTODO DE PAGO Y RESUMEN TOTAL */}
        <div className="pos-right-column">
          <div className="pos-card resumen-pago-card">
            <div className="pos-card-header">
              <span className="step-badge">3</span>
              <h3>Método de Pago y Facturación</h3>
            </div>

            {/* Selector de Método de Pago */}
            <div className="metodos-pago-header-row">
              <label className="form-label" style={{ margin: 0 }}>Selecciona forma de pago:</label>
              {esAdmin && (
                <button
                  type="button"
                  className="btn-nuevo-metodo-toggle"
                  onClick={() => {
                    setMostrarFormMetodo(!mostrarFormMetodo);
                    setErrorMetodo('');
                  }}
                  title="Agregar un nuevo método de pago (Exclusivo Administradores)"
                >
                  {mostrarFormMetodo ? '✕ Cancelar' : '➕ Agregar Método'}
                </button>
              )}
            </div>

            {/* Formulario desplegable para registrar un nuevo método de pago (Solo Administradores) */}
            {esAdmin && mostrarFormMetodo && (
              <div className="nuevo-metodo-box">
                <div className="nuevo-metodo-title">✨ Nuevo Método de Pago</div>
                {errorMetodo && (
                  <div className="nuevo-metodo-error">⚠️ {errorMetodo}</div>
                )}
                <div className="nuevo-metodo-field">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Nombre del método:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nombre"
                    value={nuevoMetodoNombre}
                    onChange={(e) => setNuevoMetodoNombre(e.target.value)}
                  />
                </div>

                <div className="nuevo-metodo-field">
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Ícono identificador:</label>
                  <div className="iconos-metodo-selector">
                    {ICONOS_METODO_SUGERIDOS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        className={`btn-icono-metodo ${nuevoMetodoIcono === ic ? 'active' : ''}`}
                        onClick={() => setNuevoMetodoIcono(ic)}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="nuevo-metodo-check">
                  <input
                    type="checkbox"
                    checked={nuevoMetodoRequiereRef}
                    onChange={(e) => setNuevoMetodoRequiereRef(e.target.checked)}
                  />
                  <span>Solicitar N° de referencia / comprobante</span>
                </label>

                <div className="nuevo-metodo-actions">
                  <button
                    type="button"
                    className="btn-primary btn-guardar-metodo"
                    onClick={handleCrearNuevoMetodo}
                  >
                    💾 Guardar y Seleccionar
                  </button>
                </div>
              </div>
            )}

            <div className="metodos-pago-grid">
              {metodosDisponibles.map((m) => (
                <div key={m.id || m.nombre} className="metodo-pago-item-wrap">
                  <button
                    type="button"
                    className={`btn-metodo-pago ${metodoPago === m.nombre ? 'active' : ''}`}
                    onClick={() => setMetodoPago(m.nombre)}
                  >
                    <span className="metodo-icon">{m.icono || '💳'}</span>
                    <span className="metodo-nombre">{m.etiqueta || m.nombre}</span>
                  </button>
                  {esAdmin && !m.esBase && (
                    m.tieneVentas ? (
                      <button
                        type="button"
                        className="btn-inhabilitar-metodo"
                        title={`"${m.nombre}" ya tiene ${m.totalVentas} venta(s) y no se puede eliminar. Haz clic para inhabilitarlo y ocultarlo de las opciones disponibles.`}
                        onClick={(e) => handleQuitarOInhabilitarMetodo(e, m)}
                      >
                        Inhabilitar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-eliminar-metodo"
                        title={`Eliminar método "${m.nombre}" (sin ventas registradas)`}
                        onClick={(e) => handleQuitarOInhabilitarMetodo(e, m)}
                      >
                        ✕
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>

            {/* Lista de métodos inhabilitados (Solo visible para Administradores cuando existen métodos ocultos) */}
            {esAdmin && metodosInhabilitados.length > 0 && (
              <div className="metodos-inhabilitados-box">
                <div className="metodos-inhabilitados-header">
                  Métodos inhabilitados (ocultos en ventas, conservados en base de datos por historial):
                </div>
                <div className="metodos-inhabilitados-list">
                  {metodosInhabilitados.map((m) => (
                    <div key={m.id || m.nombre} className="metodo-inhabilitado-pill">
                      <span>
                        {m.icono || '💳'} <strong>{m.nombre}</strong>
                        {m.totalVentas > 0 ? ` (${m.totalVentas} venta${m.totalVentas === 1 ? '' : 's'})` : ''}
                      </span>
                      <button
                        type="button"
                        className="btn-habilitar-metodo"
                        onClick={() => handleReactivarMetodo(m)}
                      >
                        Habilitar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Referencia si el método lo utiliza */}
            {mostrarCampoReferencia && (
              <div className="form-field" style={{ marginTop: '1rem' }}>
                <label className="form-label">Nro. de Referencia / Comprobante ({metodoPago}):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Referencia"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                />
              </div>
            )}

            <div className="resumen-divider"></div>

            {/* Desglose de Totales con IVA (16%) */}
            <div className="totales-breakdown">
              <div className="total-item-row">
                <span>Total de Libros:</span>
                <span className="text-bold">{totalArticulos} unidades</span>
              </div>
              <div className="total-item-row">
                <span>Base Imponible (Subtotal):</span>
                <span>
                  ${subtotalBase.toFixed(2)}{' '}
                  <small style={{ color: '#64748b' }}>
                    (Bs. {(subtotalBase * tasaDelDia).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </small>
                </span>
              </div>
              <div className="total-item-row">
                <span>IVA (16%):</span>
                <span style={{ fontWeight: 700, color: '#1e3a8a' }}>
                  +${montoIva.toFixed(2)}{' '}
                  <small style={{ color: '#64748b', fontWeight: 600 }}>
                    (Bs. {(montoIva * tasaDelDia).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </small>
                </span>
              </div>

              <div className="total-destacado-box">
                <div className="total-destacado-usd">
                  <span className="total-label">TOTAL CON IVA (USD):</span>
                  <span className="total-amount">${totalPagar.toFixed(2)}</span>
                </div>
                <div className="total-destacado-bs">
                  <span className="total-label-bs">TOTAL EN BOLÍVARES:</span>
                  <span className="total-amount-bs">Bs. {(totalPagar * tasaDelDia).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Botón Principal para Procesar */}
            <button
              type="button"
              className="btn-primary btn-procesar-venta"
              onClick={handleProcesarVenta}
              disabled={carrito.length === 0}
            >
              ✅ Procesar Venta y Emitir Recibo
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE FACTURA / RECIBO */}
      {mostrarModalFactura && ventaGenerada && (
        <ModalFactura
          venta={ventaGenerada}
          onClose={() => setMostrarModalFactura(false)}
        />
      )}
    </div>
  );
}
