const connection = require('../config/db_postgres');
const Devolucion = require('../models/Devolucion');
const { registrarAccion } = require('../utils/audit');

const DevolucionController = {
  getAll: (req, res) => {
    Devolucion.findAll((err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener devoluciones' });
      }
      res.json(results);
    });
  },

  getById: (req, res) => {
    const { id } = req.params;
    Devolucion.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener devolución' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Devolución no encontrada' });
      }
      res.json(results[0]);
    });
  },

  getByVenta: (req, res) => {
    const { idVenta } = req.params;
    Devolucion.findByVenta(idVenta, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener devoluciones de la venta' });
      }
      res.json(results);
    });
  },

  create: async (req, res) => {
    const idVenta = Number(req.body?.id_venta);
    const idProducto = Number(req.body?.id_producto);
    const cantidad = Number(req.body?.cantidad);
    const motivo = String(req.body?.motivo || 'Devolución de producto').trim().slice(0, 255);
    const metodo = String(req.body?.metodo_reembolso || '').trim().slice(0, 50);

    if (!Number.isInteger(idVenta) || idVenta <= 0 || !Number.isInteger(idProducto) || idProducto <= 0) {
      return res.status(400).json({ error: 'id_venta e id_producto deben ser válidos' });
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser un entero mayor a 0' });
    }

    try {
      const resultado = await connection.withTransaction(async (client) => {
        const ventaResult = await client.query(
          'SELECT metodo_pago, estado, saldo_pendiente FROM ventas WHERE id_venta = $1 FOR UPDATE',
          [idVenta]
        );
        if (ventaResult.rowCount === 0) {
          const error = new Error('Venta no encontrada');
          error.status = 404;
          throw error;
        }
        if (ventaResult.rows[0].estado === 'anulada') {
          const error = new Error('No se pueden devolver productos de una venta anulada');
          error.status = 409;
          throw error;
        }

        const detalleResult = await client.query(
          `SELECT COALESCE(SUM(vd.cantidad), 0)::integer as cantidad_vendida,
                  MAX(vd.precio_unitario) as precio_unitario
           FROM venta_detalle vd
           WHERE vd.id_venta = $1 AND vd.id_producto = $2`,
          [idVenta, idProducto]
        );
        if (detalleResult.rowCount === 0 || Number(detalleResult.rows[0].cantidad_vendida) <= 0) {
          const error = new Error('El producto no se encuentra en la venta especificada');
          error.status = 400;
          throw error;
        }

        const devolucionesResult = await client.query(
          `SELECT COALESCE(SUM(cantidad), 0)::integer as cantidad_devuelta
           FROM devoluciones
           WHERE id_venta = $1 AND id_producto = $2 AND estado = 'completada'`,
          [idVenta, idProducto]
        );
        const cantidadDevuelta = Number(devolucionesResult.rows[0].cantidad_devuelta);
        const cantidadVendida = Number(detalleResult.rows[0].cantidad_vendida);
        if (cantidad + cantidadDevuelta > cantidadVendida) {
          const error = new Error('La cantidad supera lo vendido o ya devuelto');
          error.status = 409;
          throw error;
        }

        const precioUnitario = Number(detalleResult.rows[0].precio_unitario);
        const montoReembolso = Math.round(precioUnitario * 100) * cantidad / 100;
        const metodoReembolso = metodo || ventaResult.rows[0].metodo_pago;
        const devolucionResult = await client.query(
          `INSERT INTO devoluciones (id_venta, id_producto, cantidad, motivo, monto_reembolso, metodo_reembolso, estado, id_usuario)
           VALUES ($1, $2, $3, $4, $5, $6, 'completada', $7)
           RETURNING id_devolucion`,
          [idVenta, idProducto, cantidad, motivo, montoReembolso, metodoReembolso, req.user.id_usuario || null]
        );

        await client.query(
          'UPDATE productos SET stock_actual = stock_actual + $1 WHERE id_producto = $2',
          [cantidad, idProducto]
        );

        if (ventaResult.rows[0].metodo_pago === 'credito' && Number(ventaResult.rows[0].saldo_pendiente) > 0) {
          const nuevoSaldo = Math.max(Number(ventaResult.rows[0].saldo_pendiente) - montoReembolso, 0);
          await client.query(
            'UPDATE ventas SET saldo_pendiente = $1, estado = $2 WHERE id_venta = $3',
            [nuevoSaldo, nuevoSaldo === 0 ? 'completada' : 'pendiente', idVenta]
          );
        }

        return { id: devolucionResult.rows[0].id_devolucion, monto_reembolso: montoReembolso };
      });

      registrarAccion(req, 'crear', 'devolucion', resultado.id, `Monto ${resultado.monto_reembolso}`);
      res.status(201).json({
        message: 'Devolución creada exitosamente',
        id: resultado.id,
        monto_reembolso: resultado.monto_reembolso
      });
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ error: status === 500 ? 'Error al crear devolución' : error.message });
    }
  },

  getDevolucionesPorPeriodo: (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    
    const hoy = new Date();
     const inicio = fechaInicio || `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
    const fin = fechaFin || hoy.toISOString().split('T')[0];

    Devolucion.getDevolucionesPorPeriodo(inicio, fin, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener devoluciones del período' });
      }
      res.json(results);
    });
  },

  getResumen: (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    const query = fechaInicio && fechaFin
      ? Devolucion.getResumenDevoluciones.bind(Devolucion, fechaInicio, fechaFin)
      : Devolucion.getResumenDevolucionesSinFiltros.bind(Devolucion);

    query((err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener resumen de devoluciones' });
      }
      res.json(results[0] || {
        total_devoluciones: 0,
        total_reembolsado: 0,
        total_productos_devueltos: 0
      });
    });
  }
};

module.exports = DevolucionController;
