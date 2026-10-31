import { useState } from 'react';
import './CambioPasswordObligatorio.css';
import logo from '../../assets/Logo.png';
import { apiCambiarPasswordInicial, guardarSesion, getToken } from '../../services/api';

export default function CambioPasswordObligatorio({ usuario, onPasswordActualizada, onCerrarSesion }) {
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nuevaPassword || !confirmarPassword) {
      setError('Por favor, completa ambos campos.');
      return;
    }

    if (nuevaPassword.length < 6) {
      setError('La nueva contraseña debe tener un mínimo de 6 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden. Por favor, verifícalas.');
      return;
    }

    try {
      setCargando(true);
      setError('');

      const res = await apiCambiarPasswordInicial(nuevaPassword);

      if (res.ok && res.usuario) {
        // Actualizar datos guardados en localStorage
        const tokenActual = getToken();
        guardarSesion(tokenActual, res.usuario);
        onPasswordActualizada(res.usuario);
      } else {
        setError(res.mensaje || 'Error al actualizar la contraseña.');
      }
    } catch (err) {
      setError(err.message || 'Error al comunicarse con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="pwd-change-container">
      <div className="pwd-change-card">
        {/* Cabecera */}
        <div className="pwd-change-header">
          <img src={logo} alt="Logo Biblioteca" className="pwd-change-logo" />
          <div className="pwd-badge-security">🛡️ Seguridad de la Cuenta</div>
          <h1 className="pwd-change-title">Establece tu Contraseña Personal</h1>
          <p className="pwd-change-subtitle">
            Hola, <strong>{usuario?.nombre || 'Usuario'}</strong>. Por motivos de seguridad y al ser tu primer inicio de sesión (o tras un restablecimiento administrativo), debes definir una contraseña privada y personal para acceder a tu panel de trabajo.
          </p>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div className="pwd-alert-error" role="alert">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="pwd-change-form">
          <div className="pwd-form-group">
            <label htmlFor="nuevaPassword" className="pwd-form-label">
              Nueva Contraseña Privada *
            </label>
            <div className="pwd-input-wrapper">
              <input
                id="nuevaPassword"
                type={mostrarPassword ? 'text' : 'password'}
                className="pwd-form-input"
                placeholder="Nueva contraseña"
                value={nuevaPassword}
                onChange={(e) => {
                  setNuevaPassword(e.target.value);
                  if (error) setError('');
                }}
                required
                autoFocus
              />
              <button
                type="button"
                className="btn-pwd-eye"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                aria-label="Ver u ocultar contraseña"
              >
                {mostrarPassword ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          <div className="pwd-form-group">
            <label htmlFor="confirmarPassword" className="pwd-form-label">
              Confirmar Nueva Contraseña *
            </label>
            <div className="pwd-input-wrapper">
              <input
                id="confirmarPassword"
                type={mostrarPassword ? 'text' : 'password'}
                className="pwd-form-input"
                placeholder="Confirmar contraseña"
                value={confirmarPassword}
                onChange={(e) => {
                  setConfirmarPassword(e.target.value);
                  if (error) setError('');
                }}
                required
              />
            </div>
          </div>

          <div className="pwd-requirements">
            <div className={`req-item ${nuevaPassword.length >= 6 ? 'req-met' : ''}`}>
              {nuevaPassword.length >= 6 ? '✓' : '○'} Mínimo 6 caracteres
            </div>
            <div className={`req-item ${nuevaPassword && nuevaPassword === confirmarPassword ? 'req-met' : ''}`}>
              {nuevaPassword && nuevaPassword === confirmarPassword ? '✓' : '○'} Las contraseñas coinciden
            </div>
          </div>

          <button
            type="submit"
            className="btn-pwd-submit"
            disabled={cargando || nuevaPassword.length < 6 || nuevaPassword !== confirmarPassword}
          >
            {cargando ? 'Guardando en Base de Datos...' : 'Guardar Mi Contraseña y Entrar ➔'}
          </button>
        </form>

        <div className="pwd-change-footer">
          <button type="button" className="btn-pwd-logout" onClick={onCerrarSesion}>
            Cerrar Sesión 🚪
          </button>
        </div>
      </div>
    </div>
  );
}
