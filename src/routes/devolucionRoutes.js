const express = require('express');
const router = express.Router();
const DevolucionController = require('../controllers/DevolucionController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/devoluciones - Obtener todas las devoluciones
router.get('/', authMiddleware, DevolucionController.getAll);

// GET /api/devoluciones/periodo - Obtener devoluciones por período
router.get('/periodo', authMiddleware, DevolucionController.getDevolucionesPorPeriodo);

// GET /api/devoluciones/resumen - Obtener resumen de devoluciones
router.get('/resumen', authMiddleware, DevolucionController.getResumen);

// GET /api/devoluciones/venta/:idVenta - Obtener devoluciones de una venta
router.get('/venta/:idVenta', authMiddleware, DevolucionController.getByVenta);

// GET /api/devoluciones/:id - Obtener devolución por ID
router.get('/:id', authMiddleware, DevolucionController.getById);

// POST /api/devoluciones - Crear nueva devolución
router.post('/', authMiddleware, DevolucionController.create);

module.exports = router;
