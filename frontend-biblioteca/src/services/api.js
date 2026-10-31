// Cliente de comunicación HTTP con el Backend SQLite (Puerto 4000)

const API_BASE_URL = 'http://localhost:4000/api';

/**
 * Obtener el token JWT guardado en el navegador
 */
export const getToken = () => {
  return localStorage.getItem('biblioteca_token');
};

/**
 * Guardar sesión en localStorage
 */
export const guardarSesion = (token, usuario, sesionId = null) => {
  localStorage.setItem('biblioteca_token', token);
  localStorage.setItem('biblioteca_usuario', JSON.stringify(usuario));
  if (sesionId) {
    localStorage.setItem('biblioteca_sesion_id', String(sesionId));
  }
};

/**
 * Obtener ID de la sesión activa
 */
export const getSesionIdGuardado = () => {
  return localStorage.getItem('biblioteca_sesion_id');
};

/**
 * Obtener usuario de la sesión guardada
 */
export const getUsuarioGuardado = () => {
  try {
    const usuarioStr = localStorage.getItem('biblioteca_usuario');
    return usuarioStr ? JSON.parse(usuarioStr) : null;
  } catch {
    return null;
  }
};

/**
 * Cerrar sesión local
 */
export const cerrarSesionStorage = () => {
  localStorage.removeItem('biblioteca_token');
  localStorage.removeItem('biblioteca_usuario');
  localStorage.removeItem('biblioteca_sesion_id');
};

/**
 * Wrapper de Fetch con inyección automática de Token y manejo de respuestas JSON
 */
const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();
  const usuarioGuardado = getUsuarioGuardado();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(usuarioGuardado?.email ? { 'X-Usuario-Email': usuarioGuardado.email } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const contentType = res.headers.get('content-type') || '';
    let data = {};
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const errorText = await res.text();
      if (!res.ok) {
        throw new Error(`Error del servidor (${res.status}): ${errorText.substring(0, 120)}...`);
      }
    }

    if (!res.ok) {
      throw new Error(data.mensaje || `Error al comunicarse con el servidor (${res.status}).`);
    }

    return data;
  } catch (err) {
    console.error(`Error en API (${endpoint}):`, err.message);
    throw err;
  }
};

// ==========================================
// 1. AUTENTICACIÓN Y SEGUNDA BARRERA (2FA)
// ==========================================
export const apiLogin = async (emailOrCedula, password) => {
  return await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ emailOrCedula, password })
  });
};

export const apiVerificar2FA = async (tempToken, codigo) => {
  return await apiFetch('/auth/verificar-2fa', {
    method: 'POST',
    body: JSON.stringify({ tempToken, codigo })
  });
};

export const apiGetPerfil = async () => {
  return await apiFetch('/auth/perfil');
};

export const apiCambiarPasswordInicial = async (nuevaPassword) => {
  return await apiFetch('/auth/cambiar-password-inicial', {
    method: 'POST',
    body: JSON.stringify({ nuevaPassword })
  });
};

export const apiLogout = async () => {
  const sesionId = getSesionIdGuardado();
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ sesionId: sesionId ? parseInt(sesionId, 10) : null })
    });
  } catch (err) {
    console.warn('Error notificando cierre de sesión:', err.message);
  } finally {
    cerrarSesionStorage();
  }
};


// ==========================================
// 2. PERSONAL / USUARIOS (Admin)
// ==========================================
export const apiGetUsuarios = async () => {
  return await apiFetch('/usuarios');
};

export const apiCrearUsuario = async (datos) => {
  return await apiFetch('/usuarios', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
};

export const apiActualizarUsuario = async (id, datos) => {
  return await apiFetch(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos)
  });
};

export const apiToggleEstadoUsuario = async (id) => {
  return await apiFetch(`/usuarios/${id}/toggle-estado`, {
    method: 'PATCH'
  });
};

export const apiResetearPassword = async (id, password) => {
  return await apiFetch(`/usuarios/${id}/reset-password`, {
    method: 'PATCH',
    body: JSON.stringify({ password })
  });
};

