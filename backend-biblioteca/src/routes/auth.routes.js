import { Router } from 'express';
import { login, verificar2FA, getPerfil, cambiarPasswordInicial, logout } from '../controllers/auth.controller.js';
import { verificarAutenticacion } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/verificar-2fa', verificar2FA);
router.get('/perfil', verificarAutenticacion, getPerfil);
router.post('/cambiar-password-inicial', verificarAutenticacion, cambiarPasswordInicial);
router.post('/logout', verificarAutenticacion, logout);

export default router;
