import prisma from '../config/prisma.js';
import { registrarBitacora } from '../utils/bitacora.js';

const IVA_PORCENTAJE = 16;
const IVA_FACTOR = 0.16;

export const getVentas = async (req, res) => {
  try {
    const ventas = await prisma.venta.findMany({
      include: {
        cliente: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true
          }
        },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      ok: true,
      ventas: ventas.map((v) => {
        const sumaItemsBase = (v.items || []).reduce(
          (acc, it) => acc + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1),
          0
        );
        const subtotal =
          Number(v.subtotal) > 0
            ? parseFloat(Number(v.subtotal).toFixed(2))
            : parseFloat((sumaItemsBase || Number(v.total) || 0).toFixed(2));
        const porcentajeIva = Number(v.porcentajeIva) || IVA_PORCENTAJE;
        const montoIva =
          Number(v.montoIva) > 0
            ? parseFloat(Number(v.montoIva).toFixed(2))
            : parseFloat((subtotal * (porcentajeIva / 100)).toFixed(2));
        const totalConIva =
          Number(v.subtotal) > 0 && Number(v.total) >= subtotal + montoIva - 0.02
            ? parseFloat(Number(v.total).toFixed(2))
            : parseFloat((subtotal + montoIva).toFixed(2));
        const tasa = Number(v.tasaCambio) || 36.50;
        const totalBs = parseFloat((totalConIva * tasa).toFixed(2));

        return {
          id: v.id,
          nroFactura: v.nroFactura,
          fecha: v.fecha,
          hora: v.hora,
          cliente: v.cliente ? {
            id: v.cliente.id,
            nombre: v.cliente.nombre,
            cedula: v.cliente.cedula,
            correo: v.cliente.correo,
            telefono: v.cliente.telefono
          } : null,
          items: v.items.map((it) => {
            const precioBase = Number(it.precioUnitario) || 0;
            const ivaUnit = parseFloat((precioBase * IVA_FACTOR).toFixed(2));
            const precioConIva = parseFloat((precioBase + ivaUnit).toFixed(2));
            const subBase = parseFloat((precioBase * it.cantidad).toFixed(2));
            const subIva = parseFloat((subBase * IVA_FACTOR).toFixed(2));
            return {
              id: it.libroId,
              libroId: it.libroId,
              titulo: it.titulo,
              autor: it.autor,
              precio: precioBase,
              ivaUnitario: ivaUnit,
              precioConIva,
              cantidad: it.cantidad,
              subtotal: subBase,
              montoIvaItem: subIva,
              totalConIva: parseFloat((subBase + subIva).toFixed(2))
            };
          }),
          metodoPago: v.metodoPago,
          referenciaPago: v.referenciaPago,
          subtotal,
          porcentajeIva,
          montoIva,
          total: totalConIva,
          tasaCambio: tasa,
          subtotalBs: parseFloat((subtotal * tasa).toFixed(2)),
          montoIvaBs: parseFloat((montoIva * tasa).toFixed(2)),
          totalBs,
          totalArticulos: v.totalArticulos,
          atendidoPor: v.atendidoPor || v.usuario?.nombre || 'Recepción'
        };
      })
    });
  } catch (error) {
    console.error('Error en getVentas:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar las ventas.'
    });
  }
};

