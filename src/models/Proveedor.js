const connection = require('../config/db_postgres');

const Proveedor = {
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
    const sql = 'INSERT INTO proveedores (nombre, contacto, telefono, email, direccion) VALUES (?, ?, ?, ?, ?) RETURNING id_proveedor';
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

module.exports = Proveedor;