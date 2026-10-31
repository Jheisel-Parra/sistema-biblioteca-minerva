import { Router } from 'express';
import {
  getUsuarios,
  crearUsuario,
  actualizarUsuario,
  toggleEstadoUsuario,
  resetearPasswordUsuario,
  obtenerQRUsuario,
  regenerarQRUsuario,
  desbloquearUsuario
} from '../controllers/usuario.controller.js';
import { verificarAutenticacion } from '../middleware/auth.middleware.js';
import { soloAdmin } from '../middleware/role.middleware.js';

const router = Router();

// Todas las rutas de personal requieren autenticación y rol 'admin'
router.use(verificarAutenticacion, soloAdmin);

router.get('/', getUsuarios);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.patch('/:id/toggle-estado', toggleEstadoUsuario);
router.patch('/:id/reset-password', resetearPasswordUsuario);
router.get('/:id/qr-2fa', obtenerQRUsuario);
router.post('/:id/regenerar-2fa', regenerarQRUsuario);
router.patch('/:id/desbloquear', desbloquearUsuario);

export default router;
