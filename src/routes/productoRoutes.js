const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const ProductoController = require('../controllers/ProductoController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const adminOGerente = roleMiddleware(['admin', 'gerente']);
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '..', '..', 'uploads', 'productos');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = crypto.randomUUID();
      cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/jpg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    };
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedTypes[file.mimetype] && allowedTypes[file.mimetype].includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo o extensión de archivo no permitido'));
    }
  }
});

// GET /api/productos - Obtener todos los productos
router.get('/', authMiddleware, ProductoController.getAll);

// GET /api/productos/search?termino=xxx - Buscar productos
router.get('/search', authMiddleware, ProductoController.search);

// GET /api/productos/lowstock - Obtener productos con stock bajo
router.get('/lowstock', authMiddleware, ProductoController.getLowStock);

// GET /api/productos/categoria/:idCategoria - Obtener productos por categoría
router.get('/categoria/:idCategoria', authMiddleware, ProductoController.getByCategoria);

// GET /api/productos/codigo/:codigo - Obtener producto por código
router.get('/codigo/:codigo', authMiddleware, ProductoController.getByCodigo);

// GET /api/productos/:id - Obtener un producto por ID
router.get('/:id', authMiddleware, ProductoController.getById);

// POST /api/productos - Crear nuevo producto (solo admin/gerente)
router.post('/', authMiddleware, adminOGerente, ProductoController.create);

// POST /api/productos/upload - Crear nuevo producto con imagen (solo admin/gerente)
router.post('/upload', authMiddleware, adminOGerente, upload.single('imagen'), ProductoController.createWithImage);

// PUT /api/productos/:id - Actualizar producto (solo admin/gerente)
router.put('/:id', authMiddleware, adminOGerente, ProductoController.update);

// DELETE /api/productos/:id - Eliminar producto (solo admin/gerente)
router.delete('/:id', authMiddleware, adminOGerente, ProductoController.delete);

// PUT /api/productos/:id/stock - Actualizar stock de producto (solo admin/gerente)
router.put('/:id/stock', authMiddleware, adminOGerente, ProductoController.updateStock);

// POST /api/productos/:id/upload - Subir imagen de producto (solo admin/gerente)
router.post('/:id/upload', authMiddleware, adminOGerente, upload.single('imagen'), ProductoController.uploadImage);

module.exports = router;