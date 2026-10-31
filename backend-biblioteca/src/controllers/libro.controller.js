import prisma from '../config/prisma.js';
import { registrarBitacora } from '../utils/bitacora.js';
import { capitalizarPalabras } from '../utils/formatoTexto.js';

const normalizarIsbn = (str) => {
  if (!str) return '';
  return str.toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

let cacheTasaBCV = { valor: null, timestamp: 0 };

const obtenerTasaBCVOficial = async () => {
  const ahora = Date.now();
  // Caché de 15 minutos para no ralentizar las consultas del catálogo
  if (cacheTasaBCV.valor && ahora - cacheTasaBCV.timestamp < 15 * 60 * 1000) {
    return cacheTasaBCV.valor;
  }
  try {
    const resp = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    if (resp.ok) {
      const data = await resp.json();
      const tasa = parseFloat(data.promedio || data.precio || 0);
      if (tasa > 0) {
        cacheTasaBCV = { valor: parseFloat(tasa.toFixed(2)), timestamp: ahora };
        return cacheTasaBCV.valor;
      }
    }
  } catch {
    // Continuar con respaldo si no hay internet
  }
  return cacheTasaBCV.valor || 88.62;
};

// CATÁLOGO PÚBLICO DE SOLO LECTURA (SIN AUTENTICACIÓN, SIN COSTOS INTERNOS NI PROVEEDORES)
export const getLibrosPublico = async (req, res) => {
  try {
    const [libros, tasaBCV] = await Promise.all([
      prisma.libro.findMany({
        where: { activo: true },
        select: {
          id: true,
          titulo: true,
          autor: true,
          isbn: true,
          categoria: true,
          precio: true,
          ejemplares: true,
          portada: true,
          updatedAt: true
        },
        orderBy: [
          { ejemplares: 'desc' },
          { titulo: 'asc' }
        ]
      }),
      obtenerTasaBCVOficial()
    ]);

    return res.status(200).json({
      ok: true,
      tasaBCV,
      libros: libros.map((l) => {
        const precioBase = Number(l.precio) || 0;
        const montoIva = parseFloat((precioBase * 0.16).toFixed(2));
        const precioConIva = parseFloat((precioBase + montoIva).toFixed(2));
        return {
          ...l,
          ivaPorcentaje: 16,
          montoIva,
          precioConIva
        };
      })
    });
  } catch (error) {
    console.error('Error en getLibrosPublico:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el catálogo público de libros.'
    });
  }
};

export const getLibros = async (req, res) => {
  try {
    const esAdmin = req.usuario?.rol === 'admin';

    const libros = await prisma.libro.findMany({
      include: {
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
      libros: libros.map((l) => {
        const precioBase = Number(l.precio) || 0;
        const montoIva = parseFloat((precioBase * 0.16).toFixed(2));
        const precioConIva = parseFloat((precioBase + montoIva).toFixed(2));
        const item = {
          ...l,
          ivaPorcentaje: 16,
          montoIva,
          precioConIva,
          distribuidor: l.distribuidor ? l.distribuidor.nombre : 'Sin distribuidor'
        };
        // Si el usuario es staff, ocultar rigurosamente el costo de compra
        if (!esAdmin) {
          delete item.precioCosto;
        }
        return item;
      })
    });
  } catch (error) {
    console.error('Error en getLibros:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el catálogo de libros.'
    });
  }
};

