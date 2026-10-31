import { useState, useMemo, useEffect } from 'react';
import './ModalReporte.css';
import logo from '../../assets/Logo.png';
import { apiGetSesionesBitacora } from '../../services/api';

/**
 * Motor Maestro de Generación de Reportes en PDF / Imprimibles
 * Librería & Centro Cultural Minerva, C.A.
 */
const METODOS_PAGO_DEFAULT = [
  { id: 'punto-venta', nombre: 'Punto de Venta' },
  { id: 'pago-movil', nombre: 'Pago Móvil' },
  { id: 'transferencia', nombre: 'Transferencia Bancaria' },
  { id: 'efectivo', nombre: 'Efectivo' }
];

const PALETA_GRAFICA = [
  '#1e3a8a',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#0284c7',
  '#dc2626',
  '#4f46e5',
  '#0d9488'
];

export default function ModalReporte({
  tipoReporte = 'arqueo-caja',
  onClose,
  usuarioActual,
  ventas = [],
  libros = [],
  distribuidores = [],
  historialEntradas = [],
  historialAjustes = [],
  fechaInicioProp = '',
  fechaFinProp = '',
  filtroMetodoPagoProp = 'todos',
  metodosPago
}) {
  const metodosDisponibles = metodosPago && metodosPago.length > 0 ? metodosPago : METODOS_PAGO_DEFAULT;
  const ahora = new Date();
  const formatoYYYYMMDD = (d) => d.toISOString().split('T')[0];

  // Tasa oficial BCV sincronizada en el sistema
  const tasaBCV = useMemo(() => {
    const guardada = localStorage.getItem('biblioteca_tasa_bcv');
    const num = guardada ? parseFloat(guardada) : 36.50;
    return num > 0 ? num : 36.50;
  }, []);

  const formatBs = (montoBs) =>
    `Bs. ${Number(montoBs || 0).toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  // Celda compacta con valor en USD ($) y equivalente en Bolívares (Bs.)
  const renderMontoDual = (montoUSD, montoBsExplicito = null, prefijo = '') => {
    const usd = Number(montoUSD || 0);
    const bs = montoBsExplicito !== null && montoBsExplicito !== undefined ? Number(montoBsExplicito) : usd * tasaBCV;
    return (
      <div className="celda-monto-dual">
        <span className="monto-usd">{prefijo}${usd.toFixed(2)}</span>
        <span className="monto-bs">{prefijo}{formatBs(bs)}</span>
      </div>
    );
  };

  const formatearFechaVisual = (fechaISO) => {
    if (!fechaISO) return '';
    const partes = fechaISO.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return fechaISO;
  };

  // Rango de fechas libre elegido por el usuario (sincronizado con props si se indican)
  const [fechaFin, setFechaFin] = useState(() => {
    if (fechaFinProp !== undefined && fechaFinProp !== null && fechaFinProp !== '') {
      return fechaFinProp;
    }
    if (fechaFinProp === '') return '';
    return formatoYYYYMMDD(ahora);
  });

  const [fechaInicio, setFechaInicio] = useState(() => {
    if (fechaInicioProp !== undefined && fechaInicioProp !== null && fechaInicioProp !== '') {
      return fechaInicioProp;
    }
    if (fechaInicioProp === '') return '';
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatoYYYYMMDD(d);
  });

  // Filtro de método de pago seleccionado
  const [filtroMetodoPago, setFiltroMetodoPago] = useState(() => {
    return filtroMetodoPagoProp || 'todos';
  });

  // Tipo de visualización gráfica al final del reporte ('ambas' | 'pastel' | 'tubitos')
  const [tipoGrafica, setTipoGrafica] = useState('ambas');

  // Sincronizar si cambian las props
  useEffect(() => {
    if (fechaInicioProp !== undefined && fechaInicioProp !== null) {
      setFechaInicio(fechaInicioProp);
    }
  }, [fechaInicioProp]);

  useEffect(() => {
    if (fechaFinProp !== undefined && fechaFinProp !== null) {
      setFechaFin(fechaFinProp);
    }
  }, [fechaFinProp]);

  useEffect(() => {
    if (filtroMetodoPagoProp !== undefined && filtroMetodoPagoProp !== null) {
      setFiltroMetodoPago(filtroMetodoPagoProp);
    }
  }, [filtroMetodoPagoProp]);

  const [sesionesData, setSesionesData] = useState([]);

  // Cálculo en vivo del intervalo seleccionado por el usuario
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
    return `${diffDays} días seleccionados (${formatearFechaVisual(fechaInicio)} al ${formatearFechaVisual(fechaFin)})`;
  }, [fechaInicio, fechaFin]);

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

  useEffect(() => {
    if (tipoReporte === 'trazabilidad-horarios') {
      apiGetSesionesBitacora({ limit: 300 })
        .then((res) => {
          if (res.ok) setSesionesData(res.sesiones || []);
        })
        .catch((err) => console.warn('Error cargando sesiones para reporte:', err));
    }
  }, [tipoReporte]);

  const fechaEmision = useMemo(() => {
    const d = new Date();
    return {
      fecha: d.toLocaleDateString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      hora: d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    };
  }, []);

  const estaEnRango = (fechaItem) => {
    if (!fechaItem) return false;
    if (!fechaInicio && !fechaFin) return true;
    const item = fechaItem.split('T')[0];
    if (fechaInicio && item < fechaInicio) return false;
    if (fechaFin && item > fechaFin) return false;
    return true;
  };

  const coincideMetodoPago = (metodoVenta) => {
    if (!filtroMetodoPago || filtroMetodoPago === 'todos') return true;
    if (!metodoVenta) return false;
    if (filtroMetodoPago === 'Transferencia Bancaria') {
      return metodoVenta.toLowerCase().includes('transferencia');
    }
    if (filtroMetodoPago === 'Pago Móvil') {
      return metodoVenta.toLowerCase().includes('móvil') || metodoVenta.toLowerCase().includes('movil');
    }
    if (filtroMetodoPago === 'Efectivo') {
      return metodoVenta.toLowerCase().includes('efectivo');
    }
    if (filtroMetodoPago === 'Punto de Venta') {
      return metodoVenta.toLowerCase().includes('punto');
    }
    return metodoVenta.toLowerCase() === filtroMetodoPago.toLowerCase();
  };

  // ========================================================
  // DEFINICIONES DE LOS 10 REPORTES, TABLAS EN $ / BS., IVA (16%) Y GRÁFICAS
  // ========================================================
  const obtenerMontosVenta = (v) => {
    const tasa = Number(v.tasaCambio) || tasaBCV;
    const sumaItemsBase = (v.items || []).reduce(
      (acc, it) => acc + (Number(it.precio ?? it.precioUnitario) || 0) * (Number(it.cantidad) || 1),
      0
    );
    const subtotal =
      Number(v.subtotal) > 0
        ? Number(v.subtotal)
        : sumaItemsBase > 0
        ? parseFloat(sumaItemsBase.toFixed(2))
        : parseFloat((Number(v.total || 0) / 1.16).toFixed(2));
    const montoIva =
      Number(v.montoIva) > 0
        ? Number(v.montoIva)
        : parseFloat((subtotal * 0.16).toFixed(2));
    const total = parseFloat((subtotal + montoIva).toFixed(2));
    return {
      subtotal,
      montoIva,
      total,
      tasa,
      subtotalBs: subtotal * tasa,
      montoIvaBs: montoIva * tasa,
      totalBs: total * tasa
    };
  };

  const reporteConfig = useMemo(() => {
    switch (tipoReporte) {
      // ----------------------------------------------------
      // REPORTE 1: ARQUEO Y CIERRE DIARIO DE CAJA (Operativo)
      // ----------------------------------------------------
      case 'arqueo-caja': {
        const ventasFiltradas = ventas.filter((v) => estaEnRango(v.fecha) && coincideMetodoPago(v.metodoPago));
        let totalSubtotalUSD = 0;
        let totalSubtotalBs = 0;
        let totalIvaUSD = 0;
        let totalIvaBs = 0;
        let totalUSD = 0;
        let totalBs = 0;
        let totalLibros = 0;

        const porMetodo = {};
        ventasFiltradas.forEach((v) => {
          const m = obtenerMontosVenta(v);
          totalSubtotalUSD += m.subtotal;
          totalSubtotalBs += m.subtotalBs;
          totalIvaUSD += m.montoIva;
          totalIvaBs += m.montoIvaBs;
          totalUSD += m.total;
          totalBs += m.totalBs;
          totalLibros += Number(v.totalArticulos) || 0;

          const metodo = v.metodoPago || 'Otro';
          porMetodo[metodo] = (porMetodo[metodo] || 0) + m.total;
        });

        const datosGrafica = Object.entries(porMetodo)
          .sort((a, b) => b[1] - a[1])
          .map(([etiqueta, valor]) => ({
            etiqueta,
            valor: parseFloat(valor.toFixed(2)),
            esMonetario: true
          }));

        return {
          numero: 1,
          categoria: 'Operativo',
          badgeClass: 'badge-cat-operativo',
          titulo: 'Arqueo y Cierre Diario de Caja (con Desglose de IVA 16%)',
          explicacion: `Consolida todas las transacciones de venta procesadas en el período seleccionado${filtroMetodoPago !== 'todos' ? ` (Filtrado por: ${filtroMetodoPago})` : ''}, detallando la Base Imponible, el IVA (16%) y el Total Facturado tanto en divisas ($) como en bolívares (Bs.).`,
          kpis: [
            { label: 'Base Imponible ($)', valor: `$${totalSubtotalUSD.toFixed(2)}`, sub: formatBs(totalSubtotalBs) },
            { label: 'IVA Recaudado (16%)', valor: `$${totalIvaUSD.toFixed(2)}`, sub: formatBs(totalIvaBs) },
            { label: 'Total Facturado c/IVA', valor: `$${totalUSD.toFixed(2)}`, sub: formatBs(totalBs) },
            { label: 'Facturas / Ejemplares', valor: `${ventasFiltradas.length} fact. (${totalLibros} uds.)` }
          ],
          columnas: ['N° Factura', 'Fecha y Hora', 'Lector', 'Método de Pago', 'Art.', 'Base Imponible ($ / Bs.)', 'IVA 16% ($ / Bs.)', 'Total c/IVA ($ / Bs.)'],
          filas: ventasFiltradas.map((v) => {
            const m = obtenerMontosVenta(v);
            return [
              v.nroFactura || `FAC-${v.id}`,
              `${v.fecha} ${v.hora || ''}`,
              v.cliente?.nombre || 'Lector General',
              v.metodoPago,
              v.totalArticulos || 1,
              renderMontoDual(m.subtotal, m.subtotalBs),
              renderMontoDual(m.montoIva, m.montoIvaBs, '+'),
              renderMontoDual(m.total, m.totalBs)
            ];
          }),
          totales: [
            'TOTAL GENERAL',
            `${ventasFiltradas.length} facturas`,
            '—',
            '—',
            totalLibros,
            renderMontoDual(totalSubtotalUSD, totalSubtotalBs),
            renderMontoDual(totalIvaUSD, totalIvaBs, '+'),
            renderMontoDual(totalUSD, totalBs)
          ],
          grafica: {
            titulo: 'Distribución de Ingresos con IVA por Método de Pago',
            subtitulo: 'Proporción del monto total facturado (con IVA 16% incluido) según la forma de pago',
            esMonetario: true,
            unidad: 'USD',
            datos: datosGrafica
          }
        };
      }

      // ----------------------------------------------------
      // REPORTE 2: ALERTA DE STOCK CRÍTICO Y REPOSICIÓN (Operativo)
      // ----------------------------------------------------
      case 'stock-critico': {
        const librosRiesgo = libros
          .filter((l) => (l.ejemplares || 0) <= 5)
          .sort((a, b) => (a.ejemplares || 0) - (b.ejemplares || 0));

        const agotados = libros.filter((l) => (l.ejemplares || 0) === 0).length;
        const criticos = libros.filter((l) => (l.ejemplares || 0) > 0 && (l.ejemplares || 0) <= 5).length;
        const optimos = libros.filter((l) => (l.ejemplares || 0) > 5).length;

        return {
          numero: 2,
          categoria: 'Operativo',
          badgeClass: 'badge-cat-operativo',
          titulo: 'Alerta de Stock Crítico y Necesidad de Reposición',
          explicacion: 'Identifica de forma prioritaria los títulos que presentan 5 o menos ejemplares en el catálogo, detallando su casa distribuidora, precio base, IVA (16%) y precio de venta al público en divisas y bolívares.',
          kpis: [
            { label: 'Títulos en Riesgo', valor: librosRiesgo.length },
            { label: 'Agotados (Stock 0)', valor: agotados },
            { label: 'Stock Bajo (1 a 5)', valor: criticos },
            { label: 'Total Catálogo Activo', valor: libros.length }
          ],
          columnas: ['ISBN', 'Título de la Obra', 'Autor', 'Género', 'Distribuidor / Proveedor', 'Precio Base ($ / Bs.)', 'PVP c/IVA 16% ($ / Bs.)', 'Stock', 'Alerta'],
          filas: librosRiesgo.map((l) => {
            const base = Number(l.precio) || 0;
            const conIva = parseFloat((base * 1.16).toFixed(2));
            return [
              l.isbn,
              l.titulo,
              l.autor,
              l.categoria,
              l.distribuidor || 'Distribución Directa',
              renderMontoDual(base),
              renderMontoDual(conIva),
              `${l.ejemplares} uds.`,
              l.ejemplares === 0 ? 'AGOTADO' : 'CRÍTICO'
            ];
          }),
          totales: [
            'TOTAL EN RIESGO',
            `${librosRiesgo.length} títulos`,
            '—',
            '—',
            '—',
            '—',
            '—',
            `${librosRiesgo.reduce((acc, l) => acc + (l.ejemplares || 0), 0)} uds.`,
            `${agotados} agotados`
          ],
          grafica: {
            titulo: 'Estado de Disponibilidad del Catálogo General',
            subtitulo: 'Distribución de títulos según nivel de alerta de inventario y stock disponible',
            esMonetario: false,
            unidad: 'títulos',
            datos: [
              { etiqueta: 'Stock Crítico (1 a 5 uds.)', valor: criticos },
              { etiqueta: 'Stock Saludable (> 5 uds.)', valor: optimos },
              { etiqueta: 'Agotados (0 uds.)', valor: agotados }
            ].filter((d) => d.valor > 0)
          }
        };
      }

      // ----------------------------------------------------
      // REPORTE 3: CATÁLOGO DE EXISTENCIAS POR GÉNERO (Operativo)
      // ----------------------------------------------------
      case 'catalogo-generos': {
        const librosOrdenados = [...libros].sort((a, b) => (a.categoria || '').localeCompare(b.categoria || ''));
        const totalEjemplares = librosOrdenados.reduce((acc, l) => acc + (l.ejemplares || 0), 0);
        const valorInventarioBase = librosOrdenados.reduce((acc, l) => acc + (l.ejemplares || 0) * (l.precio || 0), 0);
        const valorIvaInventario = parseFloat((valorInventarioBase * 0.16).toFixed(2));
        const valorInventarioConIva = parseFloat((valorInventarioBase + valorIvaInventario).toFixed(2));

        const porGeneroValor = {};
        librosOrdenados.forEach((l) => {
          const gen = l.categoria || 'General';
          porGeneroValor[gen] = (porGeneroValor[gen] || 0) + (l.ejemplares || 0) * (l.precio || 0) * 1.16;
        });

        const datosGrafica = Object.entries(porGeneroValor)
          .sort((a, b) => b[1] - a[1])
          .map(([etiqueta, valor]) => ({
            etiqueta,
            valor: parseFloat(valor.toFixed(2)),
            esMonetario: true
          }));

        return {
          numero: 3,
          categoria: 'Operativo',
          badgeClass: 'badge-cat-operativo',
          titulo: 'Catálogo de Existencias Físicas por Género (con IVA 16%)',
          explicacion: 'Muestra el inventario disponible en mostrador clasificado por género literario, detallando Precio Base, IVA (16%) y Precio Final con IVA tanto en dólares ($) como en bolívares (Bs.).',
          kpis: [
            { label: 'Títulos / Ejemplares', valor: `${librosOrdenados.length} tít. (${totalEjemplares} uds.)` },
            { label: 'Valor Base (s/IVA)', valor: `$${valorInventarioBase.toFixed(2)}`, sub: formatBs(valorInventarioBase * tasaBCV) },
            { label: 'IVA Estimado (16%)', valor: `$${valorIvaInventario.toFixed(2)}`, sub: formatBs(valorIvaInventario * tasaBCV) },
            { label: 'Valor Total c/IVA', valor: `$${valorInventarioConIva.toFixed(2)}`, sub: formatBs(valorInventarioConIva * tasaBCV) }
          ],
          columnas: ['N°', 'Género', 'Título de la Obra', 'Autor', 'Base Unit. ($ / Bs.)', 'IVA 16% ($ / Bs.)', 'PVP c/IVA ($ / Bs.)', 'Stock', 'Valor Total c/IVA ($ / Bs.)'],
          filas: librosOrdenados.map((l, idx) => {
            const base = Number(l.precio) || 0;
            const ivaUnit = parseFloat((base * 0.16).toFixed(2));
            const pvpConIva = parseFloat((base + ivaUnit).toFixed(2));
            const valorFilaConIva = (l.ejemplares || 0) * pvpConIva;
            return [
              idx + 1,
              l.categoria,
              l.titulo,
              l.autor,
              renderMontoDual(base),
              renderMontoDual(ivaUnit, null, '+'),
              renderMontoDual(pvpConIva),
              `${l.ejemplares} uds.`,
              renderMontoDual(valorFilaConIva)
            ];
          }),
          totales: [
            'TOTAL',
            '—',
            `${librosOrdenados.length} títulos`,
            '—',
            renderMontoDual(valorInventarioBase),
            renderMontoDual(valorIvaInventario, null, '+'),
            '—',
            `${totalEjemplares} uds.`,
            renderMontoDual(valorInventarioConIva)
          ],
          grafica: {
            titulo: 'Valorización del Inventario con IVA por Género Literario',
            subtitulo: 'Distribución del valor comercial con IVA (16%) en tienda ($) y Bolívares (Bs.) según categoría',
            esMonetario: true,
            unidad: 'USD',
            datos: datosGrafica
          }
        };
      }

      // ----------------------------------------------------
      // REPORTE 4: ESTADO DE RENTABILIDAD Y UTILIDADES (Gerencial - Admin)
      // ----------------------------------------------------
      case 'rentabilidad-utilidades': {
        const ventasFiltradas = ventas.filter((v) => estaEnRango(v.fecha) && coincideMetodoPago(v.metodoPago));
        
        let ingresosBaseTotales = 0;
        let ivaTotalTrasladado = 0;
        let ingresosConIvaTotales = 0;
        let costoTotalMercancia = 0;
        const utilidadPorLibro = {};
        const filasItems = [];

        ventasFiltradas.forEach((v) => {
          (v.items || []).forEach((it) => {
            const itemLibroId = it.libroId ?? it.id;
            const libroRef = libros.find(
              (l) => (itemLibroId !== undefined && Number(l.id) === Number(itemLibroId)) || l.titulo === it.titulo
            );
            const costoUnit = Number(libroRef?.precioCosto) || 0.0;
            const precioBaseUnit = Number(it.precio ?? it.precioUnitario ?? libroRef?.precio) || 0.0;
            const cant = Number(it.cantidad) || 1;

            const subtotalBase = precioBaseUnit * cant;
            const subtotalIva = parseFloat((subtotalBase * 0.16).toFixed(2));
            const totalConIva = parseFloat((subtotalBase + subtotalIva).toFixed(2));
            const subtotalCosto = costoUnit * cant;
            const ganancia = subtotalBase - subtotalCosto;
            const margenPct = subtotalBase > 0 ? ((ganancia / subtotalBase) * 100) : 0;

            ingresosBaseTotales += subtotalBase;
            ivaTotalTrasladado += subtotalIva;
            ingresosConIvaTotales += totalConIva;
            costoTotalMercancia += subtotalCosto;
            utilidadPorLibro[it.titulo] = (utilidadPorLibro[it.titulo] || 0) + ganancia;

            filasItems.push([
              v.nroFactura,
              v.fecha,
              it.titulo,
              cant,
              renderMontoDual(costoUnit),
              renderMontoDual(subtotalBase),
              renderMontoDual(subtotalIva, null, '+'),
              renderMontoDual(totalConIva),
              renderMontoDual(subtotalCosto),
              renderMontoDual(ganancia),
              `${margenPct.toFixed(1)}%`
            ]);
          });
        });

        const gananciaNetaGlobal = ingresosBaseTotales - costoTotalMercancia;
        const margenGlobalPct = ingresosBaseTotales > 0 ? ((gananciaNetaGlobal / ingresosBaseTotales) * 100) : 0;

        const datosGrafica = Object.entries(utilidadPorLibro)
          .sort((a, b) => b[1] - a[1])
          .map(([etiqueta, valor]) => ({
            etiqueta,
            valor: parseFloat(Math.max(0, valor).toFixed(2)),
            esMonetario: true
          }));

        return {
          numero: 4,
          categoria: 'Gerencial',
          badgeClass: 'badge-cat-gerencial',
          titulo: 'Estado de Rentabilidad, IVA (16%) y Márgenes de Utilidad',
          explicacion: 'Evalúa la rentabilidad real comparando la Base Imponible de ventas frente al costo de adquisición, separando el IVA (16%) recaudado para determinar la utilidad neta real en dólares ($) y bolívares (Bs.).',
          kpis: [
            { label: 'Base Imponible Ventas', valor: `$${ingresosBaseTotales.toFixed(2)}`, sub: formatBs(ingresosBaseTotales * tasaBCV) },
            { label: 'IVA Recaudado (16%)', valor: `$${ivaTotalTrasladado.toFixed(2)}`, sub: formatBs(ivaTotalTrasladado * tasaBCV) },
            { label: 'Costo de Mercancía', valor: `$${costoTotalMercancia.toFixed(2)}`, sub: formatBs(costoTotalMercancia * tasaBCV) },
            { label: 'Utilidad Neta Real', valor: `$${gananciaNetaGlobal.toFixed(2)} (${margenGlobalPct.toFixed(1)}%)`, sub: formatBs(gananciaNetaGlobal * tasaBCV) }
          ],
          columnas: ['Factura', 'Fecha', 'Libro Facturado', 'Cant.', 'Costo Unit.', 'Base Imponible', 'IVA (16%)', 'Total c/IVA', 'Costo Total', 'Utilidad Neta', 'Margen'],
          filas: filasItems,
          totales: [
            'TOTALES',
            '—',
            `${filasItems.length} ítems`,
            filasItems.reduce((acc, f) => acc + f[3], 0),
            '—',
            renderMontoDual(ingresosBaseTotales),
            renderMontoDual(ivaTotalTrasladado, null, '+'),
            renderMontoDual(ingresosConIvaTotales),
            renderMontoDual(costoTotalMercancia),
            renderMontoDual(gananciaNetaGlobal),
            `${margenGlobalPct.toFixed(1)}%`
          ],
          grafica: {
            titulo: 'Utilidad Neta Generada por Título ($ / Bs.)',
            subtitulo: 'Comparativa de ganancia neta real (sin IVA) aportada por cada libro vendido',
            esMonetario: true,
            unidad: 'USD',
            datos: datosGrafica
          }
        };
      }

      // ----------------------------------------------------
      // REPORTE 5: RANKING DE LIBROS Y ROTACIÓN (Gerencial - Admin)
      // ----------------------------------------------------
      case 'ranking-libros': {
        const ventasFiltradas = ventas.filter((v) => estaEnRango(v.fecha) && coincideMetodoPago(v.metodoPago));
        const conteoLibros = {};

        ventasFiltradas.forEach((v) => {
          (v.items || []).forEach((it) => {
            const key = it.titulo;
            if (!conteoLibros[key]) {
              const libroRef = libros.find((l) => l.titulo === it.titulo);
              conteoLibros[key] = {
                titulo: it.titulo,
                autor: it.autor || libroRef?.autor || '—',
                categoria: libroRef?.categoria || 'General',
                unidadesVendidas: 0,
                baseRecaudada: 0,
                ivaRecaudado: 0,
                totalRecaudado: 0
              };
            }
            const cant = Number(it.cantidad) || 1;
            const precioUnit = Number(it.precio ?? it.precioUnitario) || 0;
            const baseItem = precioUnit * cant;
            const ivaItem = parseFloat((baseItem * 0.16).toFixed(2));
            conteoLibros[key].unidadesVendidas += cant;
            conteoLibros[key].baseRecaudada += baseItem;
            conteoLibros[key].ivaRecaudado += ivaItem;
            conteoLibros[key].totalRecaudado += baseItem + ivaItem;
          });
        });

        const rankingArray = Object.values(conteoLibros).sort((a, b) => b.unidadesVendidas - a.unidadesVendidas);
        const totalEjemplaresVendidos = rankingArray.reduce((acc, r) => acc + r.unidadesVendidas, 0);
        const totalBaseRanking = rankingArray.reduce((acc, r) => acc + r.baseRecaudada, 0);
        const totalIvaRanking = rankingArray.reduce((acc, r) => acc + r.ivaRecaudado, 0);
        const totalDineroRanking = rankingArray.reduce((acc, r) => acc + r.totalRecaudado, 0);

        return {
          numero: 5,
          categoria: 'Gerencial',
          badgeClass: 'badge-cat-gerencial',
          titulo: 'Ranking de Libros y Facturación con IVA (16%)',
          explicacion: 'Muestra la demanda y rotación de cada título en el período seleccionado, detallando unidades vendidas, Base Imponible, IVA (16%) y Total Facturado en divisas ($) y bolívares (Bs.).',
          kpis: [
            { label: 'Ejemplares Rotados', valor: `${totalEjemplaresVendidos} uds. (${rankingArray.length} tít.)` },
            { label: 'Base Imponible', valor: `$${totalBaseRanking.toFixed(2)}`, sub: formatBs(totalBaseRanking * tasaBCV) },
            { label: 'IVA Generado (16%)', valor: `$${totalIvaRanking.toFixed(2)}`, sub: formatBs(totalIvaRanking * tasaBCV) },
            { label: 'Total Facturado c/IVA', valor: `$${totalDineroRanking.toFixed(2)}`, sub: formatBs(totalDineroRanking * tasaBCV) }
          ],
          columnas: ['Pos.', 'Título de la Obra', 'Autor', 'Género', 'Vendidos', 'Base Imponible ($ / Bs.)', 'IVA 16% ($ / Bs.)', 'Total c/IVA ($ / Bs.)', '%'],
          filas: rankingArray.map((r, i) => [
            `#${i + 1}`,
            r.titulo,
            r.autor,
            r.categoria,
            `${r.unidadesVendidas} uds.`,
            renderMontoDual(r.baseRecaudada),
            renderMontoDual(r.ivaRecaudado, null, '+'),
            renderMontoDual(r.totalRecaudado),
            `${totalDineroRanking > 0 ? ((r.totalRecaudado / totalDineroRanking) * 100).toFixed(1) : 0}%`
          ]),
          totales: [
            'TOTAL',
            `${rankingArray.length} títulos`,
            '—',
            '—',
            `${totalEjemplaresVendidos} uds.`,
            renderMontoDual(totalBaseRanking),
            renderMontoDual(totalIvaRanking, null, '+'),
            renderMontoDual(totalDineroRanking),
            '100.0%'
          ],
          grafica: {
            titulo: 'Participación de Ventas con IVA por Libro Más Vendido',
            subtitulo: 'Facturación total con IVA ($ / Bs.) por cada título dentro del ranking de ventas',
            esMonetario: true,
            unidad: 'USD',
            datos: rankingArray.map((r) => ({
              etiqueta: r.titulo,
              valor: parseFloat(r.totalRecaudado.toFixed(2)),
              esMonetario: true
            }))
          }
        };
      }

      // ----------------------------------------------------
      // REPORTE 6: BALANCE DE COMPRAS A DISTRIBUIDORES (Gerencial - Admin)
      // ----------------------------------------------------
      case 'compras-distribuidores': {
        const entradasFiltradas = historialEntradas.filter((e) => estaEnRango(e.fecha));
        const totalInversion = entradasFiltradas.reduce((acc, e) => acc + (Number(e.costoTotal) || 0), 0);
        const totalLibrosIngresados = entradasFiltradas.reduce((acc, e) => acc + (Number(e.cantidadIngresada) || 0), 0);

        const porDistribuidor = {};
        entradasFiltradas.forEach((e) => {
          const dist = e.distribuidor || 'Distribuidor';
          porDistribuidor[dist] = (porDistribuidor[dist] || 0) + (Number(e.costoTotal) || 0);
        });

        return {
          numero: 6,
          categoria: 'Gerencial',
          badgeClass: 'badge-cat-gerencial',
          titulo: 'Balance de Compras e Inversión por Distribuidor',
          explicacion: 'Audita los desembolsos e inversiones realizadas a casas distribuidoras y editoriales por concepto de compras de reposición de inventario, reflejando costos en dólares ($) y bolívares (Bs.).',
          kpis: [
            { label: 'Facturas de Compra', valor: entradasFiltradas.length },
            { label: 'Ejemplares Adquiridos', valor: `${totalLibrosIngresados} uds.` },
            { label: 'Inversión en Compras', valor: `$${totalInversion.toFixed(2)}`, sub: formatBs(totalInversion * tasaBCV) },
            { label: 'Distribuidores Activos', valor: distribuidores.length }
          ],
          columnas: ['Fecha', 'N° Factura Prov.', 'Casa Distribuidora', 'Libro Reabastecido', 'Cant.', 'Costo Unit. ($ / Bs.)', 'Costo Total ($ / Bs.)', 'Responsable'],
          filas: entradasFiltradas.map((e) => [
            e.fecha,
            e.nroFacturaProveedor,
            e.distribuidor || 'Distribuidor',
            e.libroTitulo || 'Libro',
            `${e.cantidadIngresada} uds.`,
            renderMontoDual(e.costoUnitario || 0),
            renderMontoDual(e.costoTotal || 0),
            e.responsable || 'Administrador'
          ]),
          totales: [
            'TOTAL GENERAL',
            `${entradasFiltradas.length} entradas`,
            '—',
            '—',
            `${totalLibrosIngresados} uds.`,
            '—',
            renderMontoDual(totalInversion),
            '—'
          ],
          grafica: {
            titulo: 'Inversión en Compras por Casa Distribuidora ($ / Bs.)',
            subtitulo: 'Proporción del capital invertido en reabastecimiento según proveedor editorial',
            esMonetario: true,
            unidad: 'USD',
            datos: Object.entries(porDistribuidor)
              .sort((a, b) => b[1] - a[1])
              .map(([etiqueta, valor]) => ({
                etiqueta,
                valor: parseFloat(valor.toFixed(2)),
                esMonetario: true
              }))
          }
        };
      }

      // ----------------------------------------------------
      // REPORTE 7: AUDITORÍA DE MERMAS Y BAJAS (Supervisión - Admin)
      // ----------------------------------------------------
      case 'auditoria-mermas': {
        const bajasFiltradas = historialAjustes.filter((b) => estaEnRango(b.fecha));
        const totalDescontado = bajasFiltradas.reduce((acc, b) => acc + (Number(b.cantidadDescontada) || 0), 0);
        
        let perdidaTotalEstimada = 0;
        const porLibroBaja = {};

        const filasBajas = bajasFiltradas.map((b) => {
          const libroRef = libros.find((l) => l.titulo === b.libroTitulo || l.id === b.libroId);
          const costoUnit = Number(libroRef?.precioCosto) || 0.0;
          const perdidaLote = costoUnit * (Number(b.cantidadDescontada) || 1);
          perdidaTotalEstimada += perdidaLote;
          const nombreLibro = b.libroTitulo || 'Libro';
          porLibroBaja[nombreLibro] = (porLibroBaja[nombreLibro] || 0) + perdidaLote;

          return [
            b.fecha,
            nombreLibro,
            `${b.cantidadDescontada} uds.`,
            b.motivo,
            b.observaciones || 'Sin observaciones',
            b.responsable || 'Administrador',
            renderMontoDual(perdidaLote)
          ];
        });

        return {
          numero: 7,
          categoria: 'Supervisión',
          badgeClass: 'badge-cat-supervision',
          titulo: 'Auditoría de Mermas y Bajas de Inventario',
          explicacion: 'Registra los ejemplares que fueron dados de baja del catálogo por causas no comerciales (deterioro físico, extravío o errores de conteo), detallando el impacto económico en dólares ($) y bolívares (Bs.).',
          kpis: [
            { label: 'Eventos de Baja', valor: bajasFiltradas.length },
            { label: 'Ejemplares Descontados', valor: `${totalDescontado} uds.` },
            { label: 'Pérdida Económica', valor: `$${perdidaTotalEstimada.toFixed(2)}`, sub: formatBs(perdidaTotalEstimada * tasaBCV) },
            { label: 'Motivo Frecuente', valor: bajasFiltradas[0]?.motivo || 'N/A' }
          ],
          columnas: ['Fecha', 'Título de la Obra', 'Cant.', 'Motivo de Baja', 'Observaciones', 'Autorizado Por', 'Pérdida Estimada ($ / Bs.)'],
          filas: filasBajas,
          totales: [
            'TOTAL MERMAS',
            `${bajasFiltradas.length} registros`,
            `${totalDescontado} uds.`,
            '—',
            '—',
            '—',
            renderMontoDual(perdidaTotalEstimada)
          ],
          grafica: {
            titulo: 'Impacto Económico de Mermas por Título ($ / Bs.)',
            subtitulo: 'Distribución del costo de ejemplares desincorporados del inventario',
            esMonetario: true,
            unidad: 'USD',
            datos: Object.entries(porLibroBaja)
              .sort((a, b) => b[1] - a[1])
              .map(([etiqueta, valor]) => ({
                etiqueta,
                valor: parseFloat(valor.toFixed(2)),
                esMonetario: true
              }))
          }
        };
      }

      // ----------------------------------------------------
      // REPORTE 8: RENDIMIENTO DE VENTAS POR PERSONAL (Supervisión - Admin)
      // ----------------------------------------------------
      case 'rendimiento-personal': {
        const ventasFiltradas = ventas.filter((v) => estaEnRango(v.fecha) && coincideMetodoPago(v.metodoPago));
        const porEmpleado = {};

        ventasFiltradas.forEach((v) => {
          const emp = v.atendidoPor || 'Recepción General';
          if (!porEmpleado[emp]) {
            porEmpleado[emp] = {
              nombre: emp,
              totalVentas: 0,
              articulosVendidos: 0,
              subtotalUSD: 0,
              subtotalBs: 0,
              ivaUSD: 0,
              ivaBs: 0,
              totalUSD: 0,
              totalBs: 0
            };
          }
          const m = obtenerMontosVenta(v);
          porEmpleado[emp].totalVentas += 1;
          porEmpleado[emp].articulosVendidos += (Number(v.totalArticulos) || 1);
          porEmpleado[emp].subtotalUSD += m.subtotal;
          porEmpleado[emp].subtotalBs += m.subtotalBs;
          porEmpleado[emp].ivaUSD += m.montoIva;
          porEmpleado[emp].ivaBs += m.montoIvaBs;
          porEmpleado[emp].totalUSD += m.total;
          porEmpleado[emp].totalBs += m.totalBs;
        });

        const arrayEmpleados = Object.values(porEmpleado).sort((a, b) => b.totalUSD - a.totalUSD);
        const granTotalVentas = arrayEmpleados.reduce((acc, e) => acc + e.totalVentas, 0);
        const granSubtotalUSD = arrayEmpleados.reduce((acc, e) => acc + e.subtotalUSD, 0);
        const granSubtotalBs = arrayEmpleados.reduce((acc, e) => acc + e.subtotalBs, 0);
        const granIvaUSD = arrayEmpleados.reduce((acc, e) => acc + e.ivaUSD, 0);
        const granIvaBs = arrayEmpleados.reduce((acc, e) => acc + e.ivaBs, 0);
        const granTotalUSD = arrayEmpleados.reduce((acc, e) => acc + e.totalUSD, 0);
        const granTotalBs = arrayEmpleados.reduce((acc, e) => acc + e.totalBs, 0);
        const granTotalArticulos = arrayEmpleados.reduce((acc, e) => acc + e.articulosVendidos, 0);

        return {
          numero: 8,
          categoria: 'Supervisión',
          badgeClass: 'badge-cat-supervision',
          titulo: 'Rendimiento y Productividad de Ventas por Personal (con IVA 16%)',
          explicacion: 'Mide la actividad comercial individual de cada trabajador en mostrador, cuantificando facturas emitidas, libros despachados, Base Imponible, IVA (16%) y recaudación total en dólares ($) y bolívares (Bs.).',
          kpis: [
            { label: 'Personal / Facturas', valor: `${arrayEmpleados.length} emp. (${granTotalVentas} fact.)` },
            { label: 'Base Imponible', valor: `$${granSubtotalUSD.toFixed(2)}`, sub: formatBs(granSubtotalBs) },
            { label: 'IVA Recaudado (16%)', valor: `$${granIvaUSD.toFixed(2)}`, sub: formatBs(granIvaBs) },
            { label: 'Total Recaudado c/IVA', valor: `$${granTotalUSD.toFixed(2)}`, sub: formatBs(granTotalBs) }
          ],
          columnas: ['Nombre del Trabajador', 'Facturas', 'Libros', 'Base Imponible ($ / Bs.)', 'IVA 16% ($ / Bs.)', 'Total c/IVA ($ / Bs.)', '% Aporte'],
          filas: arrayEmpleados.map((e) => [
            e.nombre,
            e.totalVentas,
            `${e.articulosVendidos} uds.`,
            renderMontoDual(e.subtotalUSD, e.subtotalBs),
            renderMontoDual(e.ivaUSD, e.ivaBs, '+'),
            renderMontoDual(e.totalUSD, e.totalBs),
            `${granTotalUSD > 0 ? ((e.totalUSD / granTotalUSD) * 100).toFixed(1) : 0}%`
          ]),
          totales: [
            'TOTAL GENERAL',
            granTotalVentas,
            `${granTotalArticulos} uds.`,
            renderMontoDual(granSubtotalUSD, granSubtotalBs),
            renderMontoDual(granIvaUSD, granIvaBs, '+'),
            renderMontoDual(granTotalUSD, granTotalBs),
            '100.0%'
          ],
          grafica: {
            titulo: 'Recaudación con IVA Generada por Trabajador ($ / Bs.)',
            subtitulo: 'Comparativa del aporte comercial total (con IVA 16%) de cada integrante del personal',
            esMonetario: true,
            unidad: 'USD',
            datos: arrayEmpleados.map((e) => ({
              etiqueta: e.nombre,
              valor: parseFloat(e.totalUSD.toFixed(2)),
              esMonetario: true
            }))
          }
        };
      }

      // ----------------------------------------------------
      // REPORTE 10: PREDICCIÓN Y RECOMENDACIÓN DE COMPRA A DISTRIBUIDORES
      // ----------------------------------------------------
      case 'predicciones-compras': {
        const ventasEnRango = ventas.filter((v) => estaEnRango(v.fecha) && coincideMetodoPago(v.metodoPago));
        const ventasAnalizadas = ventasEnRango.length > 0 ? ventasEnRango : ventas;

        const ventasPorLibroId = {};
        const ventasPorTitulo = {};
        const ventasPorGenero = {};
        let totalUnidadesVendidas = 0;

        ventasAnalizadas.forEach((v) => {
          (v.items || []).forEach((it) => {
            const cant = Number(it.cantidad) || 1;
            const itemLibroId = it.libroId ?? it.id;
            const libroCatalogo = libros.find(
              (l) => (itemLibroId !== undefined && Number(l.id) === Number(itemLibroId)) || l.titulo === it.titulo
            );
            const genero = libroCatalogo?.categoria || 'General';

            if (itemLibroId !== undefined) {
              ventasPorLibroId[itemLibroId] = (ventasPorLibroId[itemLibroId] || 0) + cant;
            }
            if (it.titulo) {
              ventasPorTitulo[it.titulo] = (ventasPorTitulo[it.titulo] || 0) + cant;
            }
            ventasPorGenero[genero] = (ventasPorGenero[genero] || 0) + cant;
            totalUnidadesVendidas += cant;
          });
        });

        const generosOrdenados = Object.entries(ventasPorGenero).sort((a, b) => b[1] - a[1]);
        const generoTopNombre = generosOrdenados[0]?.[0] || (libros[0]?.categoria || 'Novela');
        const generoTopUnidades = generosOrdenados[0]?.[1] || 0;

        const proyecciones = libros.map((l) => {
          const vendidosLibro = ventasPorLibroId[l.id] || ventasPorTitulo[l.titulo] || 0;
          const vendidosGenero = ventasPorGenero[l.categoria] || 0;
          const stockActual = Number(l.ejemplares) || 0;
          const precioVenta = Number(l.precio) || 0;
          const costoUnit = Number(l.precioCosto) > 0 ? Number(l.precioCosto) : parseFloat((precioVenta * 0.6).toFixed(2));
          const utilidadUnit = Math.max(0, precioVenta - costoUnit);

          const puntajeDemanda = (vendidosLibro * 2.5) + (vendidosGenero * 1.2);

          let stockObjetivo = 4;
          if (vendidosLibro > 0) {
            stockObjetivo = Math.max(6, (vendidosLibro * 3) + Math.ceil(vendidosGenero * 0.5));
          } else if (vendidosGenero > 0) {
            stockObjetivo = Math.max(5, Math.ceil(vendidosGenero * 1.5) + 2);
          }

          let cantidadSugerida = Math.max(0, stockObjetivo - stockActual);
          if (vendidosLibro > 0 && cantidadSugerida < 3) {
            cantidadSugerida = 3;
          } else if (stockActual <= 2 && cantidadSugerida < 4) {
            cantidadSugerida = 4 - stockActual;
          }

          const inversionEstimada = parseFloat((cantidadSugerida * costoUnit).toFixed(2));
          const gananciaProyectada = parseFloat((cantidadSugerida * utilidadUnit).toFixed(2));

          let prioridad = 'BAJA (Stock OK)';
          let prioridadOrden = 3;
          let motivoPrediccion = 'Rotación estable';

          if (vendidosLibro >= 1 && (stockActual <= 5 || vendidosGenero >= generoTopUnidades)) {
            prioridad = 'ALTA (Comprar Ya)';
            prioridadOrden = 1;
            motivoPrediccion = `Alta demanda en ${l.categoria} (${vendidosLibro} vend.)`;
          } else if (vendidosLibro >= 1 || vendidosGenero >= 1 || stockActual <= 3) {
            prioridad = 'MEDIA (Recomendado)';
            prioridadOrden = 2;
            motivoPrediccion = vendidosGenero > 0
              ? `Impulso del género ${l.categoria} (${vendidosGenero} uds. en género)`
              : `Reposición preventiva por stock bajo (${stockActual} uds.)`;
          }

          return {
            libro: l,
            distribuidor: l.distribuidor || 'Proveedor Asignado',
            vendidosLibro,
            vendidosGenero,
            stockActual,
            cantidadSugerida,
            costoUnit,
            inversionEstimada,
            gananciaProyectada,
            prioridad,
            prioridadOrden,
            motivoPrediccion,
            puntajeDemanda
          };
        });

        proyecciones.sort((a, b) => {
          if (a.prioridadOrden !== b.prioridadOrden) return a.prioridadOrden - b.prioridadOrden;
          if (b.puntajeDemanda !== a.puntajeDemanda) return b.puntajeDemanda - a.puntajeDemanda;
          return b.cantidadSugerida - a.cantidadSugerida;
        });

        const totalUnidadesSugeridas = proyecciones.reduce((acc, p) => acc + p.cantidadSugerida, 0);
        const totalInversionSugerida = proyecciones.reduce((acc, p) => acc + p.inversionEstimada, 0);
        const totalGananciaProyectada = proyecciones.reduce((acc, p) => acc + p.gananciaProyectada, 0);
        const libroTopSugerido = proyecciones[0]?.libro?.titulo || 'N/A';

        return {
          numero: 10,
          categoria: 'Predicciones',
          badgeClass: 'badge-cat-prediccion',
          titulo: 'Predicción de Demanda y Recomendación de Compra a Distribuidores',
          explicacion: `Modelo predictivo de reabastecimiento que cruza las ventas registradas por título y la tracción comercial de cada género literario (liderado por "${generoTopNombre}") frente al stock disponible, expresando la inversión y ganancia proyectada en dólares ($) y bolívares (Bs.).`,
          kpis: [
            { label: 'Género Líder en Demanda', valor: `${generoTopNombre} (${generoTopUnidades} uds.)` },
            { label: 'Top 1 Libro Recomendado', valor: libroTopSugerido.length > 20 ? `${libroTopSugerido.substring(0, 20)}...` : libroTopSugerido },
            { label: 'Inversión Sugerida', valor: `$${totalInversionSugerida.toFixed(2)}`, sub: formatBs(totalInversionSugerida * tasaBCV) },
            { label: 'Ganancia Proyectada', valor: `+$${totalGananciaProyectada.toFixed(2)}`, sub: `+${formatBs(totalGananciaProyectada * tasaBCV)}` }
          ],
          columnas: [
            'Libro Recomendado',
            'Género',
            'Distribuidor',
            'Vendidos (Libro/Gén.)',
            'Stock',
            'Sugerido Comprar',
            'Costo Unit. ($ / Bs.)',
            'Inversión Est. ($ / Bs.)',
            'Ganancia Proy. ($ / Bs.)',
            'Prioridad y Diagnóstico'
          ],
          filas: proyecciones.map((p) => [
            p.libro.titulo,
            p.libro.categoria,
            p.distribuidor,
            `${p.vendidosLibro} (${p.vendidosGenero} gén.)`,
            `${p.stockActual} uds.`,
            `${p.cantidadSugerida} uds.`,
            renderMontoDual(p.costoUnit),
            renderMontoDual(p.inversionEstimada),
            renderMontoDual(p.gananciaProyectada, null, '+'),
            `${p.prioridad} — ${p.motivoPrediccion}`
          ]),
          totales: [
            'TOTAL PROYECCIÓN',
            `Top: ${generoTopNombre}`,
            `${proyecciones.filter((p) => p.cantidadSugerida > 0).length} órdenes`,
            `${totalUnidadesVendidas} vend.`,
            `${proyecciones.reduce((acc, p) => acc + p.stockActual, 0)} uds.`,
            `${totalUnidadesSugeridas} uds.`,
            '—',
            renderMontoDual(totalInversionSugerida),
            renderMontoDual(totalGananciaProyectada, null, '+'),
            'Proyección Estimada'
          ],
          grafica: {
            titulo: 'Inversión Sugerida de Reposición por Libro ($ / Bs.)',
            subtitulo: 'Distribución del presupuesto recomendado de compra a distribuidores según demanda',
            esMonetario: true,
            unidad: 'USD',
            datos: proyecciones
              .filter((p) => p.inversionEstimada > 0)
              .map((p) => ({
                etiqueta: p.libro.titulo,
                valor: p.inversionEstimada,
                esMonetario: true
              }))
          }
        };
      }

      // ----------------------------------------------------
      // REPORTE 9: TRAZABILIDAD Y HORARIOS DE CONEXIÓN (Supervisión - Admin)
      // ----------------------------------------------------
      case 'trazabilidad-horarios':
      default: {
        const sesionesFiltradas = sesionesData.filter((s) => estaEnRango(s.fechaInicio));
        const activas = sesionesFiltradas.filter((s) => s.activo).length;

        const porUsuarioSesiones = {};
        sesionesFiltradas.forEach((s) => {
          const nombre = s.usuarioNombre || 'Usuario';
          porUsuarioSesiones[nombre] = (porUsuarioSesiones[nombre] || 0) + 1;
        });

        return {
          numero: 9,
          categoria: 'Supervisión',
          badgeClass: 'badge-cat-supervision',
          titulo: 'Trazabilidad de Accesos, Horarios y Conexiones',
          explicacion: 'Verifica la asistencia y permanencia del personal en el sistema informático, detallando la fecha y hora exacta de inicio de sesión, hora de desconexión, tiempo total conectado y dirección IP de acceso.',
          kpis: [
            { label: 'Sesiones Evaluadas', valor: sesionesFiltradas.length },
            { label: 'Usuarios en Línea Ahora', valor: activas },
            { label: 'Sesiones Finalizadas', valor: sesionesFiltradas.length - activas },
            { label: 'Estado del Servicio', valor: 'Activo' }
          ],
          columnas: ['Usuario', 'Rol de Cuenta', 'Fecha Ingreso', 'Hora Ingreso', 'Hora Salida / Desconexión', 'Tiempo Conectado', 'Dirección IP', 'Estado'],
          filas: sesionesFiltradas.map((s) => [
            s.usuarioNombre,
            s.usuarioRol === 'admin' ? 'Administrador' : 'Personal',
            s.fechaInicio,
            s.horaInicio,
            s.activo ? 'En Línea Actualmente' : (s.horaFin || 'Desconectado'),
            s.duracion || '—',
            s.ip || '127.0.0.1',
            s.activo ? 'En Línea' : 'Finalizada'
          ]),
          totales: [
            'TOTAL SESIONES',
            `${sesionesFiltradas.length} conexiones`,
            '—',
            '—',
            '—',
            '—',
            '—',
            `${activas} activas`
          ],
          grafica: {
            titulo: 'Frecuencia de Conexiones al Sistema por Usuario',
            subtitulo: 'Proporción de inicios de sesión registrados por cada miembro del personal',
            esMonetario: false,
            unidad: 'sesiones',
            datos: Object.entries(porUsuarioSesiones)
              .sort((a, b) => b[1] - a[1])
              .map(([etiqueta, valor]) => ({
                etiqueta,
                valor
              }))
          }
        };
      }
    }
  }, [tipoReporte, ventas, libros, distribuidores, historialEntradas, historialAjustes, sesionesData, fechaInicio, fechaFin, filtroMetodoPago, tasaBCV]);

  const [orientacion, setOrientacion] = useState('portrait');

  const handlePrint = () => {
    window.print();
  };

  // Preparar segmentos matemáticos para la gráfica de pastel (SVG) y tubitos
  const datosGraficaProcesados = useMemo(() => {
    const items = reporteConfig?.grafica?.datos || [];
    const total = items.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
    const maxVal = items.reduce((max, d) => Math.max(max, Number(d.valor) || 0), 0);

    let acumuladoPct = 0;
    const segmentos = items.map((d, idx) => {
      const val = Number(d.valor) || 0;
      const pct = total > 0 ? (val / total) * 100 : 0;
      const pctMax = maxVal > 0 ? (val / maxVal) * 100 : 0;
      const inicioPct = acumuladoPct;
      acumuladoPct += pct;

      return {
        ...d,
        valor: val,
        porcentaje: pct,
        porcentajeBarra: Math.max(6, pctMax),
        inicioPct,
        color: PALETA_GRAFICA[idx % PALETA_GRAFICA.length]
      };
    });

    return { total, maxVal, segmentos };
  }, [reporteConfig]);

  return (
    <div className="modal-reporte-overlay" onClick={onClose}>
      <div className="modal-reporte-window" onClick={(e) => e.stopPropagation()}>
        
        {/* INYECCIÓN DINÁMICA DE REGLA @page SEGÚN ORIENTACIÓN ELEGIDA */}
        <style>{`
          @page {
            size: letter ${orientacion} !important;
            margin: 0.7cm 0.8cm !important;
          }
        `}</style>

        {/* BARRA SUPERIOR DE ACCIONES (NO SE IMPRIME) */}
        <div className="reporte-control-bar no-print">
          <div className="reporte-control-title">
            <span className={`reporte-badge-categoria ${reporteConfig.badgeClass}`}>
              Reporte #{reporteConfig.numero} • {reporteConfig.categoria}
            </span>
            <h3>{reporteConfig.titulo}</h3>
          </div>

          <div className="reporte-control-actions">
            {/* SELECTOR DE ESTILO DE GRÁFICA */}
            <div className="reporte-orientacion-pill">
              <span className="orientacion-label">Gráfica:</span>
              <button
                type="button"
                className={`btn-orientacion ${tipoGrafica === 'ambas' ? 'active' : ''}`}
                onClick={() => setTipoGrafica('ambas')}
              >
                Pastel + Barras
              </button>
              <button
                type="button"
                className={`btn-orientacion ${tipoGrafica === 'pastel' ? 'active' : ''}`}
                onClick={() => setTipoGrafica('pastel')}
              >
                Pastel
              </button>
              <button
                type="button"
                className={`btn-orientacion ${tipoGrafica === 'tubitos' ? 'active' : ''}`}
                onClick={() => setTipoGrafica('tubitos')}
              >
                Barras
              </button>
            </div>

            {/* SELECTOR DE ORIENTACIÓN DE HOJA (VERTICAL / HORIZONTAL) */}
            <div className="reporte-orientacion-pill">
              <span className="orientacion-label">Hoja:</span>
              <button
                type="button"
                className={`btn-orientacion ${orientacion === 'portrait' ? 'active' : ''}`}
                onClick={() => setOrientacion('portrait')}
              >
                Vertical
              </button>
              <button
                type="button"
                className={`btn-orientacion ${orientacion === 'landscape' ? 'active' : ''}`}
                onClick={() => setOrientacion('landscape')}
              >
                Horizontal
              </button>
            </div>

            <button type="button" className="btn-reporte-print" onClick={handlePrint}>
              Imprimir / Guardar PDF
            </button>
            <button type="button" className="btn-reporte-close" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>

        {/* BARRA INTERACTIVA DE RANGO DE FECHAS SELECCIONADO POR EL USUARIO (NO SE IMPRIME) */}
        <div className="reporte-filter-bar no-print">
          <div className="reporte-date-picker-group">
            <div className="date-input-field">
              <label className="date-input-label">Fecha Desde:</label>
              <input 
                type="date" 
                className="date-input-control"
                value={fechaInicio} 
                onChange={(e) => setFechaInicio(e.target.value)} 
              />
            </div>

            <div className="date-input-field">
              <label className="date-input-label">Fecha Hasta:</label>
              <input 
                type="date" 
                className="date-input-control"
                value={fechaFin} 
                onChange={(e) => setFechaFin(e.target.value)} 
              />
            </div>

            <div className="date-input-field">
              <label className="date-input-label">Método de Pago:</label>
              <select 
                className="date-input-control"
                value={filtroMetodoPago} 
                onChange={(e) => setFiltroMetodoPago(e.target.value)}
              >
                <option value="todos">Todos los Métodos</option>
                {metodosDisponibles.map((m) => (
                  <option key={m.id || m.nombre} value={m.nombre}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="badge-rango-calculado">
              {calculoRangoTexto}
            </div>
          </div>

          <div className="date-quick-helpers">
            <span>Ajustar rápido:</span>
            <button 
              type="button" 
              className="btn-date-helper" 
              onClick={() => {
                const hoyStr = formatoYYYYMMDD(new Date());
                setFechaInicio(hoyStr);
                setFechaFin(hoyStr);
              }}
            >
              1 día
            </button>
            <button type="button" className="btn-date-helper" onClick={() => setRangoRapidoDias(7)}>7 días</button>
            <button type="button" className="btn-date-helper" onClick={() => setRangoRapidoDias(14)}>14 días</button>
            <button type="button" className="btn-date-helper" onClick={() => setRangoRapidoDias(21)}>21 días</button>
            <button type="button" className="btn-date-helper" onClick={() => setRangoRapidoMeses(1)}>1 mes</button>
            <button type="button" className="btn-date-helper" onClick={() => setRangoRapidoMeses(3)}>3 meses</button>
            <button type="button" className="btn-date-helper" onClick={() => setRangoRapidoMeses(6)}>6 meses</button>
            <button 
              type="button" 
              className="btn-date-helper btn-date-helper-clear" 
              onClick={() => { setFechaInicio(''); setFechaFin(''); setFiltroMetodoPago('todos'); }}
            >
              Ver Todo el Histórico
            </button>
          </div>
        </div>

        {/* DOCUMENTO IMPRIMIBLE (SECTOR IMPRESIÓN Y PDF) */}
        <div className="reporte-document-scroll">
          <div className={`reporte-sheet ${orientacion === 'landscape' ? 'sheet-landscape' : ''}`} id="documento-imprimible-minerva">
            
            {/* MEMBRETE INSTITUCIONAL MINERVA */}
            <div className="membrete-minerva">
              <div className="membrete-logo-group">
                <img src={logo} alt="Logo Minerva" className="membrete-logo" />
                <div>
                  <h1 className="membrete-empresa-nombre">LIBRERÍA & CENTRO CULTURAL MINERVA</h1>
                  <p className="membrete-slogan">"Espacio del Conocimiento y la Sabiduría"</p>
                  <p className="membrete-rif">R.I.F.: J-40192837-0 • Sistema de Gestión Bibliotecaria e Inventario</p>
                </div>
              </div>

              <div className="membrete-metadatos">
                <div><strong>Emisión:</strong> {fechaEmision.fecha} ({fechaEmision.hora})</div>
                <div><strong>Generado por:</strong> {usuarioActual?.nombre || 'Administrador'} ({usuarioActual?.rol === 'admin' ? 'Administrador' : 'Personal'})</div>
                <div><strong>Tasa BCV Ref.:</strong> Bs. {tasaBCV.toFixed(2)} / USD</div>
                <div><strong>Control N°:</strong> REP-{reporteConfig.numero}-{Date.now().toString().slice(-6)}</div>
              </div>
            </div>

            {/* CAJA DE TÍTULO Y EXPLICACIÓN DEL REPORTE */}
            <div className="reporte-header-box">
              <div className="reporte-titulo-doc">
                <span>REPORTE N° {reporteConfig.numero}: {reporteConfig.titulo.toUpperCase()}</span>
                <span className="reporte-periodo-tag">
                  <strong>Período Auditado:</strong>{' '}
                  {!fechaInicio && !fechaFin
                    ? 'Todo el Histórico Registrado'
                    : fechaInicio && fechaFin
                    ? `Del ${formatearFechaVisual(fechaInicio)} al ${formatearFechaVisual(fechaFin)}`
                    : fechaInicio
                    ? `Desde el ${formatearFechaVisual(fechaInicio)}`
                    : `Hasta el ${formatearFechaVisual(fechaFin)}`}
                </span>
                {filtroMetodoPago !== 'todos' && (
                  <span className="reporte-periodo-tag" style={{ marginLeft: '0.4rem', backgroundColor: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }}>
                    <strong>Método de Pago:</strong> {filtroMetodoPago}
                  </span>
                )}
              </div>
              <p className="reporte-explicacion">
                <strong>Propósito del Reporte:</strong> {reporteConfig.explicacion}
              </p>
            </div>

            {/* TARJETAS KPI DE RESUMEN EJECUTIVO */}
            <div className="reporte-kpi-grid">
              {reporteConfig.kpis.map((kpi, idx) => (
                <div key={idx} className="reporte-kpi-card">
                  <span>{kpi.label}</span>
                  <strong>{kpi.valor}</strong>
                  {kpi.sub && <small className="kpi-sub-bs">{kpi.sub}</small>}
                </div>
              ))}
            </div>

            {/* TABLA DE DATOS DEL REPORTE (AJUSTADA AL 100% DEL ANCHO SIN SCROLL DERECHO) */}
            <div className="reporte-table-container">
              <table className="reporte-table">
                <thead>
                  <tr>
                    {reporteConfig.columnas.map((col, idx) => (
                      <th key={idx} className={col.includes('($') || col.includes('IVA') || col.includes('Base') || col.includes('Costo') || col.includes('Total') || col.includes('Utilidad') || col.includes('Vendidos') || col.includes('Cant') || col.includes('Art.') || col.includes('Stock') || col.includes('Ejemplares') || col.includes('Margen') || col.includes('%') ? 'num' : ''}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reporteConfig.filas.length === 0 ? (
                    <tr>
                      <td colSpan={reporteConfig.columnas.length} style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.3rem' }}>Sin movimientos registrados en este período</div>
                        <div style={{ fontSize: '0.82rem' }}>
                          Puedes ajustar el rango de fechas en la barra superior o presionar "Ver Todo el Histórico".
                        </div>
                      </td>
                    </tr>
                  ) : (
                    reporteConfig.filas.map((fila, fIdx) => (
                      <tr key={fIdx}>
                        {fila.map((celda, cIdx) => {
                          const esObjetoDual = typeof celda === 'object' && celda !== null;
                          const textoCelda = esObjetoDual ? '' : String(celda);
                          const esNumerico =
                            esObjetoDual ||
                            textoCelda.startsWith('$') ||
                            textoCelda.startsWith('Bs.') ||
                            textoCelda.endsWith('%') ||
                            textoCelda.endsWith('uds.') ||
                            typeof celda === 'number';
                          return (
                            <td key={cIdx} className={esNumerico ? 'num' : ''}>
                              {celda}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
                {reporteConfig.totales && (
                  <tfoot>
                    <tr>
                      {reporteConfig.totales.map((tot, tIdx) => {
                        const esObjetoDual = typeof tot === 'object' && tot !== null;
                        const textoTot = esObjetoDual ? '' : String(tot);
                        const esNumerico =
                          esObjetoDual ||
                          textoTot.startsWith('$') ||
                          textoTot.startsWith('Bs.') ||
                          textoTot.endsWith('%') ||
                          textoTot.endsWith('uds.') ||
                          typeof tot === 'number';
                        return (
                          <td key={tIdx} className={esNumerico ? 'num' : ''}>
                            {tot}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* SECCIÓN GRÁFICA AL FINAL DEL REPORTE (PASTEL Y/O TUBITOS) */}
            {datosGraficaProcesados.segmentos.length > 0 && (
              <div className="reporte-grafica-section">
                <div className="reporte-grafica-header">
                  <div>
                    <h4 className="reporte-grafica-titulo">
                      REPRESENTACIÓN GRÁFICA: {reporteConfig.grafica.titulo.toUpperCase()}
                    </h4>
                    <p className="reporte-grafica-sub">{reporteConfig.grafica.subtitulo}</p>
                  </div>
                  <div className="reporte-grafica-total-badge">
                    {reporteConfig.grafica.esMonetario ? (
                      <>
                        <span>Total Analizado: <strong>${datosGraficaProcesados.total.toFixed(2)}</strong></span>
                        <small>{formatBs(datosGraficaProcesados.total * tasaBCV)}</small>
                      </>
                    ) : (
                      <span>Total Analizado: <strong>{datosGraficaProcesados.total} {reporteConfig.grafica.unidad || 'uds.'}</strong></span>
                    )}
                  </div>
                </div>

                <div className={`reporte-grafica-body ${tipoGrafica !== 'ambas' ? 'grafica-single-col' : ''}`}>
                  {/* 1. GRÁFICA DE PASTEL (DONUT / TORTA VECTORIAL SVG) */}
                  {(tipoGrafica === 'ambas' || tipoGrafica === 'pastel') && (
                    <div className="grafica-pastel-card">
                      <div className="grafica-card-label">Gráfica de Pastel (Distribución %)</div>
                      <div className="grafica-pastel-content">
                        <div className="pastel-svg-wrap">
                          <svg viewBox="0 0 42 42" className="pastel-donut-svg">
                            <circle
                              cx="21"
                              cy="21"
                              r="15.91549430918954"
                              fill="transparent"
                              stroke="#e2e8f0"
                              strokeWidth="6"
                            />
                            {datosGraficaProcesados.segmentos.map((seg, idx) => (
                              <circle
                                key={idx}
                                cx="21"
                                cy="21"
                                r="15.91549430918954"
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth="6"
                                strokeDasharray={`${seg.porcentaje} ${100 - seg.porcentaje}`}
                                strokeDashoffset={25 - seg.inicioPct}
                              />
                            ))}
                            <text x="21" y="20" textAnchor="middle" className="pastel-center-top">
                              100%
                            </text>
                            <text x="21" y="24.5" textAnchor="middle" className="pastel-center-sub">
                              {datosGraficaProcesados.segmentos.length} ítems
                            </text>
                          </svg>
                        </div>

                        <div className="pastel-leyenda-list">
                          {datosGraficaProcesados.segmentos.map((seg, idx) => (
                            <div key={idx} className="pastel-leyenda-item">
                              <span className="leyenda-dot" style={{ backgroundColor: seg.color }}></span>
                              <span className="leyenda-nombre" title={seg.etiqueta}>{seg.etiqueta}</span>
                              <strong className="leyenda-pct">{seg.porcentaje.toFixed(1)}%</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. GRÁFICA DE BARRAS COMPARATIVAS */}
                  {(tipoGrafica === 'ambas' || tipoGrafica === 'tubitos') && (
                    <div className="grafica-tubitos-card">
                      <div className="grafica-card-label">Gráfica de Barras Comparativas</div>
                      <div className="tubitos-bars-list">
                        {datosGraficaProcesados.segmentos.map((seg, idx) => (
                          <div key={idx} className="tubito-row">
                            <div className="tubito-row-top">
                              <span className="tubito-label">{seg.etiqueta}</span>
                              <span className="tubito-valores">
                                {reporteConfig.grafica.esMonetario ? (
                                  <>
                                    <strong>${seg.valor.toFixed(2)}</strong>
                                    <span className="tubito-bs"> ({formatBs(seg.valor * tasaBCV)})</span>
                                  </>
                                ) : (
                                  <strong>{seg.valor} {reporteConfig.grafica.unidad || 'uds.'}</strong>
                                )}
                                <span className="tubito-pct-pill">{seg.porcentaje.toFixed(1)}%</span>
                              </span>
                            </div>
                            <div className="tubito-track">
                              <div
                                className="tubito-fill"
                                style={{
                                  width: `${seg.porcentajeBarra}%`,
                                  backgroundColor: seg.color
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECCIÓN DE FIRMAS DE VALIDACIÓN */}
            <div className="reporte-firmas-box">
              <div className="linea-firma">
                Responsable de Emisión<br />
                <strong>{usuarioActual?.nombre || 'Jheisel Parra'}</strong>
              </div>
              <div className="linea-firma">
                Revisado y Conforme<br />
                <strong>Administración General</strong>
              </div>
            </div>

            {/* PIE DE PÁGINA FORMAL CON PAGINACIÓN */}
            <div className="reporte-footer">
              <span>Librería & Centro Cultural Minerva, C.A. • Documento Informativo Oficial</span>
              <span>Página 1 de 1 • Registro Inmutable del Sistema</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
