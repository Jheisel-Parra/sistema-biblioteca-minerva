import { Router } from 'express';
import { getVentas, registrarVenta } from '../controllers/venta.controller.js';
import { verificarAutenticacion } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verificarAutenticacion);

router.get('/', getVentas);
router.post('/', registrarVenta);

export default router;
