import { Router } from 'express';
import { 
  getBitacora, 
  getSesiones, 
  getResumenBitacora, 
  forzarCierreSesion,
  getEstadoSeguridad,
  descargarBackupSqlite,
  descargarBackupJson,
  restaurarBackup
} from '../controllers/bitacora.controller.js';
import { verificarAutenticacion } from '../middleware/auth.middleware.js';
import { soloAdmin } from '../middleware/role.middleware.js';

const router = Router();

// Todas las rutas de bitácora y seguridad son estrictamente para administradores
router.use(verificarAutenticacion);
router.use(soloAdmin);

router.get('/', getBitacora);
router.get('/sesiones', getSesiones);
router.get('/resumen', getResumenBitacora);
router.get('/estado-seguridad', getEstadoSeguridad);
router.get('/backup-sqlite', descargarBackupSqlite);
router.get('/backup-json', descargarBackupJson);
router.post('/restaurar-backup', restaurarBackup);
router.put('/sesiones/:sesionId/forzar-cierre', forzarCierreSesion);

export default router;
