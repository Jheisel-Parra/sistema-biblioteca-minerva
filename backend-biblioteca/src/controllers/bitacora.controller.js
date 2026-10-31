import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.resolve(__dirname, '../../prisma/dev.db');

/**
 * Obtener listado de eventos de la Bitácora con filtros
 */
export const getBitacora = async (req, res) => {
  try {
    const { modulo, usuarioId, fecha, q, limit = 100, page = 1 } = req.query;

    const where = {};

    if (modulo && modulo !== 'TODOS') {
      where.modulo = modulo.toUpperCase();
    }

    if (usuarioId) {
      where.usuarioId = parseInt(usuarioId, 10);
    }

    if (fecha) {
      where.fecha = fecha;
    }

    if (q && q.trim()) {
      const search = q.trim();
      where.OR = [
        { descripcion: { contains: search } },
        { usuarioNombre: { contains: search } },
        { accion: { contains: search } },
        { modulo: { contains: search } }
      ];
    }

    const take = Math.min(parseInt(limit, 10) || 100, 500);
    const skip = ((parseInt(page, 10) || 1) - 1) * take;

    const [total, eventos] = await Promise.all([
      prisma.bitacora.count({ where }),
      prisma.bitacora.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              rol: true,
              cedula: true
            }
          }
        }
      })
    ]);

    return res.status(200).json({
      ok: true,
      total,
      paginaActual: parseInt(page, 10) || 1,
      totalPaginas: Math.ceil(total / take) || 1,
      eventos: eventos.map((ev) => {
        let detallesParsed = null;
        if (ev.detalles) {
          try {
            detallesParsed = JSON.parse(ev.detalles);
          } catch {
            detallesParsed = ev.detalles;
          }
        }
        return {
          id: ev.id,
          usuarioId: ev.usuarioId,
          usuarioNombre: ev.usuarioNombre,
          usuarioRol: ev.usuarioRol,
          modulo: ev.modulo,
          accion: ev.accion,
          descripcion: ev.descripcion,
          detalles: detallesParsed,
          fecha: ev.fecha,
          hora: ev.hora,
          createdAt: ev.createdAt
        };
      })
    });
  } catch (error) {
    console.error('Error en getBitacora:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar los registros de la bitácora.'
    });
  }
};

/**
 * Obtener historial de conexiones / sesiones de usuarios
 */
export const getSesiones = async (req, res) => {
  try {
    const { activo, usuarioId, fecha, limit = 100 } = req.query;

    const where = {};

    if (activo !== undefined && activo !== '') {
      where.activo = activo === 'true' || activo === true;
    }

    if (usuarioId) {
      where.usuarioId = parseInt(usuarioId, 10);
    }

    if (fecha) {
      where.fechaInicio = fecha;
    }

    const take = Math.min(parseInt(limit, 10) || 100, 300);

    const sesiones = await prisma.sesionUsuario.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
            cedula: true,
            estado: true
          }
        }
      }
    });

    return res.status(200).json({
      ok: true,
      sesiones: sesiones.map((s) => {
        // Calcular duración aproximada si finalizó o tiempo transcurrido si está activa
        let duracion = null;
        const inicioDate = new Date(s.createdAt);
        const finDate = s.activo ? new Date() : (s.fechaFin && s.horaFin ? new Date(`${s.fechaFin}T${s.horaFin}`) : new Date(s.ultimaActividad));
        const diffMs = Math.max(0, finDate - inicioDate);
        const mins = Math.floor(diffMs / 60000);
        const horas = Math.floor(mins / 60);
        const minsRestantes = mins % 60;
        duracion = horas > 0 ? `${horas}h ${minsRestantes}m` : `${minsRestantes} min`;

        return {
          id: s.id,
          usuarioId: s.usuarioId,
          usuarioNombre: s.usuarioNombre,
          usuarioRol: s.usuarioRol,
          fechaInicio: s.fechaInicio,
          horaInicio: s.horaInicio,
          fechaFin: s.fechaFin,
          horaFin: s.horaFin,
          activo: s.activo,
          ip: s.ip || '127.0.0.1',
          ultimaActividad: s.ultimaActividad,
          duracion,
          usuario: s.usuario
        };
      })
    });
  } catch (error) {
    console.error('Error en getSesiones:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar las sesiones de usuario.'
    });
  }
};

/**
 * Resumen para el panel de Bitácora (tarjetas de estadísticas)
 */
