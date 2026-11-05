import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Garantizar que la base de datos SQLite con toda la información (libros, facturas, usuarios) exista siempre
const dbActualPath = path.resolve(__dirname, '../prisma/dev.db');
const dbRespaldoPath = path.resolve(__dirname, '../prisma/minerva-inicial.db');

try {
  const existeDb = fs.existsSync(dbActualPath) && fs.statSync(dbActualPath).size > 4096;
  if (!existeDb && fs.existsSync(dbRespaldoPath)) {
    fs.copyFileSync(dbRespaldoPath, dbActualPath);
    console.log('✓ Base de datos restaurada automáticamente desde minerva-inicial.db');
  }
} catch (err) {
  console.warn('Aviso verificando base de datos inicial:', err.message);
}

// Rutas
import authRoutes from './routes/auth.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import lectorRoutes from './routes/lector.routes.js';
import distribuidorRoutes from './routes/distribuidor.routes.js';
import libroRoutes from './routes/libro.routes.js';
import inventarioRoutes from './routes/inventario.routes.js';
import ventaRoutes from './routes/venta.routes.js';
import categoriaRoutes from './routes/categoria.routes.js';
import bitacoraRoutes from './routes/bitacora.routes.js';
import metodoPagoRoutes from './routes/metodoPago.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
app.use(cors({
  origin: '*', // Permitir frontend local y remoto
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Usuario-Email']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Ruta de comprobación de salud (Health check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    mensaje: 'Servidor Backend de Biblioteca e Inventario funcionando correctamente.',
    tiempo: new Date().toISOString()
  });
});

// Registrar Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/lectores', lectorRoutes);
app.use('/api/distribuidores', distribuidorRoutes);
app.use('/api/libros', libroRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/bitacora', bitacoraRoutes);
app.use('/api/metodos-pago', metodoPagoRoutes);

// Manejador de rutas no encontradas en /api (404)
app.use('/api', (req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: `Ruta "${req.originalUrl}" no encontrada en la API.`
  });
});

// Servir Landing Page Pública (/catalogo) y Sistema de Gestión (/) en producción (Render)
const frontendDistPath = path.resolve(__dirname, '../../frontend-biblioteca/dist');
const webPublicaDistPath = path.resolve(__dirname, '../../web-publica-minerva/dist');

if (fs.existsSync(webPublicaDistPath)) {
  app.use('/catalogo', express.static(webPublicaDistPath));
  app.get(/^\/catalogo(\/.*)?$/, (req, res) => {
    res.sendFile(path.join(webPublicaDistPath, 'index.html'));
  });
}

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^(?!\/api|\/catalogo).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({
      ok: false,
      mensaje: `Ruta "${req.originalUrl}" no encontrada en la API.`
    });
  });
}

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`SERVIDOR BACKEND INICIADO CON ÉXITO`);
  console.log(`Puerto: http://localhost:${PORT}`);
  console.log(`Base de Datos: SQLite (dev.db)`);
  console.log(`Autenticación: JWT + Roles RBAC Activos`);
  console.log(`====================================================`);
});
