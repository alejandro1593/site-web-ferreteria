const connection = require('../config/db_mysql');

const Venta = {
  // Crear tabla si no existe
  crearTabla: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS ventas (
        id_venta INT AUTO_INCREMENT PRIMARY KEY,
        id_cliente INT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        subtotal DECIMAL(10,2),
        iva DECIMAL(10,2),
        descuento DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2),
        metodo_pago VARCHAR(50),
        estado VARCHAR(20) DEFAULT 'completada',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL
      )
    `;
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error al crear tabla ventas:', err);
      } else {
        console.log('Tabla ventas verificada/creada');
      }
    });
  },

  // Obtener todas las ventas con cliente y total de items
  // Opcionalmente acepta { limit, offset } para paginación
  findAll: (options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    let sql = `
      SELECT v.*, 
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre, 
        c.dni as cliente_dni,
        COUNT(vd.id_detalle) as total_items
      FROM ventas v 
      LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
      LEFT JOIN venta_detalle vd ON v.id_venta = vd.id_venta
      GROUP BY v.id_venta
      ORDER BY v.fecha DESC
    `;
    const params = [];
    if (options.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(Number(options.limit), Number(options.offset || 0));
    }
    connection.query(sql, params, callback);
  },

  // Obtener venta por ID con detalles
  findById: (id, callback) => {
    const sql = `
      SELECT v.*, 
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre, 
        c.dni as cliente_dni 
      FROM ventas v 
      LEFT JOIN clientes c ON v.id_cliente = c.id_cliente 
      WHERE v.id_venta = ?
    `;
    connection.query(sql, [id], callback);
  },

  // Obtener ventas por fecha
  findByFecha: (fechaInicio, fechaFin, callback) => {
    const sql = `
      SELECT v.*, 
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre, 
        c.dni as cliente_dni 
      FROM ventas v 
      LEFT JOIN clientes c ON v.id_cliente = c.id_cliente 
      WHERE DATE(v.fecha) BETWEEN ? AND ? 
      ORDER BY v.fecha DESC
    `;
    connection.query(sql, [fechaInicio, fechaFin], callback);
  },

  // Obtener ventas por cliente
  findByCliente: (idCliente, callback) => {
    const sql = `
      SELECT v.*, 
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre, 
        c.dni as cliente_dni 
      FROM ventas v 
      LEFT JOIN clientes c ON v.id_cliente = c.id_cliente 
      WHERE v.id_cliente = ? 
      ORDER BY v.fecha DESC
    `;
    connection.query(sql, [idCliente], callback);
  },

  // Crear nueva venta
  create: (data, callback) => {
    const sql = `
      INSERT INTO ventas (id_cliente, subtotal, iva, descuento, total, metodo_pago, estado, saldo_pendiente) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    connection.query(sql, [
      data.id_cliente || null, 
      data.subtotal, 
      data.iva, 
      data.descuento || 0, 
      data.total, 
      data.metodo_pago, 
      data.estado || 'completada',
      data.saldo_pendiente || 0
    ], callback);
  },

  // Actualizar venta
  update: (id, data, callback) => {
    const sql = `
      UPDATE ventas 
      SET id_cliente = ?, subtotal = ?, iva = ?, descuento = ?, total = ?, metodo_pago = ?, estado = ? 
      WHERE id_venta = ?
    `;
    connection.query(sql, [
      data.id_cliente, 
      data.subtotal, 
      data.iva, 
      data.descuento, 
      data.total, 
      data.metodo_pago, 
      data.estado, 
      id
    ], callback);
  },

  // Eliminar venta
  delete: (id, callback) => {
    const sql = 'DELETE FROM ventas WHERE id_venta = ?';
    connection.query(sql, [id], callback);
  },

  // Obtener ventas del día
  getTodaySales: (callback) => {
    const sql = `
      SELECT v.*, 
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre 
      FROM ventas v 
      LEFT JOIN clientes c ON v.id_cliente = c.id_cliente 
      WHERE DATE(v.fecha) = CURDATE() 
      ORDER BY v.fecha DESC
    `;
    connection.query(sql, callback);
  },

  // Obtener resumen de ventas por período
  getSalesSummary: (fechaInicio, fechaFin, callback) => {
    const sql = `
      SELECT 
        COUNT(*) as total_ventas,
        SUM(total) as total_venta,
        SUM(subtotal) as total_subtotal,
        SUM(iva) as total_iva,
        AVG(total) as promedio_venta
      FROM ventas 
      WHERE fecha BETWEEN ? AND ? AND estado = 'completada'
    `;
    connection.query(sql, [fechaInicio, fechaFin], callback);
  },

  // Obtener historial de compras de un cliente con detalles
  getHistorialCliente: (idCliente, fechaInicio, fechaFin, callback) => {
    const sql = `
      SELECT 
        v.id_venta,
        v.fecha,
        v.subtotal,
        v.iva,
        v.descuento,
        v.total,
        v.metodo_pago,
        v.estado,
        GROUP_CONCAT(CONCAT(vd.cantidad, 'x ', p.nombre) SEPARATOR ', ') as productos_resumen,
        COUNT(vd.id_detalle) as total_items
      FROM ventas v
      LEFT JOIN venta_detalle vd ON v.id_venta = vd.id_venta
      LEFT JOIN productos p ON vd.id_producto = p.id_producto
      WHERE v.id_cliente = ? AND v.fecha BETWEEN ? AND ?
      GROUP BY v.id_venta
      ORDER BY v.fecha DESC
    `;
    connection.query(sql, [idCliente, fechaInicio, fechaFin], callback);
  },

  // Obtener resumen de compras de un cliente por período
  getResumenCliente: (idCliente, fechaInicio, fechaFin, callback) => {
    const sql = `
      SELECT 
        COUNT(v.id_venta) as total_compras,
        SUM(v.total) as total_gastado,
        SUM(v.subtotal) as total_subtotal,
        SUM(v.iva) as total_iva,
        AVG(v.total) as promedio_compra,
        SUM(vd.cantidad) as total_productos
      FROM ventas v
      LEFT JOIN venta_detalle vd ON v.id_venta = vd.id_venta
      WHERE v.id_cliente = ? AND v.fecha BETWEEN ? AND ? AND v.estado = 'completada'
    `;
    connection.query(sql, [idCliente, fechaInicio, fechaFin], callback);
  },

  // ---- Créditos (fiados) ----

  // Ventas con saldo pendiente
  findCrediticias: (callback) => {
    const sql = `
      SELECT v.*, 
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
        c.telefono as cliente_telefono
      FROM ventas v 
      LEFT JOIN clientes c ON v.id_cliente = c.id_cliente 
       WHERE v.saldo_pendiente > 0
       ORDER BY v.fecha ASC
    `;
    connection.query(sql, callback);
  },

  // Registrar abono a una venta a crédito
  abonar: (id, monto, callback) => {
    connection.query(
      'SELECT total, saldo_pendiente FROM ventas WHERE id_venta = ? FOR UPDATE',
      [id],
      (err, results) => {
        if (err) return callback(err);
        if (results.length === 0) return callback({ message: 'Venta no encontrada' });

        const venta = results[0];
        const nuevoSaldo = Math.max(venta.saldo_pendiente - monto, 0);

        connection.query(
          'UPDATE ventas SET saldo_pendiente = ?, estado = IF(? <= 0, \'completada\', \'pendiente\') WHERE id_venta = ?',
          [nuevoSaldo, nuevoSaldo, id],
          (err) => callback(err, { saldo_anterior: venta.saldo_pendiente, saldo_nuevo: nuevoSaldo })
        );
      }
    );
  },

  // ---- Ganancias (usa precio de compra como costo aproximado) ----

  getGanancias: (fechaInicio, fechaFin, callback) => {
    const sql = `
      SELECT 
        COUNT(DISTINCT v.id_venta) as total_ventas,
        SUM(vd.cantidad) as productos_vendidos,
        SUM(vd.subtotal) as ingresos_brutos,
        SUM(vd.cantidad * p.precio_compra) as costo_estimado,
        SUM(vd.subtotal - vd.cantidad * p.precio_compra) as ganancia_estimada,
        ROUND(
          SUM(vd.subtotal - vd.cantidad * p.precio_compra) / NULLIF(SUM(vd.subtotal), 0) * 100, 2
        ) as margen_porcentaje
      FROM venta_detalle vd
      JOIN ventas v ON vd.id_venta = v.id_venta
      LEFT JOIN productos p ON vd.id_producto = p.id_producto
      WHERE DATE(v.fecha) BETWEEN ? AND ?
        AND v.estado = 'completada'
    `;
    connection.query(sql, [fechaInicio, fechaFin], callback);
  }
};

// Inicializar tabla
Venta.crearTabla();

module.exports = Venta;