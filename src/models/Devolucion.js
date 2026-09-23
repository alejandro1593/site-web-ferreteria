const connection = require('../config/db_postgres');

const Devolucion = {
  findAll: (callback) => {
    const sql = `
      SELECT d.*, 
        v.id_venta,
        p.nombre as producto_nombre,
        p.codigo as producto_codigo,
        v.id_cliente,
        c.nombre as cliente_nombre,
        v.total as venta_total
      FROM devoluciones d
      JOIN ventas v ON d.id_venta = v.id_venta
      JOIN productos p ON d.id_producto = p.id_producto
      LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
      ORDER BY d.fecha DESC
    `;
    connection.query(sql, callback);
  },

  findById: (id, callback) => {
    const sql = `
      SELECT d.*, 
        p.nombre as producto_nombre,
        p.codigo as producto_codigo,
        v.metodo_pago as venta_metodo_pago,
        u.nombre as usuario_nombre
      FROM devoluciones d
      JOIN productos p ON d.id_producto = p.id_producto
      JOIN ventas v ON d.id_venta = v.id_venta
      LEFT JOIN usuarios u ON d.id_usuario = u.id_usuario
      WHERE d.id_devolucion = ?
    `;
    connection.query(sql, [id], callback);
  },

  findByVenta: (idVenta, callback) => {
    const sql = `
      SELECT d.*, 
        p.nombre as producto_nombre,
        p.codigo as producto_codigo
      FROM devoluciones d
      JOIN productos p ON d.id_producto = p.id_producto
      WHERE d.id_venta = ?
      ORDER BY d.fecha DESC
    `;
    connection.query(sql, [idVenta], callback);
  },

  create: (data, callback) => {
    const sql = `
      INSERT INTO devoluciones (id_venta, id_producto, cantidad, motivo, monto_reembolso, metodo_reembolso, estado, id_usuario)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id_devolucion
    `;
    connection.query(sql, [
      data.id_venta,
      data.id_producto,
      data.cantidad,
      data.motivo || '',
      data.monto_reembolso,
      data.metodo_reembolso,
      data.estado || 'completada',
      data.id_usuario
    ], callback);
  },

  getDevolucionesPorPeriodo: (fechaInicio, fechaFin, callback) => {
    const sql = `
      SELECT d.*, 
        p.nombre as producto_nombre,
        p.codigo as producto_codigo,
        u.nombre as usuario_nombre
      FROM devoluciones d
      JOIN productos p ON d.id_producto = p.id_producto
      LEFT JOIN usuarios u ON d.id_usuario = u.id_usuario
      WHERE d.fecha >= CAST(? AS date)
        AND d.fecha < CAST(? AS date) + INTERVAL '1 day'
      ORDER BY d.fecha DESC
    `;
    connection.query(sql, [fechaInicio, fechaFin], callback);
  },

  getResumenDevoluciones: (fechaInicio, fechaFin, callback) => {
    const sql = `
      SELECT 
        COUNT(*) as total_devoluciones,
        SUM(monto_reembolso) as total_reembolsado,
        SUM(cantidad) as total_productos_devueltos
      FROM devoluciones
      WHERE fecha >= CAST(? AS date)
        AND fecha < CAST(? AS date) + INTERVAL '1 day'
        AND estado = 'completada'
    `;
    connection.query(sql, [fechaInicio, fechaFin], callback);
  },

  getResumenDevolucionesSinFiltros: (callback) => {
    const sql = `
      SELECT 
        COUNT(*) as total_devoluciones,
        SUM(monto_reembolso) as total_reembolsado,
        SUM(cantidad) as total_productos_devueltos
      FROM devoluciones
      WHERE estado = 'completada'
    `;
    connection.query(sql, callback);
  }
};

module.exports = Devolucion;
