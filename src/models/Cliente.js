const connection = require('../config/db_postgres');

const Cliente = {
  // Obtener todos los clientes
  findAll: (callback) => {
    const sql = 'SELECT * FROM clientes ORDER BY nombre ASC';
    connection.query(sql, callback);
  },

  // Obtener cliente por ID
  findById: (id, callback) => {
    const sql = 'SELECT * FROM clientes WHERE id_cliente = ?';
    connection.query(sql, [id], callback);
  },

  // Crear nuevo cliente
  create: (data, callback) => {
    const sql = 'INSERT INTO clientes (nombre, apellido, dni, telefono, email, direccion) VALUES (?, ?, ?, ?, ?, ?) RETURNING id_cliente';
    connection.query(sql, [data.nombre, data.apellido, data.dni, data.telefono, data.email, data.direccion], callback);
  },

  // Actualizar cliente
  update: (id, data, callback) => {
    const sql = 'UPDATE clientes SET nombre = ?, apellido = ?, dni = ?, telefono = ?, email = ?, direccion = ? WHERE id_cliente = ?';
    connection.query(sql, [data.nombre, data.apellido, data.dni, data.telefono, data.email, data.direccion, id], callback);
  },

  // Eliminar cliente
  delete: (id, callback) => {
    const sql = 'DELETE FROM clientes WHERE id_cliente = ?';
    connection.query(sql, [id], callback);
  },

  // Buscar cliente por nombre o DNI
  search: (termino, callback) => {
    const sql = 'SELECT * FROM clientes WHERE nombre LIKE ? OR apellido LIKE ? OR dni LIKE ? ORDER BY nombre ASC';
    connection.query(sql, [`%${termino}%`, `%${termino}%`, `%${termino}%`], callback);
  },

  // Obtener cliente por DNI
  findByDni: (dni, callback) => {
    const sql = 'SELECT * FROM clientes WHERE dni = ?';
    connection.query(sql, [dni], callback);
  }
};

module.exports = Cliente;