export const crearLibro = async (req, res) => {
  try {
    // Restricción: Solo Administradores pueden dar de alta libros
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: '🔒 Acceso restringido: Solo los administradores pueden registrar nuevos libros en el catálogo.'
      });
    }

    const { 
      titulo, 
      autor, 
      isbn, 
      categoria, 
      precio, 
      precioCosto = 0.0,
      ejemplares = 0, 
      portada, 
      distribuidorId, 
      distribuidorNombre 
    } = req.body;

    if (!titulo || !autor || !isbn || !categoria) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Título, Autor, ISBN y Categoría son campos obligatorios.'
      });
    }

    if (/\d/.test(autor)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El nombre del autor no puede contener números.'
      });
    }

    const isbnLimpio = normalizarIsbn(isbn);

    // Validar ISBN único
    const librosExistentes = await prisma.libro.findMany({ select: { id: true, isbn: true } });
    const yaExisteIsbn = librosExistentes.some((l) => normalizarIsbn(l.isbn) === isbnLimpio);

    if (yaExisteIsbn) {
      return res.status(400).json({
        ok: false,
        mensaje: `⚠️ Ya existe un libro registrado con el ISBN "${isbn}".`
      });
    }

    const precioNum = parseFloat(precio) || 0.0;
    const costoNum = parseFloat(precioCosto) || 0.0;
    const stockNum = parseInt(ejemplares, 10) || 0;

    // Buscar distribuidor si se pasó nombre o ID
    let finalDistId = distribuidorId ? parseInt(distribuidorId, 10) : null;
    let distEncontrado = null;

    if (finalDistId) {
      distEncontrado = await prisma.distribuidor.findUnique({ where: { id: finalDistId } });
    } else if (distribuidorNombre) {
      distEncontrado = await prisma.distribuidor.findFirst({
        where: { nombre: distribuidorNombre }
      });
      if (distEncontrado) finalDistId = distEncontrado.id;
    }

    // Fallback de distribuidor si hay stock inicial y no se especificó uno
    if (!finalDistId && stockNum > 0) {
      distEncontrado = await prisma.distribuidor.findFirst({
        where: { estado: 'Activo' }
      }) || await prisma.distribuidor.findFirst();
      if (distEncontrado) finalDistId = distEncontrado.id;
    }

    if (precioNum < 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El precio de venta no puede ser negativo.'
      });
    }

    if (costoNum < 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El costo de compra no puede ser negativo.'
      });
    }

    if (stockNum < 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El número de ejemplares no puede ser negativo.'
      });
    }

    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = ahora.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const responsableNombre = req.usuario?.nombre || 'Administrador';

    // Transacción atómica: Crear libro y registrar automáticamente su entrada de stock inicial
    const resultado = await prisma.$transaction(async (tx) => {
      const nuevoLibro = await tx.libro.create({
        data: {
          titulo: capitalizarPalabras(titulo),
          autor: capitalizarPalabras(autor),
          isbn: isbn.trim(),
          categoria: capitalizarPalabras(categoria),
          precio: precioNum,
          precioCosto: costoNum,
          ejemplares: stockNum,
          portada: portada ? portada.trim() : null,
          distribuidorId: finalDistId,
          activo: true
        },
        include: {
          distribuidor: true
        }
      });

      let nuevaEntrada = null;
      if (stockNum > 0 && finalDistId) {
        const costoTotalLote = parseFloat((stockNum * costoNum).toFixed(2));
        nuevaEntrada = await tx.entradaInventario.create({
          data: {
            libroId: nuevoLibro.id,
            distribuidorId: finalDistId,
            cantidadIngresada: stockNum,
            costoUnitario: costoNum,
            costoTotal: costoTotalLote,
            nroFacturaProveedor: `INICIAL-${isbn.trim().replace(/[^a-zA-Z0-9]/g, '')}`,
            fecha: fechaStr,
            hora: horaStr,
            observaciones: 'Stock de apertura registrado al dar de alta el libro en el catálogo.',
            responsable: responsableNombre
          },
          include: {
            distribuidor: true,
            libro: true
          }
        });
      }

      return { nuevoLibro, nuevaEntrada };
    });

    await registrarBitacora({
      req,
      modulo: 'LIBROS',
      accion: 'CREAR',
      descripcion: `Nuevo libro registrado: "${resultado.nuevoLibro.titulo}" (${categoria.trim()}) con ${stockNum} ejemplares iniciales`,
      detalles: {
        libroId: resultado.nuevoLibro.id,
        titulo: resultado.nuevoLibro.titulo,
        autor: resultado.nuevoLibro.autor,
        isbn: isbn.trim(),
        categoria: categoria.trim(),
        precioVenta: precioNum,
        precioCosto: costoNum,
        stockInicial: stockNum
      }
    });

    return res.status(201).json({
      ok: true,
      mensaje: `Libro "${resultado.nuevoLibro.titulo}" agregado exitosamente al catálogo con ${stockNum} ejemplares registrados en el inventario.`,
      libro: {
        ...resultado.nuevoLibro,
        distribuidor: resultado.nuevoLibro.distribuidor ? resultado.nuevoLibro.distribuidor.nombre : 'Distribución Directa'
      },
      entrada: resultado.nuevaEntrada ? {
        id: resultado.nuevaEntrada.id,
        libroId: resultado.nuevaEntrada.libroId,
        libroTitulo: resultado.nuevoLibro.titulo,
        libroAutor: resultado.nuevoLibro.autor,
        libroPortada: resultado.nuevoLibro.portada,
        distribuidor: resultado.nuevaEntrada.distribuidor?.nombre || 'Distribución Directa',
        distribuidorId: resultado.nuevaEntrada.distribuidorId,
        cantidadIngresada: resultado.nuevaEntrada.cantidadIngresada,
        costoUnitario: resultado.nuevaEntrada.costoUnitario,
        costoTotal: resultado.nuevaEntrada.costoTotal,
        nroFacturaProveedor: resultado.nuevaEntrada.nroFacturaProveedor,
        fecha: resultado.nuevaEntrada.fecha,
        hora: resultado.nuevaEntrada.hora,
        observaciones: resultado.nuevaEntrada.observaciones,
        responsable: resultado.nuevaEntrada.responsable
      } : null
    });
  } catch (error) {
    console.error('Error en crearLibro:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al registrar el libro en la base de datos.'
    });
  }
};

