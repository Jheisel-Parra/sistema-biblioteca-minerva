import IconoWhatsApp from '../IconoWhatsApp/IconoWhatsApp';
import {
  calcularDesgloseIva,
  formatearBs,
  construirLinkWhatsApp
} from '../../constants/config';

export default function TarjetaLibro({ libro, tasaBCV, onSeleccionarLibro }) {
  const stock = Number(libro.ejemplares) || 0;
  const disponible = stock > 0;
  const pocoStock = stock > 0 && stock <= 3;
  const { base, iva, total } = calcularDesgloseIva(libro.precio);

  return (
    <article className="libro-card">
      <div className="libro-cover-wrap" onClick={() => onSeleccionarLibro(libro)}>
        {libro.portada ? (
          <img
            src={libro.portada}
            alt={libro.titulo}
            className="libro-cover-img"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="libro-cover-placeholder">
            <span>LIBRERÍA MINERVA</span>
            <strong>{libro.titulo}</strong>
          </div>
        )}

        <span className="libro-categoria-tag">{libro.categoria}</span>

        <span
          className={`libro-stock-badge ${
            !disponible
              ? 'badge-agotado'
              : pocoStock
              ? 'badge-poco-stock'
              : 'badge-disponible'
          }`}
        >
          {!disponible
            ? 'Agotado'
            : pocoStock
            ? `¡Últimos ${stock} disponibles!`
            : `${stock} disponibles`}
        </span>
      </div>

      <div className="libro-card-body">
        <h3 className="libro-titulo" onClick={() => onSeleccionarLibro(libro)}>
          {libro.titulo}
        </h3>
        <p className="libro-autor">{libro.autor}</p>

        <div className="libro-precio-row">
          <div>
            <span className="precio-label">Total c/IVA (16%)</span>
            <div className="precio-usd">${total.toFixed(2)}</div>
            <div className="precio-bs">{formatearBs(total, tasaBCV)}</div>
            <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '0.12rem' }}>
              Base: ${base.toFixed(2)} + IVA: ${iva.toFixed(2)}
            </div>
          </div>

          <button
            type="button"
            className="btn-ver-ficha"
            onClick={() => onSeleccionarLibro(libro)}
          >
            Ver Detalles
          </button>
        </div>

        <div className="libro-card-actions">
          <a
            href={construirLinkWhatsApp(libro, tasaBCV)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-comprar-whatsapp"
          >
            <IconoWhatsApp size={16} />
            <span>
              {disponible ? 'Comprar / Apartar por WhatsApp' : 'Consultar por WhatsApp'}
            </span>
          </a>
          <a href="#ubicacion" className="btn-comprar-fisico">
            Comprar en Tienda (C.C. Arca)
          </a>
        </div>
      </div>
    </article>
  );
}
