import { Router } from 'express';
import { getLibros, getLibrosPublico, crearLibro, actualizarLibro } from '../controllers/libro.controller.js';
import { verificarAutenticacion } from '../middleware/auth.middleware.js';

const router = Router();

// Endpoint público de solo lectura para la Página Web de Librería Minerva
router.get('/publico', getLibrosPublico);

router.use(verificarAutenticacion);

router.get('/', getLibros);
router.post('/', crearLibro);
router.put('/:id', actualizarLibro); // El controlador protege el stock

export default router;
