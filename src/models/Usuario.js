const connection = require('../config/db_postgres');

const Usuario = {
  // Obtener todos los usuarios (sin password)
  findAll: (callback) => {
    const sql = 'SELECT id_usuario, username, nombre, email, rol, activo, created_at, updated_at FROM usuarios ORDER BY nombre ASC';
    connection.query(sql, callback);
  },

  findById: (id, callback) => {
    const sql = 'SELECT id_usuario, username, nombre, email, rol, activo, token_version, created_at, updated_at FROM usuarios WHERE id_usuario = ?';
    connection.query(sql, [id], callback);
  },

  findByIdWithPassword: (id, callback) => {
    const sql = 'SELECT * FROM usuarios WHERE id_usuario = ?';
    connection.query(sql, [id], callback);
  },

  // Obtener usuario por username (con password para autenticación)
  findByUsername: (username, callback) => {
    const sql = 'SELECT * FROM usuarios WHERE username = ?';
    connection.query(sql, [username], callback);
  },

  // Crear nuevo usuario
  create: (data, callback) => {
    const sql = 'INSERT INTO usuarios (username, password, nombre, email, rol, activo) VALUES (?, ?, ?, ?, ?, ?) RETURNING id_usuario';
    connection.query(sql, [data.username, data.password, data.nombre, data.email, data.rol || 'vendedor', data.activo !== false && data.activo !== 0], callback);
  },

  // Actualizar usuario
  update: (id, data, callback) => {
    const updates = [];
    const values = [];

    if (data.username !== undefined) {
      updates.push('username = ?');
      values.push(data.username);
    }
    if (data.nombre !== undefined) {
      updates.push('nombre = ?');
      values.push(data.nombre);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.rol !== undefined) {
      updates.push('rol = ?');
      values.push(data.rol);
    }
    if (data.activo !== undefined) {
      updates.push('activo = ?');
      values.push(data.activo);
    }

    if (updates.length === 0) {
      return callback(new Error('No hay campos para actualizar'));
    }

    updates.push('token_version = token_version + 1');
    values.push(id);
    const sql = `UPDATE usuarios SET ${updates.join(', ')} WHERE id_usuario = ?`;
    connection.query(sql, values, callback);
  },

  // Actualizar contraseña
  updatePassword: (id, password, callback) => {
    const sql = 'UPDATE usuarios SET password = ?, token_version = token_version + 1 WHERE id_usuario = ?';
    connection.query(sql, [password, id], callback);
  },

  // Eliminar usuario
  delete: (id, callback) => {
    const sql = 'DELETE FROM usuarios WHERE id_usuario = ?';
    connection.query(sql, [id], callback);
  },

  // Desactivar usuario (soft delete)
  desactivar: (id, callback) => {
    const sql = 'UPDATE usuarios SET activo = FALSE, token_version = token_version + 1 WHERE id_usuario = ?';
    connection.query(sql, [id], callback);
  },

  // Activar usuario
  activar: (id, callback) => {
    const sql = 'UPDATE usuarios SET activo = TRUE, token_version = token_version + 1 WHERE id_usuario = ?';
    connection.query(sql, [id], callback);
  }
};

module.exports = Usuario;