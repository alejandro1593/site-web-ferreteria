const connection = require('../config/db_postgres');

const Caja = {
  findAll: (callback) => {
    const sql = `
      SELECT c.*, u.nombre as usuario_nombre
      FROM caja c
      JOIN usuarios u ON c.id_usuario = u.id_usuario
      ORDER BY c.fecha_apertura DESC NULLS LAST
    `;
    connection.query(sql, callback);
  },

  findById: (id, callback) => {
    const sql = `
      SELECT c.*, u.nombre as usuario_nombre
      FROM caja c
      JOIN usuarios u ON c.id_usuario = u.id_usuario
      WHERE c.id_caja = ?
    `;
    connection.query(sql, [id], callback);
  },

  findAbierta: (idUsuario, callback) => {
    const sql = `
      SELECT * FROM caja
      WHERE id_usuario = ? AND estado = 'abierta'
      ORDER BY fecha_apertura DESC
      LIMIT 1
    `;
    connection.query(sql, [idUsuario], callback);
  },

  create: (data, callback) => {
    const sql = `
      INSERT INTO caja (id_usuario, monto_apertura, estado, observaciones)
      VALUES (?, ?, 'abierta', ?) RETURNING id_caja
    `;
    connection.query(sql, [data.id_usuario, data.monto_apertura || 0, data.observaciones || ''], callback);
  },

  updateCierre: (id, data, callback) => {
    const sql = `
      UPDATE caja
      SET fecha_cierre = CURRENT_TIMESTAMP,
          monto_cierre = ?,
          monto_esperado = ?,
          diferencia = CAST(? AS numeric) - CAST(? AS numeric),
          estado = 'cerrada',
          observaciones = ?
      WHERE id_caja = ? AND estado = 'abierta'
      RETURNING id_caja
    `;
    connection.query(sql, [data.monto_cierre, data.monto_esperado, data.monto_cierre, data.monto_esperado, data.observaciones || '', id], callback);
  },

  getVentasCaja: (idCaja, callback) => {
    const sql = `
      SELECT v.*, c.nombre as cliente_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
      WHERE v.id_caja = ?
      ORDER BY v.fecha DESC
    `;
    connection.query(sql, [idCaja], callback);
  },

  getDevolucionesCaja: (idCaja, callback) => {
    const sql = `
      SELECT d.*, p.nombre as producto_nombre
      FROM devoluciones d
      JOIN productos p ON d.id_producto = p.id_producto
      JOIN ventas v ON d.id_venta = v.id_venta
      WHERE v.id_caja = ?
      ORDER BY d.fecha DESC
    `;
    connection.query(sql, [idCaja], callback);
  },

  getResumenCaja: (idCaja, callback) => {
    const sql = `
      SELECT
        COALESCE((
          SELECT SUM(v.total)
          FROM ventas v
          WHERE v.id_caja = ?
            AND v.estado = 'completada'
            AND v.metodo_pago = 'efectivo'
        ), 0) as total_ventas,
        COALESCE((
          SELECT SUM(p.monto)
          FROM pagos_venta p
          WHERE p.id_caja = ?
            AND p.tipo = 'abono'
            AND p.metodo = 'efectivo'
        ), 0) as total_abonos,
        COALESCE((
          SELECT SUM(d.monto_reembolso)
          FROM devoluciones d
          JOIN ventas v ON d.id_venta = v.id_venta
          WHERE v.id_caja = ?
            AND d.estado = 'completada'
            AND d.metodo_reembolso = 'efectivo'
        ), 0) as total_devoluciones,
        COALESCE((
          SELECT COUNT(*)
          FROM ventas v
          WHERE v.id_caja = ?
            AND v.estado = 'completada'
        ), 0)::integer as total_ventas_count
    `;
    connection.query(sql, [idCaja, idCaja, idCaja, idCaja], callback);
  }
};

module.exports = Caja;
