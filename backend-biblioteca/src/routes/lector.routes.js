import { Router } from 'express';
import { getLectores, crearLector, actualizarLector } from '../controllers/lector.controller.js';
import { verificarAutenticacion } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verificarAutenticacion);

router.get('/', getLectores);
router.post('/', crearLector);
router.put('/:id', actualizarLector);

export default router;
