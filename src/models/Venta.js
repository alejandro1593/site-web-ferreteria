const connection = require('../config/db_postgres');
const Caja = require('./Caja');
const { registrarAccionEnCliente } = require('../utils/audit');

const Venta = {
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
        COALESCE((SELECT SUM(vd.cantidad) FROM venta_detalle vd WHERE vd.id_venta = v.id_venta), 0)::integer as total_items
      FROM ventas v
      LEFT JOIN clientes c ON v.id_cliente = c.id_cliente
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
      WHERE v.fecha >= CAST(? AS date)
        AND v.fecha < CAST(? AS date) + INTERVAL '1 day'
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id_venta
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

  delete: (id, callback) => {
    const error = new Error('Las ventas no se eliminan; deben anularse');
    error.code = 'SALE_DELETE_DISABLED';
    callback(error);
  },

  // Obtener ventas del día
  getTodaySales: (callback) => {
    const sql = `
      SELECT v.*, 
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre 
      FROM ventas v 
      LEFT JOIN clientes c ON v.id_cliente = c.id_cliente 
      WHERE v.fecha >= CURRENT_DATE
        AND v.fecha < CURRENT_DATE + INTERVAL '1 day'
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
      WHERE fecha >= CAST(? AS date)
        AND fecha < CAST(? AS date) + INTERVAL '1 day'
        AND estado = 'completada'
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
        d.productos_resumen,
        COALESCE(d.total_items, 0)::integer as total_items
      FROM ventas v
      LEFT JOIN (
        SELECT vd.id_venta,
          STRING_AGG(CONCAT(vd.cantidad, 'x ', p.nombre), ', ' ORDER BY vd.id_detalle) as productos_resumen,
          SUM(vd.cantidad)::integer as total_items
        FROM venta_detalle vd
        JOIN productos p ON vd.id_producto = p.id_producto
        GROUP BY vd.id_venta
      ) d ON d.id_venta = v.id_venta
      WHERE v.id_cliente = ?
        AND v.fecha >= CAST(? AS date)
        AND v.fecha < CAST(? AS date) + INTERVAL '1 day'
      ORDER BY v.fecha DESC
    `;
    connection.query(sql, [idCliente, fechaInicio, fechaFin], callback);
  },

  // Obtener resumen de compras de un cliente por período
  getResumenCliente: (idCliente, fechaInicio, fechaFin, callback) => {
    const sql = `
      SELECT
        COUNT(*)::integer as total_compras,
        COALESCE(SUM(v.total), 0) as total_gastado,
        COALESCE(SUM(v.subtotal), 0) as total_subtotal,
        COALESCE(SUM(v.iva), 0) as total_iva,
        COALESCE(AVG(v.total), 0) as promedio_compra,
        COALESCE(SUM(d.total_productos), 0)::integer as total_productos
      FROM ventas v
      LEFT JOIN (
        SELECT id_venta, SUM(cantidad)::integer as total_productos
        FROM venta_detalle
        GROUP BY id_venta
      ) d ON d.id_venta = v.id_venta
      WHERE v.id_cliente = ?
        AND v.fecha >= CAST(? AS date)
        AND v.fecha < CAST(? AS date) + INTERVAL '1 day'
        AND v.estado = 'completada'
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
  abonar: (id, monto, idUsuario, req, callback) => {
    connection.withTransaction(async (client) => {
      const caja = await Caja.findAbiertaConCliente(client, idUsuario);
      if (!caja) {
        const error = new Error('Debes abrir una caja antes de registrar un abono');
        error.code = 'CAJA_REQUIRED';
        error.status = 409;
        throw error;
      }

      const result = await client.query(
        'SELECT total, saldo_pendiente, estado, metodo_pago FROM ventas WHERE id_venta = $1 FOR UPDATE',
        [id]
      );
      if (result.rows.length === 0) {
        const error = new Error('Venta no encontrada');
        error.code = 'NOT_FOUND';
        throw error;
      }

      const venta = result.rows[0];
      if (venta.estado === 'anulada') {
        const error = new Error('La venta está anulada');
        error.code = 'SALE_ANULLED';
        error.status = 409;
        throw error;
      }
      if (venta.metodo_pago !== 'credito') {
        const error = new Error('Solo las ventas a crédito pueden recibir abonos');
        error.code = 'NOT_CREDIT';
        error.status = 409;
        throw error;
      }
      const saldoAnterior = Number(venta.saldo_pendiente);
      const montoSolicitado = Number(monto);
      const montoCentavos = Math.round(montoSolicitado * 100);
      if (!Number.isFinite(montoSolicitado) || montoCentavos <= 0 || Math.abs(montoSolicitado * 100 - montoCentavos) > 0.000001) {
        const error = new Error('El monto del abono debe ser un valor positivo con máximo dos decimales');
        error.code = 'INVALID_AMOUNT';
        error.status = 400;
        throw error;
      }
      if (montoCentavos > Math.round(saldoAnterior * 100)) {
        const error = new Error('El abono no puede superar el saldo pendiente');
        error.code = 'AMOUNT_EXCEEDS_BALANCE';
        error.status = 409;
        throw error;
      }
      const montoAplicado = montoCentavos / 100;
      if (montoAplicado <= 0) {
        const error = new Error('La venta no tiene saldo pendiente');
        error.code = 'NO_BALANCE';
        throw error;
      }
      const nuevoSaldo = Math.max(saldoAnterior - montoAplicado, 0);
      const nuevoEstado = nuevoSaldo === 0 ? 'completada' : 'pendiente';

      await client.query(
        'UPDATE ventas SET saldo_pendiente = $1, estado = $2 WHERE id_venta = $3',
        [nuevoSaldo, nuevoEstado, id]
      );
      await client.query(
        `INSERT INTO pagos_venta (id_venta, id_caja, id_usuario, tipo, monto, metodo)
         VALUES ($1, $2, $3, 'abono', $4, 'efectivo')`,
        [id, caja.id_caja, idUsuario || null, montoAplicado]
      );
      await registrarAccionEnCliente(client, req, 'abonar', 'venta', id, `Abono de ${montoAplicado}. Saldo restante: ${nuevoSaldo}`);

      return { saldo_anterior: saldoAnterior, saldo_nuevo: nuevoSaldo, monto_aplicado: montoAplicado };
    }).then((result) => callback(null, result)).catch(callback);
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
      WHERE v.fecha >= CAST(? AS date)
        AND v.fecha < CAST(? AS date) + INTERVAL '1 day'
        AND v.estado = 'completada'
    `;
    connection.query(sql, [fechaInicio, fechaFin], callback);
  }
};

module.exports = Venta;