export const apiObtenerQRUsuario = async (id) => {
  return await apiFetch(`/usuarios/${id}/qr-2fa`);
};

export const apiRegenerarQRUsuario = async (id) => {
  return await apiFetch(`/usuarios/${id}/regenerar-2fa`, {
    method: 'POST'
  });
};

export const apiDesbloquearUsuario = async (id) => {
  return await apiFetch(`/usuarios/${id}/desbloquear`, {
    method: 'PATCH'
  });
};

// ==========================================
// 3. DISTRIBUIDORES
// ==========================================
export const apiGetDistribuidores = async () => {
  return await apiFetch('/distribuidores');
};

export const apiCrearDistribuidor = async (datos) => {
  return await apiFetch('/distribuidores', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
};

export const apiActualizarDistribuidor = async (id, datos) => {
  return await apiFetch(`/distribuidores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos)
  });
};

export const apiToggleEstadoDistribuidor = async (id) => {
  return await apiFetch(`/distribuidores/${id}/toggle-estado`, {
    method: 'PATCH'
  });
};

// ==========================================
// 4. LIBROS / CATÁLOGO
// ==========================================
export const apiGetLibros = async () => {
  return await apiFetch('/libros');
};

export const apiCrearLibro = async (datos) => {
  return await apiFetch('/libros', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
};

export const apiActualizarLibro = async (id, datos) => {
  return await apiFetch(`/libros/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos)
  });
};

// ==========================================
// 5. LECTORES / CLIENTES
// ==========================================
export const apiGetLectores = async () => {
  return await apiFetch('/lectores');
};

export const apiCrearLector = async (datos) => {
  return await apiFetch('/lectores', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
};

export const apiActualizarLector = async (id, datos) => {
  return await apiFetch(`/lectores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos)
  });
};

// ==========================================
// 6. CONTROL DE INVENTARIO (Entradas & Bajas)
// ==========================================
export const apiGetHistorialEntradas = async () => {
  return await apiFetch('/inventario/entradas');
};

export const apiRegistrarEntrada = async (datos) => {
  return await apiFetch('/inventario/entradas', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
};

export const apiGetHistorialBajas = async () => {
  return await apiFetch('/inventario/bajas');
};

export const apiRegistrarBaja = async (datos) => {
  return await apiFetch('/inventario/bajas', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
};

// ==========================================
// 7. VENTAS (Punto de Venta)
// ==========================================
export const apiGetVentas = async () => {
  return await apiFetch('/ventas');
};

export const apiRegistrarVenta = async (datos) => {
  return await apiFetch('/ventas', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
};

// ==========================================
// 8. CATEGORÍAS / GÉNEROS LITERARIOS
// ==========================================
export const apiGetCategorias = async () => {
  return await apiFetch('/categorias');
};

export const apiCrearCategoria = async (datos) => {
  return await apiFetch('/categorias', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
};

export const apiActualizarCategoria = async (id, datos) => {
  return await apiFetch(`/categorias/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos)
  });
};

export const apiEliminarCategoria = async (id) => {
  return await apiFetch(`/categorias/${id}`, {
    method: 'DELETE'
  });
};

// ==========================================
// 9. TASA DE CAMBIO (BCV / OFICIAL)
// ==========================================
export const apiConsultarTasaBCV = async () => {
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    if (!res.ok) throw new Error('Error al conectar con el servicio de tasa oficial.');
    const data = await res.json();
    const tasa = parseFloat(data.promedio || data.precio || 0);
    if (!tasa || tasa <= 0) throw new Error('Respuesta de tasa inválida.');
    return {
      ok: true,
      tasa: parseFloat(tasa.toFixed(2)),
      fechaActualizacion: data.fechaActualizacion
    };
  } catch (err) {
    console.warn('Fallo al obtener tasa oficial en línea:', err.message);
    throw new Error('No se pudo conectar con la API de tasa oficial en este momento. Puedes ingresarla manualmente.', { cause: err });
  }
};

