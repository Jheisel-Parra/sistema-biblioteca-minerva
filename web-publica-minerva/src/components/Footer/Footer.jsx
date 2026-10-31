const logo = './Logo.png';
import IconoWhatsApp from '../IconoWhatsApp/IconoWhatsApp';
import { UBICACION_NOMBRE, construirLinkWhatsApp } from '../../constants/config';
import './Footer.css';

export default function Footer({ tasaBCV }) {
  return (
    <>
      <a
        href={construirLinkWhatsApp(null, tasaBCV)}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-whatsapp-btn"
        title="Contactar por WhatsApp"
      >
        <IconoWhatsApp size={22} />
        <span>WhatsApp</span>
      </a>

      <footer className="footer-minerva">
        <div className="container footer-inner">
          <div className="footer-brand">
            <img src={logo} alt="Logo Minerva" className="footer-logo" />
            <div>
              <h4>LIBRERÍA & CENTRO CULTURAL MINERVA</h4>
              <p>"Espacio del Conocimiento y la Sabiduría"</p>
              <small>R.I.F.: J-40192837-0 • {UBICACION_NOMBRE}, Estado Lara</small>
            </div>
          </div>

          <div className="footer-contact">
            <div>
              <strong>Ubicación:</strong> {UBICACION_NOMBRE}
            </div>
            <div>
              <strong>Horario:</strong> Lunes a Sábado, 9:00 AM – 6:00 PM
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
