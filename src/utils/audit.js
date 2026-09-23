const connection = require('../config/db_postgres');

function valoresAuditoria(req, accion, entidad, entidadId, detalles) {
  const usuario = req.user || {};
  return [
    usuario.id_usuario || null,
    usuario.username || null,
    accion,
    entidad,
    entidadId,
    detalles ? String(detalles).substring(0, 500) : null,
    req.ip || null
  ];
}

function registrarAccionEnCliente(client, req, accion, entidad, entidadId = null, detalles = null) {
  return client.query(
    `INSERT INTO log_acciones (id_usuario, username, accion, entidad, entidad_id, detalles, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    valoresAuditoria(req, accion, entidad, entidadId, detalles)
  );
}

function registrarAccion(req, accion, entidad, entidadId = null, detalles = null) {
  registrarAccionEnCliente(connection, req, accion, entidad, entidadId, detalles).catch(error => {
    console.error('Error al registrar auditoría:', error.message);
  });
}

module.exports = { registrarAccion, registrarAccionEnCliente };
