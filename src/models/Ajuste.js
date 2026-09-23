const connection = require('../config/db_postgres');

const Ajuste = {
  findAll: (callback) => {
    const sql = `
      SELECT a.*, pr.nombre AS producto_nombre, pr.codigo AS producto_codigo, u.username AS usuario_username
      FROM ajustes_inventario a
      LEFT JOIN productos pr ON a.id_producto = pr.id_producto
      LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
      ORDER BY a.fecha DESC
      LIMIT 200
    `;
    connection.query(sql, callback);
  },

  crear: (idProducto, stockNuevo, motivo, idUsuario, callback) => {
    connection.withTransaction(async (client) => {
      const result = await client.query(
        'SELECT stock_actual FROM productos WHERE id_producto = $1 FOR UPDATE',
        [idProducto]
      );
      if (result.rowCount === 0) {
        const error = new Error('Producto no encontrado');
        error.code = 'PRODUCT_NOT_FOUND';
        throw error;
      }

      const stockAnterior = result.rows[0].stock_actual;
      const updateResult = await client.query(
        'UPDATE productos SET stock_actual = $1 WHERE id_producto = $2',
        [stockNuevo, idProducto]
      );
      if (updateResult.rowCount !== 1) throw new Error('No se pudo actualizar el producto');

      const auditResult = await client.query(
        `INSERT INTO ajustes_inventario (id_producto, stock_anterior, stock_nuevo, motivo, id_usuario)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id_ajuste`,
        [idProducto, stockAnterior, stockNuevo, motivo, idUsuario || null]
      );
      return auditResult.rows[0].id_ajuste;
    }).then((id) => callback(null, id)).catch(callback);
  }
};

module.exports = Ajuste;
