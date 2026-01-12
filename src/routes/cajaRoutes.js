const express = require('express');
const router = express.Router();
const CajaController = require('../controllers/CajaController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/caja - Obtener todas las cajas
router.get('/', authMiddleware, CajaController.getAll);

// GET /api/caja/abierta - Obtener caja abierta del usuario actual
router.get('/abierta', authMiddleware, CajaController.getAbierta);

// GET /api/caja/cerradas - Obtener cajas cerradas con filtros
router.get('/cerradas', authMiddleware, CajaController.getCajasCerradas);

// GET /api/caja/:id - Obtener caja por ID
router.get('/:id', authMiddleware, CajaController.getById);

// GET /api/caja/:id/ventas - Obtener ventas de una caja
router.get('/:id/ventas', authMiddleware, CajaController.getVentasCaja);

// GET /api/caja/:id/devoluciones - Obtener devoluciones de una caja
router.get('/:id/devoluciones', authMiddleware, CajaController.getDevolucionesCaja);

// GET /api/caja/:id/resumen - Obtener resumen completo de una caja
router.get('/:id/resumen', authMiddleware, CajaController.getResumenCaja);

// POST /api/caja/abrir - Abrir caja
router.post('/abrir', authMiddleware, CajaController.abrirCaja);

// POST /api/caja/cerrar - Cerrar caja
router.post('/cerrar', authMiddleware, CajaController.cerrarCaja);

module.exports = router;