export const getResumenBitacora = async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    const [totalEventos, eventosHoy, sesionesActivas, totalSesiones] = await Promise.all([
      prisma.bitacora.count(),
      prisma.bitacora.count({ where: { fecha: hoy } }),
      prisma.sesionUsuario.count({ where: { activo: true } }),
      prisma.sesionUsuario.count()
    ]);

    // Conteo por módulo hoy
    const modulos = ['VENTAS', 'INVENTARIO', 'LIBROS', 'GENEROS', 'USUARIOS', 'AUTH'];
    const conteoModulos = {};

    for (const m of modulos) {
      conteoModulos[m] = await prisma.bitacora.count({
        where: { modulo: m, fecha: hoy }
      });
    }

    return res.status(200).json({
      ok: true,
      resumen: {
        totalEventos,
        eventosHoy,
        sesionesActivas,
        totalSesiones,
        conteoModulos
      }
    });
  } catch (error) {
    console.error('Error en getResumenBitacora:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el resumen de la bitácora.'
    });
  }
};

/**
 * Terminar forzosamente una sesión abierta (Solo Administradores)
 */
export const forzarCierreSesion = async (req, res) => {
  try {
    const { sesionId } = req.params;
    const id = parseInt(sesionId, 10);

    const sesion = await prisma.sesionUsuario.findUnique({
      where: { id }
    });

    if (!sesion) {
      return res.status(404).json({
        ok: false,
        mensaje: 'La sesión no existe.'
      });
    }

    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = ahora.toTimeString().split(' ')[0];

    await prisma.sesionUsuario.update({
      where: { id },
      data: {
        activo: false,
        fechaFin: fechaStr,
        horaFin: horaStr,
        ultimaActividad: ahora
      }
    });

    await prisma.bitacora.create({
      data: {
        usuarioId: req.usuario.id,
        usuarioNombre: req.usuario.nombre,
        usuarioRol: req.usuario.rol,
        modulo: 'AUTH',
        accion: 'FORCE_LOGOUT',
        descripcion: `El administrador ${req.usuario.nombre} cerró administrativamente la sesión de ${sesion.usuarioNombre}`,
        detalles: JSON.stringify({ sesionId: id, usuarioAfectado: sesion.usuarioNombre }),
        fecha: fechaStr,
        hora: horaStr
      }
    }).catch(() => {});

    return res.status(200).json({
      ok: true,
      mensaje: `Sesión de ${sesion.usuarioNombre} finalizada exitosamente.`
    });
  } catch (error) {
    console.error('Error en forzarCierreSesion:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al forzar el cierre de la sesión.'
    });
  }
};

/**
 * Obtener estado de seguridad, métricas de la base de datos SQLite e historial de respaldos (Solo Admin)
 */
export const getEstadoSeguridad = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: 'Acceso restringido: Solo los administradores pueden consultar el módulo de seguridad.'
      });
    }

    let dbExiste = false;
    let tamanoBytes = 0;
    let tamanoFormateado = '0 KB';
    let ultimaModificacion = null;

    if (fs.existsSync(DB_FILE_PATH)) {
      dbExiste = true;
      const stats = fs.statSync(DB_FILE_PATH);
      tamanoBytes = stats.size;
      tamanoFormateado =
        tamanoBytes >= 1024 * 1024
          ? `${(tamanoBytes / (1024 * 1024)).toFixed(2)} MB`
          : `${(tamanoBytes / 1024).toFixed(1)} KB`;
      ultimaModificacion = stats.mtime.toISOString();
    }

    const [
      totalUsuarios,
      totalLectores,
      totalLibros,
      totalDistribuidores,
      totalVentas,
      totalEntradas,
      totalBajas,
      totalBitacora,
      historialBackups
    ] = await Promise.all([
      prisma.usuario.count(),
      prisma.lector.count(),
      prisma.libro.count(),
      prisma.distribuidor.count(),
      prisma.venta.count(),
      prisma.entradaInventario.count(),
      prisma.ajusteInventario.count(),
      prisma.bitacora.count(),
      prisma.bitacora.findMany({
        where: { accion: { in: ['BACKUP_DB', 'RESTAURAR_DB'] } },
        orderBy: { createdAt: 'desc' },
        take: 15
      })
    ]);

    return res.status(200).json({
      ok: true,
      seguridad: {
        motor: 'SQLite 3 (Archivo Portable dev.db)',
        dbExiste,
        tamanoBytes,
        tamanoFormateado,
        ultimaModificacion,
        conteos: {
          usuarios: totalUsuarios,
          lectores: totalLectores,
          libros: totalLibros,
          distribuidores: totalDistribuidores,
          ventas: totalVentas,
          entradas: totalEntradas,
          bajas: totalBajas,
          bitacora: totalBitacora,
          totalRegistros:
            totalUsuarios +
            totalLectores +
            totalLibros +
            totalDistribuidores +
            totalVentas +
            totalEntradas +
            totalBajas +
            totalBitacora
        },
        historialBackups: historialBackups.map((b) => {
          let det = {};
          try {
            det = b.detalles ? JSON.parse(b.detalles) : {};
          } catch {
            det = {};
          }
          return {
            id: b.id,
            usuarioNombre: b.usuarioNombre,
            fecha: b.fecha,
            hora: b.hora,
            descripcion: b.descripcion,
            formato: det.formato || 'SQLite (.db)',
            tamano: det.tamano || tamanoFormateado,
            archivo: det.archivo || 'respaldo-biblioteca-minerva.db'
          };
        })
      }
    });
  } catch (error) {
    console.error('Error en getEstadoSeguridad:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar el estado de seguridad de la base de datos.'
    });
  }
};

