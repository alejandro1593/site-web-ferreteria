const express = require('express');
const router = express.Router();
const ProductoController = require('../controllers/ProductoController');

// GET /api/productos - Obtener todos los productos
router.get('/', ProductoController.getAll);

// GET /api/productos/search?termino=xxx - Buscar productos
router.get('/search', ProductoController.search);

// GET /api/productos/lowstock - Obtener productos con stock bajo
router.get('/lowstock', ProductoController.getLowStock);

// GET /api/productos/categoria/:idCategoria - Obtener productos por categoría
router.get('/categoria/:idCategoria', ProductoController.getByCategoria);

// GET /api/productos/codigo/:codigo - Obtener producto por código
router.get('/codigo/:codigo', ProductoController.getByCodigo);

// GET /api/productos/:id - Obtener un producto por ID
router.get('/:id', ProductoController.getById);

// POST /api/productos - Crear nuevo producto
router.post('/', ProductoController.create);

// PUT /api/productos/:id - Actualizar producto
router.put('/:id', ProductoController.update);

// DELETE /api/productos/:id - Eliminar producto (soft delete)
router.delete('/:id', ProductoController.delete);

// PUT /api/productos/:id/stock - Actualizar stock de producto
router.put('/:id/stock', ProductoController.updateStock);

module.exports = router;