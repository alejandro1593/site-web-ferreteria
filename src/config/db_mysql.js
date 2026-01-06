const mysql = require('mysql2');

// Crear una conexión a la base de datos
const connection = mysql.createConnection({
 host: process.env.DB_HOST || 'localhost',
 user: process.env.DB_USER || 'root',
 password: process.env.DB_PASSWORD || '',
 database: process.env.DB_NAME || 'db_ferreteria'
});

// Conectar a la base de datos
connection.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.stack);
    return;
  }
  console.log('Conectado a la base de datos con ID ' + connection.threadId);
});

module.exports = connection;