/**
 * Descargar copia de seguridad binaria del archivo SQLite (dev.db) — Exclusivo Administradores
 */
export const descargarBackupSqlite = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: 'Acceso restringido: Solo los administradores pueden descargar copias de seguridad de la base de datos.'
      });
    }

    if (!fs.existsSync(DB_FILE_PATH)) {
      return res.status(404).json({
        ok: false,
        mensaje: 'No se encontró el archivo de base de datos SQLite en el servidor.'
      });
    }

    // Forzar volcado de transacciones pendientes en SQLite antes de copiar
    await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(FULL);').catch(() => {});

    const stats = fs.statSync(DB_FILE_PATH);
    const tamanoStr = `${(stats.size / 1024).toFixed(1)} KB`;
    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = ahora.toTimeString().split(' ')[0];
    const nombreArchivo = `backup-minerva-${fechaStr}.db`;

    await prisma.bitacora.create({
      data: {
        usuarioId: req.usuario.id,
        usuarioNombre: req.usuario.nombre,
        usuarioRol: req.usuario.rol,
        modulo: 'AUTH',
        accion: 'BACKUP_DB',
        descripcion: `Copia de seguridad SQLite descargada (${nombreArchivo} - ${tamanoStr})`,
        detalles: JSON.stringify({
          formato: 'SQLite (.db)',
          archivo: nombreArchivo,
          tamano: tamanoStr,
          ip: req.ip || '127.0.0.1'
        }),
        fecha: fechaStr,
        hora: horaStr
      }
    }).catch(() => {});

    const fileBuffer = fs.readFileSync(DB_FILE_PATH);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    return res.status(200).send(fileBuffer);
  } catch (error) {
    console.error('Error en descargarBackupSqlite:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al generar la copia de seguridad de la base de datos SQLite.'
    });
  }
};

/**
 * Exportar respaldo completo en formato JSON estructurado — Exclusivo Administradores
 */
export const descargarBackupJson = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: 'Acceso restringido: Solo los administradores pueden exportar respaldos de la base de datos.'
      });
    }

    const [
      usuarios,
      lectores,
      distribuidores,
      libros,
      entradasInventario,
      ajustesInventario,
      ventas,
      categorias
    ] = await Promise.all([
      prisma.usuario.findMany({
        select: { id: true, cedula: true, nombre: true, email: true, rol: true, estado: true, createdAt: true }
      }),
      prisma.lector.findMany(),
      prisma.distribuidor.findMany(),
      prisma.libro.findMany(),
      prisma.entradaInventario.findMany(),
      prisma.ajusteInventario.findMany(),
      prisma.venta.findMany({ include: { items: true } }),
      prisma.categoria.findMany()
    ]);

    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = ahora.toTimeString().split(' ')[0];
    const nombreArchivo = `backup-minerva-${fechaStr}.json`;

    const payload = {
      sistema: 'Sistema de Biblioteca e Inventario Minerva',
      fechaExportacion: ahora.toISOString(),
      generadoPor: req.usuario.nombre,
      datos: {
        usuarios,
        lectores,
        distribuidores,
        categorias,
        libros,
        entradasInventario,
        ajustesInventario,
        ventas
      }
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const tamanoStr = `${(Buffer.byteLength(jsonString, 'utf8') / 1024).toFixed(1)} KB`;

    await prisma.bitacora.create({
      data: {
        usuarioId: req.usuario.id,
        usuarioNombre: req.usuario.nombre,
        usuarioRol: req.usuario.rol,
        modulo: 'AUTH',
        accion: 'BACKUP_DB',
        descripcion: `Respaldo estructurado JSON exportado (${nombreArchivo} - ${tamanoStr})`,
        detalles: JSON.stringify({
          formato: 'JSON (.json)',
          archivo: nombreArchivo,
          tamano: tamanoStr
        }),
        fecha: fechaStr,
        hora: horaStr
      }
    }).catch(() => {});

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    return res.status(200).send(jsonString);
  } catch (error) {
    console.error('Error en descargarBackupJson:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al exportar el respaldo JSON de la base de datos.'
    });
  }
};

