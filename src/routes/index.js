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

module.exports = router;