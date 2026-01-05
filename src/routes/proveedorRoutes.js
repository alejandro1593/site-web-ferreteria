const express = require('express');
const router = express.Router();
const ProveedorController = require('../controllers/ProveedorController');

// GET /api/proveedores - Obtener todos los proveedores
router.get('/', ProveedorController.getAll);

// GET /api/proveedores/:id - Obtener un proveedor por ID
router.get('/:id', ProveedorController.getById);

// GET /api/proveedores/search?nombre=xxx - Buscar proveedor por nombre
router.get('/search', ProveedorController.search);

// POST /api/proveedores - Crear nuevo proveedor
router.post('/', ProveedorController.create);

// PUT /api/proveedores/:id - Actualizar proveedor
router.put('/:id', ProveedorController.update);

// DELETE /api/proveedores/:id - Eliminar proveedor
router.delete('/:id', ProveedorController.delete);

module.exports = router;