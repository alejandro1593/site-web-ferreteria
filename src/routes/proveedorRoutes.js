const express = require('express');
const router = express.Router();
const ProveedorController = require('../controllers/ProveedorController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const adminOGerente = roleMiddleware(['admin', 'gerente']);

// GET /api/proveedores - Obtener todos los proveedores
router.get('/', authMiddleware, ProveedorController.getAll);

// GET /api/proveedores/search?nombre=xxx - Buscar proveedor por nombre
router.get('/search', authMiddleware, ProveedorController.search);

// GET /api/proveedores/:id - Obtener un proveedor por ID
router.get('/:id', authMiddleware, ProveedorController.getById);

// POST /api/proveedores - Crear nuevo proveedor (solo admin/gerente)
router.post('/', authMiddleware, adminOGerente, ProveedorController.create);

// PUT /api/proveedores/:id - Actualizar proveedor (solo admin/gerente)
router.put('/:id', authMiddleware, adminOGerente, ProveedorController.update);

// DELETE /api/proveedores/:id - Eliminar proveedor (solo admin/gerente)
router.delete('/:id', authMiddleware, adminOGerente, ProveedorController.delete);

module.exports = router;