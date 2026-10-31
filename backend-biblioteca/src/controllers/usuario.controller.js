import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { registrarBitacora } from '../utils/bitacora.js';
import { capitalizarPalabras } from '../utils/formatoTexto.js';
import {
  generarSecretoTOTP,
  construirOtpAuthUri,
  generarQRCodeSVG,
  formatearSecretoLegible
} from '../utils/totp.js';

// Normalizar cédula con V- o E-
const formatearCedula = (str) => {
  if (!str) return '';
  const texto = str.toString().trim();
  const primerCaracter = texto.charAt(0).toUpperCase();
  const esExtranjero = primerCaracter === 'E';
  const soloDigitos = texto.replace(/\D/g, '');
  if (!soloDigitos) return '';
  return `${esExtranjero ? 'E' : 'V'}-${soloDigitos}`;
};

const CAMPOS_PUBLICOS_USUARIO = {
  id: true,
  cedula: true,
  nombre: true,
  fechaNacimiento: true,
  email: true,
  rol: true,
  estado: true,
  debeCambiarPassword: true,
  totpHabilitado: true,
  intentosFallidos: true,
  bloqueadoHasta: true,
  createdAt: true,
  updatedAt: true
};

export const getUsuarios = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: CAMPOS_PUBLICOS_USUARIO,
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      ok: true,
      usuarios
    });
  } catch (error) {
    console.error('Error en getUsuarios:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener los usuarios del sistema.'
    });
  }
};

export const crearUsuario = async (req, res) => {
  try {
    const { nombre, cedula, fechaNacimiento, email, password, rol = 'staff' } = req.body;

    if (!nombre || !cedula || !email || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Todos los campos obligatorios deben ser completados (nombre, cédula, correo, contraseña).'
      });
    }

    if (/\d/.test(nombre)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El nombre del trabajador/usuario no puede contener números.'
      });
    }

    const cedulaFormateada = formatearCedula(cedula);
    const emailNormalizado = email.trim().toLowerCase();

    // Validar cédula única
    const existeCedula = await prisma.usuario.findUnique({
      where: { cedula: cedulaFormateada }
    });
    if (existeCedula) {
      return res.status(400).json({
        ok: false,
        mensaje: `Ya existe un usuario con la cédula "${cedulaFormateada}".`
      });
    }

    // Validar email único
    const existeEmail = await prisma.usuario.findUnique({
      where: { email: emailNormalizado }
    });
    if (existeEmail) {
      return res.status(400).json({
        ok: false,
        mensaje: `Ya existe un usuario con el correo "${emailNormalizado}".`
      });
    }

    // Encriptar contraseña inicial y generar secreto TOTP único
    const hashedPassword = await bcrypt.hash(password, 10);
    const totpSecret = generarSecretoTOTP();

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: capitalizarPalabras(nombre),
        cedula: cedulaFormateada,
        fechaNacimiento: fechaNacimiento ? fechaNacimiento.trim() : null,
        email: emailNormalizado,
        password: hashedPassword,
        rol: rol === 'admin' ? 'admin' : 'staff',
        estado: 'Activo',
        debeCambiarPassword: true, // Obligatorio cambiarla al primer login
        totpSecret,
        totpHabilitado: false
      },
      select: CAMPOS_PUBLICOS_USUARIO
    });

    await registrarBitacora({
      req,
      modulo: 'USUARIOS',
      accion: 'CREAR',
      descripcion: `Nuevo usuario registrado: "${nuevoUsuario.nombre}" (${nuevoUsuario.rol.toUpperCase()}) - C.I: ${nuevoUsuario.cedula}`,
      detalles: { id: nuevoUsuario.id, nombre: nuevoUsuario.nombre, cedula: nuevoUsuario.cedula, email: nuevoUsuario.email, rol: nuevoUsuario.rol }
    });

    return res.status(201).json({
      ok: true,
      mensaje: `Usuario "${nuevoUsuario.nombre}" registrado exitosamente. Al iniciar sesión vinculará su código QR de Google Authenticator y definirá su contraseña privada.`,
      usuario: nuevoUsuario
    });
  } catch (error) {
    console.error('Error en crearUsuario:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al registrar el nuevo usuario.'
    });
  }
};

