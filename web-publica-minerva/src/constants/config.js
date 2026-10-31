export const API_URL_PUBLICO =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api/libros/publico';
export const API_DOLAR_BCV = 'https://ve.dolarapi.com/v1/dolares/oficial';
export const CACHE_KEY = 'minerva_catalogo_publico_cache_v2';

// Datos de contacto y ubicación oficial
export const WHATSAPP_INTL = '584125274956';
export const UBICACION_NOMBRE = 'Centro Comercial Arca, Barquisimeto';
export const UBICACION_DETALLE =
  'Av. Vargas con Carrera 19, Centro Comercial Arca, Nivel Feria / Planta Principal, Barquisimeto, Estado Lara.';

// Catálogo base para carga inmediata
export const CATALOGO_INSTANTANEO = [
  {
    id: 1,
    titulo: 'Cien Años de Soledad',
    autor: 'Gabriel García Márquez',
    isbn: '978-0307474728',
    categoria: 'Novela',
    precio: 18.5,
    ejemplares: 15,
    portada:
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 2,
    titulo: 'Don Quijote de la Mancha',
    autor: 'Miguel de Cervantes',
    isbn: '978-8420412146',
    categoria: 'Novela',
    precio: 22.0,
    ejemplares: 8,
    portada:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 3,
    titulo: 'El Principito',
    autor: 'Antoine de Saint-Exupéry',
    isbn: '978-0156012195',
    categoria: 'Fantasía',
    precio: 12.0,
    ejemplares: 18,
    portada:
      'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 4,
    titulo: '1984',
    autor: 'George Orwell',
    isbn: '978-0451524935',
    categoria: 'Distopía',
    precio: 16.5,
    ejemplares: 14,
    portada:
      'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 5,
    titulo: 'Hábitos Atómicos',
    autor: 'James Clear',
    isbn: '978-0735211292',
    categoria: 'Crecimiento Personal',
    precio: 21.0,
    ejemplares: 16,
    portada:
      'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 6,
    titulo: 'Crónica de una Muerte Anunciada',
    autor: 'Gabriel García Márquez',
    isbn: '978-1400034956',
    categoria: 'Novela',
    precio: 14.0,
    ejemplares: 10,
    portada:
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=400&q=80'
  }
];

export const IVA_PORCENTAJE = 16;
export const IVA_FACTOR = 0.16;

export const calcularDesgloseIva = (precioBase) => {
  const base = Number(precioBase) || 0;
  const iva = parseFloat((base * IVA_FACTOR).toFixed(2));
  const total = parseFloat((base + iva).toFixed(2));
  return { base, iva, total };
};

export const formatearBs = (montoUSD, tasaBCV) => {
  const bs = (Number(montoUSD) || 0) * (Number(tasaBCV) || 88.62);
  return `Bs. ${bs.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export const construirLinkWhatsApp = (libro = null, tasaBCV = 88.62) => {
  let mensaje = '';
  if (libro) {
    const { total } = calcularDesgloseIva(libro.precio);
    const precioUSD = total.toFixed(2);
    const precioBs = (total * tasaBCV).toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    mensaje = `¡Hola Librería Minerva! Vi en su página web el libro "${libro.titulo}" de ${libro.autor} (Total c/IVA: $${precioUSD} / Bs. ${precioBs}) y me gustaría adquirirlo.`;
  } else {
    mensaje = `¡Hola Librería Minerva! Visité su página web y me gustaría consultar sobre los libros disponibles en el Centro Comercial Arca en Barquisimeto.`;
  }
  return `https://wa.me/${WHATSAPP_INTL}?text=${encodeURIComponent(mensaje)}`;
};
