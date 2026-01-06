const express = require('express');
const router = express.Router();
const ProductoController = require('../controllers/ProductoController');
const { authMiddleware } = require('../middleware/auth');
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
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
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

// POST /api/productos - Crear nuevo producto
router.post('/', authMiddleware, ProductoController.create);

// POST /api/productos/upload - Crear nuevo producto con imagen
router.post('/upload', authMiddleware, upload.single('imagen'), ProductoController.createWithImage);

// PUT /api/productos/:id - Actualizar producto
router.put('/:id', authMiddleware, ProductoController.update);

// DELETE /api/productos/:id - Eliminar producto (soft delete)
router.delete('/:id', authMiddleware, ProductoController.delete);

// PUT /api/productos/:id/stock - Actualizar stock de producto
router.put('/:id/stock', authMiddleware, ProductoController.updateStock);

// POST /api/productos/:id/upload - Subir imagen de producto
router.post('/:id/upload', authMiddleware, upload.single('imagen'), ProductoController.uploadImage);

module.exports = router;