import './ModalFactura.css';
import logo from '../../assets/Logo.png';

export default function ModalFactura({ venta, onClose }) {
  if (!venta) return null;

  const tasa = Number(venta.tasaCambio) || 36.50;
  const sumaItemsBase = (venta.items || []).reduce(
    (acc, it) => acc + (Number(it.precio) || 0) * (Number(it.cantidad) || 1),
    0
  );
  const subtotalUSD =
    Number(venta.subtotal) > 0
      ? Number(venta.subtotal)
      : sumaItemsBase > 0
      ? parseFloat(sumaItemsBase.toFixed(2))
      : parseFloat((Number(venta.total || 0) / 1.16).toFixed(2));
  const montoIvaUSD =
    Number(venta.montoIva) > 0
      ? Number(venta.montoIva)
      : parseFloat((subtotalUSD * 0.16).toFixed(2));
  const totalConIvaUSD = parseFloat((subtotalUSD + montoIvaUSD).toFixed(2));
  const totalConIvaBs = parseFloat((totalConIvaUSD * tasa).toFixed(2));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-factura-overlay" onClick={onClose}>
      <div className="modal-factura-wrapper" onClick={(e) => e.stopPropagation()}>
        {/* Barra superior de controles del modal (oculta al imprimir) */}
        <div className="modal-factura-actions-top no-print">
          <button className="btn-print-action" onClick={handlePrint}>
            Imprimir Recibo
          </button>
          <button className="btn-close-action" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {/* Contenido imprimible de la Factura / Recibo */}
        <div className="recibo-container" id="recibo-imprimible">
          {/* Cabecera de la factura */}
          <div className="recibo-header">
            <div className="recibo-brand">
              <img src={logo} alt="Logo" className="recibo-logo" />
              <div>
                <h2 className="recibo-empresa-titulo">LIBRERÍA & CENTRO CULTURAL MINERVA</h2>
                <p className="recibo-subtexto">Espacio del Conocimiento y la Sabiduría</p>
                <p className="recibo-subtexto">RIF: J-40192837-0 • Telf: (0212) 555-0199</p>
              </div>
            </div>
            <div className="recibo-nro-caja">
              <span className="recibo-tipo-doc">RECIBO DE VENTA</span>
              <span className="recibo-numero">{venta.nroFactura || `FAC-${venta.id}`}</span>
              <span className="recibo-fecha">Fecha: {venta.fecha}</span>
              <span className="recibo-hora">Hora: {venta.hora || '10:30 AM'}</span>
            </div>
          </div>

          <div className="recibo-divider"></div>

          {/* Información del Lector */}
          <div className="recibo-cliente-grid">
            <div>
              <span className="recibo-label">Lector:</span>
              <p className="recibo-valor text-bold">{venta.cliente?.nombre || venta.clienteNombre || 'Lector General'}</p>
            </div>
            <div>
              <span className="recibo-label">Cédula / Identificación:</span>
              <p className="recibo-valor">{venta.cliente?.cedula || venta.clienteCedula || 'No especificada'}</p>
            </div>
            <div>
              <span className="recibo-label">Método de Pago:</span>
              <p className="recibo-valor">
                <span className="recibo-badge-pago">{venta.metodoPago}</span>
                {venta.referenciaPago && (
                  <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Ref: {venta.referenciaPago}
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="recibo-label">Atendido por:</span>
              <p className="recibo-valor">{venta.atendidoPor || 'Recepción'}</p>
            </div>
          </div>

          <div className="recibo-divider"></div>

          {/* Tabla de Artículos Comprados */}
          <table className="recibo-items-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '50px' }}>Cant.</th>
                <th>Descripción del Libro</th>
                <th style={{ textAlign: 'right', width: '100px' }}>P. Unit ($)</th>
                <th style={{ textAlign: 'right', width: '100px' }}>Total ($)</th>
              </tr>
            </thead>
            <tbody>
              {venta.items && venta.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                  <td>
                    <span className="text-bold">{item.titulo}</span>
                    {item.autor && <span className="recibo-item-autor"> - {item.autor}</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>${Number(item.precio).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }} className="text-bold">
                    ${(Number(item.precio) * Number(item.cantidad)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="recibo-divider"></div>

          {/* Resumen de Totales con IVA (16%) */}
          <div className="recibo-totales-wrapper">
            <div className="recibo-totales-box">
              <div className="recibo-total-row">
                <span>Base Imponible (Subtotal):</span>
                <span>${subtotalUSD.toFixed(2)} USD (Bs. {(subtotalUSD * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
              </div>
              <div className="recibo-total-row">
                <span>IVA (16%):</span>
                <span>+${montoIvaUSD.toFixed(2)} USD (Bs. {(montoIvaUSD * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
              </div>
              <div className="recibo-total-row">
                <span>Total en Divisas (c/IVA):</span>
                <span className="text-bold">${totalConIvaUSD.toFixed(2)} USD</span>
              </div>
              <div className="recibo-total-row">
                <span>Tasa Oficial BCV:</span>
                <span>Bs. {tasa.toFixed(2)} / $</span>
              </div>
              <div className="recibo-total-row total-destacado">
                <span>TOTAL A PAGAR (BS.):</span>
                <span>Bs. {totalConIvaBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Pie de Recibo */}
          <div className="recibo-footer">
            <p className="recibo-agradecimiento">¡Gracias por fomentar la lectura con nosotros!</p>
            <p className="recibo-legal">Comprobante de entrega y compra directa de material bibliográfico.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