// ACTUALIZAR INFORMACIÓN DEL LIBRO (STOCK PROTEGIDO: NO SE PUEDE ALTERAR AQUÍ)
export const actualizarLibro = async (req, res) => {
  try {
    // Restricción: Solo Administradores pueden editar libros
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: '🔒 Acceso restringido: Solo los administradores pueden modificar libros.'
      });
    }

    const { id } = req.params;
    const libroId = parseInt(id, 10);
    const { titulo, autor, isbn, categoria, precio, precioCosto, portada, distribuidorId, distribuidorNombre } = req.body;

    if (!titulo || !autor || !categoria) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Título, Autor y Categoría son campos obligatorios.'
      });
    }

    if (autor && /\d/.test(autor)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El nombre del autor no puede contener números.'
      });
    }

    if (precio !== undefined && parseFloat(precio) < 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El precio del libro no puede ser un número negativo.'
      });
    }

    if (precioCosto !== undefined && parseFloat(precioCosto) < 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El costo del libro no puede ser un número negativo.'
      });
    }

    let finalDistId = distribuidorId ? parseInt(distribuidorId, 10) : null;
    if (!finalDistId && distribuidorNombre) {
      const dist = await prisma.distribuidor.findFirst({
        where: { nombre: distribuidorNombre }
      });
      if (dist) finalDistId = dist.id;
    }

    // Buscar el libro por ID o, si cambió el ID tras una recarga de semilla, por ISBN o Título
    let libroExistente = await prisma.libro.findUnique({ where: { id: libroId } });
    if (!libroExistente && isbn) {
      libroExistente = await prisma.libro.findFirst({ where: { isbn: isbn.trim() } });
    }
    if (!libroExistente && titulo) {
      libroExistente = await prisma.libro.findFirst({ where: { titulo: titulo.trim() } });
    }

    if (!libroExistente) {
      return res.status(404).json({
        ok: false,
        mensaje: 'El libro seleccionado no fue encontrado en la base de datos.'
      });
    }

    // Actualizamos metadata, precio de venta, costo y portada. El stock "ejemplares" NO se toca aquí.
    const libroActualizado = await prisma.libro.update({
      where: { id: libroExistente.id },
      data: {
        titulo: capitalizarPalabras(titulo),
        autor: capitalizarPalabras(autor),
        categoria: capitalizarPalabras(categoria),
        precio: precio !== undefined ? parseFloat(precio) : undefined,
        precioCosto: precioCosto !== undefined ? parseFloat(precioCosto) : undefined,
        portada: portada !== undefined ? (typeof portada === 'string' ? portada.trim() : portada) : undefined,
        distribuidorId: finalDistId !== null ? finalDistId : libroExistente.distribuidorId
      },
      include: {
        distribuidor: true
      }
    });

    await registrarBitacora({
      req,
      modulo: 'LIBROS',
      accion: 'EDITAR',
      descripcion: `Modificación de datos del libro: "${libroActualizado.titulo}" (ID: ${libroId})`,
      detalles: {
        libroId,
        titulo: libroActualizado.titulo,
        autor: libroActualizado.autor,
        categoria: libroActualizado.categoria,
        precio: libroActualizado.precio,
        precioCosto: libroActualizado.precioCosto
      }
    });

    return res.status(200).json({
      ok: true,
      mensaje: 'Información del libro actualizada correctamente.',
      libro: {
        ...libroActualizado,
        distribuidor: libroActualizado.distribuidor ? libroActualizado.distribuidor.nombre : 'Sin distribuidor'
      }
    });
  } catch (error) {
    console.error('Error en actualizarLibro:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar los datos del libro.'
    });
  }
};
