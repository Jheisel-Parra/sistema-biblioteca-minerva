import prisma from '../config/prisma.js';
import { capitalizarPalabras } from '../utils/formatoTexto.js';

export const getDistribuidores = async (req, res) => {
  try {
    const distribuidores = await prisma.distribuidor.findMany({
      include: {
        _count: {
          select: {
            libros: true,
            entradasInventario: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      ok: true,
      distribuidores
    });
  } catch (error) {
    console.error('Error en getDistribuidores:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener los distribuidores.'
    });
  }
};

export const crearDistribuidor = async (req, res) => {
  try {
    const { nombre, rif, contacto, correo, telefono, direccion } = req.body;

    if (!nombre || !rif || !contacto || !correo || !telefono || !direccion) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Todos los campos de la distribuidora son obligatorios.'
      });
    }

    if (/\d/.test(contacto)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El nombre de la persona de contacto no puede contener números.'
      });
    }

    const rifNormalizado = rif.trim().toUpperCase();

    // Validar RIF único
    const existe = await prisma.distribuidor.findUnique({
      where: { rif: rifNormalizado }
    });

    if (existe) {
      return res.status(400).json({
        ok: false,
        mensaje: `⚠️ Ya existe un distribuidor registrado con el RIF "${rifNormalizado}".`
      });
    }

    const nuevoDistribuidor = await prisma.distribuidor.create({
      data: {
        nombre: capitalizarPalabras(nombre),
        rif: rifNormalizado,
        contacto: capitalizarPalabras(contacto),
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim(),
        direccion: capitalizarPalabras(direccion),
        estado: 'Activo'
      }
    });

    return res.status(201).json({
      ok: true,
      mensaje: `Distribuidor "${nuevoDistribuidor.nombre}" registrado exitosamente.`,
      distribuidor: nuevoDistribuidor
    });
  } catch (error) {
    console.error('Error en crearDistribuidor:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al registrar el distribuidor.'
    });
  }
};

export const actualizarDistribuidor = async (req, res) => {
  try {
    const { id } = req.params;
    const distribuidorId = parseInt(id, 10);
    const { nombre, contacto, correo, telefono, direccion, estado } = req.body;

    if (contacto && /\d/.test(contacto)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El nombre de la persona de contacto no puede contener números.'
      });
    }

    const distribuidorActualizado = await prisma.distribuidor.update({
      where: { id: distribuidorId },
      data: {
        nombre: nombre ? capitalizarPalabras(nombre) : undefined,
        contacto: contacto ? capitalizarPalabras(contacto) : undefined,
        correo: correo ? correo.trim().toLowerCase() : undefined,
        telefono: telefono ? telefono.trim() : undefined,
        direccion: direccion ? capitalizarPalabras(direccion) : undefined,
        estado: estado || undefined
      }
    });

    return res.status(200).json({
      ok: true,
      mensaje: 'Distribuidor actualizado correctamente.',
      distribuidor: distribuidorActualizado
    });
  } catch (error) {
    console.error('Error en actualizarDistribuidor:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar el distribuidor.'
    });
  }
};

export const toggleEstadoDistribuidor = async (req, res) => {
  try {
    const { id } = req.params;
    const distribuidorId = parseInt(id, 10);

    const dist = await prisma.distribuidor.findUnique({
      where: { id: distribuidorId }
    });

    if (!dist) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Distribuidor no encontrado.'
      });
    }

    const nuevoEstado = dist.estado === 'Activo' ? 'Inactivo' : 'Activo';

    const actualizado = await prisma.distribuidor.update({
      where: { id: distribuidorId },
      data: { estado: nuevoEstado }
    });

    return res.status(200).json({
      ok: true,
      mensaje: `El distribuidor "${actualizado.nombre}" ahora está ${nuevoEstado}.`,
      distribuidor: actualizado
    });
  } catch (error) {
    console.error('Error en toggleEstadoDistribuidor:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cambiar estado del distribuidor.'
    });
  }
};
