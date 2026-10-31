import prisma from '../config/prisma.js';
import { registrarBitacora } from '../utils/bitacora.js';

const METODOS_PREDETERMINADOS = [
  {
    nombre: 'Punto de Venta',
    etiqueta: 'Punto de Venta',
    icono: '💳',
    requiereReferencia: true,
    esBase: true,
    activo: true
  },
  {
    nombre: 'Pago Móvil',
    etiqueta: 'Pago Móvil',
    icono: '📱',
    requiereReferencia: true,
    esBase: true,
    activo: true
  },
  {
    nombre: 'Transferencia Bancaria',
    etiqueta: 'Transferencia',
    icono: '🏦',
    requiereReferencia: true,
    esBase: true,
    activo: true
  },
  {
    nombre: 'Efectivo',
    etiqueta: 'Efectivo ($ / Bs)',
    icono: '💵',
    requiereReferencia: false,
    esBase: true,
    activo: true
  }
];

/**
 * Asegura que la tabla MetodoPago exista en SQLite y devuelve todas las filas ordenadas por ID
 */
async function obtenerTodosMetodosDB() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MetodoPago" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "nombre" TEXT NOT NULL,
      "etiqueta" TEXT NOT NULL,
      "icono" TEXT NOT NULL DEFAULT '💳',
      "requiereReferencia" BOOLEAN NOT NULL DEFAULT true,
      "esBase" BOOLEAN NOT NULL DEFAULT false,
      "activo" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "MetodoPago_nombre_key" ON "MetodoPago"("nombre");
  `);

  const filas = await prisma.$queryRawUnsafe(`SELECT * FROM "MetodoPago" ORDER BY "id" ASC`);
  return filas.map((f) => ({
    id: Number(f.id),
    nombre: f.nombre,
    etiqueta: f.etiqueta || f.nombre,
    icono: f.icono || '💳',
    requiereReferencia: Boolean(f.requiereReferencia),
    esBase: Boolean(f.esBase),
    activo: f.activo === undefined || f.activo === null ? true : Boolean(f.activo)
  }));
}

async function insertarMetodoDB({ nombre, etiqueta, icono, requiereReferencia, esBase, activo }) {
  const ahora = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO "MetodoPago" ("nombre", "etiqueta", "icono", "requiereReferencia", "esBase", "activo", "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    nombre,
    etiqueta || nombre,
    icono || '💸',
    requiereReferencia ? 1 : 0,
    esBase ? 1 : 0,
    activo !== false ? 1 : 0,
    ahora,
    ahora
  );
  const filas = await prisma.$queryRawUnsafe(`SELECT * FROM "MetodoPago" WHERE "nombre" = ? LIMIT 1`, nombre);
  const f = filas[0];
  return {
    id: Number(f.id),
    nombre: f.nombre,
    etiqueta: f.etiqueta || f.nombre,
    icono: f.icono || '💸',
    requiereReferencia: Boolean(f.requiereReferencia),
    esBase: Boolean(f.esBase),
    activo: Boolean(f.activo)
  };
}

/**
 * Obtener todos los métodos de pago registrados en la base de datos
 * junto con el conteo de ventas asociadas para validar si pueden eliminarse o solo inhabilitarse.
 */
export const getMetodosPago = async (req, res) => {
  try {
    let metodos = await obtenerTodosMetodosDB();

    // Si aún no hay métodos en la BD, sembrar los predeterminados
    if (metodos.length === 0) {
      for (const item of METODOS_PREDETERMINADOS) {
        await insertarMetodoDB(item);
      }
      metodos = await obtenerTodosMetodosDB();
    }

    // Sincronizar cualquier método histórico usado en Ventas que no esté en la tabla
    const ventasMetodos = await prisma.venta.findMany({
      select: { metodoPago: true },
      distinct: ['metodoPago']
    });

    const nombresRegistrados = new Set(metodos.map((m) => m.nombre.toLowerCase()));
    let huboSincronizacion = false;

    for (const v of ventasMetodos) {
      const nombreVenta = (v.metodoPago || '').trim();
      if (nombreVenta && !nombresRegistrados.has(nombreVenta.toLowerCase())) {
        await insertarMetodoDB({
          nombre: nombreVenta,
          etiqueta: nombreVenta,
          icono: '💸',
          requiereReferencia: nombreVenta.toLowerCase() !== 'efectivo',
          esBase: false,
          activo: true
        });
        nombresRegistrados.add(nombreVenta.toLowerCase());
        huboSincronizacion = true;
      }
    }

    if (huboSincronizacion) {
      metodos = await obtenerTodosMetodosDB();
    }

    // Calcular ventas asociadas a cada método de pago
    const metodosConMetricas = await Promise.all(
      metodos.map(async (m) => {
        const totalVentas = await prisma.venta.count({
          where: { metodoPago: m.nombre }
        });

        return {
          id: m.id,
          nombre: m.nombre,
          etiqueta: m.etiqueta || m.nombre,
          icono: m.icono || '💳',
          requiereReferencia: m.requiereReferencia,
          esBase: m.esBase,
          activo: m.activo,
          totalVentas,
          tieneVentas: totalVentas > 0,
          sePuedeEliminar: !m.esBase && totalVentas === 0
        };
      })
    );

    return res.status(200).json({
      ok: true,
      metodosPago: metodosConMetricas
    });
  } catch (error) {
    console.error('Error en getMetodosPago:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar los métodos de pago en la base de datos.'
    });
  }
};

/**
 * Crear un nuevo método de pago en la base de datos (Exclusivo Administradores)
 */
export const crearMetodoPago = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: 'Acceso restringido: Solo los administradores pueden agregar métodos de pago.'
      });
    }

    const { nombre, etiqueta, icono, requiereReferencia } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El nombre del método de pago es obligatorio.'
      });
    }

    const nombreLimpio = nombre.trim();

    const todos = await obtenerTodosMetodosDB();
    const existente = todos.find(
      (m) => m.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );

    if (existente) {
      if (!existente.activo) {
        return res.status(400).json({
          ok: false,
          mensaje: `El método "${existente.nombre}" ya existe en la base de datos (con historial) y está inhabilitado. Puedes volver a habilitarlo abajo.`
        });
      }
      return res.status(400).json({
        ok: false,
        mensaje: `El método de pago "${existente.nombre}" ya está registrado.`
      });
    }

    const nuevoMetodo = await insertarMetodoDB({
      nombre: nombreLimpio,
      etiqueta: (etiqueta || nombreLimpio).trim(),
      icono: icono || '💸',
      requiereReferencia: requiereReferencia !== undefined ? Boolean(requiereReferencia) : true,
      esBase: false,
      activo: true
    });

    await registrarBitacora({
      req,
      modulo: 'VENTAS',
      accion: 'CREAR',
      descripcion: `Nuevo método de pago registrado: "${nuevoMetodo.nombre}"`,
      detalles: {
        id: nuevoMetodo.id,
        nombre: nuevoMetodo.nombre,
        requiereReferencia: nuevoMetodo.requiereReferencia
      }
    });

    return res.status(201).json({
      ok: true,
      mensaje: `Método de pago "${nuevoMetodo.nombre}" registrado exitosamente.`,
      metodoPago: {
        ...nuevoMetodo,
        totalVentas: 0,
        tieneVentas: false,
        sePuedeEliminar: true
      }
    });
  } catch (error) {
    console.error('Error en crearMetodoPago:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al guardar el método de pago en la base de datos.'
    });
  }
};

/**
 * Habilitar o Inhabilitar un método de pago (Exclusivo Administradores)
 * Se utiliza cuando un método ya tuvo ventas y NO puede eliminarse de la BD,
 * permitiendo ocultarlo de las opciones disponibles en Nueva Venta.
 */
export const toggleEstadoMetodoPago = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: 'Acceso restringido: Solo los administradores pueden habilitar o inhabilitar métodos de pago.'
      });
    }

    const { id } = req.params;
    const metodoId = parseInt(id, 10);

    const todos = await obtenerTodosMetodosDB();
    const metodoExistente = todos.find((m) => m.id === metodoId);

    if (!metodoExistente) {
      return res.status(404).json({
        ok: false,
        mensaje: 'El método de pago no fue encontrado.'
      });
    }

    const nuevoEstadoActivo = !metodoExistente.activo;
    const ahora = new Date().toISOString();

    await prisma.$executeRawUnsafe(
      `UPDATE "MetodoPago" SET "activo" = ?, "updatedAt" = ? WHERE "id" = ?`,
      nuevoEstadoActivo ? 1 : 0,
      ahora,
      metodoId
    );

    const totalVentas = await prisma.venta.count({
      where: { metodoPago: metodoExistente.nombre }
    });

    await registrarBitacora({
      req,
      modulo: 'VENTAS',
      accion: 'EDITAR',
      descripcion: `Método de pago "${metodoExistente.nombre}" ${nuevoEstadoActivo ? 'habilitado' : 'inhabilitado'} para nuevas ventas`,
      detalles: {
        id: metodoExistente.id,
        nombre: metodoExistente.nombre,
        activo: nuevoEstadoActivo,
        totalVentas
      }
    });

    return res.status(200).json({
      ok: true,
      mensaje: `El método "${metodoExistente.nombre}" fue ${nuevoEstadoActivo ? 'habilitado' : 'inhabilitado'} correctamente.`,
      metodoPago: {
        ...metodoExistente,
        activo: nuevoEstadoActivo,
        totalVentas,
        tieneVentas: totalVentas > 0,
        sePuedeEliminar: !metodoExistente.esBase && totalVentas === 0
      }
    });
  } catch (error) {
    console.error('Error en toggleEstadoMetodoPago:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cambiar el estado del método de pago.'
    });
  }
};

/**
 * Eliminar un método de pago de la base de datos (Exclusivo Administradores)
 * REGLA DE NEGOCIO: Solo se pueden eliminar métodos personalizados que NO hayan tenido ventas.
 * Si el método ya tiene ventas asociadas, no se borra de la base de datos (solo puede inhabilitarse).
 */
export const eliminarMetodoPago = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: 'Acceso restringido: Solo los administradores pueden eliminar métodos de pago.'
      });
    }

    const { id } = req.params;
    const metodoId = parseInt(id, 10);

    const todos = await obtenerTodosMetodosDB();
    const metodoExistente = todos.find((m) => m.id === metodoId);

    if (!metodoExistente) {
      return res.status(404).json({
        ok: false,
        mensaje: 'El método de pago no fue encontrado.'
      });
    }

    if (metodoExistente.esBase) {
      return res.status(400).json({
        ok: false,
        mensaje: `El método "${metodoExistente.nombre}" es un método base del sistema y no puede eliminarse (solo puede inhabilitarse si no deseas mostrarlo).`
      });
    }

    // Regla de Negocio: Verificar si ya tiene ventas registradas
    const totalVentas = await prisma.venta.count({
      where: { metodoPago: metodoExistente.nombre }
    });

    if (totalVentas > 0) {
      return res.status(400).json({
        ok: false,
        mensaje: `No se puede eliminar el método de pago "${metodoExistente.nombre}" porque ya registra ${totalVentas} venta(s) en la base de datos. Solo puedes inhabilitarlo para que no aparezca disponible al vender.`
      });
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM "MetodoPago" WHERE "id" = ?`,
      metodoId
    );

    await registrarBitacora({
      req,
      modulo: 'VENTAS',
      accion: 'ELIMINAR',
      descripcion: `Método de pago eliminado (sin ventas asociadas): "${metodoExistente.nombre}"`,
      detalles: {
        id: metodoId,
        nombre: metodoExistente.nombre
      }
    });

    return res.status(200).json({
      ok: true,
      mensaje: `Método de pago "${metodoExistente.nombre}" eliminado permanentemente.`
    });
  } catch (error) {
    console.error('Error en eliminarMetodoPago:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al intentar eliminar el método de pago.'
    });
  }
};
