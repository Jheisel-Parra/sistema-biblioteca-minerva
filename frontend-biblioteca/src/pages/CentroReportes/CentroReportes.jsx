import { useState, useMemo } from 'react';
import './CentroReportes.css';

const METODOS_PAGO_DEFAULT = [
  { id: 'punto-venta', nombre: 'Punto de Venta', icono: '💳' },
  { id: 'pago-movil', nombre: 'Pago Móvil', icono: '📱' },
  { id: 'transferencia', nombre: 'Transferencia Bancaria', icono: '🏦' },
  { id: 'efectivo', nombre: 'Efectivo', icono: '💵' }
];

export default function CentroReportes({
  esAdmin = false,
  onAbrirReporte,
  metodosPago
}) {
  const metodosDisponibles = metodosPago && metodosPago.length > 0 ? metodosPago : METODOS_PAGO_DEFAULT;
  const [tabActiva, setTabActiva] = useState('todos');

  // Rango de fechas libre y personalizable
  const ahora = new Date();
  const formatoYYYYMMDD = (d) => d.toISOString().split('T')[0];
  const dInicioDefault = new Date();
  dInicioDefault.setDate(dInicioDefault.getDate() - 30);

  const [fechaInicio, setFechaInicio] = useState(formatoYYYYMMDD(dInicioDefault));
  const [fechaFin, setFechaFin] = useState(formatoYYYYMMDD(ahora));
  const [filtroMetodoPago, setFiltroMetodoPago] = useState('todos');

  const formatearFechaVisual = (fechaISO) => {
    if (!fechaISO) return '';
    const partes = fechaISO.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return fechaISO;
  };

  // Cálculo descriptivo del intervalo libre elegido por el usuario
  const calculoRangoTexto = useMemo(() => {
    if (!fechaInicio && !fechaFin) return 'Todo el Histórico (Sin límites de fecha)';
    if (fechaInicio && !fechaFin) return `Desde el ${formatearFechaVisual(fechaInicio)}`;
    if (!fechaInicio && fechaFin) return `Hasta el ${formatearFechaVisual(fechaFin)}`;

    const ini = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');
    const diffTime = fin.getTime() - ini.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;

    if (diffDays <= 0) return 'Fecha de inicio posterior a fecha fin';
    if (diffDays === 1) return `1 día seleccionado (${formatearFechaVisual(fechaInicio)})`;
    return `${diffDays} días seleccionados libremente (${formatearFechaVisual(fechaInicio)} al ${formatearFechaVisual(fechaFin)})`;
  }, [fechaInicio, fechaFin]);

  // Atajos rápidos que rellenan los campos de fecha como sugerencias prácticas
  const setRangoRapidoDias = (dias) => {
    const fin = new Date();
    const ini = new Date();
    ini.setDate(ini.getDate() - dias);
    setFechaInicio(formatoYYYYMMDD(ini));
    setFechaFin(formatoYYYYMMDD(fin));
  };

  const setRangoRapidoMeses = (meses) => {
    const fin = new Date();
    const ini = new Date();
    ini.setMonth(ini.getMonth() - meses);
    setFechaInicio(formatoYYYYMMDD(ini));
    setFechaFin(formatoYYYYMMDD(fin));
  };

  // Catálogo Maestro de los 10 Reportes
  const reportes = [
    // --- 1. OPERATIVOS ---
    {
      id: 'arqueo-caja',
      numero: 1,
      categoria: 'operativo',
      categoriaLabel: 'Operativo',
      icono: 'R1',
      titulo: 'Arqueo y Cierre Diario de Caja',
      descripcion: 'Cuadre de ingresos percibidos por ventas de mostrador clasificados por método de pago (Punto, Pago Móvil, Efectivo, etc.), total USD y total Bs.',
      metricas: [
        'Total recaudado en divisas ($) y bolívares (Bs.)',
        'Desglose detallado por cada método de pago',
        'Facturas emitidas y libros despachados',
        'Responsable de recepción que procesó la venta'
      ]
    },
    {
      id: 'stock-critico',
      numero: 2,
      categoria: 'operativo',
      categoriaLabel: 'Operativo',
      icono: 'R2',
      titulo: 'Alerta de Stock Crítico y Reposición',
      descripcion: 'Detección inmediata de libros agotados (0 unidades) o en estado crítico (≤ 5 unidades), asociándolos a su distribuidor para reabastecimiento.',
      metricas: [
        'Títulos con stock en cero (agotados)',
        'Ejemplares en reserva crítica (1 a 5 unidades)',
        'Casa distribuidora o proveedor asociado',
        'Precio de venta al público en mostrador'
      ]
    },
    {
      id: 'catalogo-generos',
      numero: 3,
      categoria: 'operativo',
      categoriaLabel: 'Operativo',
      icono: 'R3',
      titulo: 'Catálogo de Existencias por Género',
      descripcion: 'Inventario físico y títulos disponibles en tienda agrupados por género literario, sirviendo de guía de consulta directa para atención de lectores.',
      metricas: [
        'Listado completo de obras por categoría',
        'Ejemplares físicos disponibles en estantes',
        'Precio oficial de venta al público ($)',
        'Valoración total del catálogo en inventario'
      ]
    },

    // --- 2. GERENCIALES ---
    {
      id: 'rentabilidad-utilidades',
      numero: 4,
      categoria: 'gerencial',
      categoriaLabel: 'Gerencial',
      icono: 'R4',
      titulo: 'Estado de Rentabilidad y Utilidades',
      descripcion: 'Cálculo de la ganancia neta en dólares y porcentaje de margen de utilidad obtenido, comparando precio de venta vs. costo de compra.',
      metricas: [
        'Ingresos brutos por facturación ($)',
        'Costo real de adquisición de libros vendidos',
        'Utilidad neta obtenida en el período ($)',
        'Porcentaje de margen de ganancia comercial'
      ]
    },
    {
      id: 'ranking-libros',
      numero: 5,
      categoria: 'gerencial',
      categoriaLabel: 'Gerencial',
      icono: 'R5',
      titulo: 'Ranking de Libros y Rotación',
      descripcion: 'Identificación de los libros de mayor demanda comercial (Best Sellers) frente a los títulos con menor movimiento en el período evaluado.',
      metricas: [
        'Top de títulos con mayor volumen de venta',
        'Ejemplares rotados y despachados',
        'Total facturado por cada título ($)',
        'Porcentaje de aporte sobre la venta global'
      ]
    },
    {
      id: 'compras-distribuidores',
      numero: 6,
      categoria: 'gerencial',
      categoriaLabel: 'Gerencial',
      icono: 'R6',
      titulo: 'Balance de Compras a Proveedores',
      descripcion: 'Auditoría de inversiones y facturas de adquisición pagadas a distribuidoras y editoriales por concepto de compras de reabastecimiento.',
      metricas: [
        'Facturas de compra recibidas por proveedor',
        'Cantidad de ejemplares incorporados al stock',
        'Costo unitario y total invertido por lote ($)',
        'Distribuidora con mayor volumen facturado'
      ]
    },

    // --- 3. SUPERVISIÓN ---
    {
      id: 'auditoria-mermas',
      numero: 7,
      categoria: 'supervision',
      categoriaLabel: 'Supervisión',
      icono: 'R7',
      titulo: 'Auditoría de Mermas y Bajas de Stock',
      descripcion: 'Fiscalización de libros retirados de inventario por daños físicos, extravíos, fallas de imprenta o corrección de conteo, y su pérdida económica.',
      metricas: [
        'Ejemplares desincorporados del catálogo',
        'Motivo justificado de cada baja registrada',
        'Responsable administrativo que autorizó el ajuste',
        'Impacto económico estimado en costo ($)'
      ]
    },
    {
      id: 'rendimiento-personal',
      numero: 8,
      categoria: 'supervision',
      categoriaLabel: 'Supervisión',
      icono: 'R8',
      titulo: 'Rendimiento de Ventas por Personal',
      descripcion: 'Evaluación de productividad comercial de cada miembro del equipo de recepción, comparando facturas emitidas, recaudación y ticket promedio.',
      metricas: [
        'Total de facturas procesadas por trabajador',
        'Volumen de libros vendidos por empleado',
        'Recaudación total lograda en $ y Bs.',
        'Ticket promedio de compra por cliente'
      ]
    },
    {
      id: 'trazabilidad-horarios',
      numero: 9,
      categoria: 'supervision',
      categoriaLabel: 'Supervisión',
      icono: 'R9',
      titulo: 'Trazabilidad y Horarios de Conexión',
      descripcion: 'Control de asistencia, horarios de ingreso, tiempo total de permanencia en el sistema e IP de conexión de administradores y personal.',
      metricas: [
        'Fecha y hora exacta de inicio de sesión',
        'Hora de desconexión y tiempo total en línea',
        'Dirección IP y terminal de trabajo',
        'Monitoreo de sesiones activas en tiempo real'
      ]
    },

    // --- 4. PREDICCIONES E INTELIGENCIA COMERCIAL ---
    {
      id: 'predicciones-compras',
      numero: 10,
      categoria: 'prediccion',
      categoriaLabel: 'Predicciones',
      icono: 'R10',
      titulo: 'Predicción y Recomendación de Compra',
      descripcion: 'Proyección inteligente basada en el volumen de libros vendidos y la tracción por género literario para recomendar qué títulos y cuántas unidades pedir a cada distribuidor.',
      metricas: [
        'Demanda histórica por libro y tracción de su género literario',
        'Cantidad sugerida de ejemplares a comprar por proveedor',
        'Inversión estimada en costo ($) vs. ganancia neta proyectada ($)',
        'Nivel de prioridad de compra (Urgente, Tendencia o Stock Suficiente)'
      ]
    }
  ];

  // Filtrar según pestaña seleccionada y permisos de rol
  const reportesVisibles = reportes.filter((r) => {
    // Si el usuario es staff, ocultar de forma estricta los gerenciales, supervisión y predicciones
    if (!esAdmin && (r.categoria === 'gerencial' || r.categoria === 'supervision' || r.categoria === 'prediccion')) {
      return false;
    }
    if (tabActiva === 'todos') return true;
    return r.categoria === tabActiva;
  });

  return (
    <div className="centro-reportes-container">
      {/* Encabezado */}
      <div className="centro-reportes-header">
        <div className="centro-reportes-title">
          <h1>Centro de Reportes y Documentos Oficiales</h1>
          <p>Librería & Centro Cultural Minerva — Emisión de reportes estructurados listos para imprimir o guardar en PDF</p>
        </div>
        <span className="centro-reportes-tag">
          Módulo Exclusivo de Administrador (10 Reportes)
        </span>
      </div>

      {/* BARRA DE RANGO DE FECHAS PERSONALIZADO LIBRE */}
      <div className="centro-reportes-filtro-fechas">
        <div className="filtro-fechas-info">
          <div className="filtro-fechas-titulo">
            <strong>Rango de Fechas Personalizado:</strong>
          </div>
          <p className="filtro-fechas-sub">
            Indica cualquier fecha inicial y final que desees auditar. Los 10 reportes se generarán con este período exacto (o déjalo en blanco para ver todo el histórico).
          </p>
        </div>

        <div className="filtro-fechas-controles">
          <div className="filtro-fecha-campo">
            <label htmlFor="fecha-desde-centro">Fecha Desde:</label>
            <input
              id="fecha-desde-centro"
              type="date"
              className="filtro-fecha-input"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              title="Selecciona la fecha inicial deseada"
            />
          </div>

          <div className="filtro-fecha-campo">
            <label htmlFor="fecha-hasta-centro">Fecha Hasta:</label>
            <input
              id="fecha-hasta-centro"
              type="date"
              className="filtro-fecha-input"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              title="Selecciona la fecha final deseada"
            />
          </div>

          <div className="filtro-fecha-campo">
            <label htmlFor="filtro-pago-centro">Método de Pago:</label>
            <select
              id="filtro-pago-centro"
              className="filtro-fecha-input filtro-select-pago"
              value={filtroMetodoPago}
              onChange={(e) => setFiltroMetodoPago(e.target.value)}
              title="Filtrar ventas por método de pago específico"
            >
              <option value="todos">Todos los Métodos</option>
              {metodosDisponibles.map((m) => (
                <option key={m.id || m.nombre} value={m.nombre}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="filtro-rango-badge">
            {calculoRangoTexto}
          </div>
        </div>

        <div className="filtro-atajos-row">
          <span className="filtro-atajos-label">Atajos sugeridos (opcionales):</span>
          <button 
            type="button" 
            className="btn-atajo-fecha" 
            onClick={() => {
              const hoyStr = formatoYYYYMMDD(new Date());
              setFechaInicio(hoyStr);
              setFechaFin(hoyStr);
            }}
          >
            1 día
          </button>
          <button type="button" className="btn-atajo-fecha" onClick={() => setRangoRapidoDias(7)}>
            7 días
          </button>
          <button type="button" className="btn-atajo-fecha" onClick={() => setRangoRapidoDias(14)}>
            14 días
          </button>
          <button type="button" className="btn-atajo-fecha" onClick={() => setRangoRapidoDias(21)}>
            21 días
          </button>
          <button type="button" className="btn-atajo-fecha" onClick={() => setRangoRapidoMeses(1)}>
            1 mes
          </button>
          <button type="button" className="btn-atajo-fecha" onClick={() => setRangoRapidoMeses(3)}>
            3 meses
          </button>
          <button type="button" className="btn-atajo-fecha" onClick={() => setRangoRapidoMeses(6)}>
            6 meses
          </button>
          <button 
            type="button" 
            className="btn-atajo-fecha btn-atajo-clear" 
            onClick={() => {
              setFechaInicio('');
              setFechaFin('');
              setFiltroMetodoPago('todos');
            }}
            title="Quitar filtros de fecha y método de pago"
          >
            Ver Todo el Histórico
          </button>
        </div>
      </div>

      {/* Pestañas de Categoría */}
      <div className="centro-reportes-tabs">
        <button
          type="button"
          className={`centro-tab-btn ${tabActiva === 'todos' ? 'active' : ''}`}
          onClick={() => setTabActiva('todos')}
        >
          Todos los Reportes
          <span className="tab-tag-count">{esAdmin ? 10 : 3}</span>
        </button>

        <button
          type="button"
          className={`centro-tab-btn ${tabActiva === 'operativo' ? 'active' : ''}`}
          onClick={() => setTabActiva('operativo')}
        >
          Reportes Operativos
          <span className="tab-tag-count">3</span>
        </button>

        {esAdmin && (
          <>
            <button
              type="button"
              className={`centro-tab-btn ${tabActiva === 'gerencial' ? 'active' : ''}`}
              onClick={() => setTabActiva('gerencial')}
            >
              Reportes Gerenciales
              <span className="tab-tag-count">3</span>
            </button>

            <button
              type="button"
              className={`centro-tab-btn ${tabActiva === 'supervision' ? 'active' : ''}`}
              onClick={() => setTabActiva('supervision')}
            >
              Reportes de Supervisión
              <span className="tab-tag-count">3</span>
            </button>

            <button
              type="button"
              className={`centro-tab-btn ${tabActiva === 'prediccion' ? 'active' : ''}`}
              onClick={() => setTabActiva('prediccion')}
            >
              Predicciones
              <span className="tab-tag-count">1</span>
            </button>
          </>
        )}
      </div>

      {/* Grilla de Tarjetas */}
      <div className="reportes-cards-grid">
        {reportesVisibles.map((rep) => (
          <div key={rep.id} className="reporte-card">
            <div>
              <div className="reporte-card-header">
                <div className={`reporte-card-icon icon-${rep.categoria}`} style={{ fontSize: '1rem', fontWeight: 800 }}>
                  {rep.icono}
                </div>
                <div className="reporte-card-info">
                  <span className={`reporte-card-badge badge-${rep.categoria}-text`}>
                    Reporte #{rep.numero} • {rep.categoriaLabel}
                  </span>
                  <h3 className="reporte-card-title">{rep.titulo}</h3>
                  <p className="reporte-card-desc">{rep.descripcion}</p>
                </div>
              </div>

              <div className="reporte-card-metrics-preview" style={{ marginTop: '1rem' }}>
                <div className="metrics-preview-title">Información y Cálculos Incluidos:</div>
                <ul className="metrics-preview-list">
                  {rep.metricas.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              type="button"
              className="btn-launch-report"
              onClick={() => onAbrirReporte(rep.id, { fechaInicio, fechaFin, filtroMetodoPago })}
            >
              Generar Reporte PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
