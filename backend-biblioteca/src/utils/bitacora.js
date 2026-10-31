import prisma from '../config/prisma.js';

/**
 * Registra un evento en la Bitácora del Sistema
 * @param {Object} params
 * @param {Object} [params.req] - Express request con req.usuario (opcional)
 * @param {Object} [params.usuario] - Objeto usuario explícito { id, nombre, rol } si req no está disponible
 * @param {string} params.modulo - Módulo afectado (VENTAS, INVENTARIO, LIBROS, GENEROS, USUARIOS, AUTH, CLIENTES)
 * @param {string} params.accion - Acción realizada (LOGIN, LOGOUT, CREAR, EDITAR, ELIMINAR, VENTA, ENTRADA_STOCK, BAJA_STOCK, etc.)
 * @param {string} params.descripcion - Resumen entendible para humanos
 * @param {any} [params.detalles] - Datos adicionales u objeto con información relevante
 */
export const registrarBitacora = async ({
  req,
  usuario,
  modulo,
  accion,
  descripcion,
  detalles = null
}) => {
  try {
    const user = req?.usuario || usuario;
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().split(' ')[0];

    let detallesStr = null;
    if (detalles) {
      detallesStr = typeof detalles === 'string' ? detalles : JSON.stringify(detalles);
    }

    return await prisma.bitacora.create({
      data: {
        usuarioId: user?.id || null,
        usuarioNombre: user?.nombre || 'Sistema',
        usuarioRol: user?.rol || 'sistema',
        modulo: (modulo || 'GENERAL').toUpperCase(),
        accion: (accion || 'ACCION').toUpperCase(),
        descripcion: descripcion || '',
        detalles: detallesStr,
        fecha,
        hora
      }
    });
  } catch (error) {
    console.error('Error no fatal registrando evento en Bitácora:', error);
    return null;
  }
};
