const express = require('express');
const router = express.Router();
const CategoriaController = require('../controllers/CategoriaController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/categorias - Obtener todas las categorías
router.get('/', authMiddleware, CategoriaController.getAll);

// GET /api/categorias/:id - Obtener una categoría por ID
router.get('/:id', authMiddleware, CategoriaController.getById);

// POST /api/categorias - Crear nueva categoría
router.post('/', authMiddleware, CategoriaController.create);

// PUT /api/categorias/:id - Actualizar categoría
router.put('/:id', authMiddleware, CategoriaController.update);

// DELETE /api/categorias/:id - Eliminar categoría
router.delete('/:id', authMiddleware, CategoriaController.delete);

module.exports = router;