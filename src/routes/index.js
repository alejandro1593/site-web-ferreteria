const express = require('express');
const router = express.Router();

// Importar todas las rutas
const categoriaRoutes = require('./categoriaRoutes');
const proveedorRoutes = require('./proveedorRoutes');
const clienteRoutes = require('./clienteRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const productoRoutes = require('./productoRoutes');
const ventaRoutes = require('./ventaRoutes');
const ventaDetalleRoutes = require('./ventaDetalleRoutes');

// Montar todas las rutas
router.use('/categorias', categoriaRoutes);
router.use('/proveedores', proveedorRoutes);
router.use('/clientes', clienteRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/productos', productoRoutes);
router.use('/ventas', ventaRoutes);
router.use('/venta-detalles', ventaDetalleRoutes);

// Ruta raíz para API
router.get('/', (req, res) => {
    res.json({
        message: 'Sistema de Ferretería API',
        version: '1.0.0',
        endpoints: [
            'GET /api/categorias',
            'GET /api/proveedores',
            'GET /api/clientes',
            'GET /api/usuarios',
            'GET /api/productos',
            'GET /api/ventas',
            'GET /api/venta-detalles'
        ]
    });
});

module.exports = router;