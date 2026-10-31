import { Router } from 'express';
import {
  getDistribuidores,
  crearDistribuidor,
  actualizarDistribuidor,
  toggleEstadoDistribuidor
} from '../controllers/distribuidor.controller.js';
import { verificarAutenticacion } from '../middleware/auth.middleware.js';
import { soloAdmin } from '../middleware/role.middleware.js';

const router = Router();

router.use(verificarAutenticacion);

// Lectura permitida a usuarios autenticados
router.get('/', getDistribuidores);

// Creación, edición y cambio de estado exclusivos de Admin
router.post('/', soloAdmin, crearDistribuidor);
router.put('/:id', soloAdmin, actualizarDistribuidor);
router.patch('/:id/toggle-estado', soloAdmin, toggleEstadoDistribuidor);

export default router;
