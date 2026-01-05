const connection = require('../config/db_mysql');

const Proveedor = {
  // Crear tabla si no existe
  crearTabla: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS proveedores (
        id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        contacto VARCHAR(100),
        telefono VARCHAR(20),
        email VARCHAR(100),
        direccion VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error al crear tabla proveedores:', err);
      } else {
        console.log('Tabla proveedores verificada/creada');
      }
    });
  },

  // Obtener todos los proveedores
  findAll: (callback) => {
    const sql = 'SELECT * FROM proveedores ORDER BY nombre ASC';
    connection.query(sql, callback);
  },

  // Obtener proveedor por ID
  findById: (id, callback) => {
    const sql = 'SELECT * FROM proveedores WHERE id_proveedor = ?';
    connection.query(sql, [id], callback);
  },

  // Crear nuevo proveedor
  create: (data, callback) => {
    const sql = 'INSERT INTO proveedores (nombre, contacto, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)';
    connection.query(sql, [data.nombre, data.contacto, data.telefono, data.email, data.direccion], callback);
  },

  // Actualizar proveedor
  update: (id, data, callback) => {
    const sql = 'UPDATE proveedores SET nombre = ?, contacto = ?, telefono = ?, email = ?, direccion = ? WHERE id_proveedor = ?';
    connection.query(sql, [data.nombre, data.contacto, data.telefono, data.email, data.direccion, id], callback);
  },

  // Eliminar proveedor
  delete: (id, callback) => {
    const sql = 'DELETE FROM proveedores WHERE id_proveedor = ?';
    connection.query(sql, [id], callback);
  },

  // Buscar proveedor por nombre
  searchByName: (nombre, callback) => {
    const sql = 'SELECT * FROM proveedores WHERE nombre LIKE ? ORDER BY nombre ASC';
    connection.query(sql, [`%${nombre}%`], callback);
  }
};

// Inicializar tabla
Proveedor.crearTabla();

module.exports = Proveedor;