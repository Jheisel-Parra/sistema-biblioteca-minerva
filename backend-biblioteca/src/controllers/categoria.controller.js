import prisma from '../config/prisma.js';
import { registrarBitacora } from '../utils/bitacora.js';
import { capitalizarPalabras } from '../utils/formatoTexto.js';

const GENEROS_PREDETERMINADOS = [
  'Novela',
  'Clásico',
  'Ciencia Ficción',
  'Fantasía',
  'Infantil / Juvenil',
  'Misterio / Suspenso',
  'Historia / Biografía',
  'Filosofía',
  'Ciencia / Divulgación',
  'Poesía / Teatro',
  'Autoayuda / Desarrollo Personal',
  'Educación / Texto Escolar',
  'Otro'
];

/**
 * Obtener todos los géneros / categorías con conteo de libros y ventas asociadas
 */
export const getCategorias = async (req, res) => {
  try {
    let categorias = await prisma.categoria.findMany({
      orderBy: { nombre: 'asc' }
    });

    // Si aún no hay géneros registrados, sembrar los predeterminados
    if (categorias.length === 0) {
      for (const nombre of GENEROS_PREDETERMINADOS) {
        await prisma.categoria.upsert({
          where: { nombre },
          update: {},
          create: { nombre }
        });
      }
      categorias = await prisma.categoria.findMany({
        orderBy: { nombre: 'asc' }
      });
    }

    // Calcular en paralelo el total de libros y ventas de cada género
    const categoriasConMetricas = await Promise.all(
      categorias.map(async (cat) => {
        const totalLibros = await prisma.libro.count({
          where: { categoria: cat.nombre }
        });

        const totalVentas = await prisma.detalleVenta.count({
          where: { libro: { categoria: cat.nombre } }
        });

        return {
          id: cat.id,
          nombre: cat.nombre,
          descripcion: cat.descripcion || '',
          totalLibros,
          totalVentas,
          tieneVentas: totalVentas > 0,
          sePuedeEditar: totalVentas === 0,
          sePuedeEliminar: totalVentas === 0
        };
      })
    );

    return res.status(200).json({
      ok: true,
      categorias: categoriasConMetricas
    });
  } catch (error) {
    console.error('Error en getCategorias:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar los géneros literarios.'
    });
  }
};

/**
 * Crear un nuevo género literario (Solo Admin)
 */
export const crearCategoria = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: '🔒 Acceso restringido: Solo los administradores pueden registrar nuevos géneros.'
      });
    }

    const { nombre, descripcion } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El nombre del género es obligatorio.'
      });
    }

    const nombreLimpio = capitalizarPalabras(nombre);

    // Validar duplicado sin importar mayúsculas/minúsculas
    const existente = await prisma.categoria.findFirst({
      where: {
        nombre: {
          equals: nombreLimpio
        }
      }
    });

    if (existente) {
      return res.status(400).json({
        ok: false,
        mensaje: `⚠️ Ya existe un género registrado con el nombre "${nombreLimpio}".`
      });
    }

    const nuevaCategoria = await prisma.categoria.create({
      data: {
        nombre: nombreLimpio,
        descripcion: descripcion ? descripcion.trim() : null
      }
    });

    await registrarBitacora({
      req,
      modulo: 'GENEROS',
      accion: 'CREAR',
      descripcion: `Nuevo género literario agregado: "${nuevaCategoria.nombre}"`,
      detalles: { id: nuevaCategoria.id, nombre: nuevaCategoria.nombre, descripcion: nuevaCategoria.descripcion }
    });

    return res.status(201).json({
      ok: true,
      mensaje: `¡Género "${nuevaCategoria.nombre}" creado exitosamente!`,
      categoria: {
        id: nuevaCategoria.id,
        nombre: nuevaCategoria.nombre,
        descripcion: nuevaCategoria.descripcion || '',
        totalLibros: 0,
        totalVentas: 0,
        tieneVentas: false,
        sePuedeEditar: true,
        sePuedeEliminar: true
      }
    });
  } catch (error) {
    console.error('Error en crearCategoria:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al registrar el género en la base de datos.'
    });
  }
};

/**
 * Editar nombre de género (Solo Admin y antes de su primera venta)
 */
