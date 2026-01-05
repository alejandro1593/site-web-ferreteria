const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importar modelos (esto creará las tablas automáticamente)
require('./models/Categoria');
require('./models/Proveedor');
require('./models/Cliente');
require('./models/Usuario');
require('./models/Producto');
require('./models/Venta');
require('./models/VentaDetalle');

const app = express();

// Middlewares básicos
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.1.5:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use('/static', express.static('src/static'));

// Servir vistas HTML
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/views/dashboard.html');
});
app.get('/dashboard.html', (req, res) => {
    res.sendFile(__dirname + '/views/dashboard.html');
});

app.get('/categorias', (req, res) => {
    res.sendFile(__dirname + '/views/categorias.html');
});
app.get('/categorias.html', (req, res) => {
    res.sendFile(__dirname + '/views/categorias.html');
});

app.get('/proveedores', (req, res) => {
    res.sendFile(__dirname + '/views/proveedores.html');
});
app.get('/proveedores.html', (req, res) => {
    res.sendFile(__dirname + '/views/proveedores.html');
});

app.get('/clientes', (req, res) => {
    res.sendFile(__dirname + '/views/clientes.html');
});
app.get('/clientes.html', (req, res) => {
    res.sendFile(__dirname + '/views/clientes.html');
});

app.get('/usuarios', (req, res) => {
    res.sendFile(__dirname + '/views/usuarios.html');
});
app.get('/usuarios.html', (req, res) => {
    res.sendFile(__dirname + '/views/usuarios.html');
});

app.get('/productos', (req, res) => {
    res.sendFile(__dirname + '/views/productos.html');
});
app.get('/productos.html', (req, res) => {
    res.sendFile(__dirname + '/views/productos.html');
});

app.get('/ventas', (req, res) => {
    res.sendFile(__dirname + '/views/ventas.html');
});
app.get('/ventas.html', (req, res) => {
    res.sendFile(__dirname + '/views/ventas.html');
});

app.get('/reportes', (req, res) => {
    res.sendFile(__dirname + '/views/reportes.html');
});
app.get('/reportes.html', (req, res) => {
    res.sendFile(__dirname + '/views/reportes.html');
});

app.get('/api-docs', (req, res) => {
    res.sendFile(__dirname + '/views/api.html');
});
app.get('/api.html', (req, res) => {
    res.sendFile(__dirname + '/views/api.html');
});

app.get('/catalogo', (req, res) => {
    res.sendFile(__dirname + '/views/products.html');
});
app.get('/products.html', (req, res) => {
    res.sendFile(__dirname + '/views/products.html');
});

// Importar rutas
const apiRoutes = require('./routes');

// Montar rutas API
app.use('/api', apiRoutes);

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});