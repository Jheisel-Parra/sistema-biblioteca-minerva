import { useState } from 'react';
import './Login.css';
import logo from '../../assets/Logo.png';
import { apiLogin, apiVerificar2FA, guardarSesion } from '../../services/api';

export default function Login({ onLoginExitoso }) {
  // Estados del Paso 1: Correo/Cédula y Contraseña
  const [credencial, setCredencial] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Estados del Paso 2: Verificación 2FA (Google Authenticator)
  const [paso2FA, setPaso2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [configurando2FA, setConfigurando2FA] = useState(false);
  const [qrSvg, setQrSvg] = useState('');
  const [secretManual, setSecretManual] = useState('');
  const [mostrarClaveManual, setMostrarClaveManual] = useState(false);
  const [usuarioResumen, setUsuarioResumen] = useState(null);
  const [codigo2FA, setCodigo2FA] = useState('');

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Paso 1: Validar correo/cédula y contraseña
  const handleSubmitCredenciales = async (e) => {
    e.preventDefault();
    if (!credencial.trim() || !password.trim()) {
      setError('Por favor, ingresa tu correo electrónico o cédula y tu contraseña.');
      return;
    }

    try {
      setCargando(true);
      setError('');

      const res = await apiLogin(credencial, password);

      if (res.ok && res.requiere2FA) {
        setTempToken(res.tempToken);
        setConfigurando2FA(Boolean(res.configurando2FA));
        setQrSvg(res.qrSvg || '');
        setSecretManual(res.secretManual || '');
        setUsuarioResumen(res.usuarioResumen || null);
        setCodigo2FA('');
        setPaso2FA(true);
      } else if (res.ok && res.token) {
        guardarSesion(res.token, res.usuario, res.sesionId);
        onLoginExitoso(res.usuario, res.token);
      } else {
        setError(res.mensaje || 'Error al iniciar sesión.');
      }
    } catch (err) {
      setError(err.message || 'No fue posible conectar con el servidor. Verifica que el backend esté activo.');
    } finally {
      setCargando(false);
    }
  };

  // Paso 2: Validar el código temporal de 6 dígitos de Google Authenticator
  const handleSubmit2FA = async (e) => {
    e.preventDefault();
    const codigoLimpio = codigo2FA.replace(/\D/g, '');
    if (codigoLimpio.length !== 6) {
      setError('El código de seguridad debe tener exactamente 6 dígitos numéricos.');
      return;
    }

    try {
      setCargando(true);
      setError('');

      const res = await apiVerificar2FA(tempToken, codigoLimpio);

      if (res.ok && res.token) {
        guardarSesion(res.token, res.usuario, res.sesionId);
        onLoginExitoso(res.usuario, res.token);
      } else {
        setError(res.mensaje || 'Código de verificación inválido.');
      }
    } catch (err) {
      setError(err.message || 'Error al verificar el código de seguridad.');
    } finally {
      setCargando(false);
    }
  };

  const handleVolverPaso1 = () => {
    setPaso2FA(false);
    setTempToken('');
    setQrSvg('');
    setSecretManual('');
    setCodigo2FA('');
    setMostrarClaveManual(false);
    setError('');
  };

  return (
    <div className="login-container">
      <div className={`login-card ${paso2FA && configurando2FA ? 'login-card-2fa-setup' : ''}`}>
        {/* Encabezado con Logo */}
        <div className="login-header">
          <img src={logo} alt="Logo Biblioteca" className="login-logo" />
          <h1 className="login-title">Sistema Bibliotecario</h1>
          <p className="login-subtitle">
            {paso2FA
              ? 'Segunda Barrera de Seguridad • Autenticador 2FA'
              : 'Gestión Integral de Libros, Inventario y Ventas'}
          </p>
        </div>

        {/* Indicador de pasos */}
        <div className="login-steps-bar">
          <div className={`login-step-pill ${!paso2FA ? 'active' : 'completed'}`}>
            <span className="step-num">{!paso2FA ? '1' : '✓'}</span>
            <span>Credenciales</span>
          </div>
          <div className="login-step-divider"></div>
          <div className={`login-step-pill ${paso2FA ? 'active' : ''}`}>
            <span className="step-num">2</span>
            <span>Código 2FA</span>
          </div>
        </div>

        {/* Alerta de Error o Bloqueo */}
        {error && (
          <div className="login-alert-error" role="alert">
            <span className="login-alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* PASO 1: FORMULARIO DE CORREO/CÉDULA Y CONTRASEÑA */}
        {!paso2FA ? (
          <form onSubmit={handleSubmitCredenciales} className="login-form">
            <div className="login-group">
              <label htmlFor="credencial" className="login-label">
                Correo Electrónico o Cédula
              </label>
              <input
                id="credencial"
                type="text"
                className="login-input"
                placeholder="Correo o cédula"
                value={credencial}
                onChange={(e) => {
                  setCredencial(e.target.value);
                  if (error) setError('');
                }}
                autoFocus
                required
              />
            </div>

            <div className="login-group">
              <label htmlFor="password" className="login-label">
                Contraseña
              </label>
              <div className="login-password-wrapper">
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {mostrarPassword ? '👁️' : '🔒'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-login-submit"
              disabled={cargando}
            >
              {cargando ? (
                <span className="login-spinner-text">
                  <span className="login-spinner"></span> Verificando credenciales...
                </span>
              ) : (
                'Continuar a Verificación 2FA ➔'
              )}
            </button>
          </form>
        ) : (
          /* PASO 2: SEGUNDA BARRERA DE SEGURIDAD (GOOGLE AUTHENTICATOR / TOTP) */
          <form onSubmit={handleSubmit2FA} className="login-form">
            {usuarioResumen && (
              <div className="login-user-verified-banner">
                <span className="verified-icon">🛡️</span>
                <div>
                  <strong>{usuarioResumen.nombre}</strong>
                  <span className="verified-sub">{usuarioResumen.email}</span>
                </div>
              </div>
            )}

            {configurando2FA && qrSvg ? (
              <div className="login-qr-setup-box">
                <div className="qr-setup-badge">📲 Vinculación Inicial de Seguridad (Única Vez)</div>
                <p className="qr-setup-instructions">
                  Abre la app <strong>Google Authenticator</strong> (o Authy) en tu teléfono, toca <strong>"+"</strong> y escanea este código QR:
                </p>

                <div
                  className="qr-svg-wrapper"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />

                {secretManual && (
                  <div className="qr-manual-section">
                    <button
                      type="button"
                      className="btn-link-manual-key"
                      onClick={() => setMostrarClaveManual(!mostrarClaveManual)}
                    >
                      {mostrarClaveManual ? '▲ Ocultar clave manual' : '¿No puedes escanear el QR? Ver clave manual'}
                    </button>
                    {mostrarClaveManual && (
                      <div className="qr-manual-code-box">
                        <span>Clave de configuración (Base32):</span>
                        <code>{secretManual}</code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="login-2fa-prompt-box">
                <p>
                  Abre la aplicación <strong>Google Authenticator</strong> en tu teléfono e ingresa el código temporal de <strong>6 dígitos</strong> para desbloquear tu sesión.
                </p>
                <small className="offline-hint">✓ Funciona 100% local sin necesidad de conexión a internet</small>
              </div>
            )}

            <div className="login-group">
              <label htmlFor="codigo2fa" className="login-label" style={{ textAlign: 'center' }}>
                Código de Seguridad de 6 Dígitos
              </label>
              <input
                id="codigo2fa"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="login-input login-input-otp"
                placeholder="000000"
                value={codigo2FA}
                onChange={(e) => {
                  const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCodigo2FA(soloNumeros);
                  if (error) setError('');
                }}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="btn-login-submit"
              disabled={cargando || codigo2FA.length !== 6}
            >
              {cargando ? (
                <span className="login-spinner-text">
                  <span className="login-spinner"></span> Validando código...
                </span>
              ) : configurando2FA ? (
                'Activar 2FA e Iniciar Sesión ➔'
              ) : (
                'Verificar Código e Ingresar ➔'
              )}
            </button>

            <button
              type="button"
              className="btn-login-back"
              onClick={handleVolverPaso1}
              disabled={cargando}
            >
              ← Volver al paso anterior
            </button>
          </form>
        )}

        <div className="login-footer">
          <small>Doble Factor TOTP Local + Protección Anti-Intrusión (Máx. 3 intentos)</small>
        </div>
      </div>
    </div>
  );
}
