import './Metricas.css';

export default function Metricas({ ventas = [], libros = [], usuarios = [], esAdmin = false, onAbrirReporte }) {
  const totalIngresos = ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
  const totalEjemplares = libros.reduce((acc, l) => acc + (Number(l.ejemplares) || 0), 0);
  const totalLectores = usuarios.length;

  let totalGananciaEstimada = 0;
  if (esAdmin) {
    ventas.forEach((v) => {
      if (Array.isArray(v.items)) {
        v.items.forEach((it) => {
          const itemLibroId = it.libroId ?? it.id;
          const libro = libros.find(
            (l) => (itemLibroId !== undefined && Number(l.id) === Number(itemLibroId)) || (it.titulo && l.titulo === it.titulo)
          );
          const precioUnit = Number(it.precio ?? it.precioUnitario ?? libro?.precio) || 0;
          const cantidad = Number(it.cantidad) || 0;
          const subtotal = Number(it.subtotal) || (precioUnit * cantidad);
          const costoUnit = Number(libro?.precioCosto) || 0;
          const costoItem = cantidad * costoUnit;
          totalGananciaEstimada += subtotal - costoItem;
        });
      }
    });
  }

  const metricas = [
    { titulo: 'Total Recaudado Ventas', valor: `$${totalIngresos.toFixed(2)}`, icono: '💵' },
    ...(esAdmin ? [{ titulo: 'Ganancia Neta Estimada', valor: `$${totalGananciaEstimada.toFixed(2)}`, icono: '📈' }] : []),
    { titulo: 'Ventas Realizadas', valor: `${ventas.length}`, icono: '🧾' },
    { titulo: 'Total Ejemplares en Stock', valor: `${totalEjemplares}`, icono: '📚' },
    { titulo: 'Lectores Registrados', valor: `${totalLectores}`, icono: '👥' },
  ];

  // Últimas ventas para seguimiento
  const ventasRecientes = ventas.slice(0, 5);

  return (
    <div className="page-container">
      {/* Encabezado */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>📊 Resumen General y Métricas</h2>
          <p>Bienvenido al panel principal de gestión de inventario, ventas y lectores de la biblioteca.</p>
        </div>
        {esAdmin && onAbrirReporte && (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onAbrirReporte('rentabilidad-utilidades')}
              style={{
                background: '#1e3a8a',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 8px rgba(30, 58, 138, 0.25)'
              }}
              title="Generar estado de rentabilidad y utilidades en PDF"
            >
              📈 Reporte Rentabilidad (PDF)
            </button>
            <button
              type="button"
              onClick={() => onAbrirReporte('ranking-libros')}
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="Generar ranking de libros más vendidos en PDF"
            >
              🏆 Ranking Libros (PDF)
            </button>
            <button
              type="button"
              onClick={() => onAbrirReporte('predicciones-compras')}
              style={{
                background: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fde68a',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="Generar predicción de demanda y recomendación de compra a distribuidores en PDF"
            >
              🔮 Predicción de Compras (PDF)
            </button>
          </div>
        )}
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="metrics-grid">
        {metricas.map((m, index) => (
          <div key={index} className="metric-card">
            <div className="metric-icon">{m.icono}</div>
            <div className="metric-data">
              <span className="metric-title">{m.titulo}</span>
              <span className="metric-value">{m.valor}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de Últimas Ventas */}
      <div className="section-card">
        <h3 className="section-title">⚡ Últimas Ventas Registradas</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>N° Factura</th>
                <th>Fecha</th>
                <th>Lector</th>
                <th>Método de Pago</th>
                <th style={{ textAlign: 'right' }}>Total ($)</th>
              </tr>
            </thead>
            <tbody>
              {ventasRecientes.length > 0 ? (
                ventasRecientes.map((v) => (
                  <tr key={v.id}>
                    <td className="text-bold" style={{ fontFamily: 'monospace', color: '#2563eb' }}>
                      {v.nroFactura || `FAC-${v.id}`}
                    </td>
                    <td>{v.fecha}</td>
                    <td className="text-bold">{v.cliente?.nombre || v.clienteNombre || 'Lector General'}</td>
                    <td>
                      <span className="badge badge-staff">
                        {v.metodoPago}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: '#0f766e' }} className="text-bold">
                      ${Number(v.total).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="table-empty">
                    No se han registrado ventas aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}