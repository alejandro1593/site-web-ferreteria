const express = require('express');
const router = express.Router();
const VentaController = require('../controllers/VentaController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const rolesVentas = roleMiddleware(['admin', 'gerente', 'supervisor', 'vendedor', 'cajero']);
const rolesReporte = roleMiddleware(['admin', 'gerente', 'supervisor']);
const adminOGerente = roleMiddleware(['admin', 'gerente']);

// GET /api/ventas - Obtener todas las ventas
router.get('/', authMiddleware, rolesVentas, VentaController.getAll);

// GET /api/ventas/fecha?fechaInicio=xxx&fechaFin=xxx - Obtener ventas por fecha
router.get('/fecha', authMiddleware, rolesVentas, VentaController.getByFecha);

// GET /api/ventas/today - Obtener ventas del día
router.get('/today', authMiddleware, rolesVentas, VentaController.getTodaySales);

// GET /api/ventas/summary - Obtener resumen de ventas
router.get('/summary', authMiddleware, rolesVentas, VentaController.getSummary);

// GET /api/ventas/crediticias - Ventas con saldo pendiente (fiados)
router.get('/crediticias', authMiddleware, rolesVentas, VentaController.getCrediticias);

// GET /api/ventas/ganancias?fechaInicio=xxx&fechaFin=xxx - Ganancias por período
router.get('/ganancias', authMiddleware, adminOGerente, VentaController.getGanancias);

// GET /api/ventas/cliente/:idCliente - Obtener ventas por cliente
router.get('/cliente/:idCliente', authMiddleware, rolesVentas, VentaController.getByCliente);

// GET /api/ventas/cliente/:idCliente/historial - Obtener historial de compras del cliente
router.get('/cliente/:idCliente/historial', authMiddleware, rolesVentas, VentaController.getHistorialCliente);

// GET /api/ventas/:id/detalles - Obtener detalles de una venta
router.get('/:id/detalles', authMiddleware, rolesVentas, VentaController.getDetallesVenta);

// GET /api/ventas/:id - Obtener una venta con detalles
router.get('/:id', authMiddleware, rolesVentas, VentaController.getById);

// POST /api/ventas - Crear nueva venta
router.post('/', authMiddleware, rolesVentas, VentaController.create);

// DELETE /api/ventas/:id - Eliminar venta (solo admin/gerente)
router.delete('/:id', authMiddleware, adminOGerente, VentaController.delete);

// POST /api/ventas/:id/abonar - Abonar a venta a crédito
router.post('/:id/abonar', authMiddleware, rolesVentas, VentaController.abonar);

module.exports = router;