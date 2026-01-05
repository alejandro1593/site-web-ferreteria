const express = require('express');
require('dotenv').config();

const app = express();

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use(express.static('src/public'));

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Sistema de Ferretería en funcionamiento');
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
