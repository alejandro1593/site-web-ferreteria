const connection = require('../config/db_postgres');
const Venta = require('../models/Venta');
const VentaDetalle = require('../models/VentaDetalle');
const Caja = require('../models/Caja');
const { registrarAccionEnCliente } = require('../utils/audit');

const VentaController = {
  // Obtener todas las ventas (soporta ?page=1&limit=50)
  getAll: (req, res) => {
    const { page, limit } = req.query;
    const options = {};
    if (page !== undefined || limit !== undefined) {
      const pageNumber = Number(page);
      const limitNumber = Number(limit);
      if (!Number.isInteger(pageNumber) || pageNumber < 1 || !Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 200) {
        return res.status(400).json({ error: 'Parámetros de paginación inválidos' });
      }
      options.limit = limitNumber;
      options.offset = (pageNumber - 1) * limitNumber;
    }
    Venta.findAll(options, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener ventas' });
      }
      res.json(results);
    });
  },

  // Obtener venta por ID con detalles
  getById: (req, res) => {
    const { id } = req.params;
    Venta.findById(id, (err, ventaResults) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener venta' });
      }
      if (ventaResults.length === 0) {
        return res.status(404).json({ error: 'Venta no encontrada' });
      }
      
      const venta = ventaResults[0];
      
      // Obtener detalles de la venta
      VentaDetalle.findByIdVenta(id, (err, detalleResults) => {
        if (err) {
          return res.status(500).json({ error: 'Error al obtener detalles de venta' });
        }
        venta.detalles = detalleResults;
        res.json(venta);
      });
    });
  },

  // Obtener ventas por fecha
  getByFecha: (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Fecha inicio y fecha fin son requeridas' });
    }

    Venta.findByFecha(fechaInicio, fechaFin, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener ventas' });
      }
      res.json(results);
    });
  },

  // Obtener ventas por cliente
  getByCliente: (req, res) => {
    const { idCliente } = req.params;
    Venta.findByCliente(idCliente, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener ventas' });
      }
      res.json(results);
    });
  },

  // Obtener historial de compras de un cliente en un período
  getHistorialCliente: (req, res) => {
    const { idCliente } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    const currentYear = new Date().getFullYear();
    const inicio = fechaInicio || `${currentYear}-01-01`;
    const fin = fechaFin || `${currentYear}-12-31`;

    Venta.getHistorialCliente(idCliente, inicio, fin, (err, ventas) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener historial de compras' });
      }

      Venta.getResumenCliente(idCliente, inicio, fin, (err, resumen) => {
        if (err) {
          return res.status(500).json({ error: 'Error al obtener resumen de compras' });
        }

        res.json({
          ventas,
          resumen: resumen[0] || {}
        });
      });
    });
  },

  // Obtener detalles completos de una venta con información de productos
  getDetallesVenta: (req, res) => {
    const { id } = req.params;
    VentaDetalle.findByIdVenta(id, (err, detalles) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener detalles de venta' });
      }
      res.json(detalles);
    });
  },

  // Obtener ventas del día
  getTodaySales: (req, res) => {
    Venta.getTodaySales((err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener ventas del día' });
      }
      res.json(results);
    });
  },

  // Obtener resumen de ventas
  getSummary: (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    
    const today = new Date().toISOString().split('T')[0];
    const inicio = fechaInicio || today;
    const fin = fechaFin || today;

    Venta.getSalesSummary(inicio, fin, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener resumen de ventas' });
      }
      res.json(results[0]);
    });
  },

  create: async (req, res) => {
    const { id_cliente, detalles, metodo_pago, descuento = 0 } = req.body || {};

    if (!Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ error: 'Se debe incluir al menos un detalle' });
    }

    const metodosValidos = new Set(['efectivo', 'tarjeta', 'transferencia', 'credito']);
    if (!metodosValidos.has(metodo_pago)) {
      return res.status(400).json({ error: 'Método de pago inválido' });
    }

    const esCredito = metodo_pago === 'credito';
    const clienteId = id_cliente === undefined || id_cliente === null || id_cliente === '' ? null : Number(id_cliente);
    if (clienteId !== null && (!Number.isInteger(clienteId) || clienteId <= 0)) {
      return res.status(400).json({ error: 'Cliente inválido' });
    }
    if (esCredito && clienteId === null) {
      return res.status(400).json({ error: 'Las ventas a crédito requieren un cliente registrado' });
    }

    const descuentoNumero = Number(descuento);
    const descuentoCentavos = Math.round(descuentoNumero * 100);
    if (!Number.isFinite(descuentoNumero) || descuentoNumero < 0 || Math.abs(descuentoNumero * 100 - descuentoCentavos) > 0.000001) {
      return res.status(400).json({ error: 'El descuento debe ser un número válido con máximo dos decimales' });
    }

    const productosSolicitados = new Map();
    for (const detalle of detalles) {
      const idProducto = Number(detalle && detalle.id_producto);
      const cantidad = Number(detalle && detalle.cantidad);
      if (!Number.isInteger(idProducto) || idProducto <= 0 || !Number.isInteger(cantidad) || cantidad <= 0) {
        return res.status(400).json({ error: 'Cada detalle requiere producto y cantidad enteros positivos' });
      }
      productosSolicitados.set(idProducto, (productosSolicitados.get(idProducto) || 0) + cantidad);
    }

    try {
      const resultado = await connection.withTransaction(async (client) => {
        const caja = await Caja.findAbiertaConCliente(client, req.user.id_usuario);
        if (!caja) {
          const error = new Error('Debes abrir una caja antes de registrar una venta');
          error.status = 409;
          throw error;
        }

        const productos = [];
        const ids = [...productosSolicitados.keys()].sort((a, b) => a - b);
        for (const idProducto of ids) {
          const productResult = await client.query(
            'SELECT id_producto, nombre, precio_venta, stock_actual FROM productos WHERE id_producto = $1 AND activo = TRUE FOR UPDATE',
            [idProducto]
          );
          if (productResult.rowCount === 0) {
            const error = new Error(`Producto ${idProducto} no encontrado`);
            error.status = 400;
            throw error;
          }
          const producto = productResult.rows[0];
          const cantidad = productosSolicitados.get(idProducto);
          if (Number(producto.stock_actual) < cantidad) {
            const error = new Error(`Stock insuficiente para ${producto.nombre}`);
            error.status = 400;
            throw error;
          }
          productos.push({ ...producto, cantidad });
        }

        const idCaja = caja.id_caja;
        const subtotalCentavos = productos.reduce((sum, producto) => sum + Math.round(Number(producto.precio_venta) * 100) * producto.cantidad, 0);
        const ivaCentavos = Math.round(subtotalCentavos * 0.16);
        const totalCentavos = subtotalCentavos + ivaCentavos - descuentoCentavos;
        if (totalCentavos < 0) {
          const error = new Error('El descuento no puede superar el total de la venta');
          error.status = 400;
          throw error;
        }

        const ventaResult = await client.query(
          `INSERT INTO ventas (id_cliente, id_usuario, id_caja, subtotal, iva, descuento, total, metodo_pago, estado, saldo_pendiente)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id_venta`,
          [
            clienteId,
            req.user.id_usuario || null,
            idCaja,
            subtotalCentavos / 100,
            ivaCentavos / 100,
            descuentoCentavos / 100,
            totalCentavos / 100,
            metodo_pago,
            esCredito ? 'pendiente' : 'completada',
            esCredito ? totalCentavos / 100 : 0
          ]
        );
        const idVenta = ventaResult.rows[0].id_venta;

        for (const producto of productos) {
          const subtotal = Math.round(Number(producto.precio_venta) * 100) * producto.cantidad;
          await client.query(
            `INSERT INTO venta_detalle (id_venta, id_producto, cantidad, precio_unitario, subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [idVenta, producto.id_producto, producto.cantidad, producto.precio_venta, subtotal / 100]
          );
          const stockResult = await client.query(
            'UPDATE productos SET stock_actual = stock_actual - $1 WHERE id_producto = $2 AND stock_actual >= $1',
            [producto.cantidad, producto.id_producto]
          );
          if (stockResult.rowCount !== 1) {
            const error = new Error(`Stock insuficiente para ${producto.nombre}`);
            error.status = 409;
            throw error;
          }
        }

        await registrarAccionEnCliente(client, req, 'crear', 'venta', idVenta, `Total ${totalCentavos / 100}${esCredito ? ' (crédito)' : ''}`);
        return {
          idVenta,
          total: totalCentavos / 100,
          saldoPendiente: esCredito ? totalCentavos / 100 : 0
        };
      });

      res.status(201).json({
        message: 'Venta creada exitosamente',
        id: resultado.idVenta,
        total: resultado.total,
        saldo_pendiente: resultado.saldoPendiente
      });
    } catch (error) {
      const status = error.status || (error.code === '23503' ? 400 : 500);
      res.status(status).json({ error: status === 500 ? 'Error al crear la venta' : error.message });
    }
  },

  delete: async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID de venta inválido' });

    try {
      const total = await connection.withTransaction(async (client) => {
        const preview = await client.query(
          'SELECT id_caja, estado FROM ventas WHERE id_venta = $1',
          [id]
        );
        if (preview.rowCount === 0) {
          const error = new Error('Venta no encontrada');
          error.status = 404;
          throw error;
        }
        if (!preview.rows[0].id_caja) {
          const error = new Error('No se puede anular una venta sin caja asociada');
          error.status = 409;
          throw error;
        }
        const cajaResult = await client.query(
          'SELECT estado FROM caja WHERE id_caja = $1 FOR UPDATE',
          [preview.rows[0].id_caja]
        );
        if (cajaResult.rowCount === 0 || cajaResult.rows[0].estado !== 'abierta') {
          const error = new Error('No se puede modificar una venta de una caja cerrada');
          error.status = 409;
          throw error;
        }

        const ventaResult = await client.query(
          'SELECT total, saldo_pendiente, estado, metodo_pago, id_caja FROM ventas WHERE id_venta = $1 FOR UPDATE',
          [id]
        );
        if (ventaResult.rowCount === 0) {
          const error = new Error('Venta no encontrada');
          error.status = 404;
          throw error;
        }
        if (ventaResult.rows[0].estado === 'anulada') {
          const error = new Error('La venta ya está anulada');
          error.status = 409;
          throw error;
        }
        if (Number(ventaResult.rows[0].saldo_pendiente) > 0) {
          const error = new Error('No se puede anular una venta con saldo pendiente');
          error.status = 409;
          throw error;
        }
        if (!['efectivo', 'credito'].includes(ventaResult.rows[0].metodo_pago)) {
          const error = new Error('La venta requiere una reversión externa antes de anularse');
          error.status = 409;
          throw error;
        }
        const pagos = await client.query(
          'SELECT 1 FROM pagos_venta WHERE id_venta = $1 LIMIT 1 FOR UPDATE',
          [id]
        );
        if (pagos.rowCount > 0) {
          const error = new Error('No se puede anular una venta con pagos o reembolsos registrados');
          error.status = 409;
          throw error;
        }
        const devoluciones = await client.query(
          'SELECT 1 FROM devoluciones WHERE id_venta = $1 LIMIT 1',
          [id]
        );
        if (devoluciones.rowCount > 0) {
          const error = new Error('No se puede anular una venta con devoluciones');
          error.status = 409;
          throw error;
        }

        const detalles = await client.query(
          'SELECT id_producto, cantidad FROM venta_detalle WHERE id_venta = $1 ORDER BY id_producto',
          [id]
        );
        for (const detalle of detalles.rows) {
          const productResult = await client.query(
            'SELECT id_producto FROM productos WHERE id_producto = $1 FOR UPDATE',
            [detalle.id_producto]
          );
          if (productResult.rowCount !== 1) {
            const error = new Error('No se pudo bloquear el producto de la venta');
            error.status = 409;
            throw error;
          }
          const stockResult = await client.query(
            'UPDATE productos SET stock_actual = stock_actual + $1 WHERE id_producto = $2',
            [detalle.cantidad, detalle.id_producto]
          );
          if (stockResult.rowCount !== 1) {
            const error = new Error('No se pudo restaurar el stock de la venta');
            error.status = 409;
            throw error;
          }
        }
        await client.query("UPDATE ventas SET estado = 'anulada' WHERE id_venta = $1", [id]);
        const totalVenta = Number(ventaResult.rows[0].total);
        await registrarAccionEnCliente(client, req, 'anular', 'venta', id, `Total ${totalVenta}`);
        return totalVenta;
      });
      res.json({ message: 'Venta anulada exitosamente' });
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ error: status === 500 ? 'Error al anular venta' : error.message });
    }
  },

  // ---- Créditos (fiados) ----

  // Ventas con saldo pendiente
  getCrediticias: (req, res) => {
    Venta.findCrediticias((err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener ventas a crédito' });
      res.json(results);
    });
  },

  abonar: (req, res) => {
    const id = Number(req.params.id);
    const monto = Number(req.body?.monto);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID de venta inválido' });
    if (!Number.isFinite(monto) || monto <= 0) return res.status(400).json({ error: 'El monto del abono debe ser mayor a 0' });

    Venta.abonar(id, monto, req.user.id_usuario || null, req, (err, resultado) => {
      if (err) {
        const status = err.status || (err.code === 'NOT_FOUND' ? 404 : err.code === 'NO_BALANCE' ? 400 : 500);
        return res.status(status).json({ error: status === 500 ? 'Error al registrar el abono' : err.message });
      }
      res.json({
        message: 'Abono registrado exitosamente',
        saldo_anterior: resultado.saldo_anterior,
        saldo_pendiente: resultado.saldo_nuevo,
        pagado: resultado.saldo_nuevo === 0
      });
    });
  },

  // ---- Ganancias ----

  getGanancias: (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Fecha inicio y fecha fin son requeridas' });
    }
    Venta.getGanancias(fechaInicio, fechaFin, (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al calcular ganancias' });
      res.json(results[0]);
    });
  }
};

module.exports = VentaController;