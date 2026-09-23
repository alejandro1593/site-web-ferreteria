const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { validateAuthConfig } = require('./config/auth_config');

// Importar modelos
require('./models/Categoria');
require('./models/Proveedor');
require('./models/Cliente');
require('./models/Usuario');
require('./models/Producto');
require('./models/Venta');
require('./models/VentaDetalle');
require('./models/Devolucion');
require('./models/Caja');
require('./models/Cotizacion');
require('./models/CotizacionDetalle');

// Importar rutas
const apiRoutes = require('./routes');
const viewRoutes = require('./routeViews/viewRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middlewares básicos
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"]
    }
  }
}));

// Limitador general para la API: máx 300 peticiones por minuto por IP
// (se desactiva en tests para no interferir con Jest)
const enTests = process.env.NODE_ENV === 'test';
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => enTests,
  message: { error: 'Demasiadas peticiones, intente más tarde' }
});

// Limitador estricto para autenticación: máx 10 intentos cada 15 minutos (fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => enTests,
  message: { error: 'Demasiados intentos. Espere 15 minutos antes de volver a intentar' }
});

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Servir archivos estáticos
app.use('/static', express.static(path.join(__dirname, 'static')));

// Servir archivos subidos
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => enTests,
  message: { status: 'degraded', database: 'rate_limited' }
});

app.get('/health', healthLimiter, async (req, res) => {
  try {
    const database = require('./config/db_postgres');
    await database.pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'degraded', database: 'error', timestamp: new Date().toISOString() });
  }
});

// Montar rutas
app.use('/', viewRoutes);
app.use('/api', apiLimiter, apiRoutes);
app.use('/api/auth', authLimiter, authRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError || error.message === 'Tipo o extensión de archivo no permitido') {
    return res.status(400).json({ error: 'Archivo inválido' });
  }
  if (error instanceof SyntaxError && error.status === 400 && error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  res.status(500).json({ error: 'Error interno del servidor' });
});

function validateRuntimeConfig() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada');
  validateAuthConfig();
}

if (require.main === module) {
  try {
    validateRuntimeConfig();
    const PORT = process.env.PORT || 3000;
    const database = require('./config/db_postgres');
    let server;
    const shutdown = async () => {
      if (server) {
        await new Promise(resolve => server.close(resolve));
      }
      await database.pool.end();
      process.exit(0);
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
    database.pool.query('SELECT 1')
      .then(() => {
        server = app.listen(PORT, () => {
          console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
        });
      })
      .catch((error) => {
        console.error('No se pudo conectar con PostgreSQL:', error.code || error.message);
        process.exit(1);
      });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = app;