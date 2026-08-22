const connection = require('../config/db_mysql');

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

  // Aplica un ajuste de stock dentro de una transacción y registra el historial
  crear: (idProducto, stockNuevo, motivo, idUsuario, callback) => {
    connection.beginTransaction((err) => {
      if (err) return callback(err);

      connection.query(
        'SELECT stock_actual FROM productos WHERE id_producto = ? FOR UPDATE',
        [idProducto],
        (err, results) => {
          if (err) return connection.rollback(() => callback(err));
          if (results.length === 0) {
            return connection.rollback(() => callback({ message: 'Producto no encontrado' }));
          }

          const stockAnterior = results[0].stock_actual;

          connection.query(
            'UPDATE productos SET stock_actual = ? WHERE id_producto = ?',
            [stockNuevo, idProducto],
            (err) => {
              if (err) return connection.rollback(() => callback(err));

              connection.query(
                'INSERT INTO ajustes_inventario (id_producto, stock_anterior, stock_nuevo, motivo, id_usuario) VALUES (?, ?, ?, ?, ?)',
                [idProducto, stockAnterior, stockNuevo, motivo, idUsuario],
                (err, result) => {
                  if (err) return connection.rollback(() => callback(err));
                  connection.commit((err) => {
                    if (err) return connection.rollback(() => callback(err));
                    callback(null, result.insertId);
                  });
                }
              );
            }
          );
        }
      );
    });
  }
};

module.exports = Ajuste;
