/**
 * Convierte cualquier cadena de texto (ya sea en MAYÚSCULAS, minúsculas o mixto)
 * para que la primera letra de cada palabra esté en Mayúscula y el resto en minúscula.
 * Ejemplo: "jheisel parra" / "JHEISEL PARRA" -> "Jheisel Parra"
 */
export function capitalizarPalabras(texto) {
  if (!texto || typeof texto !== 'string') return '';
  return texto
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/([^\s\-'/(]+)/g, (palabra) => {
      return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase();
    });
}
