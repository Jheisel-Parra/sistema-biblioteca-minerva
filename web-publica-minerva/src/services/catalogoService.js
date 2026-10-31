import { API_URL_PUBLICO, API_DOLAR_BCV, CACHE_KEY } from '../constants/config';

export async function obtenerTasaBCVOficial() {
  try {
    const resDolar = await fetch(API_DOLAR_BCV);
    if (resDolar.ok) {
      const dataDolar = await resDolar.json();
      const valor = parseFloat(dataDolar.promedio || dataDolar.precio || 0);
      if (valor > 0) {
        return parseFloat(valor.toFixed(2));
      }
    }
  } catch {
    // Si no hay conexión externa, usar respaldo del backend
  }
  return null;
}

export async function obtenerCatalogoPublico() {
  const tasaDirecta = await obtenerTasaBCVOficial();

  try {
    const respuesta = await fetch(API_URL_PUBLICO);
    if (!respuesta.ok) {
      return { libros: null, tasaBCV: tasaDirecta };
    }
    const data = await respuesta.json();
    if (data.ok && Array.isArray(data.libros)) {
      const tasaFinal =
        tasaDirecta ||
        (data.tasaBCV && Number(data.tasaBCV) > 40 ? Number(data.tasaBCV) : 88.62);

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          libros: data.libros,
          tasaBCV: tasaFinal,
          timestamp: Date.now()
        })
      );

      return { libros: data.libros, tasaBCV: tasaFinal };
    }
  } catch {
    // Mantener caché local si el backend está apagado
  }

  return { libros: null, tasaBCV: tasaDirecta };
}
