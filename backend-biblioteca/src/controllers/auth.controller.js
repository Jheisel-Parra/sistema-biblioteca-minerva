import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import {
  generarSecretoTOTP,
  verificarCodigoTOTP,
  construirOtpAuthUri,
  generarQRCodeSVG,
  formatearSecretoLegible
} from '../utils/totp.js';

const MAX_INTENTOS_FALLIDOS = 3;
const MINUTOS_BLOQUEO = 10;

const calcularTiempoRestanteBloqueo = (bloqueadoHasta) => {
  const diffMs = new Date(bloqueadoHasta).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const totalSeg = Math.ceil(diffMs / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return min > 0 ? `${min} min ${seg} seg` : `${seg} segundos`;
};

export const login = async (req, res) => {
  try {
    const { emailOrCedula, password } = req.body;

    if (!emailOrCedula || !password) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Por favor, ingresa tu correo/cédula y tu contraseña.'
      });
    }

    const valorBuscado = emailOrCedula.trim();

    // Buscar usuario por correo o por cédula
    let usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: valorBuscado.toLowerCase() },
          { cedula: valorBuscado },
          { cedula: valorBuscado.toUpperCase() }
        ]
      }
    });

    if (!usuario) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Credenciales inválidas. Verifica tu correo/cédula o contraseña.'
      });
    }

    if (usuario.estado !== 'Activo') {
      return res.status(403).json({
        ok: false,
        mensaje: 'Esta cuenta se encuentra inactiva. Contacta al administrador del sistema.'
      });
    }

    // 1. Verificar si la cuenta está bloqueada temporalmente por intentos fallidos
    if (usuario.bloqueadoHasta) {
      const tiempoRestante = calcularTiempoRestanteBloqueo(usuario.bloqueadoHasta);
      if (tiempoRestante) {
        return res.status(429).json({
          ok: false,
          bloqueado: true,
          mensaje: `🔒 Cuenta bloqueada temporalmente por seguridad tras ${MAX_INTENTOS_FALLIDOS} intentos fallidos. Intenta nuevamente en ${tiempoRestante} o solicita el desbloqueo a un Administrador.`
        });
      } else {
        // Si ya expiró el tiempo de bloqueo, limpiar contadores
        usuario = await prisma.usuario.update({
          where: { id: usuario.id },
          data: { intentosFallidos: 0, bloqueadoHasta: null }
        });
      }
    }

    // 2. Comparar contraseña con el hash de bcrypt
    const passwordValido = await bcrypt.compare(password, usuario.password);
    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = ahora.toTimeString().split(' ')[0];
    const ipCliente = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';

    if (!passwordValido) {
      const nuevosIntentos = (usuario.intentosFallidos || 0) + 1;

      if (nuevosIntentos >= MAX_INTENTOS_FALLIDOS) {
        const fechaDesbloqueo = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000);
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            intentosFallidos: nuevosIntentos,
            bloqueadoHasta: fechaDesbloqueo
          }
        });

        await prisma.bitacora.create({
          data: {
            usuarioId: usuario.id,
            usuarioNombre: usuario.nombre,
            usuarioRol: usuario.rol,
            modulo: 'AUTH',
            accion: 'BLOQUEO_SEGURIDAD',
            descripcion: `Cuenta de ${usuario.nombre} bloqueada por ${MINUTOS_BLOQUEO} minutos tras ${MAX_INTENTOS_FALLIDOS} intentos fallidos de contraseña.`,
            detalles: JSON.stringify({ ip: ipCliente, email: usuario.email, motivo: 'Contraseña incorrecta reiterada' }),
            fecha: fechaStr,
            hora: horaStr
          }
        }).catch(() => {});

        return res.status(429).json({
          ok: false,
          bloqueado: true,
          mensaje: `🔒 Has superado los ${MAX_INTENTOS_FALLIDOS} intentos permitidos. Por seguridad, tu cuenta ha sido bloqueada temporalmente por ${MINUTOS_BLOQUEO} minutos.`
        });
      }

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { intentosFallidos: nuevosIntentos }
      });

      const restantes = MAX_INTENTOS_FALLIDOS - nuevosIntentos;
      return res.status(401).json({
        ok: false,
        mensaje: `Credenciales inválidas. Verifica tu contraseña (${restantes} ${restantes === 1 ? 'intento restante' : 'intentos restantes'} antes del bloqueo temporal).`
      });
    }

    // 3. Contraseña correcta -> Asegurar que el usuario tenga su secreto TOTP generado
    let totpSecret = usuario.totpSecret;
    if (!totpSecret) {
      totpSecret = generarSecretoTOTP();
    }

    // Reiniciar intentos fallidos de la fase 1 para dar paso limpio al 2FA
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        totpSecret,
        intentosFallidos: 0,
        bloqueadoHasta: null
      }
    });

    // Generar token temporal exclusivo para el Paso 2 (Verificación 2FA) válido por 10 minutos
    const secret = process.env.JWT_SECRET || 'biblioteca_jwt_secret_key_segura_2026_sistema';
    const tempToken = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        etapa: '2fa_pending'
      },
      secret,
      { expiresIn: '10m' }
    );

    const configurando2FA = !usuario.totpHabilitado;
    let qrSvg = null;
    let secretManual = null;

    if (configurando2FA) {
      const otpUri = construirOtpAuthUri({
        secret: totpSecret,
        email: usuario.email,
        nombre: usuario.nombre
      });
      qrSvg = generarQRCodeSVG(otpUri);
      secretManual = formatearSecretoLegible(totpSecret);
    }

    return res.status(200).json({
      ok: true,
      requiere2FA: true,
      configurando2FA,
      tempToken,
      qrSvg,
      secretManual,
      usuarioResumen: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      },
      mensaje: configurando2FA
        ? 'Paso 2: Escanea tu código QR con Google Authenticator e ingresa el código de 6 dígitos para vincular tu dispositivo.'
        : 'Paso 2: Ingresa el código temporal de 6 dígitos de Google Authenticator.'
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Ocurrió un error interno en el servidor al intentar iniciar sesión.'
    });
  }
};

