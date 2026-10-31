import { Router } from 'express';
import {
  getCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria
} from '../controllers/categoria.controller.js';
import { verificarAutenticacion } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verificarAutenticacion);

router.get('/', getCategorias);
router.post('/', crearCategoria);
router.put('/:id', actualizarCategoria);
router.delete('/:id', eliminarCategoria);

export default router;
