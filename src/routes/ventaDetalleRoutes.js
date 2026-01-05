const express = require('express');
const router = express.Router();
const VentaDetalleController = require('../controllers/VentaDetalleController');

// GET /api/venta-detalles/top?limit=10 - Obtener productos más vendidos
router.get('/top', VentaDetalleController.getTopProductos);

// GET /api/venta-detalles/producto/:idProducto - Obtener historial de ventas de un producto
router.get('/producto/:idProducto', VentaDetalleController.getByProducto);

// GET /api/venta-detalles/:idVenta - Obtener detalles de una venta
router.get('/:idVenta', VentaDetalleController.getByIdVenta);

module.exports = router;