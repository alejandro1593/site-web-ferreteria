const connection = require('../config/db_postgres');

const resumenSql = `
  SELECT
    COALESCE((
      SELECT SUM(v.total)
      FROM ventas v
      WHERE v.id_caja = $1
        AND v.estado = 'completada'
        AND v.metodo_pago = 'efectivo'
    ), 0) AS total_ventas,
    COALESCE((
      SELECT SUM(p.monto)
      FROM pagos_venta p
      WHERE p.id_caja = $2
        AND p.tipo = 'abono'
        AND p.metodo = 'efectivo'
    ), 0) AS total_abonos,
    COALESCE((
      SELECT SUM(p.monto)
      FROM pagos_venta p
      WHERE p.id_caja = $3
        AND p.tipo = 'reembolso'
        AND p.metodo = 'efectivo'
    ), 0) + COALESCE((
      SELECT SUM(d.monto_reembolso)
      FROM devoluciones d
      JOIN ventas v ON v.id_venta = d.id_venta
      WHERE v.id_caja = $4
        AND d.estado = 'completada'
        AND d.metodo_reembolso = 'efectivo'
         AND NOT EXISTS (
           SELECT 1
           FROM pagos_venta p
           WHERE p.tipo = 'reembolso'
             AND (
               p.id_devolucion = d.id_devolucion
               OR (p.id_devolucion IS NULL AND p.id_venta = d.id_venta)
             )
         )

    ), 0) AS total_devoluciones,
    COALESCE((
      SELECT COUNT(*)
      FROM ventas v
      WHERE v.id_caja = $5
        AND v.estado = 'completada'
    ), 0)::integer AS total_ventas_count
`;

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

  findAbiertaConCliente: async (client, idUsuario) => {
    const result = await client.query(
      `SELECT * FROM caja
       WHERE id_usuario = $1 AND estado = 'abierta'
       ORDER BY fecha_apertura DESC
       LIMIT 1
       FOR UPDATE`,
      [idUsuario]
    );
    return result.rows[0] || null;
  },

  create: (data, callback) => {
    const sql = `
      INSERT INTO caja (id_usuario, fecha_apertura, monto_apertura, estado, observaciones)
      VALUES (?, CURRENT_TIMESTAMP, ?, 'abierta', ?) RETURNING id_caja
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
      SELECT d.*, pr.nombre as producto_nombre
      FROM devoluciones d
      JOIN productos pr ON d.id_producto = pr.id_producto
      JOIN ventas v ON d.id_venta = v.id_venta
      LEFT JOIN LATERAL (
        SELECT p.id_caja
        FROM pagos_venta p
        WHERE p.tipo = 'reembolso'
          AND (
            p.id_devolucion = d.id_devolucion
            OR (p.id_devolucion IS NULL AND p.id_venta = d.id_venta)
          )
        ORDER BY (p.id_devolucion IS NOT NULL) DESC, p.id_pago
        LIMIT 1
      ) pg ON TRUE
      WHERE pg.id_caja = ?
         OR (pg.id_caja IS NULL AND v.id_caja = ?)
      ORDER BY d.fecha DESC
    `;
    connection.query(sql, [idCaja, idCaja], callback);
  },

  getResumenCajaConCliente: async (client, idCaja) => {
    const result = await client.query(resumenSql, [idCaja, idCaja, idCaja, idCaja, idCaja]);
    return result.rows[0] || {};
  },

  getResumenCaja: (idCaja, callback) => {
    connection.query(resumenSql, [idCaja, idCaja, idCaja, idCaja, idCaja], callback);
  }
};

module.exports = Caja;
