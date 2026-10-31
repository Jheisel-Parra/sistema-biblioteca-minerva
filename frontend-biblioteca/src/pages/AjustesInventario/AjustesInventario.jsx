import { useState } from 'react';
import './AjustesInventario.css';
import { apiConsultarTasaBCV } from '../../services/api';

function crearRegistroAjusteBaja({ libro, cantidad, motivo, observaciones, rolUsuario }) {
  const timestamp = Date.now();
  const fechaActual = new Date(timestamp);
  const fechaFormateada = fechaActual.toISOString().split('T')[0];
  const horaFormateada = fechaActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    id: timestamp,
    libroId: libro.id,
    libroTitulo: libro.titulo,
    libroAutor: libro.autor,
    libroPortada: libro.portada || '',
    cantidadDescontada: Number(cantidad),
    motivo: motivo,
    observaciones: observaciones.trim() || 'Sin observaciones adicionales.',
    fecha: fechaFormateada,
    hora: horaFormateada,
    responsable: rolUsuario === 'admin' ? 'Administrador' : 'Personal'
  };
}

function crearRegistroEntrada({ libro, cantidad, distribuidor, costoUnitario = 0, nroFacturaProveedor, observaciones, rolUsuario }) {
  const timestamp = Date.now();
  const fechaActual = new Date(timestamp);
  const fechaFormateada = fechaActual.toISOString().split('T')[0];
  const horaFormateada = fechaActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const cant = Number(cantidad);
  const costo = Number(costoUnitario) || 0;

  return {
    id: timestamp,
    libroId: libro.id,
    libroTitulo: libro.titulo,
    libroAutor: libro.autor,
    libroPortada: libro.portada || '',
    distribuidor: distribuidor,
    cantidadIngresada: cant,
    costoUnitario: costo,
    costoTotal: parseFloat((cant * costo).toFixed(2)),
    nroFacturaProveedor: nroFacturaProveedor.trim() || 'S/N',
    observaciones: observaciones.trim() || 'Reabastecimiento de inventario.',
    fecha: fechaFormateada,
    hora: horaFormateada,
    responsable: rolUsuario === 'admin' ? 'Administrador' : 'Personal'
  };
}

