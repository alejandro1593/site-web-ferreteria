const express = require('express');
const router = express.Router();
const CategoriaController = require('../controllers/CategoriaController');

// GET /api/categorias - Obtener todas las categorías
router.get('/', CategoriaController.getAll);

// GET /api/categorias/:id - Obtener una categoría por ID
router.get('/:id', CategoriaController.getById);

// POST /api/categorias - Crear nueva categoría
router.post('/', CategoriaController.create);

// PUT /api/categorias/:id - Actualizar categoría
router.put('/:id', CategoriaController.update);

// DELETE /api/categorias/:id - Eliminar categoría
router.delete('/:id', CategoriaController.delete);

module.exports = router;