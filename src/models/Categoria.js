const connection = require('../config/db_postgres');

const Categoria = {
  // Obtener todas las categorías
  findAll: (callback) => {
    const sql = 'SELECT * FROM categorias ORDER BY nombre ASC';
    connection.query(sql, callback);
  },

  // Obtener una categoría por ID
  findById: (id, callback) => {
    const sql = 'SELECT * FROM categorias WHERE id_categoria = ?';
    connection.query(sql, [id], callback);
  },

  // Crear nueva categoría
  create: (data, callback) => {
    const sql = 'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?) RETURNING id_categoria';
    connection.query(sql, [data.nombre, data.descripcion], callback);
  },

  // Actualizar categoría
  update: (id, data, callback) => {
    const sql = 'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id_categoria = ?';
    connection.query(sql, [data.nombre, data.descripcion, id], callback);
  },

  // Eliminar categoría
  delete: (id, callback) => {
    const sql = 'DELETE FROM categorias WHERE id_categoria = ?';
    connection.query(sql, [id], callback);
  }
};

module.exports = Categoria;