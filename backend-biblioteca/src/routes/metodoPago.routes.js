import { Router } from 'express';
import {
  getMetodosPago,
  crearMetodoPago,
  toggleEstadoMetodoPago,
  eliminarMetodoPago
} from '../controllers/metodoPago.controller.js';
import { verificarAutenticacion } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verificarAutenticacion);

router.get('/', getMetodosPago);
router.post('/', crearMetodoPago);
router.patch('/:id/toggle-estado', toggleEstadoMetodoPago);
router.delete('/:id', eliminarMetodoPago);

export default router;