export const resetearPasswordUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const usuarioId = parseInt(id, 10);

    if (!password || password.trim().length < 6) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La nueva contraseña temporal debe tener al menos 6 caracteres.'
      });
    }

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: usuarioId }
    });

    if (!usuarioExistente) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        password: hashedPassword,
        debeCambiarPassword: true, // Obligar al usuario a cambiarla en su siguiente acceso
        intentosFallidos: 0,
        bloqueadoHasta: null
      },
      select: CAMPOS_PUBLICOS_USUARIO
    });

    await registrarBitacora({
      req,
      modulo: 'USUARIOS',
      accion: 'RESET_PASSWORD',
      descripcion: `Restablecimiento de contraseña temporal para "${usuarioActualizado.nombre}" (C.I: ${usuarioActualizado.cedula})`,
      detalles: { id: usuarioActualizado.id, nombre: usuarioActualizado.nombre, cedula: usuarioActualizado.cedula }
    });

    return res.status(200).json({
      ok: true,
      mensaje: `Contraseña restablecida exitosamente para "${usuarioActualizado.nombre}". Se le solicitará definir una nueva al ingresar.`,
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.error('Error en resetearPasswordUsuario:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al restablecer la contraseña del usuario.'
    });
  }
};

export const toggleEstadoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = parseInt(id, 10);

    // Evitar que el usuario logueado se desactive a sí mismo
    if (req.usuario.id === usuarioId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No puedes desactivar tu propia cuenta mientras estás en sesión.'
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId }
    });

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    const nuevoEstado = usuario.estado === 'Activo' ? 'Inactivo' : 'Activo';

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: { estado: nuevoEstado },
      select: CAMPOS_PUBLICOS_USUARIO
    });

    await registrarBitacora({
      req,
      modulo: 'USUARIOS',
      accion: 'ESTADO_USUARIO',
      descripcion: `Estado del usuario "${usuarioActualizado.nombre}" cambiado a "${nuevoEstado}"`,
      detalles: { id: usuarioActualizado.id, nombre: usuarioActualizado.nombre, nuevoEstado }
    });

    return res.status(200).json({
      ok: true,
      mensaje: `El usuario "${usuarioActualizado.nombre}" ahora está ${nuevoEstado}.`,
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.error('Error en toggleEstadoUsuario:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cambiar el estado del usuario.'
    });
  }
};

export const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, fechaNacimiento, email, rol } = req.body;
    const usuarioId = parseInt(id, 10);

    if (!nombre || !email || !rol) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Nombre, Correo Electrónico y Rol son obligatorios.'
      });
    }

    if (/\d/.test(nombre)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El nombre del trabajador/usuario no puede contener números.'
      });
    }

    const emailNormalizado = email.trim().toLowerCase();

    // Validar si el nuevo correo ya existe en otro usuario distinto
    const existeEmail = await prisma.usuario.findFirst({
      where: {
        email: emailNormalizado,
        NOT: { id: usuarioId }
      }
    });

    if (existeEmail) {
      return res.status(400).json({
        ok: false,
        mensaje: `Ya existe otro usuario registrado con el correo "${emailNormalizado}".`
      });
    }

    // Actualizar nombre, fechaNacimiento, email y rol (la cédula permanece protegida e inmutable)
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        nombre: capitalizarPalabras(nombre),
        ...(fechaNacimiento !== undefined ? { fechaNacimiento: fechaNacimiento ? fechaNacimiento.trim() : null } : {}),
        email: emailNormalizado,
        rol: rol === 'admin' ? 'admin' : 'staff'
      },
      select: CAMPOS_PUBLICOS_USUARIO
    });

    await registrarBitacora({
      req,
      modulo: 'USUARIOS',
      accion: 'EDITAR',
      descripcion: `Información de usuario actualizada: "${usuarioActualizado.nombre}" (${usuarioActualizado.rol.toUpperCase()})`,
      detalles: { id: usuarioActualizado.id, nombre: usuarioActualizado.nombre, email: usuarioActualizado.email, rol: usuarioActualizado.rol }
    });

    return res.status(200).json({
      ok: true,
      mensaje: `Información de "${usuarioActualizado.nombre}" actualizada exitosamente.`,
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.error('Error en actualizarUsuario:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar la información del trabajador.'
    });
  }
};

