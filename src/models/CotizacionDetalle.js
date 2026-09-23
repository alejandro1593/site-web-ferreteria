const connection = require('../config/db_postgres');

const CotizacionDetalle = {
  findByIdCotizacion: (idCotizacion, callback) => {
    const sql = `
      SELECT cd.*, 
        p.nombre as producto_nombre,
        p.codigo as producto_codigo,
        p.descripcion as producto_descripcion,
        p.stock_actual,
        c.nombre as categoria_nombre
      FROM cotizacion_detalles cd
      JOIN productos p ON cd.id_producto = p.id_producto
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE cd.id_cotizacion = ?
      ORDER BY cd.id_detalle ASC
    `;
    connection.query(sql, [idCotizacion], callback);
  },

  create: (data, callback) => {
    const sql = `
      INSERT INTO cotizacion_detalles (
        id_cotizacion, 
        id_producto, 
        cantidad, 
        precio_unitario, 
        descuento_producto, 
        subtotal
      ) VALUES (?, ?, ?, ?, ?, ?) RETURNING id_detalle
    `;
    connection.query(sql, [
      data.id_cotizacion,
      data.id_producto,
      data.cantidad,
      data.precio_unitario,
      data.descuento_producto || 0,
      data.subtotal
    ], callback);
  },

  delete: (id, callback) => {
    const sql = 'DELETE FROM cotizacion_detalles WHERE id_detalle = ?';
    connection.query(sql, [id], callback);
  },

  deleteByCotizacion: (idCotizacion, callback) => {
    const sql = 'DELETE FROM cotizacion_detalles WHERE id_cotizacion = ?';
    connection.query(sql, [idCotizacion], callback);
  }
};

module.exports = CotizacionDetalle;
