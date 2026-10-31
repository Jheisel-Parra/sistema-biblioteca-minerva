import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

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

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
app.use(cors({
  origin: '*', // Permitir frontend local
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

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: `Ruta "${req.originalUrl}" no encontrada en la API.`
  });
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 SERVIDOR BACKEND INICIADO CON ÉXITO`);
  console.log(`📡 Puerto: http://localhost:${PORT}`);
  console.log(`💾 Base de Datos: SQLite (dev.db)`);
  console.log(`🔐 Autenticación: JWT + Roles RBAC Activos`);
  console.log(`====================================================`);
});
