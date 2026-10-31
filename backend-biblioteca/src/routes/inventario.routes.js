import { Router } from 'express';
import {
  getHistorialEntradas,
  registrarEntrada,
  getHistorialBajas,
  registrarBaja
} from '../controllers/inventario.controller.js';
import { verificarAutenticacion } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verificarAutenticacion);

// Entradas / Reabastecimiento (+)
router.get('/entradas', getHistorialEntradas);
router.post('/entradas', registrarEntrada);

// Bajas / Mermas (-)
router.get('/bajas', getHistorialBajas);
router.post('/bajas', registrarBaja);

export default router;
