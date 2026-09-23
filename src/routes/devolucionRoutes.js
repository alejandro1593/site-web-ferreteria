const express = require('express');
const router = express.Router();
const DevolucionController = require('../controllers/DevolucionController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const rolesDevoluciones = roleMiddleware(['admin', 'gerente', 'supervisor', 'cajero']);

// GET /api/devoluciones - Obtener todas las devoluciones
router.get('/', authMiddleware, rolesDevoluciones, DevolucionController.getAll);

// GET /api/devoluciones/periodo - Obtener devoluciones por período
router.get('/periodo', authMiddleware, rolesDevoluciones, DevolucionController.getDevolucionesPorPeriodo);

// GET /api/devoluciones/resumen - Obtener resumen de devoluciones
router.get('/resumen', authMiddleware, rolesDevoluciones, DevolucionController.getResumen);

// GET /api/devoluciones/venta/:idVenta - Obtener devoluciones de una venta
router.get('/venta/:idVenta', authMiddleware, rolesDevoluciones, DevolucionController.getByVenta);

// GET /api/devoluciones/:id - Obtener devolución por ID
router.get('/:id', authMiddleware, rolesDevoluciones, DevolucionController.getById);

// POST /api/devoluciones - Crear nueva devolución
router.post('/', authMiddleware, rolesDevoluciones, DevolucionController.create);

module.exports = router;