// Segundo Paso de Seguridad: Verificar código TOTP de 6 dígitos (Google Authenticator)
export const verificar2FA = async (req, res) => {
  try {
    const { tempToken, codigo } = req.body;

    if (!tempToken || !codigo) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Por favor, ingresa el código de 6 dígitos del autenticador.'
      });
    }

    const secret = process.env.JWT_SECRET || 'biblioteca_jwt_secret_key_segura_2026_sistema';
    let decoded;
    try {
      decoded = jwt.verify(tempToken, secret);
    } catch {
      return res.status(401).json({
        ok: false,
        sesionExpirada: true,
        mensaje: 'El tiempo para ingresar el código de seguridad expiró. Por favor, inicia sesión nuevamente.'
      });
    }

    if (!decoded || decoded.etapa !== '2fa_pending') {
      return res.status(401).json({
        ok: false,
        mensaje: 'Token de verificación inválido.'
      });
    }

    let usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id }
    });

    if (!usuario || usuario.estado !== 'Activo') {
      return res.status(403).json({
        ok: false,
        mensaje: 'Usuario no válido o cuenta inactiva.'
      });
    }

    // Verificar bloqueo activo
    if (usuario.bloqueadoHasta) {
      const tiempoRestante = calcularTiempoRestanteBloqueo(usuario.bloqueadoHasta);
      if (tiempoRestante) {
        return res.status(429).json({
          ok: false,
          bloqueado: true,
          mensaje: `🔒 Cuenta bloqueada por seguridad tras ${MAX_INTENTOS_FALLIDOS} intentos fallidos. Intenta de nuevo en ${tiempoRestante}.`
        });
      }
    }

    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = ahora.toTimeString().split(' ')[0];
    const ipCliente = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';

    const codigoValido = verificarCodigoTOTP(usuario.totpSecret, codigo, 1);

    if (!codigoValido) {
      const nuevosIntentos = (usuario.intentosFallidos || 0) + 1;

      if (nuevosIntentos >= MAX_INTENTOS_FALLIDOS) {
        const fechaDesbloqueo = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000);
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            intentosFallidos: nuevosIntentos,
            bloqueadoHasta: fechaDesbloqueo
          }
        });

        await prisma.bitacora.create({
          data: {
            usuarioId: usuario.id,
            usuarioNombre: usuario.nombre,
            usuarioRol: usuario.rol,
            modulo: 'AUTH',
            accion: 'BLOQUEO_SEGURIDAD',
            descripcion: `Cuenta de ${usuario.nombre} bloqueada por ${MINUTOS_BLOQUEO} minutos tras ${MAX_INTENTOS_FALLIDOS} intentos fallidos en el código 2FA (Google Authenticator).`,
            detalles: JSON.stringify({ ip: ipCliente, email: usuario.email, motivo: 'Código 2FA inválido reiterado' }),
            fecha: fechaStr,
            hora: horaStr
          }
        }).catch(() => {});

        return res.status(429).json({
          ok: false,
          bloqueado: true,
          mensaje: `🔒 Código incorrecto ${MAX_INTENTOS_FALLIDOS} veces seguidas. Por seguridad, tu cuenta ha sido bloqueada por ${MINUTOS_BLOQUEO} minutos.`
        });
      }

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { intentosFallidos: nuevosIntentos }
      });

      const restantes = MAX_INTENTOS_FALLIDOS - nuevosIntentos;
      return res.status(401).json({
        ok: false,
        mensaje: `Código de 6 dígitos incorrecto o expirado. Verifica tu app autenticadora (${restantes} ${restantes === 1 ? 'intento restante' : 'intentos restantes'}).`
      });
    }

    // Código 2FA válido -> Marcar totpHabilitado = true y limpiar contadores de bloqueo
    const eraPrimeraVinculacion = !usuario.totpHabilitado;
    usuario = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        totpHabilitado: true,
        intentosFallidos: 0,
        bloqueadoHasta: null
      }
    });

    // Generar Token JWT definitivo de sesión
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        cedula: usuario.cedula,
        rol: usuario.rol
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    let sesionId = null;
    try {
      const sesion = await prisma.sesionUsuario.create({
        data: {
          usuarioId: usuario.id,
          usuarioNombre: usuario.nombre,
          usuarioRol: usuario.rol,
          fechaInicio: fechaStr,
          horaInicio: horaStr,
          activo: true,
          ip: String(ipCliente)
        }
      });
      sesionId = sesion.id;

      await prisma.bitacora.create({
        data: {
          usuarioId: usuario.id,
          usuarioNombre: usuario.nombre,
          usuarioRol: usuario.rol,
          modulo: 'AUTH',
          accion: 'LOGIN',
          descripcion: eraPrimeraVinculacion
            ? `Inicio de sesión y activación inicial de 2FA (Google Authenticator) de ${usuario.nombre} (${usuario.rol.toUpperCase()})`
            : `Inicio de sesión verificado con 2FA (Google Authenticator) de ${usuario.nombre} (${usuario.rol.toUpperCase()})`,
          detalles: JSON.stringify({
            ip: ipCliente,
            email: usuario.email,
            sesionId: sesion.id,
            verificacion2FA: true,
            primeraVinculacionQR: eraPrimeraVinculacion
          }),
          fecha: fechaStr,
          hora: horaStr
        }
      });
    } catch (auditErr) {
      console.error('Error registrando sesión o bitácora en verificar2FA:', auditErr);
    }

    return res.status(200).json({
      ok: true,
      mensaje: `¡Bienvenido, ${usuario.nombre}! Identidad verificada con éxito.`,
      token,
      sesionId,
      usuario: {
        id: usuario.id,
        cedula: usuario.cedula,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        estado: usuario.estado,
        totpHabilitado: true,
        debeCambiarPassword: usuario.debeCambiarPassword || false
      }
    });
  } catch (error) {
    console.error('Error en verificar2FA:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error interno al verificar el código de seguridad 2FA.'
    });
  }
};

