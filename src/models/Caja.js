const connection = require('../config/db_mysql');

const Caja = {
  crearTabla: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS caja (
        id_caja INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        fecha_apertura DATETIME NOT NULL,
        fecha_cierre DATETIME,
        monto_apertura DECIMAL(10,2) DEFAULT 0,
        monto_cierre DECIMAL(10,2),
        monto_esperado DECIMAL(10,2),
        diferencia DECIMAL(10,2),
        estado VARCHAR(20) DEFAULT 'abierta',
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
      )
    `;
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error al crear tabla caja:', err);
      } else {
        console.log('Tabla caja verificada/creada');
        
        // Agregar valor por defecto a fecha_apertura si no existe
        connection.query(`
          ALTER TABLE caja MODIFY COLUMN fecha_apertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        `, (err) => {
          if (err && err.code !== 'ER_DUP_ENTRYNAME') {
            console.warn('Advertencia: No se pudo modificar fecha_apertura:', err.message);
          }
        });
      }
    });
  },

  findAll: (callback) => {
    const sql = `
      SELECT c.*, 
        u.nombre as usuario_nombre
      FROM caja c
      JOIN usuarios u ON c.id_usuario = u.id_usuario
      ORDER BY c.fecha_apertura DESC
    `;
    connection.query(sql, callback);
  },

  findById: (id, callback) => {
    const sql = `
      SELECT c.*, 
        u.nombre as usuario_nombre
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
      VALUES (?, ?, 'abierta', ?)
    `;
    connection.query(sql, [
      data.id_usuario,
      data.monto_apertura || 0,
      data.observaciones || ''
    ], callback);
  },

  updateCierre: (id, data, callback) => {
    const sql = `
      UPDATE caja 
      SET fecha_cierre = NOW(),
          monto_cierre = ?,
          monto_esperado = ?,
          diferencia = ? - ?,
          estado = 'cerrada',
          observaciones = ?
      WHERE id_caja = ?
    `;
    connection.query(sql, [
      data.monto_cierre,
      data.monto_esperado,
      data.monto_cierre,
      data.monto_esperado,
      data.observaciones || '',
      id
    ], callback);
  },

  getVentasCaja: (idCaja, callback) => {
    const sql = `
      SELECT v.*, 
        c.nombre as cliente_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
      WHERE v.fecha >= (SELECT fecha_apertura FROM caja WHERE id_caja = ?)
      AND (v.fecha <= (SELECT fecha_cierre FROM caja WHERE id_caja = ?) OR 
           (SELECT fecha_cierre FROM caja WHERE id_caja = ?) IS NULL)
      AND v.estado = 'completada'
      ORDER BY v.fecha DESC
    `;
    connection.query(sql, [idCaja, idCaja, idCaja], callback);
  },

  getDevolucionesCaja: (idCaja, callback) => {
    const sql = `
      SELECT d.*, 
        p.nombre as producto_nombre
      FROM devoluciones d
      JOIN productos p ON d.id_producto = p.id_producto
      WHERE d.fecha >= (SELECT fecha_apertura FROM caja WHERE id_caja = ?)
      AND (d.fecha <= (SELECT fecha_cierre FROM caja WHERE id_caja = ?) OR 
           (SELECT fecha_cierre FROM caja WHERE id_caja = ?) IS NULL)
      ORDER BY d.fecha DESC
    `;
    connection.query(sql, [idCaja, idCaja, idCaja], callback);
  },

  getResumenCaja: (idCaja, callback) => {
    const sql = `
      SELECT 
        (SELECT COALESCE(SUM(total), 0) FROM ventas 
         WHERE fecha >= (SELECT fecha_apertura FROM caja WHERE id_caja = ?)
         AND (fecha <= (SELECT fecha_cierre FROM caja WHERE id_caja = ?) OR 
              (SELECT fecha_cierre FROM caja WHERE id_caja = ?) IS NULL)
         AND estado = 'completada') as total_ventas,
        (SELECT COALESCE(SUM(monto_reembolso), 0) FROM devoluciones 
         WHERE fecha >= (SELECT fecha_apertura FROM caja WHERE id_caja = ?)
         AND (fecha <= (SELECT fecha_cierre FROM caja WHERE id_caja = ?) OR 
              (SELECT fecha_cierre FROM caja WHERE id_caja = ?) IS NULL)
         AND estado = 'completada') as total_devoluciones,
        (SELECT COUNT(*) FROM ventas 
         WHERE fecha >= (SELECT fecha_apertura FROM caja WHERE id_caja = ?)
         AND (fecha <= (SELECT fecha_cierre FROM caja WHERE id_caja = ?) OR 
              (SELECT fecha_cierre FROM caja WHERE id_caja = ?) IS NULL)
         AND estado = 'completada') as total_ventas_count
    `;
    connection.query(sql, [idCaja, idCaja, idCaja, idCaja, idCaja, idCaja, idCaja, idCaja, idCaja], callback);
  }
};

Caja.crearTabla();
module.exports = Caja;
