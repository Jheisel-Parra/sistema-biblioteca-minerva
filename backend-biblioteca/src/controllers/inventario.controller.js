import prisma from '../config/prisma.js';
import { registrarBitacora } from '../utils/bitacora.js';

// ==========================================
// 1. REABASTECIMIENTO / ENTRADAS DE STOCK (+)
// ==========================================
export const getHistorialEntradas = async (req, res) => {
  try {
    const esAdmin = req.usuario?.rol === 'admin';

    const entradas = await prisma.entradaInventario.findMany({
      include: {
        libro: {
          select: {
            id: true,
            titulo: true,
            autor: true,
            portada: true,
            isbn: true
          }
        },
        distribuidor: {
          select: {
            id: true,
            nombre: true,
            rif: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      ok: true,
      entradas: entradas.map((e) => {
        const item = {
          id: e.id,
          libroId: e.libroId,
          libroTitulo: e.libro?.titulo,
          libroAutor: e.libro?.autor,
          libroPortada: e.libro?.portada,
          distribuidor: e.distribuidor?.nombre,
          distribuidorId: e.distribuidorId,
          cantidadIngresada: e.cantidadIngresada,
          costoUnitario: e.costoUnitario || 0.0,
          costoTotal: e.costoTotal || 0.0,
          nroFacturaProveedor: e.nroFacturaProveedor,
          fecha: e.fecha,
          hora: e.hora,
          observaciones: e.observaciones,
          responsable: e.responsable
        };
        // Si no es admin, ocultar costos
        if (!esAdmin) {
          delete item.costoUnitario;
          delete item.costoTotal;
        }
        return item;
      })
    });
  } catch (error) {
    console.error('Error en getHistorialEntradas:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar el historial de entradas.'
    });
  }
};

export const registrarEntrada = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: '🔒 Acceso restringido: Solo los administradores pueden reabastecer inventario y registrar costos.'
      });
    }

    const { 
      libroId, 
      distribuidorId, 
      distribuidorNombre, 
      cantidadIngresada, 
      costoUnitario = 0.0,
      nroFacturaProveedor, 
      observaciones 
    } = req.body;

    const idLibro = parseInt(libroId, 10);
    const cant = parseInt(cantidadIngresada, 10);
    const costoNum = parseFloat(costoUnitario) || 0.0;

    if (!idLibro || !cant || cant <= 0 || !nroFacturaProveedor) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debe seleccionar un libro, especificar una cantidad válida (> 0) y el número de factura/guía.'
      });
    }

    if (costoNum < 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El costo unitario de compra no puede ser negativo.'
      });
    }

    // Resolver ID de distribuidor
    let finalDistId = distribuidorId ? parseInt(distribuidorId, 10) : null;
    if (!finalDistId && distribuidorNombre) {
      const dist = await prisma.distribuidor.findFirst({
        where: { nombre: distribuidorNombre }
      });
      if (dist) finalDistId = dist.id;
    }

    if (!finalDistId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debe seleccionar una empresa distribuidora para registrar la entrada.'
      });
    }

    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = ahora.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const responsableNombre = req.usuario ? req.usuario.nombre : 'Administrador';
    const totalLote = parseFloat((cant * costoNum).toFixed(2));

    // Transacción atómica: Registrar entrada y AUMENTAR stock en Libro
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevaEntrada = await tx.entradaInventario.create({
        data: {
          libroId: idLibro,
          distribuidorId: finalDistId,
          cantidadIngresada: cant,
          costoUnitario: costoNum,
          costoTotal: totalLote,
          nroFacturaProveedor: nroFacturaProveedor.trim(),
          fecha: fechaStr,
          hora: horaStr,
          observaciones: observaciones ? observaciones.trim() : null,
          responsable: responsableNombre
        },
        include: {
          libro: true,
          distribuidor: true
        }
      });

      const libroActualizado = await tx.libro.update({
        where: { id: idLibro },
        data: {
          ejemplares: {
            increment: cant
          },
          ...(costoNum > 0 ? { precioCosto: costoNum } : {})
        }
      });

      return { nuevaEntrada, libroActualizado };
    });

    await registrarBitacora({
      req,
      modulo: 'INVENTARIO',
      accion: 'ENTRADA_STOCK',
      descripcion: `Reabastecimiento de +${cant} ejemplares para "${resultado.libroActualizado.titulo}" - Fac: ${nroFacturaProveedor}`,
      detalles: {
        libroId: idLibro,
        libroTitulo: resultado.libroActualizado.titulo,
        cantidad: cant,
        costoUnitario: costoNum,
        costoTotal: totalLote,
        nroFacturaProveedor,
        distribuidor: resultado.nuevaEntrada.distribuidor?.nombre
      }
    });

    return res.status(201).json({
      ok: true,
      mensaje: `¡Entrada registrada! Se sumaron +${cant} ejemplares al libro "${resultado.libroActualizado.titulo}". Stock actual: ${resultado.libroActualizado.ejemplares}.`,
      entrada: {
        id: resultado.nuevaEntrada.id,
        libroId: resultado.nuevaEntrada.libroId,
        libroTitulo: resultado.nuevaEntrada.libro.titulo,
        libroAutor: resultado.nuevaEntrada.libro.autor,
        libroPortada: resultado.nuevaEntrada.libro.portada,
        distribuidor: resultado.nuevaEntrada.distribuidor.nombre,
        cantidadIngresada: resultado.nuevaEntrada.cantidadIngresada,
        costoUnitario: resultado.nuevaEntrada.costoUnitario,
        costoTotal: resultado.nuevaEntrada.costoTotal,
        nroFacturaProveedor: resultado.nuevaEntrada.nroFacturaProveedor,
        fecha: resultado.nuevaEntrada.fecha,
        hora: resultado.nuevaEntrada.hora,
        observaciones: resultado.nuevaEntrada.observaciones,
        responsable: resultado.nuevaEntrada.responsable
      },
      stockActual: resultado.libroActualizado.ejemplares
    });
  } catch (error) {
    console.error('Error en registrarEntrada:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al registrar la entrada de inventario.'
    });
  }
};

