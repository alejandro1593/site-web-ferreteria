const express = require('express');
const router = express.Router();
const ProveedorController = require('../controllers/ProveedorController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/proveedores - Obtener todos los proveedores
router.get('/', authMiddleware, ProveedorController.getAll);

// GET /api/proveedores/:id - Obtener un proveedor por ID
router.get('/:id', authMiddleware, ProveedorController.getById);

// GET /api/proveedores/search?nombre=xxx - Buscar proveedor por nombre
router.get('/search', authMiddleware, ProveedorController.search);

// POST /api/proveedores - Crear nuevo proveedor
router.post('/', authMiddleware, ProveedorController.create);

// PUT /api/proveedores/:id - Actualizar proveedor
router.put('/:id', authMiddleware, ProveedorController.update);

// DELETE /api/proveedores/:id - Eliminar proveedor
router.delete('/:id', authMiddleware, ProveedorController.delete);

module.exports = router;