/**
 * Restaurar / Cargar una copia de seguridad (.db SQLite o .json estructurado) — Exclusivo Administradores
 */
export const restaurarBackup = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        mensaje: 'Acceso restringido: Solo los administradores pueden restaurar copias de seguridad de la base de datos.'
      });
    }

    const { nombreArchivo, contenidoBase64 } = req.body;

    if (!nombreArchivo || !contenidoBase64) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debes seleccionar un archivo de respaldo válido (.db o .json).'
      });
    }

    const nombreLower = String(nombreArchivo).toLowerCase();
    const bufferArchivo = Buffer.from(contenidoBase64, 'base64');
    const tamanoStr = `${(bufferArchivo.length / 1024).toFixed(1)} KB`;
    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = ahora.toTimeString().split(' ')[0];

    // CASO 1: Archivo binario SQLite (.db / .sqlite / .sqlite3)
    if (nombreLower.endsWith('.db') || nombreLower.endsWith('.sqlite') || nombreLower.endsWith('.sqlite3')) {
      const cabecera = bufferArchivo.subarray(0, 15).toString('utf8');
      if (cabecera !== 'SQLite format 3') {
        return res.status(400).json({
          ok: false,
          mensaje: 'El archivo seleccionado no es una base de datos SQLite 3 válida.'
        });
      }

      // Desconectar motor Prisma temporalmente para reemplazar dev.db de forma segura
      await prisma.$disconnect();

      try {
        // Eliminar archivos temporales WAL/SHM si existieran
        if (fs.existsSync(`${DB_FILE_PATH}-wal`)) fs.unlinkSync(`${DB_FILE_PATH}-wal`);
        if (fs.existsSync(`${DB_FILE_PATH}-shm`)) fs.unlinkSync(`${DB_FILE_PATH}-shm`);

        // Reemplazar dev.db con el backup cargado
        fs.writeFileSync(DB_FILE_PATH, bufferArchivo);
      } finally {
        await prisma.$connect();
      }

      // Asegurar compatibilidad de columnas nuevas en caso de cargar un backup anterior
      const migracionesCompatibilidad = [
        'ALTER TABLE "Usuario" ADD COLUMN "fechaNacimiento" TEXT;',
        'ALTER TABLE "Usuario" ADD COLUMN "totpSecret" TEXT;',
        'ALTER TABLE "Usuario" ADD COLUMN "totpHabilitado" BOOLEAN NOT NULL DEFAULT false;',
        'ALTER TABLE "Usuario" ADD COLUMN "intentosFallidos" INTEGER NOT NULL DEFAULT 0;',
        'ALTER TABLE "Usuario" ADD COLUMN "bloqueadoHasta" DATETIME;',
        'ALTER TABLE "Lector" ADD COLUMN "fechaNacimiento" TEXT;',
        'ALTER TABLE "Venta" ADD COLUMN "subtotal" REAL NOT NULL DEFAULT 0.0;',
        'ALTER TABLE "Venta" ADD COLUMN "porcentajeIva" REAL NOT NULL DEFAULT 16.0;',
        'ALTER TABLE "Venta" ADD COLUMN "montoIva" REAL NOT NULL DEFAULT 0.0;'
      ];

      for (const sql of migracionesCompatibilidad) {
        await prisma.$executeRawUnsafe(sql).catch(() => {});
      }

      await prisma.bitacora.create({
        data: {
          usuarioId: req.usuario.id,
          usuarioNombre: req.usuario.nombre,
          usuarioRol: req.usuario.rol,
          modulo: 'AUTH',
          accion: 'RESTAURAR_DB',
          descripcion: `Base de datos SQLite restaurada exitosamente desde el archivo "${nombreArchivo}" (${tamanoStr})`,
          detalles: JSON.stringify({
            formato: 'Restauración SQLite (.db)',
            archivo: nombreArchivo,
            tamano: tamanoStr
          }),
          fecha: fechaStr,
          hora: horaStr
        }
      }).catch(() => {});

      return res.status(200).json({
        ok: true,
        mensaje: `¡Base de datos restaurada exitosamente desde "${nombreArchivo}" (${tamanoStr})! Todos los registros han sido cargados.`
      });
    }

    // CASO 2: Archivo estructurado JSON (.json)
    if (nombreLower.endsWith('.json')) {
      let jsonParsed;
      try {
        jsonParsed = JSON.parse(bufferArchivo.toString('utf8'));
      } catch {
        return res.status(400).json({
          ok: false,
          mensaje: 'El archivo .json seleccionado no tiene un formato JSON válido.'
        });
      }

      const datos = jsonParsed?.datos;
      if (!datos || typeof datos !== 'object') {
        return res.status(400).json({
          ok: false,
          mensaje: 'El archivo JSON no corresponde a un respaldo estructurado del Sistema Minerva.'
        });
      }

      // Restaurar categorías
      if (Array.isArray(datos.categorias)) {
        for (const cat of datos.categorias) {
          if (!cat.nombre) continue;
          await prisma.categoria.upsert({
            where: { nombre: cat.nombre },
            update: { descripcion: cat.descripcion || null },
            create: { nombre: cat.nombre, descripcion: cat.descripcion || null }
          }).catch(() => {});
        }
      }

      // Restaurar distribuidores
      if (Array.isArray(datos.distribuidores)) {
        for (const d of datos.distribuidores) {
          if (!d.rif) continue;
          await prisma.distribuidor.upsert({
            where: { rif: d.rif },
            update: {
              nombre: d.nombre,
              contacto: d.contacto,
              correo: d.correo,
              telefono: d.telefono,
              direccion: d.direccion,
              estado: d.estado || 'Activo'
            },
            create: {
              rif: d.rif,
              nombre: d.nombre,
              contacto: d.contacto,
              correo: d.correo,
              telefono: d.telefono,
              direccion: d.direccion,
              estado: d.estado || 'Activo'
            }
          }).catch(() => {});
        }
      }

      // Restaurar lectores
      if (Array.isArray(datos.lectores)) {
        for (const l of datos.lectores) {
          if (!l.cedula) continue;
          await prisma.lector.upsert({
            where: { cedula: l.cedula },
            update: {
              nombre: l.nombre,
              fechaNacimiento: l.fechaNacimiento || null,
              correo: l.correo,
              telefono: l.telefono,
              direccion: l.direccion || null
            },
            create: {
              cedula: l.cedula,
              nombre: l.nombre,
              fechaNacimiento: l.fechaNacimiento || null,
              correo: l.correo,
              telefono: l.telefono,
              direccion: l.direccion || null
            }
          }).catch(() => {});
        }
      }

      // Restaurar libros
      if (Array.isArray(datos.libros)) {
        for (const lib of datos.libros) {
          if (!lib.isbn) continue;
          await prisma.libro.upsert({
            where: { isbn: lib.isbn },
            update: {
              titulo: lib.titulo,
              autor: lib.autor,
              categoria: lib.categoria,
              precio: Number(lib.precio || 0),
              precioCosto: Number(lib.precioCosto || 0),
              ejemplares: Number(lib.ejemplares || 0),
              portada: lib.portada || null,
              activo: lib.activo !== false
            },
            create: {
              isbn: lib.isbn,
              titulo: lib.titulo,
              autor: lib.autor,
              categoria: lib.categoria,
              precio: Number(lib.precio || 0),
              precioCosto: Number(lib.precioCosto || 0),
              ejemplares: Number(lib.ejemplares || 0),
              portada: lib.portada || null,
              activo: lib.activo !== false
            }
          }).catch(() => {});
        }
      }

      await prisma.bitacora.create({
        data: {
          usuarioId: req.usuario.id,
          usuarioNombre: req.usuario.nombre,
          usuarioRol: req.usuario.rol,
          modulo: 'AUTH',
          accion: 'RESTAURAR_DB',
          descripcion: `Respaldo JSON importado y sincronizado desde "${nombreArchivo}" (${tamanoStr})`,
          detalles: JSON.stringify({
            formato: 'Restauración JSON (.json)',
            archivo: nombreArchivo,
            tamano: tamanoStr
          }),
          fecha: fechaStr,
          hora: horaStr
        }
      }).catch(() => {});

      return res.status(200).json({
        ok: true,
        mensaje: `¡Respaldo JSON "${nombreArchivo}" cargado y sincronizado exitosamente!`
      });
    }

    return res.status(400).json({
      ok: false,
      mensaje: 'Formato de archivo no soportado. Selecciona un archivo .db (SQLite) o .json.'
    });
  } catch (error) {
    console.error('Error en restaurarBackup:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Ocurrió un error al intentar restaurar la copia de seguridad.'
    });
  }
};