export const registrarVenta = async (req, res) => {
  try {
    const { clienteId, items, metodoPago, referenciaPago, tasaCambio } = req.body;
    const tasaNum = parseFloat(tasaCambio) > 0 ? parseFloat(tasaCambio) : 36.50;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La venta debe contener al menos un libro en el carrito.'
      });
    }

    if (!metodoPago) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debe seleccionar un método de pago.'
      });
    }

    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = ahora.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    // Generar correlativo secuencial único (ej. FAC-000001, FAC-000002)
    const ultimaVenta = await prisma.venta.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true }
    });
    const proximoNumero = (ultimaVenta?.id || 0) + 1;
    const nroFactura = `FAC-${String(proximoNumero).padStart(6, '0')}`;

    const atendidoPor = req.usuario ? req.usuario.nombre : 'Recepción';
    const usuarioId = req.usuario ? req.usuario.id : null;

    let subtotalVenta = 0;
    let totalArticulos = 0;

    // Transacción atómica: Verificar stock, descontar de libros, crear venta y detalles
    const ventaCreada = await prisma.$transaction(async (tx) => {
      // 1. Validar disponibilidad de stock de cada libro
      for (const item of items) {
        const libro = await tx.libro.findUnique({
          where: { id: item.id }
        });

        if (!libro) {
          throw new Error(`El libro con ID ${item.id} no existe en el catálogo.`);
        }

        if (libro.ejemplares < item.cantidad) {
          throw new Error(`Stock insuficiente para "${libro.titulo}". Solicitado: ${item.cantidad}, Disponible: ${libro.ejemplares}.`);
        }

        const subtotalItem = libro.precio * item.cantidad;
        subtotalVenta += subtotalItem;
        totalArticulos += item.cantidad;

        // Descontar stock
        await tx.libro.update({
          where: { id: item.id },
          data: {
            ejemplares: {
              decrement: item.cantidad
            }
          }
        });
      }

      const subtotalUSD = parseFloat(subtotalVenta.toFixed(2));
      const montoIvaUSD = parseFloat((subtotalUSD * IVA_FACTOR).toFixed(2));
      const totalUSD = parseFloat((subtotalUSD + montoIvaUSD).toFixed(2));
      const totalBolivares = parseFloat((totalUSD * tasaNum).toFixed(2));

      // 2. Crear cabecera de la venta con desglose de IVA (16%)
      const nuevaVenta = await tx.venta.create({
        data: {
          nroFactura,
          fecha: fechaStr,
          hora: horaStr,
          clienteId: clienteId ? parseInt(clienteId, 10) : null,
          usuarioId: usuarioId,
          metodoPago: metodoPago.trim(),
          referenciaPago: referenciaPago ? referenciaPago.trim() : null,
          subtotal: subtotalUSD,
          porcentajeIva: IVA_PORCENTAJE,
          montoIva: montoIvaUSD,
          total: totalUSD,
          tasaCambio: tasaNum,
          totalBs: totalBolivares,
          totalArticulos,
          atendidoPor
        },
        include: {
          cliente: true
        }
      });

      // 3. Crear detalles de venta
      for (const item of items) {
        const libro = await tx.libro.findUnique({ where: { id: item.id } });
        await tx.detalleVenta.create({
          data: {
            ventaId: nuevaVenta.id,
            libroId: item.id,
            titulo: libro.titulo,
            autor: libro.autor,
            precioUnitario: libro.precio,
            cantidad: item.cantidad,
            subtotal: parseFloat((libro.precio * item.cantidad).toFixed(2))
          }
        });
      }

      return nuevaVenta;
    });

    // Consultar la venta completa para retornar
    const ventaCompleta = await prisma.venta.findUnique({
      where: { id: ventaCreada.id },
      include: {
        cliente: true,
        items: true
      }
    });

    await registrarBitacora({
      req,
      modulo: 'VENTAS',
      accion: 'VENTA',
      descripcion: `Venta #${nroFactura} procesada por $${ventaCompleta.total.toFixed(2)} (Base: $${ventaCompleta.subtotal.toFixed(2)} + IVA 16%: $${ventaCompleta.montoIva.toFixed(2)}) - Pago: ${metodoPago}`,
      detalles: {
        nroFactura,
        subtotalUSD: ventaCompleta.subtotal,
        montoIvaUSD: ventaCompleta.montoIva,
        totalUSD: ventaCompleta.total,
        totalBs: ventaCompleta.totalBs,
        metodoPago,
        totalArticulos,
        cliente: ventaCompleta.cliente ? ventaCompleta.cliente.nombre : 'Consumidor Final',
        items: items.map(i => ({ id: i.id, cantidad: i.cantidad }))
      }
    });

    return res.status(201).json({
      ok: true,
      mensaje: `¡Venta ${nroFactura} procesada con éxito!`,
      venta: {
        id: ventaCompleta.id,
        nroFactura: ventaCompleta.nroFactura,
        fecha: ventaCompleta.fecha,
        hora: ventaCompleta.hora,
        cliente: ventaCompleta.cliente ? {
          id: ventaCompleta.cliente.id,
          nombre: ventaCompleta.cliente.nombre,
          cedula: ventaCompleta.cliente.cedula
        } : null,
        items: ventaCompleta.items.map((it) => {
          const precioBase = Number(it.precioUnitario) || 0;
          const ivaUnit = parseFloat((precioBase * IVA_FACTOR).toFixed(2));
          const subBase = parseFloat((precioBase * it.cantidad).toFixed(2));
          const subIva = parseFloat((subBase * IVA_FACTOR).toFixed(2));
          return {
            id: it.libroId,
            libroId: it.libroId,
            titulo: it.titulo,
            autor: it.autor,
            precio: precioBase,
            ivaUnitario: ivaUnit,
            precioConIva: parseFloat((precioBase + ivaUnit).toFixed(2)),
            cantidad: it.cantidad,
            subtotal: subBase,
            montoIvaItem: subIva,
            totalConIva: parseFloat((subBase + subIva).toFixed(2))
          };
        }),
        metodoPago: ventaCompleta.metodoPago,
        referenciaPago: ventaCompleta.referenciaPago,
        subtotal: ventaCompleta.subtotal,
        porcentajeIva: ventaCompleta.porcentajeIva,
        montoIva: ventaCompleta.montoIva,
        total: ventaCompleta.total,
        tasaCambio: ventaCompleta.tasaCambio,
        subtotalBs: parseFloat((ventaCompleta.subtotal * ventaCompleta.tasaCambio).toFixed(2)),
        montoIvaBs: parseFloat((ventaCompleta.montoIva * ventaCompleta.tasaCambio).toFixed(2)),
        totalBs: ventaCompleta.totalBs,
        totalArticulos: ventaCompleta.totalArticulos,
        atendidoPor: ventaCompleta.atendidoPor
      }
    });
  } catch (error) {
    console.error('Error en registrarVenta:', error);
    return res.status(400).json({
      ok: false,
      mensaje: error.message || 'Error al procesar la venta.'
    });
  }
};
