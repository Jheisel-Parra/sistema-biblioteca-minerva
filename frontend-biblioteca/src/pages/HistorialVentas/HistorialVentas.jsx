import { useState } from 'react';
import './HistorialVentas.css';
import ModalFactura from '../../components/ModalFactura/ModalFactura';

const METODOS_PAGO_DEFAULT = [
  { id: 'punto-venta', nombre: 'Punto de Venta', icono: '💳' },
  { id: 'pago-movil', nombre: 'Pago Móvil', icono: '📱' },
  { id: 'transferencia', nombre: 'Transferencia Bancaria', icono: '🏦' },
  { id: 'efectivo', nombre: 'Efectivo', icono: '💵' }
];

export default function HistorialVentas({ ventas = [], onAbrirReporte, esAdmin = false, metodosPago }) {
  const metodosDisponibles = metodosPago && metodosPago.length > 0 ? metodosPago : METODOS_PAGO_DEFAULT;
  const [busqueda, setBusqueda] = useState('');
  const [filtroPago, setFiltroPago] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  // Filtrado de ventas
  const ventasFiltradas = ventas.filter((v) => {
    const clienteNombre = v.cliente?.nombre || v.clienteNombre || '';
    const clienteCedula = v.cliente?.cedula || v.clienteCedula || '';
    const nroFactura = v.nroFactura || '';

    const coincideBusqueda =
      clienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      clienteCedula.toLowerCase().includes(busqueda.toLowerCase()) ||
      nroFactura.toLowerCase().includes(busqueda.toLowerCase());

    const coincidePago = filtroPago === 'todos' || (
      filtroPago === 'Transferencia Bancaria'
        ? (v.metodoPago && v.metodoPago.toLowerCase().includes('transferencia'))
        : v.metodoPago === filtroPago
    );
    const coincideFecha = !filtroFecha || v.fecha === filtroFecha;

    return coincideBusqueda && coincidePago && coincideFecha;
  });

  // Helper para obtener Base Imponible, IVA (16%) y Total con IVA de cada venta
  const obtenerDesgloseVenta = (v) => {
    const sumaItems = (v.items || []).reduce(
      (acc, it) => acc + (Number(it.precio) || 0) * (Number(it.cantidad) || 1),
      0
    );
    const subtotal =
      Number(v.subtotal) > 0
        ? Number(v.subtotal)
        : sumaItems > 0
        ? parseFloat(sumaItems.toFixed(2))
        : parseFloat((Number(v.total || 0) / 1.16).toFixed(2));
    const montoIva =
      Number(v.montoIva) > 0
        ? Number(v.montoIva)
        : parseFloat((subtotal * 0.16).toFixed(2));
    const total = parseFloat((subtotal + montoIva).toFixed(2));
    const tasa = Number(v.tasaCambio) || 36.50;
    const totalBs = parseFloat((total * tasa).toFixed(2));
    return { subtotal, montoIva, total, tasa, totalBs };
  };

  // KPIs financieros calculados con IVA (16%)
  const totalBaseImponible = ventas.reduce((acc, v) => acc + obtenerDesgloseVenta(v).subtotal, 0);
  const totalIvaRecaudado = ventas.reduce((acc, v) => acc + obtenerDesgloseVenta(v).montoIva, 0);
  const totalIngresos = ventas.reduce((acc, v) => acc + obtenerDesgloseVenta(v).total, 0);
  const totalLibrosVendidos = ventas.reduce((acc, v) => acc + (Number(v.totalArticulos) || (v.items?.reduce((s, i) => s + i.cantidad, 0) || 0)), 0);

  return (
    <div className="page-container historial-ventas-container">
      {/* Encabezado */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>🧾 Historial de Ventas y Facturación</h2>
          <p>Consulta las transacciones de venta de libros, montos recaudados y reimprime recibos.</p>
        </div>
        {esAdmin && onAbrirReporte && (
          <button 
            type="button" 
            onClick={() => onAbrirReporte('arqueo-caja')}
            style={{ 
              background: '#1e3a8a', 
              color: 'white', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              fontWeight: 700, 
              padding: '0.65rem 1.2rem', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(30, 58, 138, 0.25)'
            }}
          >
            📑 Reporte Arqueo de Caja (PDF)
          </button>
        )}
      </div>

      {/* Tarjetas de Métricas de Venta */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>💵</div>
          <div className="metric-data">
            <span className="metric-title">Total Facturado (c/IVA)</span>
            <span className="metric-value" style={{ color: '#0f766e' }}>
              ${totalIngresos.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>🏛️</div>
          <div className="metric-data">
            <span className="metric-title">IVA Recaudado (16%)</span>
            <span className="metric-value" style={{ color: '#b45309' }}>
              ${totalIvaRecaudado.toFixed(2)}
            </span>
            <small style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Base Imponible: ${totalBaseImponible.toFixed(2)}
            </small>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>🧾</div>
          <div className="metric-data">
            <span className="metric-title">Ventas Concretadas</span>
            <span className="metric-value">{ventas.length}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fdf4ff', color: '#a855f7' }}>📚</div>
          <div className="metric-data">
            <span className="metric-title">Libros Vendidos</span>
            <span className="metric-value">{totalLibrosVendidos} uds.</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="controls-bar" style={{ marginTop: '0.5rem' }}>
        <input
          type="text"
          className="input-search"
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="historial-filtros-right">
          {/* Selector de Método de Pago */}
          <select
            className="form-input form-select filter-select"
            value={filtroPago}
            onChange={(e) => setFiltroPago(e.target.value)}
          >
            <option value="todos">Todos los pagos</option>
            {metodosDisponibles.map((m) => (
              <option key={m.id || m.nombre} value={m.nombre}>
                {m.icono || '💳'} {m.nombre}
              </option>
            ))}
          </select>

          {/* Filtro de Fecha */}
          <input
            type="date"
            className="form-input filter-date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            title="Filtrar por fecha específica"
          />

          {filtroFecha && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setFiltroFecha('')}
              style={{ padding: '0.75rem' }}
            >
              Limpiar Fecha
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Historial de Ventas */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>N° FACTURA</th>
              <th>FECHA Y HORA</th>
              <th>LECTOR</th>
              <th>ARTÍCULOS</th>
              <th>MÉTODO DE PAGO</th>
              <th style={{ textAlign: 'right' }}>BASE IMPONIBLE ($)</th>
              <th style={{ textAlign: 'right' }}>IVA 16% ($)</th>
              <th style={{ textAlign: 'right' }}>TOTAL C/IVA ($)</th>
              <th style={{ textAlign: 'center' }}>COMPROBANTE</th>
            </tr>
          </thead>
          <tbody>
            {ventasFiltradas.length > 0 ? (
              ventasFiltradas.map((v) => {
                const clienteNombre = v.cliente?.nombre || v.clienteNombre || 'Lector General';
                const clienteCedula = v.cliente?.cedula || v.clienteCedula || '';
                const cantLibros = v.totalArticulos || (v.items?.reduce((s, i) => s + i.cantidad, 0) || 0);
                const desglose = obtenerDesgloseVenta(v);

                return (
                  <tr key={v.id}>
                    <td className="text-bold" style={{ fontFamily: 'monospace', color: '#2563eb' }}>
                      {v.nroFactura || `FAC-${v.id}`}
                    </td>
                    <td>
                      <div>{v.fecha}</div>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>{v.hora || ''}</span>
                    </td>
                    <td>
                      <div className="text-bold">{clienteNombre}</div>
                      {clienteCedula && <span className="text-muted" style={{ fontSize: '0.75rem' }}>{clienteCedula}</span>}
                    </td>
                    <td>
                      <span className="badge badge-staff">
                        {cantLibros} {cantLibros === 1 ? 'libro' : 'libros'}
                      </span>
                    </td>
                    <td>
                      <span className="badge-metodo-pago">
                        {(() => {
                          const metodoObj = metodosDisponibles.find(
                            (m) => m.nombre.toLowerCase() === (v.metodoPago || '').toLowerCase()
                          );
                          if (metodoObj?.icono) return `${metodoObj.icono} `;
                          if (v.metodoPago === 'Efectivo') return '💵 ';
                          if (v.metodoPago === 'Pago Móvil') return '📱 ';
                          if (v.metodoPago === 'Punto de Venta') return '💳 ';
                          if (v.metodoPago?.toLowerCase().includes('transferencia')) return '🏦 ';
                          return '💸 ';
                        })()}
                        {v.metodoPago}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                      ${desglose.subtotal.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.84rem', color: '#1e3a8a', fontWeight: 600 }}>
                      +${desglose.montoIva.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }} className="text-bold text-total-cell">
                      <div>${desglose.total.toFixed(2)}</div>
                      <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>
                        Bs. {desglose.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-action-reprint"
                        onClick={() => setVentaSeleccionada(v)}
                        title="Ver detalle y reimprimir factura"
                      >
                        🖨️ Reimprimir Recibo
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" className="table-empty">
                  No se encontraron ventas registradas con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para Reimprimir Factura */}
      {ventaSeleccionada && (
        <ModalFactura
          venta={ventaSeleccionada}
          onClose={() => setVentaSeleccionada(null)}
        />
      )}
    </div>
  );
}
