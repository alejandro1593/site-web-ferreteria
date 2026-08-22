const connection = require('../config/db_mysql');

/**
 * Registra una acción en el log de auditoría.
 * No bloquea la petición: si falla, solo lo reporta por consola.
 *
 * @param {Object} req  - Request de Express (usa req.user e ip)
 * @param {string} accion - 'crear' | 'actualizar' | 'eliminar' | 'abonar' ...
 * @param {string} entidad - 'usuario' | 'producto' | 'venta' | 'compra' ...
 * @param {number|null} entidadId
 * @param {string|null} detalles
 */
function registrarAccion(req, accion, entidad, entidadId = null, detalles = null) {
  const usuario = req.user || {};
  const sql = `
    INSERT INTO log_acciones (id_usuario, username, accion, entidad, entidad_id, detalles, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    usuario.id_usuario || null,
    usuario.username || null,
    accion,
    entidad,
    entidadId,
    detalles ? String(detalles).substring(0, 500) : null,
    req.ip || null
  ];

  connection.query(sql, values, (err) => {
    if (err) {
      console.error('Error al registrar auditoría:', err.message);
    }
  });
}

module.exports = { registrarAccion };
