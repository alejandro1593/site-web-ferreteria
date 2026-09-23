const express = require('express');
const router = express.Router();
const VentaDetalleController = require('../controllers/VentaDetalleController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const rolesVentas = roleMiddleware(['admin', 'gerente', 'supervisor', 'vendedor', 'cajero']);

// GET /api/venta-detalles/top?limit=10 - Obtener productos más vendidos
router.get('/top', authMiddleware, rolesVentas, VentaDetalleController.getTopProductos);

// GET /api/venta-detalles/categoria/top - Obtener productos más vendidos por categoría
router.get('/categoria/top', authMiddleware, rolesVentas, VentaDetalleController.getTopProductosPorCategoria);

// GET /api/venta-detalles/categoria/resumen - Obtener resumen de ventas por categoría
router.get('/categoria/resumen', authMiddleware, rolesVentas, VentaDetalleController.getVentasPorCategoria);

// GET /api/venta-detalles/producto/:idProducto - Obtener historial de ventas de un producto
router.get('/producto/:idProducto', authMiddleware, rolesVentas, VentaDetalleController.getByProducto);

// GET /api/venta-detalles/:idVenta - Obtener detalles de una venta
router.get('/:idVenta', authMiddleware, rolesVentas, VentaDetalleController.getByIdVenta);

// GET /api/venta-detalles - Listar todas las rutas de venta-detalles
router.get('/', (req, res) => {
    res.json({
        message: 'Rutas de VentaDetalle disponibles',
        endpoints: [
            'GET /api/venta-detalles/top?limit=10 - Productos más vendidos',
            'GET /api/venta-detalles/categoria/top - Productos por categoría',
            'GET /api/venta-detalles/categoria/resumen - Resumen por categoría',
            'GET /api/venta-detalles/producto/:idProducto - Historial de producto',
            'GET /api/venta-detalles/:idVenta - Detalles de venta'
        ]
    });
});

module.exports = router;