export default function AjustesInventario({
  libros = [],
  historialAjustes = [],
  historialEntradas = [],
  onRegistrarAjuste,
  onRegistrarEntrada,
  distribuidores = [],
  rolUsuario = 'admin',
  onAbrirReporte
}) {
  // Tasa de cambio del día (gestión administrativa con persistencia offline)
  const [tasaDelDia, setTasaDelDia] = useState(() => {
    const saved = localStorage.getItem('biblioteca_tasa_bcv');
    return saved ? parseFloat(saved) : 36.50;
  });
  const [editandoTasa, setEditandoTasa] = useState(false);
  const [tempTasa, setTempTasa] = useState(tasaDelDia);
  const [consultandoTasa, setConsultandoTasa] = useState(false);

  const handleGuardarTasa = (e) => {
    e.preventDefault();
    const val = parseFloat(tempTasa);
    if (val > 0) {
      setTasaDelDia(val);
      localStorage.setItem('biblioteca_tasa_bcv', val.toString());
      setEditandoTasa(false);
    }
  };

  const handleSincronizarTasaBCV = async () => {
    try {
      setConsultandoTasa(true);
      const res = await apiConsultarTasaBCV();
      if (res.ok && res.tasa) {
        setTasaDelDia(res.tasa);
        setTempTasa(res.tasa);
        localStorage.setItem('biblioteca_tasa_bcv', res.tasa.toString());
      }
    } catch (err) {
      alert(err.message || 'No se pudo sincronizar la tasa oficial en línea.');
    } finally {
      setConsultandoTasa(false);
    }
  };

  // Pestañas: 'entradas-libros' | 'entradas-historial' | 'bajas-libros' | 'bajas-historial'
  const [pestañaActiva, setPestañaActiva] = useState('entradas-libros');

  // Filtros y búsquedas
  const [busquedaLibroEntrada, setBusquedaLibroEntrada] = useState('');
  const [busquedaHistorialEntrada, setBusquedaHistorialEntrada] = useState('');
  const [filtroDistribuidorEntrada, setFiltroDistribuidorEntrada] = useState('todos');

  const [busquedaLibroBaja, setBusquedaLibroBaja] = useState('');
  const [busquedaHistorialBaja, setBusquedaHistorialBaja] = useState('');
  const [filtroMotivoBaja, setFiltroMotivoBaja] = useState('todos');

  // Modal de Entrada / Reabastecimiento
  const [libroEntradaSeleccionado, setLibroEntradaSeleccionado] = useState(null);
  const [formularioEntrada, setFormularioEntrada] = useState({
    cantidad: 1,
    costoUnitario: '',
    distribuidor: '',
    nroFacturaProveedor: '',
    observaciones: ''
  });

  // Modal de Baja / Merma
  const [libroBajaSeleccionado, setLibroBajaSeleccionado] = useState(null);
  const [formularioBaja, setFormularioBaja] = useState({
    cantidad: 1,
    motivo: 'Dañado / Deteriorado',
    observaciones: ''
  });

  const [mensajeExito, setMensajeExito] = useState('');
  const [errorModal, setErrorModal] = useState('');

  // 1. Libros para Entradas
  const librosEntradasFiltrados = libros.filter((l) => {
    const query = busquedaLibroEntrada.toLowerCase();
    return (
      l.titulo.toLowerCase().includes(query) ||
      l.autor.toLowerCase().includes(query) ||
      (l.isbn && l.isbn.includes(query)) ||
      (l.distribuidor && l.distribuidor.toLowerCase().includes(query))
    );
  });

  // 2. Historial de Entradas
  const historialEntradasFiltrado = historialEntradas.filter((h) => {
    const query = busquedaHistorialEntrada.toLowerCase();
    const coincideTexto =
      h.libroTitulo.toLowerCase().includes(query) ||
      h.distribuidor.toLowerCase().includes(query) ||
      h.nroFacturaProveedor.toLowerCase().includes(query) ||
      h.observaciones.toLowerCase().includes(query);

    const coincideDistribuidor =
      filtroDistribuidorEntrada === 'todos' || h.distribuidor === filtroDistribuidorEntrada;

    return coincideTexto && coincideDistribuidor;
  });

  // 3. Libros para Bajas
  const librosBajasFiltrados = libros.filter((l) => {
    const query = busquedaLibroBaja.toLowerCase();
    return (
      l.titulo.toLowerCase().includes(query) ||
      l.autor.toLowerCase().includes(query) ||
      (l.isbn && l.isbn.includes(query))
    );
  });

  // 4. Historial de Bajas
  const historialBajasFiltrado = historialAjustes.filter((h) => {
    const query = busquedaHistorialBaja.toLowerCase();
    const coincideTexto =
      h.libroTitulo.toLowerCase().includes(query) ||
      h.observaciones.toLowerCase().includes(query) ||
      h.motivo.toLowerCase().includes(query);

    const coincideMotivo = filtroMotivoBaja === 'todos' || h.motivo === filtroMotivoBaja;
    return coincideTexto && coincideMotivo;
  });

  // --- HANDLERS DE ENTRADAS ---
  const abrirModalEntrada = (libro) => {
    setLibroEntradaSeleccionado(libro);
    const distribuidorDefault = libro.distribuidor || (distribuidores.find((d) => d.estado === 'Activo')?.nombre || '');
    setFormularioEntrada({
      cantidad: 5,
      costoUnitario: libro.precioCosto || '',
      distribuidor: distribuidorDefault,
      nroFacturaProveedor: '',
      observaciones: ''
    });
    setErrorModal('');
  };

  const cerrarModalEntrada = () => {
    setLibroEntradaSeleccionado(null);
    setErrorModal('');
  };

  const handleConfirmarEntrada = (e) => {
    e.preventDefault();
    if (!libroEntradaSeleccionado) return;

    const cant = Number(formularioEntrada.cantidad);
    if (cant <= 0 || isNaN(cant)) {
      setErrorModal('La cantidad de libros a ingresar debe ser mayor a 0.');
      return;
    }

    const costo = formularioEntrada.costoUnitario !== '' ? parseFloat(formularioEntrada.costoUnitario) : 0;
    if (costo < 0 || isNaN(costo)) {
      setErrorModal('El costo unitario de compra no puede ser un valor negativo.');
      return;
    }

    if (!formularioEntrada.distribuidor.trim()) {
      setErrorModal('Debes seleccionar la empresa distribuidora responsable del lote.');
      return;
    }

    const nuevoRegistro = crearRegistroEntrada({
      libro: libroEntradaSeleccionado,
      cantidad: cant,
      costoUnitario: costo,
      distribuidor: formularioEntrada.distribuidor,
      nroFacturaProveedor: formularioEntrada.nroFacturaProveedor,
      observaciones: formularioEntrada.observaciones,
      rolUsuario
    });

    if (onRegistrarEntrada) {
      onRegistrarEntrada(nuevoRegistro);
    }

    setMensajeExito(
      `✅ Se ingresaron exitosamente +${cant} unidades a "${libroEntradaSeleccionado.titulo}" suministradas por ${formularioEntrada.distribuidor}.`
    );
    setTimeout(() => setMensajeExito(''), 4500);

    cerrarModalEntrada();
  };

  // --- HANDLERS DE BAJAS ---
  const abrirModalBaja = (libro) => {
    setLibroBajaSeleccionado(libro);
    setFormularioBaja({
      cantidad: 1,
      motivo: 'Dañado / Deteriorado',
      observaciones: ''
    });
    setErrorModal('');
  };

  const cerrarModalBaja = () => {
    setLibroBajaSeleccionado(null);
    setErrorModal('');
  };

  const handleConfirmarBaja = (e) => {
    e.preventDefault();
    if (!libroBajaSeleccionado) return;

    const cant = Number(formularioBaja.cantidad);
    if (cant <= 0) {
      setErrorModal('La cantidad a descontar debe ser mayor a 0.');
      return;
    }

    if (cant > libroBajaSeleccionado.ejemplares) {
      setErrorModal(`No puedes descontar más de las unidades disponibles (${libroBajaSeleccionado.ejemplares} uds).`);
      return;
    }

    const nuevoRegistro = crearRegistroAjusteBaja({
      libro: libroBajaSeleccionado,
      cantidad: cant,
      motivo: formularioBaja.motivo,
      observaciones: formularioBaja.observaciones,
      rolUsuario
    });

    if (onRegistrarAjuste) {
      onRegistrarAjuste(nuevoRegistro);
    }

    setMensajeExito(
      `✅ Se descontaron correctamente -${cant} unidades de "${libroBajaSeleccionado.titulo}" por motivo: ${formularioBaja.motivo}.`
    );
    setTimeout(() => setMensajeExito(''), 4500);

    cerrarModalBaja();
  };

  // KPIs Totales
  const totalStockActual = libros.reduce((acc, l) => acc + (Number(l.ejemplares) || 0), 0);
  const totalUnidadesIngresadas = historialEntradas.reduce(
    (acc, h) => acc + (Number(h.cantidadIngresada) || 0),
    0
  );
  const totalUnidadesBajas = historialAjustes.reduce(
    (acc, h) => acc + (Number(h.cantidadDescontada) || 0),
    0
  );

  return (
    <div className="page-container ajustes-inventario-container">
      {/* Encabezado con Panel de Tasa de Cambio */}
      <div className="page-header pos-header-flex">
        <div>
          <h2>📦 Movimientos y Ajustes de Inventario</h2>
          <p>
            Control integral de entradas (reabastecimiento por distribuidor) y bajas de stock con trazabilidad completa.
          </p>
        </div>

        {/* Panel Administrativo de Tasa de Cambio */}
        <div className="tasa-admin-widget">
          {!editandoTasa ? (
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
              <button 
                type="button" 
                className="btn-editar-tasa" 
                onClick={() => { setTempTasa(tasaDelDia); setEditandoTasa(true); }}
                title="Modificar tasa del día manualmente (exclusivo para administradores)"
              >
                ✏️ Modificar Tasa
              </button>
            </div>
          ) : (
            <form onSubmit={handleGuardarTasa} className="tasa-form-inline">
              <span className="tasa-label">Nueva Tasa Bs./$:</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="tasa-input-small"
                value={tempTasa}
                onChange={(e) => setTempTasa(e.target.value)}
                autoFocus
                required
              />
              <button type="submit" className="btn-tasa-save" title="Guardar tasa">✓ Guardar</button>
              <button type="button" className="btn-tasa-cancel" onClick={() => setEditandoTasa(false)} title="Cancelar">✕</button>
            </form>
          )}
        </div>
      </div>

      {/* BANNER DE ÉXITO */}
      {mensajeExito && (
        <div className="alert-success" style={{ marginBottom: '1rem' }}>
          {mensajeExito}
        </div>
      )}

      {/* DASHBOARD DE MOVIMIENTOS */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>📦</div>
          <div className="metric-data">
            <span className="metric-title">Stock Total en Almacén</span>
            <span className="metric-value">{totalStockActual} uds.</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>📈</div>
          <div className="metric-data">
            <span className="metric-title">Entradas / Reabastecimiento</span>
            <span className="metric-value" style={{ color: '#16a34a' }}>
              +{totalUnidadesIngresadas} uds.
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>📉</div>
          <div className="metric-data">
            <span className="metric-title">Bajas / Mermas Totales</span>
            <span className="metric-value" style={{ color: '#dc2626' }}>
              -{totalUnidadesBajas} uds.
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fdf4ff', color: '#a855f7' }}>📚</div>
          <div className="metric-data">
            <span className="metric-title">Títulos en Catálogo</span>
            <span className="metric-value">{libros.length}</span>
          </div>
        </div>
      </div>

      {/* NAVEGACIÓN ENTRE PESTAÑAS */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${pestañaActiva === 'entradas-libros' ? 'active' : ''}`}
          onClick={() => setPestañaActiva('entradas-libros')}
        >
          📈 Reabastecer Stock (+ Entradas)
        </button>
        <button
          className={`tab-btn ${pestañaActiva === 'entradas-historial' ? 'active' : ''}`}
          onClick={() => setPestañaActiva('entradas-historial')}
        >
          🧾 Historial de Entradas ({historialEntradas.length})
        </button>
        <button
          className={`tab-btn ${pestañaActiva === 'bajas-libros' ? 'active' : ''}`}
          onClick={() => setPestañaActiva('bajas-libros')}
        >
          📉 Registrar Bajas / Mermas
        </button>
        <button
          className={`tab-btn ${pestañaActiva === 'bajas-historial' ? 'active' : ''}`}
          onClick={() => setPestañaActiva('bajas-historial')}
        >
          📑 Historial de Bajas ({historialAjustes.length})
        </button>

        {onAbrirReporte && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="tab-btn"
              onClick={() => onAbrirReporte('auditoria-mermas')}
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontWeight: 700 }}
              title="Generar reporte formal de mermas y pérdidas"
            >
              📉 Reporte Mermas (PDF)
            </button>
            <button
              type="button"
              className="tab-btn"
              onClick={() => onAbrirReporte('compras-distribuidores')}
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 700 }}
              title="Generar balance de compras a distribuidores"
            >
              🏢 Reporte Compras (PDF)
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. VISTA: REABASTECER STOCK (ENTRADAS DE MERCANCÍA)       */}
      {/* ========================================================= */}
      {pestañaActiva === 'entradas-libros' && (
        <>
          <div className="controls-bar">
            <input
              type="text"
              className="input-search"
              placeholder="Buscar libro..."
              value={busquedaLibroEntrada}
              onChange={(e) => setBusquedaLibroEntrada(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>Portada</th>
                  <th>Título del Libro</th>
                  <th>Autor</th>
                  <th>Categoría</th>
                  <th>Distribuidor Habitual</th>
                  <th>Stock Actual</th>
                  <th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {librosEntradasFiltrados.length > 0 ? (
                  librosEntradasFiltrados.map((libro) => (
                    <tr key={libro.id}>
                      <td style={{ textAlign: 'center' }}>
                        {libro.portada ? (
                          <img src={libro.portada} alt={libro.titulo} className="libro-portada-thumb" />
                        ) : (
                          <div className="libro-portada-placeholder">📖</div>
                        )}
                      </td>
                      <td className="text-bold">{libro.titulo}</td>
                      <td>{libro.autor}</td>
                      <td>{libro.categoria}</td>
                      <td>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                          🏢 {libro.distribuidor || 'Distribución Directa'}
                        </span>
                      </td>
                      <td className="text-bold">{libro.ejemplares} uds.</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-entrada-action"
                          onClick={() => abrirModalEntrada(libro)}
                          title="Ingresar nuevo lote de ejemplares para este libro"
                        >
                          ➕ Ingresar Stock
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="table-empty">
                      No se encontraron libros que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 2. VISTA: HISTORIAL DE ENTRADAS / COMPRAS                 */}
      {/* ========================================================= */}
      {pestañaActiva === 'entradas-historial' && (
        <>
          {/* Tarjetas resumen de compras para el Administrador */}
          {(() => {
            const totalInvertido = historialEntradasFiltrado.reduce((acc, h) => {
              const total = h.costoTotal || (h.cantidadIngresada * (h.costoUnitario || 0));
              return acc + (Number(total) || 0);
            }, 0);
            const totalUds = historialEntradasFiltrado.reduce((acc, h) => acc + (Number(h.cantidadIngresada) || 0), 0);
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '1rem', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#0f766e', fontWeight: 600, display: 'block' }}>💵 Total Invertido en Compras (Filtrado)</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#115e59' }}>${totalInvertido.toFixed(2)}</span>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, display: 'block' }}>📦 Total Ejemplares Ingresados</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>{totalUds} unidades</span>
                </div>
              </div>
            );
          })()}

          <div className="controls-bar">
            <input 
              type="text" 
              className="input-search"
              placeholder="Buscar entrada..." 
              value={busquedaHistorialEntrada}
              onChange={(e) => setBusquedaHistorialEntrada(e.target.value)}
            />

            <div className="filter-group">
              <select
                className="form-input form-select"
                value={filtroDistribuidorEntrada}
                onChange={(e) => setFiltroDistribuidorEntrada(e.target.value)}
                style={{ minWidth: '220px' }}
              >
                <option value="todos">Todos los distribuidores</option>
                {distribuidores.map((d) => (
                  <option key={d.id} value={d.nombre}>
                    🏢 {d.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Libro Ingresado</th>
                  <th style={{ textAlign: 'center' }}>Cantidad</th>
                  <th style={{ textAlign: 'right' }}>Costo Unit. ($)</th>
                  <th style={{ textAlign: 'right' }}>Costo Total ($)</th>
                  <th>Distribuidor / Proveedor</th>
                  <th>Factura / Guía</th>
                  <th>Notas / Observaciones</th>
                  <th>Registrado Por</th>
                </tr>
              </thead>
              <tbody>
                {historialEntradasFiltrado.length > 0 ? (
                  historialEntradasFiltrado.map((h) => (
                    <tr key={h.id}>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {h.fecha} • {h.hora}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          {h.libroPortada ? (
                            <img src={h.libroPortada} alt={h.libroTitulo} className="libro-portada-thumb" style={{ width: '30px', height: '42px' }} />
                          ) : (
                            <div className="libro-portada-placeholder" style={{ width: '30px', height: '42px', fontSize: '0.9rem' }}>📖</div>
                          )}
                          <div>
                            <div className="text-bold">{h.libroTitulo}</div>
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>{h.libroAutor}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-entrada-unidades">
                          +{h.cantidadIngresada} uds.
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: '#475569', fontWeight: 500 }}>
                        ${Number(h.costoUnitario || 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#0f766e', fontWeight: 600 }}>
                        ${Number(h.costoTotal || (h.cantidadIngresada * (h.costoUnitario || 0))).toFixed(2)}
                      </td>
                      <td>
                        <span className="badge-distribuidor-tag">
                          🏢 {h.distribuidor}
                        </span>
                      </td>
                      <td>
                        <span className="badge-factura-proveedor">
                          {h.nroFacturaProveedor}
                        </span>
                      </td>
                      <td style={{ maxWidth: '260px', fontSize: '0.85rem' }}>
                        {h.observaciones}
                      </td>
                      <td>
                        <span className="badge badge-admin">{h.responsable}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="table-empty">
                      No se encontraron registros de entradas con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 3. VISTA: REGISTRAR BAJAS (MERMAS / PÉRDIDAS)             */}
      {/* ========================================================= */}
      {pestañaActiva === 'bajas-libros' && (
        <>
          <div className="controls-bar">
            <input
              type="text"
              className="input-search"
              placeholder="Buscar libro..."
              value={busquedaLibroBaja}
              onChange={(e) => setBusquedaLibroBaja(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>Portada</th>
                  <th>Título del Libro</th>
                  <th>Autor</th>
                  <th>Categoría</th>
                  <th>Stock Actual</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acción de Ajuste</th>
                </tr>
              </thead>
              <tbody>
                {librosBajasFiltrados.length > 0 ? (
                  librosBajasFiltrados.map((libro) => {
                    const tieneStock = libro.ejemplares > 0;
                    return (
                      <tr key={libro.id}>
                        <td style={{ textAlign: 'center' }}>
                          {libro.portada ? (
                            <img src={libro.portada} alt={libro.titulo} className="libro-portada-thumb" />
                          ) : (
                            <div className="libro-portada-placeholder">📖</div>
                          )}
                        </td>
                        <td className="text-bold">{libro.titulo}</td>
                        <td>{libro.autor}</td>
                        <td>{libro.categoria}</td>
                        <td className="text-bold">{libro.ejemplares} uds.</td>
                        <td>
                          <span className={`badge ${tieneStock ? 'badge-success' : 'badge-danger'}`}>
                            {tieneStock ? 'En Stock' : 'Sin Stock'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-baja-action"
                            onClick={() => abrirModalBaja(libro)}
                            disabled={!tieneStock}
                            title={tieneStock ? 'Registrar baja de inventario' : 'No hay stock disponible para descontar'}
                          >
                            📉 Registrar Baja
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="table-empty">
                      No se encontraron libros que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 4. VISTA: HISTORIAL DE BAJAS Y MERMAS                     */}
      {/* ========================================================= */}
      {pestañaActiva === 'bajas-historial' && (
        <>
          <div className="controls-bar">
            <input
              type="text"
              className="input-search"
              placeholder="Buscar en historial..."
              value={busquedaHistorialBaja}
              onChange={(e) => setBusquedaHistorialBaja(e.target.value)}
            />

            <div className="filter-group">
              <select
                className="form-input form-select"
                value={filtroMotivoBaja}
                onChange={(e) => setFiltroMotivoBaja(e.target.value)}
                style={{ minWidth: '220px' }}
              >
                <option value="todos">Todos los motivos</option>
                <option value="Dañado / Deteriorado">Dañado / Deteriorado</option>
                <option value="Pérdida / Extravío">Pérdida / Extravío</option>
                <option value="Error de conteo / Inventario">Error de conteo / Inventario</option>
                <option value="Otro">Otro motivo</option>
              </select>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Libro Afectado</th>
                  <th style={{ textAlign: 'center' }}>Cantidad Descontada</th>
                  <th>Motivo</th>
                  <th>Notas / Observación</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {historialBajasFiltrado.length > 0 ? (
                  historialBajasFiltrado.map((h) => (
                    <tr key={h.id}>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {h.fecha} • {h.hora}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          {h.libroPortada ? (
                            <img src={h.libroPortada} alt={h.libroTitulo} className="libro-portada-thumb" style={{ width: '30px', height: '42px' }} />
                          ) : (
                            <div className="libro-portada-placeholder" style={{ width: '30px', height: '42px', fontSize: '0.9rem' }}>📖</div>
                          )}
                          <div>
                            <div className="text-bold">{h.libroTitulo}</div>
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>{h.libroAutor}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-baja-unidades">
                          -{h.cantidadDescontada} uds.
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          h.motivo === 'Dañado / Deteriorado' ? 'badge-motivo-danado' :
                          h.motivo === 'Pérdida / Extravío' ? 'badge-motivo-perdida' :
                          'badge-motivo-conteo'
                        }`}>
                          {h.motivo}
                        </span>
                      </td>
                      <td style={{ maxWidth: '280px', fontSize: '0.85rem' }}>
                        {h.observaciones}
                      </td>
                      <td>
                        <span className="badge badge-admin">{h.responsable}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      No se encontraron registros de bajas o mermas con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: REGISTRAR ENTRADA / REABASTECIMIENTO DE STOCK    */}
      {/* ========================================================= */}
      {libroEntradaSeleccionado && (
        <div className="modal-overlay">
          <div className="modal-content modal-entrada-content">
            <h3>📈 Reabastecer Stock / Entrada de Libros</h3>
            <p className="modal-subtitle">
              Registra el ingreso de nuevos ejemplares indicando la empresa distribuidora responsable.
            </p>

            {/* Ficha rápida del libro */}
            <div className="libro-entrada-banner">
              {libroEntradaSeleccionado.portada ? (
                <img src={libroEntradaSeleccionado.portada} alt={libroEntradaSeleccionado.titulo} className="libro-entrada-thumb" />
              ) : (
                <div className="libro-entrada-placeholder">📖</div>
              )}
              <div>
                <h4 className="libro-entrada-titulo">{libroEntradaSeleccionado.titulo}</h4>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                  {libroEntradaSeleccionado.autor} • {libroEntradaSeleccionado.categoria}
                </p>
                <div className="stock-actual-entrada-tag">
                  Stock actual en inventario: <strong>{libroEntradaSeleccionado.ejemplares} unidades</strong>
                </div>
              </div>
            </div>

            {errorModal && (
              <div className="alert-error-modal">
                ⚠️ {errorModal}
              </div>
            )}

            <form onSubmit={handleConfirmarEntrada} className="form-group" style={{ marginTop: '1rem' }}>
              {/* 1. Empresa Distribuidora */}
              <div className="form-field">
                <label className="form-label" htmlFor="distribuidorEntrada">
                  1. Empresa Distribuidora / Proveedor del Lote *:
                </label>
                <select
                  id="distribuidorEntrada"
                  name="distribuidor"
                  className="form-input form-select"
                  value={formularioEntrada.distribuidor}
                  onChange={(e) => setFormularioEntrada({ ...formularioEntrada, distribuidor: e.target.value })}
                  required
                >
                  <option value="">Selecciona la empresa distribuidora...</option>
                  {distribuidores.filter((d) => d.estado === 'Activo').map((d) => (
                    <option key={d.id} value={d.nombre}>
                      🏢 {d.nombre} ({d.rif})
                    </option>
                  ))}
                  <option value="Distribución Directa">Distribución Directa / Editorial Independiente</option>
                </select>
              </div>

              {/* 2. Cantidad, Costo Unitario y Factura */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-field">
                  <label className="form-label" htmlFor="cantidadEntrada">
                    2. Cantidad *:
                  </label>
                  <input
                    id="cantidadEntrada"
                    type="number"
                    name="cantidad"
                    min="1"
                    className="form-input"
                    value={formularioEntrada.cantidad}
                    onChange={(e) => setFormularioEntrada({ ...formularioEntrada, cantidad: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="costoEntrada" style={{ color: '#0f766e' }}>
                    3. Costo Unitario ($) 🔒:
                  </label>
                  <input
                    id="costoEntrada"
                    type="number"
                    step="0.01"
                    min="0"
                    name="costoUnitario"
                    placeholder="0.00"
                    className="form-input"
                    value={formularioEntrada.costoUnitario}
                    onChange={(e) => setFormularioEntrada({ ...formularioEntrada, costoUnitario: e.target.value })}
                    title="Costo de compra por unidad a la empresa distribuidora"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="facturaProveedor">
                    4. N° Factura / Guía:
                  </label>
                  <input
                    id="facturaProveedor"
                    type="text"
                    name="nroFacturaProveedor"
                    placeholder="N° factura"
                    className="form-input"
                    value={formularioEntrada.nroFacturaProveedor}
                    onChange={(e) => setFormularioEntrada({ ...formularioEntrada, nroFacturaProveedor: e.target.value })}
                  />
                </div>
              </div>

              {Number(formularioEntrada.cantidad) > 0 && Number(formularioEntrada.costoUnitario) > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#0f766e', background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
                  💵 <strong>Costo Total estimado del Lote:</strong> ${(Number(formularioEntrada.cantidad) * Number(formularioEntrada.costoUnitario)).toFixed(2)} USD
                </div>
              )}

              {/* 4. Observaciones */}
              <div className="form-field">
                <label className="form-label" htmlFor="observacionesEntrada">
                  4. Notas / Observaciones del Lote (Opcional):
                </label>
                <textarea
                  id="observacionesEntrada"
                  name="observaciones"
                  rows="2"
                  className="form-input"
                  placeholder="Observaciones"
                  value={formularioEntrada.observaciones}
                  onChange={(e) => setFormularioEntrada({ ...formularioEntrada, observaciones: e.target.value })}
                ></textarea>
              </div>

              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={cerrarModalEntrada}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: '#16a34a' }}>
                  ➕ Confirmar Ingreso de Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: REGISTRAR BAJA DE EJEMPLARES                     */}
      {/* ========================================================= */}
      {libroBajaSeleccionado && (
        <div className="modal-overlay">
          <div className="modal-content modal-baja-content">
            <h3>📉 Registrar Baja de Ejemplares</h3>
            <p className="modal-subtitle">
              Esta acción descontará unidades de forma inmediata del inventario disponible.
            </p>

            {/* Ficha rápida del libro */}
            <div className="libro-baja-banner">
              {libroBajaSeleccionado.portada ? (
                <img src={libroBajaSeleccionado.portada} alt={libroBajaSeleccionado.titulo} className="libro-baja-thumb" />
              ) : (
                <div className="libro-baja-placeholder">📖</div>
              )}
              <div>
                <h4 className="libro-baja-titulo">{libroBajaSeleccionado.titulo}</h4>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>{libroBajaSeleccionado.autor} • {libroBajaSeleccionado.categoria}</p>
                <div className="stock-actual-tag">
                  Stock actual disponible: <strong>{libroBajaSeleccionado.ejemplares} unidades</strong>
                </div>
              </div>
            </div>

            {errorModal && (
              <div className="alert-error-modal">
                ⚠️ {errorModal}
              </div>
            )}

            <form onSubmit={handleConfirmarBaja} className="form-group" style={{ marginTop: '1rem' }}>
              {/* 1. Cantidad a descontar */}
              <div className="form-field">
                <label className="form-label" htmlFor="cantidadBaja">
                  1. Cantidad de unidades a descontar * (Máx: {libroBajaSeleccionado.ejemplares}):
                </label>
                <input
                  id="cantidadBaja"
                  type="number"
                  name="cantidad"
                  min="1"
                  max={libroBajaSeleccionado.ejemplares}
                  className="form-input"
                  value={formularioBaja.cantidad}
                  onChange={(e) => setFormularioBaja({ ...formularioBaja, cantidad: e.target.value })}
                  required
                />
              </div>

              {/* 2. Motivo */}
              <div className="form-field">
                <label className="form-label" htmlFor="motivoBaja">
                  2. Motivo del ajuste / baja *:
                </label>
                <select
                  id="motivoBaja"
                  name="motivo"
                  className="form-input form-select"
                  value={formularioBaja.motivo}
                  onChange={(e) => setFormularioBaja({ ...formularioBaja, motivo: e.target.value })}
                  required
                >
                  <option value="Dañado / Deteriorado">📕 Dañado / Deteriorado (Hojas rotas, humedad, desgaste)</option>
                  <option value="Pérdida / Extravío">🔍 Pérdida / Extravío</option>
                  <option value="Error de conteo / Inventario">🔢 Error de conteo / Auditoría física</option>
                  <option value="Otro">📝 Otro motivo</option>
                </select>
              </div>

              {/* 3. Observaciones */}
              <div className="form-field">
                <label className="form-label" htmlFor="observacionesBaja">
                  3. Notas / Observaciones detalladas (Opcional):
                </label>
                <textarea
                  id="observacionesBaja"
                  name="observaciones"
                  rows="3"
                  className="form-input"
                  placeholder="Observaciones"
                  value={formularioBaja.observaciones}
                  onChange={(e) => setFormularioBaja({ ...formularioBaja, observaciones: e.target.value })}
                ></textarea>
              </div>

              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={cerrarModalBaja}>
                  Cancelar
                </button>
                <button type="submit" className="btn-danger-confirm">
                  Confirmar Descuento de Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
