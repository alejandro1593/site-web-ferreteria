const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

// Importar modelos
require('./models/Categoria');
require('./models/Proveedor');
require('./models/Cliente');
require('./models/Usuario');
require('./models/Producto');
require('./models/Venta');
require('./models/VentaDetalle');

// Importar controlador
const ProductoController = require('./controllers/ProductoController');

// Importar rutas
const apiRoutes = require('./routes');
const viewRoutes = require('./routeViews/viewRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'productos');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten: JPG, PNG, GIF, WebP'));
    }
  }
});

// Middlewares básicos
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.1.5:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/static', express.static('src/static'));

// Servir archivos subidos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Montar rutas
app.use('/', viewRoutes);
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});