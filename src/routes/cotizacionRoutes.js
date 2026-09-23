const express = require('express');
const router = express.Router();
const CotizacionController = require('../controllers/CotizacionController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const rolesCotizacion = roleMiddleware(['admin', 'gerente', 'supervisor', 'vendedor', 'cajero']);
const rolesCotizacionGestion = roleMiddleware(['admin', 'gerente', 'supervisor']);
const rolesCotizacionEliminar = roleMiddleware(['admin', 'gerente']);

// GET /api/cotizaciones - Obtener todas las cotizaciones
router.get('/', authMiddleware, rolesCotizacion, CotizacionController.getAll);

// GET /api/cotizaciones/resumen - Obtener resumen de cotizaciones (DEBE IR ANTES DE /:id)
router.get('/resumen', authMiddleware, rolesCotizacion, CotizacionController.getResumen);

// GET /api/cotizaciones/cliente/:idCliente - Obtener cotizaciones de un cliente
router.get('/cliente/:idCliente', authMiddleware, rolesCotizacion, CotizacionController.getByCliente);

// GET /api/cotizaciones/:id - Obtener cotización por ID
router.get('/:id', authMiddleware, rolesCotizacion, CotizacionController.getById);

// GET /api/cotizaciones/:id/detalles - Obtener detalles de una cotización
router.get('/:id/detalles', authMiddleware, rolesCotizacion, CotizacionController.getDetalles);

// POST /api/cotizaciones - Crear nueva cotización
router.post('/', authMiddleware, rolesCotizacion, CotizacionController.create);

// POST /api/cotizaciones/:id/convertir - Convertir cotización a venta
router.post('/:id/convertir', authMiddleware, rolesCotizacion, CotizacionController.convertirAVenta);

// PUT /api/cotizaciones/:id - Actualizar cotización
router.put('/:id', authMiddleware, rolesCotizacionGestion, CotizacionController.update);

// DELETE /api/cotizaciones/:id - Eliminar cotización
router.delete('/:id', authMiddleware, rolesCotizacionEliminar, CotizacionController.delete);

module.exports = router;
