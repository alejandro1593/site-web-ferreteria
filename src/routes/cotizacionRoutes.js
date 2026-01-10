const express = require('express');
const router = express.Router();
const CotizacionController = require('../controllers/CotizacionController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/cotizaciones - Obtener todas las cotizaciones
router.get('/', authMiddleware, CotizacionController.getAll);

// GET /api/cotizaciones/resumen - Obtener resumen de cotizaciones (DEBE IR ANTES DE /:id)
router.get('/resumen', authMiddleware, CotizacionController.getResumen);

// GET /api/cotizaciones/cliente/:idCliente - Obtener cotizaciones de un cliente
router.get('/cliente/:idCliente', authMiddleware, CotizacionController.getByCliente);

// GET /api/cotizaciones/:id - Obtener cotización por ID
router.get('/:id', authMiddleware, CotizacionController.getById);

// GET /api/cotizaciones/:id/detalles - Obtener detalles de una cotización
router.get('/:id/detalles', authMiddleware, CotizacionController.getDetalles);

// POST /api/cotizaciones - Crear nueva cotización
router.post('/', authMiddleware, CotizacionController.create);

// POST /api/cotizaciones/:id/convertir - Convertir cotización a venta
router.post('/:id/convertir', authMiddleware, CotizacionController.convertirAVenta);

// PUT /api/cotizaciones/:id - Actualizar cotización
router.put('/:id', authMiddleware, CotizacionController.update);

// DELETE /api/cotizaciones/:id - Eliminar cotización
router.delete('/:id', authMiddleware, CotizacionController.delete);

module.exports = router;
