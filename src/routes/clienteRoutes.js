const express = require('express');
const router = express.Router();
const ClienteController = require('../controllers/ClienteController');

// GET /api/clientes - Obtener todos los clientes
router.get('/', ClienteController.getAll);

// GET /api/clientes/search?termino=xxx - Buscar cliente por nombre, apellido o DNI
router.get('/search', ClienteController.search);

// GET /api/clientes/dni/:dni - Obtener cliente por DNI
router.get('/dni/:dni', ClienteController.getByDni);

// GET /api/clientes/:id - Obtener un cliente por ID
router.get('/:id', ClienteController.getById);

// POST /api/clientes - Crear nuevo cliente
router.post('/', ClienteController.create);

// PUT /api/clientes/:id - Actualizar cliente
router.put('/:id', ClienteController.update);

// DELETE /api/clientes/:id - Eliminar cliente
router.delete('/:id', ClienteController.delete);

module.exports = router;