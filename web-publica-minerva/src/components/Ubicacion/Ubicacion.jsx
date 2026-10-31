import IconoWhatsApp from '../IconoWhatsApp/IconoWhatsApp';
import {
  UBICACION_NOMBRE,
  UBICACION_DETALLE,
  construirLinkWhatsApp
} from '../../constants/config';
import './Ubicacion.css';

export default function Ubicacion({ tasaBCV }) {
  return (
    <section id="ubicacion" className="ubicacion-section">
      <div className="container">
        <div className="ubicacion-grid">
          <div className="ubicacion-info-card">
            <span className="section-eyebrow">VISÍTANOS EN BARQUISIMETO</span>
            <h2>¿Dónde se encuentra ubicada la Biblioteca Minerva?</h2>
            <p className="ubicacion-lead">
              Te esperamos en nuestra sede física en Barquisimeto para que disfrutes de
              nuestro espacio cultural y adquieras tus obras favoritas.
            </p>

            <div className="ubicacion-details-list">
              <div className="ubicacion-detail-item">
                <strong>Dirección:</strong>
                <p>{UBICACION_NOMBRE}</p>
                <small>{UBICACION_DETALLE}</small>
              </div>

              <div className="ubicacion-detail-item">
                <strong>Horario de Atención:</strong>
                <p>Lunes a Sábado: 9:00 AM a 6:00 PM</p>
                <small>Domingos y feriados: Atención vía WhatsApp</small>
              </div>
            </div>

            <div className="ubicacion-cta-group">
              <a
                href={construirLinkWhatsApp(null, tasaBCV)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-comprar-whatsapp"
              >
                <IconoWhatsApp size={18} />
                <span>Contactar por WhatsApp</span>
              </a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Centro+Comercial+Arca+Barquisimeto"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-mapa-externo"
              >
                Ver en Google Maps
              </a>
            </div>
          </div>

          <div className="ubicacion-map-card">
            <iframe
              title="Ubicación Librería Minerva - Centro Comercial Arca, Barquisimeto"
              src="https://www.google.com/maps?q=Centro+Comercial+Arca+Barquisimeto+Lara+Venezuela&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
