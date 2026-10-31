import IconoWhatsApp from '../IconoWhatsApp/IconoWhatsApp';
import {
  UBICACION_NOMBRE,
  calcularDesgloseIva,
  formatearBs,
  construirLinkWhatsApp
} from '../../constants/config';
import './ModalDetalleLibro.css';

export default function ModalDetalleLibro({ libro, tasaBCV, onCerrar }) {
  if (!libro) return null;

  const disponible = (Number(libro.ejemplares) || 0) > 0;
  const { base, iva, total } = calcularDesgloseIva(libro.precio);

  return (
    <div className="modal-libro-overlay" onClick={onCerrar}>
      <div className="modal-libro-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-libro-close" onClick={onCerrar}>
          Cerrar ✕
        </button>

        <div className="modal-libro-grid">
          <div className="modal-libro-img-box">
            {libro.portada ? (
              <img src={libro.portada} alt={libro.titulo} />
            ) : (
              <div className="libro-cover-placeholder">
                <span>LIBRERÍA MINERVA</span>
                <strong>{libro.titulo}</strong>
              </div>
            )}
          </div>

          <div className="modal-libro-info">
            <span className="libro-categoria-tag">{libro.categoria}</span>
            <h2>{libro.titulo}</h2>
            <p className="modal-libro-autor">
              Autor: <strong>{libro.autor}</strong>
            </p>
            <p className="modal-libro-isbn">
              ISBN: <strong>{libro.isbn}</strong>
            </p>

            <div className="modal-stock-panel">
              <div>
                <span>Disponibilidad:</span>
                <strong className={disponible ? 'text-green' : 'text-red'}>
                  {disponible
                    ? `${Number(libro.ejemplares)} ejemplares disponibles`
                    : 'Agotado temporalmente'}
                </strong>
              </div>
              <div>
                <span>Sede Física:</span>
                <strong>{UBICACION_NOMBRE}</strong>
              </div>
            </div>

            <div className="modal-precio-panel">
              <div>
                <span>Precio Base (sin IVA):</span>
                <strong>${base.toFixed(2)} ({formatearBs(base, tasaBCV)})</strong>
              </div>
              <div>
                <span>IVA (16%):</span>
                <strong style={{ color: '#1e3a8a' }}>
                  +${iva.toFixed(2)} ({formatearBs(iva, tasaBCV)})
                </strong>
              </div>
              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                <span>Total con IVA (USD):</span>
                <strong className="modal-usd">${total.toFixed(2)}</strong>
              </div>
              <div>
                <span>Total con IVA (Bolívares BCV):</span>
                <strong className="modal-bs">{formatearBs(total, tasaBCV)}</strong>
              </div>
            </div>

            <div className="modal-libro-actions">
              <a
                href={construirLinkWhatsApp(libro, tasaBCV)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-comprar-whatsapp"
              >
                <IconoWhatsApp size={18} />
                <span>Comprar / Apartar por WhatsApp</span>
              </a>
              <a href="#ubicacion" className="btn-comprar-fisico" onClick={onCerrar}>
                Ver Ubicación en C.C. Arca
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