export const actualizarCategoria = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: '🔒 Acceso restringido: Solo los administradores pueden editar géneros.'
      });
    }

    const { id } = req.params;
    const catId = parseInt(id, 10);
    const { nombre, descripcion } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El nuevo nombre del género es obligatorio.'
      });
    }

    const catExistente = await prisma.categoria.findUnique({
      where: { id: catId }
    });

    if (!catExistente) {
      return res.status(404).json({
        ok: false,
        mensaje: 'El género no fue encontrado.'
      });
    }

    const nombreNuevo = capitalizarPalabras(nombre);

    // Regla de Negocio: Verificar si ya tiene ventas registradas
    const totalVentas = await prisma.detalleVenta.count({
      where: { libro: { categoria: catExistente.nombre } }
    });

    if (totalVentas > 0) {
      return res.status(400).json({
        ok: false,
        mensaje: `🔒 No se puede modificar el nombre del género "${catExistente.nombre}" porque ya cuenta con ${totalVentas} venta(s) registrada(s). Se debe preservar el historial de facturación.`
      });
    }

    // Validar si el nuevo nombre ya está usado por otro género
    if (nombreNuevo.toLowerCase() !== catExistente.nombre.toLowerCase()) {
      const duplicado = await prisma.categoria.findFirst({
        where: { nombre: { equals: nombreNuevo } }
      });
      if (duplicado) {
        return res.status(400).json({
          ok: false,
          mensaje: `⚠️ Ya existe otro género con el nombre "${nombreNuevo}".`
        });
      }
    }

    // Actualizar categoría y sincronizar los libros que tenían este nombre antes de venderse
    const nombreAnterior = catExistente.nombre;

    const [categoriaActualizada] = await prisma.$transaction([
      prisma.categoria.update({
        where: { id: catId },
        data: {
          nombre: nombreNuevo,
          descripcion: descripcion !== undefined ? (descripcion ? descripcion.trim() : null) : catExistente.descripcion
        }
      }),
      prisma.libro.updateMany({
        where: { categoria: nombreAnterior },
        data: { categoria: nombreNuevo }
      })
    ]);

    const totalLibros = await prisma.libro.count({
      where: { categoria: categoriaActualizada.nombre }
    });

    await registrarBitacora({
      req,
      modulo: 'GENEROS',
      accion: 'EDITAR',
      descripcion: `Género literario modificado: "${nombreAnterior}" pasó a ser "${categoriaActualizada.nombre}"`,
      detalles: {
        id: categoriaActualizada.id,
        nombreAnterior,
        nuevoNombre: categoriaActualizada.nombre,
        descripcion: categoriaActualizada.descripcion
      }
    });

    return res.status(200).json({
      ok: true,
      mensaje: `¡Género actualizado a "${categoriaActualizada.nombre}" correctamente!`,
      categoria: {
        id: categoriaActualizada.id,
        nombre: categoriaActualizada.nombre,
        descripcion: categoriaActualizada.descripcion || '',
        totalLibros,
        totalVentas: 0,
        tieneVentas: false,
        sePuedeEditar: true,
        sePuedeEliminar: true
      }
    });
  } catch (error) {
    console.error('Error en actualizarCategoria:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar el género.'
    });
  }
};

/**
 * Eliminar género (Solo Admin y solo si NO tiene ventas registradas)
 */
export const eliminarCategoria = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: '🔒 Acceso restringido: Solo los administradores pueden eliminar géneros.'
      });
    }

    const { id } = req.params;
    const catId = parseInt(id, 10);

    const catExistente = await prisma.categoria.findUnique({
      where: { id: catId }
    });

    if (!catExistente) {
      return res.status(404).json({
        ok: false,
        mensaje: 'El género no fue encontrado.'
      });
    }

    // Regla de Negocio: No se puede eliminar si ya se vendió un libro con este género
    const totalVentas = await prisma.detalleVenta.count({
      where: { libro: { categoria: catExistente.nombre } }
    });

    if (totalVentas > 0) {
      return res.status(400).json({
        ok: false,
        mensaje: `🔒 No se puede eliminar el género "${catExistente.nombre}" porque ya existen ${totalVentas} ventas y facturas registradas de libros pertenecientes a este género.`
      });
    }

    // Si tiene libros existentes pero sin ventas, reasignar su categoría a 'Otro'
    await prisma.$transaction([
      prisma.libro.updateMany({
        where: { categoria: catExistente.nombre },
        data: { categoria: 'Otro' }
      }),
      prisma.categoria.delete({
        where: { id: catId }
      })
    ]);

    await registrarBitacora({
      req,
      modulo: 'GENEROS',
      accion: 'ELIMINAR',
      descripcion: `Género literario eliminado: "${catExistente.nombre}" (ID: ${catId})`,
      detalles: { id: catId, nombre: catExistente.nombre }
    });

    return res.status(200).json({
      ok: true,
      mensaje: `¡Género "${catExistente.nombre}" eliminado correctamente! (Los libros asociados se asignaron a "Otro").`
    });
  } catch (error) {
    console.error('Error en eliminarCategoria:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al eliminar el género.'
    });
  }
};
