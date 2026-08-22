const express = require('express');
const router = express.Router();
const CompraController = require('../controllers/CompraController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const adminOGerente = roleMiddleware(['admin', 'gerente']);

// GET /api/compras - Listar compras
router.get('/', authMiddleware, CompraController.getAll);

// GET /api/compras/:id - Detalle de una compra
router.get('/:id', authMiddleware, CompraController.getById);

// POST /api/compras - Registrar compra (aumenta stock)
router.post('/', authMiddleware, adminOGerente, CompraController.create);

// PUT /api/compras/:id/anular - Anular compra (descuenta stock)
router.put('/:id/anular', authMiddleware, adminOGerente, CompraController.anular);

module.exports = router;
