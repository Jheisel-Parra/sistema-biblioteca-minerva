import IconoWhatsApp from '../IconoWhatsApp/IconoWhatsApp';
import { construirLinkWhatsApp } from '../../constants/config';
import './ComoComprar.css';

export default function ComoComprar({ tasaBCV }) {
  return (
    <section id="como-comprar" className="como-comprar-section">
      <div className="container">
        <div className="section-header centered">
          <span className="section-eyebrow">ATENCIÓN PERSONALIZADA</span>
          <h2>¿Cómo adquirir tus libros en Librería Minerva?</h2>
          <p>
            Elige tu obra favorita en nuestro catálogo y adquiérela a través de cualquiera de
            nuestras dos modalidades de atención:
          </p>
        </div>

        <div className="modalidades-grid">
          <div className="modalidad-card">
            <div className="modalidad-step">OPCIÓN 1</div>
            <h3>Visita nuestra Sede Física</h3>
            <p>
              Acércate directamente a nuestra librería en el{' '}
              <strong>Centro Comercial Arca en Barquisimeto</strong> y solicita el ejemplar de
              tu preferencia en mostrador.
            </p>
            <ul className="modalidad-list">
              <li>Atención directa por nuestro equipo de librería.</li>
              <li>Pago en tienda mediante Efectivo, Pago Móvil o Punto de Venta.</li>
              <li>Entrega inmediata de tu libro.</li>
            </ul>
            <a href="#ubicacion" className="btn-modalidad-outline">
              Ver Dirección y Horarios
            </a>
          </div>

          <div className="modalidad-card modalidad-featured">
            <div className="modalidad-step step-gold">OPCIÓN 2</div>
            <h3>Solicítalo vía WhatsApp</h3>
            <p>
              Pulsa el botón <strong>"Comprar / Apartar por WhatsApp"</strong> en el libro que
              desees para conversar directamente con nuestro equipo de atención.
            </p>
            <ul className="modalidad-list">
              <li>Aparta tu ejemplar antes de acercarte al Centro Comercial Arca.</li>
              <li>Atención rápida y personalizada por chat.</li>
              <li>Coordina tu compra y retiro cómodamente.</li>
            </ul>
            <a
              href={construirLinkWhatsApp(null, tasaBCV)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-modalidad-whatsapp"
            >
              <IconoWhatsApp size={18} />
              <span>Escribir por WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