// ==========================================
// 2. AJUSTES / BAJAS DE INVENTARIO (-)
// ==========================================
export const getHistorialBajas = async (req, res) => {
  try {
    const bajas = await prisma.ajusteInventario.findMany({
      include: {
        libro: {
          select: {
            id: true,
            titulo: true,
            autor: true,
            portada: true,
            isbn: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      ok: true,
      bajas: bajas.map((b) => ({
        id: b.id,
        libroId: b.libroId,
        libroTitulo: b.libro?.titulo,
        libroAutor: b.libro?.autor,
        libroPortada: b.libro?.portada,
        cantidadDescontada: b.cantidadDescontada,
        motivo: b.motivo,
        observaciones: b.observaciones,
        fecha: b.fecha,
        hora: b.hora,
        responsable: b.responsable
      }))
    });
  } catch (error) {
    console.error('Error en getHistorialBajas:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar el historial de bajas.'
    });
  }
};

export const registrarBaja = async (req, res) => {
  try {
    const { libroId, cantidadDescontada, motivo, observaciones } = req.body;

    const idLibro = parseInt(libroId, 10);
    const cant = parseInt(cantidadDescontada, 10);

    if (!idLibro || !cant || cant <= 0 || !motivo) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debe seleccionar un libro, especificar una cantidad válida (> 0) y el motivo de la baja.'
      });
    }

    const libro = await prisma.libro.findUnique({
      where: { id: idLibro }
    });

    if (!libro) {
      return res.status(404).json({
        ok: false,
        mensaje: 'El libro seleccionado no existe.'
      });
    }

    if (libro.ejemplares < cant) {
      return res.status(400).json({
        ok: false,
        mensaje: `No se puede descontar ${cant} unidades. El stock disponible actual es de sólo ${libro.ejemplares} ejemplar(es).`
      });
    }

    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = ahora.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const responsableNombre = req.usuario ? req.usuario.nombre : 'Administrador';

    // Transacción atómica: Registrar baja y DESCONTAR stock en Libro
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevaBaja = await tx.ajusteInventario.create({
        data: {
          libroId: idLibro,
          cantidadDescontada: cant,
          motivo: motivo.trim(),
          observaciones: observaciones ? observaciones.trim() : null,
          fecha: fechaStr,
          hora: horaStr,
          responsable: responsableNombre
        },
        include: {
          libro: true
        }
      });

      const libroActualizado = await tx.libro.update({
        where: { id: idLibro },
        data: {
          ejemplares: {
            decrement: cant
          }
        }
      });

      return { nuevaBaja, libroActualizado };
    });

    await registrarBitacora({
      req,
      modulo: 'INVENTARIO',
      accion: 'BAJA_STOCK',
      descripcion: `Baja de inventario: -${cant} ejemplares de "${resultado.libroActualizado.titulo}" (${motivo})`,
      detalles: {
        libroId: idLibro,
        libroTitulo: resultado.libroActualizado.titulo,
        cantidadDescontada: cant,
        motivo,
        observaciones: observaciones || null
      }
    });

    return res.status(201).json({
      ok: true,
      mensaje: `¡Baja registrada! Se descontaron -${cant} ejemplares del libro "${resultado.libroActualizado.titulo}". Stock actual: ${resultado.libroActualizado.ejemplares}.`,
      baja: {
        id: resultado.nuevaBaja.id,
        libroId: resultado.nuevaBaja.libroId,
        libroTitulo: resultado.nuevaBaja.libro.titulo,
        libroAutor: resultado.nuevaBaja.libro.autor,
        libroPortada: resultado.nuevaBaja.libro.portada,
        cantidadDescontada: resultado.nuevaBaja.cantidadDescontada,
        motivo: resultado.nuevaBaja.motivo,
        observaciones: resultado.nuevaBaja.observaciones,
        fecha: resultado.nuevaBaja.fecha,
        hora: resultado.nuevaBaja.hora,
        responsable: resultado.nuevaBaja.responsable
      },
      stockActual: resultado.libroActualizado.ejemplares
    });
  } catch (error) {
    console.error('Error en registrarBaja:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al registrar la baja de inventario.'
    });
  }
};
