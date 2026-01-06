const express = require('express');
const router = express.Router();
const ClienteController = require('../controllers/ClienteController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/clientes - Obtener todos los clientes
router.get('/', authMiddleware, ClienteController.getAll);

// GET /api/clientes/search?termino=xxx - Buscar cliente por nombre, apellido o DNI
router.get('/search', authMiddleware, ClienteController.search);

// GET /api/clientes/dni/:dni - Obtener cliente por DNI
router.get('/dni/:dni', authMiddleware, ClienteController.getByDni);

// GET /api/clientes/:id - Obtener un cliente por ID
router.get('/:id', authMiddleware, ClienteController.getById);

// POST /api/clientes - Crear nuevo cliente
router.post('/', authMiddleware, ClienteController.create);

// PUT /api/clientes/:id - Actualizar cliente
router.put('/:id', authMiddleware, ClienteController.update);

// DELETE /api/clientes/:id - Eliminar cliente
router.delete('/:id', authMiddleware, ClienteController.delete);

module.exports = router;