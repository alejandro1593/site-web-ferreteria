const connection = require('../config/db_postgres');

const Compra = {
  findAll: (callback) => {
    const sql = `
      SELECT c.*, p.nombre AS proveedor_nombre, u.username AS usuario_username
      FROM compras c
      LEFT JOIN proveedores p ON c.id_proveedor = p.id_proveedor
      LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
      ORDER BY c.fecha DESC
    `;
    connection.query(sql, callback);
  },

  findById: (id, callback) => {
    const sql = `
      SELECT c.*, p.nombre AS proveedor_nombre
      FROM compras c
      LEFT JOIN proveedores p ON c.id_proveedor = p.id_proveedor
      WHERE c.id_compra = ?
    `;
    connection.query(sql, [id], callback);
  },

  getDetalles: (idCompra, callback) => {
    const sql = `
      SELECT d.*, pr.nombre AS producto_nombre, pr.codigo AS producto_codigo
      FROM compra_detalles d
      LEFT JOIN productos pr ON d.id_producto = pr.id_producto
      WHERE d.id_compra = ?
      ORDER BY d.id_detalle ASC
    `;
    connection.query(sql, [idCompra], callback);
  },

  create: (compra, detalles, callback) => {
    connection.withTransaction(async (client) => {
      const productIds = new Set();
      for (const detalle of detalles) {
        if (productIds.has(detalle.id_producto)) {
          const error = new Error('No se permiten productos duplicados en una compra');
          error.code = 'DUPLICATE_PRODUCT';
          throw error;
        }
        productIds.add(detalle.id_producto);
      }

      const compraResult = await client.query(
        `INSERT INTO compras (id_proveedor, total, observaciones, id_usuario)
         VALUES ($1, $2, $3, $4)
         RETURNING id_compra`,
        [compra.id_proveedor, compra.total, compra.observaciones || null, compra.id_usuario || null]
      );
      const idCompra = compraResult.rows[0].id_compra;

      for (const detalle of detalles) {
        const productResult = await client.query(
          'SELECT precio_compra FROM productos WHERE id_producto = $1 FOR UPDATE',
          [detalle.id_producto]
        );
        if (productResult.rowCount === 0) {
          const error = new Error(`Producto ${detalle.id_producto} no encontrado`);
          error.code = 'PRODUCT_NOT_FOUND';
          throw error;
        }

        await client.query(
          `INSERT INTO compra_detalles (id_compra, id_producto, cantidad, precio_costo, subtotal, precio_compra_anterior)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            idCompra,
            detalle.id_producto,
            detalle.cantidad,
            detalle.precio_costo,
            detalle.cantidad * detalle.precio_costo,
            productResult.rows[0].precio_compra
          ]
        );

        await client.query(
          `UPDATE productos
           SET stock_actual = stock_actual + $1,
               precio_compra = $2
           WHERE id_producto = $3`,
          [detalle.cantidad, detalle.precio_costo, detalle.id_producto]
        );
      }

      return idCompra;
    }).then((id) => callback(null, id)).catch(callback);
  },

  anular: (id, callback) => {
    connection.withTransaction(async (client) => {
      const compraResult = await client.query(
        'SELECT * FROM compras WHERE id_compra = $1 FOR UPDATE',
        [id]
      );
      if (compraResult.rowCount === 0 || compraResult.rows[0].estado !== 'completada') {
        const error = new Error('Compra no encontrada o ya anulada');
        error.code = 'PURCHASE_NOT_ACTIVE';
        throw error;
      }

      const detallesResult = await client.query(
        'SELECT id_producto, cantidad, precio_compra_anterior FROM compra_detalles WHERE id_compra = $1 ORDER BY id_detalle DESC',
        [id]
      );

      for (const detalle of detallesResult.rows) {
        const productResult = await client.query(
          'SELECT stock_actual FROM productos WHERE id_producto = $1 FOR UPDATE',
          [detalle.id_producto]
        );
        if (productResult.rowCount === 0 || productResult.rows[0].stock_actual < detalle.cantidad) {
          const error = new Error('No se puede anular: el stock ya fue vendido o ajustado');
          error.code = 'STOCK_INSUFFICIENT';
          throw error;
        }
        const laterPurchase = await client.query(
          `SELECT 1
           FROM compra_detalles d2
           JOIN compras c2 ON c2.id_compra = d2.id_compra
           WHERE d2.id_producto = $1
             AND c2.id_compra > $2
             AND c2.estado = 'completada'
           LIMIT 1`,
          [detalle.id_producto, id]
        );
        if (laterPurchase.rowCount > 0) {
          const error = new Error('No se puede anular: existe una compra posterior del producto');
          error.code = 'LATER_PURCHASE_EXISTS';
          throw error;
        }

        await client.query(
          'UPDATE productos SET stock_actual = stock_actual - $1 WHERE id_producto = $2',
          [detalle.cantidad, detalle.id_producto]
        );
        if (detalle.precio_compra_anterior !== null) {
          await client.query(
            'UPDATE productos SET precio_compra = $1 WHERE id_producto = $2',
            [detalle.precio_compra_anterior, detalle.id_producto]
          );
        }
      }

      await client.query(
        "UPDATE compras SET estado = 'anulada' WHERE id_compra = $1",
        [id]
      );
    }).then(() => callback(null)).catch(callback);
  }
};

module.exports = Compra;