// Obtener Código QR de Google Authenticator (2FA) para un usuario ya registrado
export const obtenerQRUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = parseInt(id, 10);

    let usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId }
    });

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    // Si por alguna razón aún no tiene secreto TOTP, generarlo y guardarlo
    if (!usuario.totpSecret) {
      const nuevoSecret = generarSecretoTOTP();
      usuario = await prisma.usuario.update({
        where: { id: usuarioId },
        data: { totpSecret: nuevoSecret }
      });
    }

    const otpUri = construirOtpAuthUri({
      secret: usuario.totpSecret,
      email: usuario.email,
      nombre: usuario.nombre
    });
    const qrSvg = generarQRCodeSVG(otpUri);
    const secretManual = formatearSecretoLegible(usuario.totpSecret);

    return res.status(200).json({
      ok: true,
      qrSvg,
      secretManual,
      totpHabilitado: usuario.totpHabilitado,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        cedula: usuario.cedula,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error('Error en obtenerQRUsuario:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al generar el código QR del usuario.'
    });
  }
};

// Regenerar / Reiniciar el Código QR 2FA de un usuario (por cambio o pérdida de teléfono)
export const regenerarQRUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = parseInt(id, 10);

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: usuarioId }
    });

    if (!usuarioExistente) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado.'
      });
    }

    const nuevoSecret = generarSecretoTOTP();

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        totpSecret: nuevoSecret,
        totpHabilitado: false,
        intentosFallidos: 0,
        bloqueadoHasta: null
      },
      select: CAMPOS_PUBLICOS_USUARIO
    });

    const otpUri = construirOtpAuthUri({
      secret: nuevoSecret,
      email: usuarioActualizado.email,
      nombre: usuarioActualizado.nombre
    });
    const qrSvg = generarQRCodeSVG(otpUri);
    const secretManual = formatearSecretoLegible(nuevoSecret);

    await registrarBitacora({
      req,
      modulo: 'USUARIOS',
      accion: 'RESET_2FA',
      descripcion: `Restablecimiento y generación de nuevo código QR 2FA para "${usuarioActualizado.nombre}" (C.I: ${usuarioActualizado.cedula})`,
      detalles: { id: usuarioActualizado.id, nombre: usuarioActualizado.nombre, email: usuarioActualizado.email }
    });

    return res.status(200).json({
      ok: true,
      mensaje: `Nuevo código QR generado para "${usuarioActualizado.nombre}". Deberá escanearlo nuevamente en su autenticador.`,
      qrSvg,
      secretManual,
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.error('Error en regenerarQRUsuario:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al regenerar el código QR 2FA.'
    });
  }
};

// Desbloquear manualmente una cuenta bloqueada por intentos fallidos
export const desbloquearUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = parseInt(id, 10);

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        intentosFallidos: 0,
        bloqueadoHasta: null
      },
      select: CAMPOS_PUBLICOS_USUARIO
    });

    await registrarBitacora({
      req,
      modulo: 'USUARIOS',
      accion: 'DESBLOQUEO_CUENTA',
      descripcion: `Cuenta de "${usuarioActualizado.nombre}" desbloqueada manualmente por el Administrador.`,
      detalles: { id: usuarioActualizado.id, nombre: usuarioActualizado.nombre, cedula: usuarioActualizado.cedula }
    });

    return res.status(200).json({
      ok: true,
      mensaje: `🔓 La cuenta de "${usuarioActualizado.nombre}" ha sido desbloqueada exitosamente.`,
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.error('Error en desbloquearUsuario:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al desbloquear la cuenta del usuario.'
    });
  }
};