// ==========================================
// 10. BITÁCORA / AUDITORÍA Y SESIONES (Admin)
// ==========================================
export const apiGetBitacora = async (filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.modulo) params.append('modulo', filtros.modulo);
  if (filtros.usuarioId) params.append('usuarioId', filtros.usuarioId);
  if (filtros.fecha) params.append('fecha', filtros.fecha);
  if (filtros.q) params.append('q', filtros.q);
  if (filtros.limit) params.append('limit', filtros.limit);
  if (filtros.page) params.append('page', filtros.page);
  return await apiFetch(`/bitacora?${params.toString()}`);
};

export const apiGetSesionesBitacora = async (filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.activo !== undefined && filtros.activo !== '') params.append('activo', filtros.activo);
  if (filtros.usuarioId) params.append('usuarioId', filtros.usuarioId);
  if (filtros.fecha) params.append('fecha', filtros.fecha);
  if (filtros.limit) params.append('limit', filtros.limit);
  return await apiFetch(`/bitacora/sesiones?${params.toString()}`);
};

export const apiGetResumenBitacora = async () => {
  return await apiFetch('/bitacora/resumen');
};

export const apiForzarCierreSesion = async (sesionId) => {
  return await apiFetch(`/bitacora/sesiones/${sesionId}/forzar-cierre`, {
    method: 'PUT'
  });
};

export const apiGetEstadoSeguridad = async () => {
  return await apiFetch('/bitacora/estado-seguridad');
};

export const apiDescargarBackupSqlite = async () => {
  const token = getToken();
  const usuarioGuardado = getUsuarioGuardado();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(usuarioGuardado?.email ? { 'X-Usuario-Email': usuarioGuardado.email } : {})
  };

  const res = await fetch(`${API_BASE_URL}/bitacora/backup-sqlite`, {
    method: 'GET',
    headers
  });

  if (!res.ok) {
    let mensaje = `Error al descargar la copia de seguridad (${res.status}).`;
    try {
      const errData = await res.json();
      if (errData.mensaje) mensaje = errData.mensaje;
    } catch {
      // Ignorar si no es JSON
    }
    throw new Error(mensaje);
  }

  const blob = await res.blob();
  const fechaStr = new Date().toISOString().split('T')[0];
  const nombreArchivo = `backup-minerva-${fechaStr}.db`;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
  return { ok: true, archivo: nombreArchivo };
};

export const apiDescargarBackupJson = async () => {
  const token = getToken();
  const usuarioGuardado = getUsuarioGuardado();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(usuarioGuardado?.email ? { 'X-Usuario-Email': usuarioGuardado.email } : {})
  };

  const res = await fetch(`${API_BASE_URL}/bitacora/backup-json`, {
    method: 'GET',
    headers
  });

  if (!res.ok) {
    let mensaje = `Error al exportar el respaldo JSON (${res.status}).`;
    try {
      const errData = await res.json();
      if (errData.mensaje) mensaje = errData.mensaje;
    } catch {
      // Ignorar si no es JSON
    }
    throw new Error(mensaje);
  }

  const blob = await res.blob();
  const fechaStr = new Date().toISOString().split('T')[0];
  const nombreArchivo = `backup-minerva-${fechaStr}.json`;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
  return { ok: true, archivo: nombreArchivo };
};

export const apiRestaurarBackup = async (file) => {
  const contenidoBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64Part = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64Part);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });

  return await apiFetch('/bitacora/restaurar-backup', {
    method: 'POST',
    body: JSON.stringify({
      nombreArchivo: file.name,
      contenidoBase64
    })
  });
};

// ==========================================
// 11. MÉTODOS DE PAGO
// ==========================================
export const apiGetMetodosPago = async () => {
  return await apiFetch('/metodos-pago');
};

export const apiCrearMetodoPago = async (datos) => {
  return await apiFetch('/metodos-pago', {
    method: 'POST',
    body: JSON.stringify(datos)
  });
};

export const apiToggleEstadoMetodoPago = async (id) => {
  return await apiFetch(`/metodos-pago/${id}/toggle-estado`, {
    method: 'PATCH'
  });
};

export const apiEliminarMetodoPago = async (id) => {
  return await apiFetch(`/metodos-pago/${id}`, {
    method: 'DELETE'
  });
};



