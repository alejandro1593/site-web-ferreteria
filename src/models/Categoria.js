const connection = require('../config/db_mysql');

const Categoria = {
  // Crear tabla si no existe
  crearTabla: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS categorias (
        id_categoria INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error al crear tabla categorias:', err);
      } else {
        console.log('Tabla categorias verificada/creada');
      }
    });
  },

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
    const sql = 'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)';
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

// Inicializar tabla
Categoria.crearTabla();

module.exports = Categoria;