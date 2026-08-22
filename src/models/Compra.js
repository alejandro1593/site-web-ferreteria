const connection = require('../config/db_mysql');

const Compra = {
  // Obtener todas las compras con nombre del proveedor
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

  // Detalles de una compra con info del producto
  getDetalles: (idCompra, callback) => {
    const sql = `
      SELECT d.*, pr.nombre AS producto_nombre, pr.codigo AS producto_codigo
        FROM compra_detalles d
        LEFT JOIN productos pr ON d.id_producto = pr.id_producto
       WHERE d.id_compra = ?
    `;
    connection.query(sql, [idCompra], callback);
  },

  // Crear compra + detalles y aumentar stock (transacción)
  create: (compra, detalles, callback) => {
    connection.beginTransaction((err) => {
      if (err) return callback(err);

      connection.query(
        'INSERT INTO compras (id_proveedor, total, observaciones, id_usuario) VALUES (?, ?, ?, ?)',
        [compra.id_proveedor, compra.total, compra.observaciones || null, compra.id_usuario || null],
        (err, result) => {
          if (err) return connection.rollback(() => callback(err));

          const idCompra = result.insertId;

          const values = detalles.map(d => [
            idCompra,
            d.id_producto,
            d.cantidad,
            d.precio_costo,
            d.cantidad * d.precio_costo
          ]);

          connection.query(
            'INSERT INTO compra_detalles (id_compra, id_producto, cantidad, precio_costo, subtotal) VALUES ?',
            [values],
            (err) => {
              if (err) return connection.rollback(() => callback(err));

              // Aumentar el stock de cada producto y actualizar su costo de compra
              let pendientes = detalles.length;
              let fallo = null;

              detalles.forEach((d) => {
                connection.query(
                  `UPDATE productos
                      SET stock_actual = stock_actual + ?,
                          precio_compra = ?
                    WHERE id_producto = ?`,
                  [d.cantidad, d.precio_costo, d.id_producto],
                  (err) => {
                    if (err && !fallo) fallo = err;
                    if (--pendientes === 0) {
                      if (fallo) return connection.rollback(() => callback(fallo));
                      connection.commit((err) => {
                        if (err) return connection.rollback(() => callback(err));
                        callback(null, idCompra);
                      });
                    }
                  }
                );
              });
            }
          );
        }
      );
    });
  },

  // Anular compra: marca como anulada y descuenta el stock devuelto
  anular: (id, callback) => {
    connection.beginTransaction((err) => {
      if (err) return callback(err);

      connection.query('SELECT * FROM compras WHERE id_compra = ?', [id], (err, results) => {
        if (err) return connection.rollback(() => callback(err));
        if (results.length === 0 || results[0].estado !== 'completada') {
          return connection.rollback(() => callback({ message: 'Compra no encontrada o ya anulada' }));
        }

        connection.query('UPDATE compras SET estado = ? WHERE id_compra = ?', ['anulada', id], (err) => {
          if (err) return connection.rollback(() => callback(err));

          connection.query('SELECT id_producto, cantidad FROM compra_detalles WHERE id_compra = ?', [id], (err, detalles) => {
            if (err) return connection.rollback(() => callback(err));

            let pendientes = detalles.length;
            let fallo = null;

            detalles.forEach((d) => {
              connection.query(
                'UPDATE productos SET stock_actual = GREATEST(stock_actual - ?, 0) WHERE id_producto = ?',
                [d.cantidad, d.id_producto],
                (err) => {
                  if (err && !fallo) fallo = err;
                  if (--pendientes === 0) {
                    if (fallo) return connection.rollback(() => callback(fallo));
                    connection.commit((err) => {
                      if (err) return connection.rollback(() => callback(err));
                      callback(null);
                    });
                  }
                }
              );
            });

            if (detalles.length === 0) {
              connection.commit((err) => {
                if (err) return connection.rollback(() => callback(err));
                callback(null);
              });
            }
          });
        });
      });
    });
  }
};

module.exports = Compra;
