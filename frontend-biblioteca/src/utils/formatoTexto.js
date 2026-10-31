/**
 * Convierte una cadena de texto para que cada palabra inicie con Mayúscula y el resto en minúscula.
 * - Cuando se usa en tiempo real en un input (`enVivo = true`), conserva los espacios finales mientras se escribe.
 * - Cuando se usa al guardar (`enVivo = false`), limpia espacios dobles y extremos.
 */
export function capitalizarPalabras(texto, enVivo = true) {
  if (!texto || typeof texto !== 'string') return '';
  const transformado = texto.replace(/([^\s\-'/(]+)/g, (palabra) => {
    return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
  });
  return enVivo ? transformado : transformado.replace(/\s+/g, ' ').trim();
}
