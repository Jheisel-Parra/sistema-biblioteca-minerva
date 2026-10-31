import { useState, useEffect, useMemo } from 'react';
import { CACHE_KEY, CATALOGO_INSTANTANEO } from './constants/config';
import { obtenerCatalogoPublico } from './services/catalogoService';

// Componentes Modulares
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import Catalogo from './components/Catalogo/Catalogo';
import ComoComprar from './components/ComoComprar/ComoComprar';
import Ubicacion from './components/Ubicacion/Ubicacion';
import ModalDetalleLibro from './components/ModalDetalleLibro/ModalDetalleLibro';
import Footer from './components/Footer/Footer';

function App() {
  const [libros, setLibros] = useState(() => {
    try {
      const guardado = localStorage.getItem(CACHE_KEY);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed.libros) && parsed.libros.length > 0) {
          return parsed.libros;
        }
      }
    } catch {
      // Ignorar errores de caché
    }
    return CATALOGO_INSTANTANEO;
  });

  const [tasaBCV, setTasaBCV] = useState(() => {
    try {
      const guardado = localStorage.getItem(CACHE_KEY);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (parsed.tasaBCV && Number(parsed.tasaBCV) > 40) {
          return Number(parsed.tasaBCV);
        }
      }
    } catch {
      // Ignorar
    }
    return 88.62;
  });

  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [libroDetalle, setLibroDetalle] = useState(null);

  useEffect(() => {
    let montado = true;

    const sincronizar = async () => {
      const { libros: nuevosLibros, tasaBCV: nuevaTasa } = await obtenerCatalogoPublico();
      if (!montado) return;
      if (nuevosLibros) setLibros(nuevosLibros);
      if (nuevaTasa) setTasaBCV(nuevaTasa);
    };

    sincronizar();
    const intervalo = setInterval(sincronizar, 20000);
    window.addEventListener('focus', sincronizar);

    return () => {
      montado = false;
      clearInterval(intervalo);
      window.removeEventListener('focus', sincronizar);
    };
  }, []);

  const categorias = useMemo(() => {
    const unicas = new Set(libros.map((l) => l.categoria).filter(Boolean));
    return ['Todas', ...Array.from(unicas)];
  }, [libros]);

  const librosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return libros.filter((libro) => {
      const coincideCategoria =
        categoriaActiva === 'Todas' || libro.categoria === categoriaActiva;
      const stock = Number(libro.ejemplares) || 0;
      const coincideStock = !soloDisponibles || stock > 0;
      const coincideTexto =
        !q ||
        (libro.titulo && libro.titulo.toLowerCase().includes(q)) ||
        (libro.autor && libro.autor.toLowerCase().includes(q)) ||
        (libro.isbn && libro.isbn.toLowerCase().includes(q)) ||
        (libro.categoria && libro.categoria.toLowerCase().includes(q));

      return coincideCategoria && coincideStock && coincideTexto;
    });
  }, [libros, busqueda, categoriaActiva, soloDisponibles]);

  const handleResetearFiltros = () => {
    setBusqueda('');
    setCategoriaActiva('Todas');
    setSoloDisponibles(false);
  };

  return (
    <div className="minerva-web-layout">
      <Navbar tasaBCV={tasaBCV} />

      <Hero busqueda={busqueda} onCambiarBusqueda={setBusqueda} />

      <Catalogo
        librosFiltrados={librosFiltrados}
        categorias={categorias}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        categoriaActiva={categoriaActiva}
        onCambiarCategoria={setCategoriaActiva}
        soloDisponibles={soloDisponibles}
        onCambiarSoloDisponibles={setSoloDisponibles}
        onResetearFiltros={handleResetearFiltros}
        onSeleccionarLibro={setLibroDetalle}
        tasaBCV={tasaBCV}
      />

      <ComoComprar tasaBCV={tasaBCV} />

      <Ubicacion tasaBCV={tasaBCV} />

      <ModalDetalleLibro
        libro={libroDetalle}
        tasaBCV={tasaBCV}
        onCerrar={() => setLibroDetalle(null)}
      />

      <Footer tasaBCV={tasaBCV} />
    </div>
  );
}

export default App;
