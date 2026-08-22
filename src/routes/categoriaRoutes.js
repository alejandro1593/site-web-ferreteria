const express = require('express');
const router = express.Router();
const CategoriaController = require('../controllers/CategoriaController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const adminOGerente = roleMiddleware(['admin', 'gerente']);

// GET /api/categorias - Obtener todas las categorías
router.get('/', authMiddleware, CategoriaController.getAll);

// GET /api/categorias/:id - Obtener una categoría por ID
router.get('/:id', authMiddleware, CategoriaController.getById);

// POST /api/categorias - Crear nueva categoría (solo admin/gerente)
router.post('/', authMiddleware, adminOGerente, CategoriaController.create);

// PUT /api/categorias/:id - Actualizar categoría (solo admin/gerente)
router.put('/:id', authMiddleware, adminOGerente, CategoriaController.update);

// DELETE /api/categorias/:id - Eliminar categoría (solo admin/gerente)
router.delete('/:id', authMiddleware, adminOGerente, CategoriaController.delete);

module.exports = router;