export const getPerfil = async (req, res) => {
  try {
    return res.status(200).json({
      ok: true,
      usuario: req.usuario
    });
  } catch (error) {
    console.error('Error en getPerfil:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al consultar el perfil de usuario.'
    });
  }
};

// Establecer nueva contraseña privada en el primer inicio de sesión
export const cambiarPasswordInicial = async (req, res) => {
  try {
    const { nuevaPassword } = req.body;

    if (!nuevaPassword || nuevaPassword.trim().length < 6) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La nueva contraseña debe tener un mínimo de 6 caracteres.'
      });
    }

    const hashedPassword = await bcrypt.hash(nuevaPassword.trim(), 10);

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: {
        password: hashedPassword,
        debeCambiarPassword: false
      },
      select: {
        id: true,
        cedula: true,
        nombre: true,
        email: true,
        rol: true,
        estado: true,
        totpHabilitado: true,
        debeCambiarPassword: true
      }
    });

    const ahora = new Date();
    await prisma.bitacora.create({
      data: {
        usuarioId: req.usuario.id,
        usuarioNombre: req.usuario.nombre,
        usuarioRol: req.usuario.rol,
        modulo: 'AUTH',
        accion: 'CAMBIO_PASSWORD',
        descripcion: `El usuario ${req.usuario.nombre} actualizó su contraseña personal.`,
        fecha: ahora.toISOString().split('T')[0],
        hora: ahora.toTimeString().split(' ')[0]
      }
    }).catch(() => {});

    return res.status(200).json({
      ok: true,
      mensaje: '¡Contraseña actualizada exitosamente! Bienvenido al sistema.',
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.error('Error en cambiarPasswordInicial:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar la contraseña personal.'
    });
  }
};

// Cerrar sesión y marcar desconexión en Bitácora y SesionUsuario
export const logout = async (req, res) => {
  try {
    const { sesionId } = req.body;
    const ahora = new Date();
    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = ahora.toTimeString().split(' ')[0];

    if (sesionId) {
      await prisma.sesionUsuario.updateMany({
        where: { id: Number(sesionId) },
        data: {
          activo: false,
          fechaFin: fechaStr,
          horaFin: horaStr,
          ultimaActividad: ahora
        }
      });
    } else if (req.usuario) {
      await prisma.sesionUsuario.updateMany({
        where: {
          usuarioId: req.usuario.id,
          activo: true
        },
        data: {
          activo: false,
          fechaFin: fechaStr,
          horaFin: horaStr,
          ultimaActividad: ahora
        }
      });
    }

    if (req.usuario) {
      await prisma.bitacora.create({
        data: {
          usuarioId: req.usuario.id,
          usuarioNombre: req.usuario.nombre,
          usuarioRol: req.usuario.rol,
          modulo: 'AUTH',
          accion: 'LOGOUT',
          descripcion: `Cierre de sesión de ${req.usuario.nombre} (${req.usuario.rol.toUpperCase()})`,
          detalles: JSON.stringify({ sesionId: sesionId || 'todas' }),
          fecha: fechaStr,
          hora: horaStr
        }
      }).catch(() => {});
    }

    return res.status(200).json({
      ok: true,
      mensaje: 'Sesión cerrada exitosamente.'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al cerrar sesión.'
    });
  }
};
