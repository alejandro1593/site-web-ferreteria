const express = require('express');
const router = express.Router();
const VentaController = require('../controllers/VentaController');

// GET /api/ventas - Obtener todas las ventas
router.get('/', VentaController.getAll);

// GET /api/ventas/fecha?fechaInicio=xxx&fechaFin=xxx - Obtener ventas por fecha
router.get('/fecha', VentaController.getByFecha);

// GET /api/ventas/today - Obtener ventas del día
router.get('/today', VentaController.getTodaySales);

// GET /api/ventas/summary - Obtener resumen de ventas
router.get('/summary', VentaController.getSummary);

// GET /api/ventas/cliente/:idCliente - Obtener ventas por cliente
router.get('/cliente/:idCliente', VentaController.getByCliente);

// GET /api/ventas/:id - Obtener una venta con detalles
router.get('/:id', VentaController.getById);

// POST /api/ventas - Crear nueva venta
router.post('/', VentaController.create);

// DELETE /api/ventas/:id - Eliminar venta
router.delete('/:id', VentaController.delete);

module.exports = router;