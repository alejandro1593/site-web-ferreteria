const express = require('express');
const router = express.Router();
const path = require('path');

const viewsPath = path.join(__dirname, '../views');

router.get('/', (req, res) => {
    res.redirect('/login');
});

router.get('/login', (req, res) => {
    res.sendFile(path.join(viewsPath, 'login.html'));
});

router.get('/login.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'login.html'));
});

router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(viewsPath, 'dashboard.html'));
});

router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(viewsPath, 'dashboard.html'));
});

router.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'dashboard.html'));
});

router.get('/categorias', (req, res) => {
    res.sendFile(path.join(viewsPath, 'categorias.html'));
});

router.get('/categorias.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'categorias.html'));
});

router.get('/proveedores', (req, res) => {
    res.sendFile(path.join(viewsPath, 'proveedores.html'));
});

router.get('/proveedores.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'proveedores.html'));
});

router.get('/clientes', (req, res) => {
    res.sendFile(path.join(viewsPath, 'clientes.html'));
});

router.get('/clientes.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'clientes.html'));
});

router.get('/usuarios', (req, res) => {
    res.sendFile(path.join(viewsPath, 'usuarios.html'));
});

router.get('/usuarios.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'usuarios.html'));
});

router.get('/productos', (req, res) => {
    res.sendFile(path.join(viewsPath, 'productos.html'));
});

router.get('/productos.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'productos.html'));
});

router.get('/ventas', (req, res) => {
    res.sendFile(path.join(viewsPath, 'ventas.html'));
});

router.get('/ventas.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'ventas.html'));
});

router.get('/compras', (req, res) => {
    res.sendFile(path.join(viewsPath, 'compras.html'));
});

router.get('/compras.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'compras.html'));
});

router.get('/historial-clientes', (req, res) => {
    res.sendFile(path.join(viewsPath, 'historial-clientes.html'));
});

router.get('/historial-clientes.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'historial-clientes.html'));
});

router.get('/historial-ventas', (req, res) => {
    res.sendFile(path.join(viewsPath, 'historial-ventas.html'));
});

router.get('/historial-ventas.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'historial-ventas.html'));
});

router.get('/devoluciones', (req, res) => {
    res.sendFile(path.join(viewsPath, 'devoluciones.html'));
});

router.get('/devoluciones.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'devoluciones.html'));
});

router.get('/caja', (req, res) => {
    res.sendFile(path.join(viewsPath, 'caja.html'));
});

router.get('/caja.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'caja.html'));
});

router.get('/historial-cajas', (req, res) => {
    res.sendFile(path.join(viewsPath, 'historial-cajas.html'));
});

router.get('/historial-cajas.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'historial-cajas.html'));
});

router.get('/cotizaciones', (req, res) => {
    res.sendFile(path.join(viewsPath, 'cotizaciones.html'));
});

router.get('/cotizaciones.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'cotizaciones.html'));
});

router.get('/reportes', (req, res) => {
    res.sendFile(path.join(viewsPath, 'reportes.html'));
});

router.get('/reportes.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'reportes.html'));
});

router.get('/api-docs', (req, res) => {
    res.sendFile(path.join(viewsPath, 'api.html'));
});

router.get('/api.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'api.html'));
});

router.get('/products', (req, res) => {
    res.sendFile(path.join(viewsPath, 'products.html'));
});

router.get('/products.html', (req, res) => {
    res.sendFile(path.join(viewsPath, 'products.html'));
});

router.get('/catalogo', (req, res) => {
    res.sendFile(path.join(viewsPath, 'products.html'));
});

module.exports = router;
