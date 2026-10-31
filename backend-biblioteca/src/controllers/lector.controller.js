import prisma from '../config/prisma.js';
import { capitalizarPalabras } from '../utils/formatoTexto.js';

const formatearCedula = (str) => {
  if (!str) return '';
  const texto = str.toString().trim();
  const primerCaracter = texto.charAt(0).toUpperCase();
  const esExtranjero = primerCaracter === 'E';
  const soloDigitos = texto.replace(/\D/g, '');
  if (!soloDigitos) return '';
  return `${esExtranjero ? 'E' : 'V'}-${soloDigitos}`;
};

export const getLectores = async (req, res) => {
  try {
    const lectores = await prisma.lector.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      ok: true,
      lectores
    });
  } catch (error) {
    console.error('Error en getLectores:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener la lista de lectores.'
    });
  }
};

export const crearLector = async (req, res) => {
  try {
    const { nombre, cedula, fechaNacimiento, correo, telefono, direccion } = req.body;

    if (!nombre || !cedula || !correo || !telefono) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Nombre, Cédula, Correo Electrónico y Teléfono son campos obligatorios.'
      });
    }

    if (/\d/.test(nombre)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El nombre del lector no puede contener números.'
      });
    }

    const cedulaFormateada = formatearCedula(cedula);

    // Validar cédula única
    const existe = await prisma.lector.findUnique({
      where: { cedula: cedulaFormateada }
    });

    if (existe) {
      return res.status(400).json({
        ok: false,
        mensaje: `⚠️ Ya existe un lector registrado con la cédula "${cedulaFormateada}".`
      });
    }

    const nuevoLector = await prisma.lector.create({
      data: {
        nombre: capitalizarPalabras(nombre),
        cedula: cedulaFormateada,
        fechaNacimiento: fechaNacimiento ? fechaNacimiento.trim() : null,
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim(),
        direccion: direccion ? capitalizarPalabras(direccion) : null
      }
    });

    return res.status(201).json({
      ok: true,
      mensaje: `Lector "${nuevoLector.nombre}" registrado exitosamente.`,
      lector: nuevoLector
    });
  } catch (error) {
    console.error('Error en crearLector:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al registrar al lector.'
    });
  }
};

export const actualizarLector = async (req, res) => {
  try {
    const { id } = req.params;
    const lectorId = parseInt(id, 10);
    const { nombre, fechaNacimiento, correo, telefono, direccion } = req.body;

    if (!nombre || !correo || !telefono) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Nombre, Correo Electrónico y Teléfono son campos obligatorios.'
      });
    }

    if (/\d/.test(nombre)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El nombre del lector no puede contener números.'
      });
    }

    const lectorActualizado = await prisma.lector.update({
      where: { id: lectorId },
      data: {
        nombre: capitalizarPalabras(nombre),
        ...(fechaNacimiento !== undefined ? { fechaNacimiento: fechaNacimiento ? fechaNacimiento.trim() : null } : {}),
        correo: correo.trim().toLowerCase(),
        telefono: telefono.trim(),
        direccion: direccion ? capitalizarPalabras(direccion) : null
      }
    });

    return res.status(200).json({
      ok: true,
      mensaje: 'Información del lector actualizada correctamente.',
      lector: lectorActualizado
    });
  } catch (error) {
    console.error('Error en actualizarLector:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar la información del lector.'
    });
  }
};
