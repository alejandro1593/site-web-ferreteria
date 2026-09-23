const connection = require('../config/db_postgres');
const Cotizacion = require('../models/Cotizacion');
const CotizacionDetalle = require('../models/CotizacionDetalle');
const Caja = require('../models/Caja');
const { registrarAccionEnCliente } = require('../utils/audit');

const METODOS_PAGO = new Set(['efectivo', 'tarjeta', 'transferencia', 'credito']);
const ESTADOS = new Set(['pendiente', 'aprobada', 'rechazada', 'convertida']);

function crearError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function aCentavos(value) {
  return Math.round(Number(value) * 100);
}

function idValido(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validarFecha(fecha) {
  if (fecha === undefined || fecha === null || fecha === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(`${fecha}T00:00:00`))) {
    throw crearError('La fecha de validez no es válida');
  }
  return fecha;
}

const CotizacionController = {
  getAll: (req, res) => {
    const filters = {};
    if (req.query.id_cliente) filters.id_cliente = req.query.id_cliente;
    if (req.query.estado) filters.estado = req.query.estado;
    const method = Object.keys(filters).length > 0 ? Cotizacion.findWithFilters.bind(Cotizacion, filters) : Cotizacion.findAll.bind(Cotizacion);
    method((err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener cotizaciones' });
      res.json(results);
    });
  },

  getById: (req, res) => {
    Cotizacion.findById(req.params.id, (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener cotizacion' });
      if (results.length === 0) return res.status(404).json({ error: 'Cotizacion no encontrada' });
      res.json(results[0]);
    });
  },

  getByCliente: (req, res) => {
    Cotizacion.findByCliente(req.params.idCliente, (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener cotizaciones del cliente' });
      res.json(results);
    });
  },

  create: async (req, res) => {
    const idCliente = idValido(req.body?.id_cliente);
    if (!idCliente) return res.status(400).json({ error: 'ID de cliente es requerido' });
    if (!Array.isArray(req.body?.detalles) || req.body.detalles.length === 0) {
      return res.status(400).json({ error: 'Se debe incluir al menos un detalle' });
    }

    let fechaValidez;
    try {
      fechaValidez = validarFecha(req.body?.fecha_validez);
    } catch (error) {
      return res.status(error.status).json({ error: error.message });
    }

    const productosSolicitados = new Map();
    try {
      for (const detalle of req.body.detalles) {
        const idProducto = idValido(detalle?.id_producto);
        const cantidad = Number(detalle?.cantidad);
        const descuento = Number(detalle?.descuento ?? 0);
        if (!idProducto || !Number.isInteger(cantidad) || cantidad <= 0 || !Number.isFinite(descuento) || descuento < 0) {
          throw crearError('Cada detalle requiere producto, cantidad positiva y descuento válido');
        }
        const actual = productosSolicitados.get(idProducto) || { cantidad: 0, descuento: 0 };
        actual.cantidad += cantidad;
        actual.descuento += descuento;
        productosSolicitados.set(idProducto, actual);
      }
    } catch (error) {
      return res.status(error.status).json({ error: error.message });
    }

    const descuentoGlobal = Number(req.body?.descuento_global ?? 0);
    const descuentoGlobalCentavos = Math.round(descuentoGlobal * 100);
    if (!Number.isFinite(descuentoGlobal) || descuentoGlobal < 0 || Math.abs(descuentoGlobal * 100 - descuentoGlobalCentavos) > 0.000001) {
      return res.status(400).json({ error: 'El descuento global no es válido ni tiene más de dos decimales' });
    }

    try {
      const resultado = await connection.withTransaction(async (client) => {
        const productos = [];
        for (const idProducto of [...productosSolicitados.keys()].sort((a, b) => a - b)) {
          const productResult = await client.query(
            'SELECT id_producto, nombre, precio_venta, stock_actual FROM productos WHERE id_producto = $1 AND activo = TRUE FOR UPDATE',
            [idProducto]
          );
          if (productResult.rowCount === 0) throw crearError(`Producto ${idProducto} no encontrado`);
          const producto = productResult.rows[0];
          const solicitado = productosSolicitados.get(idProducto);
          if (Number(producto.stock_actual) < solicitado.cantidad) throw crearError(`Stock insuficiente para ${producto.nombre}`);
          productos.push({ ...producto, ...solicitado });
        }

        const lineas = productos.map((producto) => {
          const bruto = aCentavos(producto.precio_venta) * producto.cantidad;
          const descuento = Math.min(aCentavos(producto.descuento), bruto);
          return { ...producto, netoCentavos: bruto - descuento };
        });
        const brutoCentavos = lineas.reduce((sum, linea) => sum + aCentavos(linea.precio_venta) * linea.cantidad, 0);
        const descuentoLineasCentavos = lineas.reduce((sum, linea) => sum + aCentavos(linea.precio_venta) * linea.cantidad - linea.netoCentavos, 0);
        const descuentoGlobalCentavos = aCentavos(descuentoGlobal);
        const baseGlobalCentavos = lineas.reduce((sum, linea) => sum + linea.netoCentavos, 0);
        if (descuentoGlobalCentavos > baseGlobalCentavos) throw crearError('El descuento global supera el importe de la cotización');
        let descuentoGlobalAsignado = 0;
        const lineasNetas = lineas.map((linea, index) => {
          const descuentoGlobalLinea = index === lineas.length - 1
            ? descuentoGlobalCentavos - descuentoGlobalAsignado
            : Math.floor((descuentoGlobalCentavos * linea.netoCentavos) / (baseGlobalCentavos || 1));
          descuentoGlobalAsignado += descuentoGlobalLinea;
          return { ...linea, subtotalCentavos: linea.netoCentavos - descuentoGlobalLinea };
        });
        const subtotalCentavos = lineasNetas.reduce((sum, linea) => sum + linea.subtotalCentavos, 0);
        const ivaCentavos = Math.round(subtotalCentavos * 0.16);
        const totalCentavos = subtotalCentavos + ivaCentavos;
        const descuentoTotalCentavos = descuentoLineasCentavos + descuentoGlobalCentavos;
        const observaciones = String(req.body?.observaciones || '').trim().slice(0, 2000);

        const quoteResult = await client.query(
          `INSERT INTO cotizaciones (id_cliente, fecha_validez, subtotal, iva, descuento, total, estado, observaciones, id_usuario)
           VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', $7, $8)
           RETURNING id_cotizacion`,
           [idCliente, fechaValidez, subtotalCentavos / 100, ivaCentavos / 100, descuentoTotalCentavos / 100, totalCentavos / 100, observaciones, req.user.id_usuario || null]

        );
        const idCotizacion = quoteResult.rows[0].id_cotizacion;

        for (const linea of lineasNetas) {
          await client.query(
            `INSERT INTO cotizacion_detalles (id_cotizacion, id_producto, cantidad, precio_unitario, descuento_producto, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [idCotizacion, linea.id_producto, linea.cantidad, linea.precio_venta, (aCentavos(linea.precio_venta) * linea.cantidad - linea.netoCentavos) / 100, linea.subtotalCentavos / 100]
          );
        }

        await registrarAccionEnCliente(client, req, 'crear', 'cotizacion', idCotizacion, `Total ${totalCentavos / 100}`);
        return { id: idCotizacion, total: totalCentavos / 100 };
      });

      res.status(201).json({ message: 'Cotizacion creada exitosamente', id: resultado.id, total: resultado.total });

    } catch (error) {
      const status = error.status || (error.code === '23503' ? 400 : 500);
      res.status(status).json({ error: status === 500 ? 'Error al crear cotizacion' : error.message });
    }
  },

  update: (req, res) => {
    const updateData = {};
    if (req.body?.estado !== undefined) {
      if (!ESTADOS.has(req.body.estado)) return res.status(400).json({ error: 'Estado inválido' });
      if (req.body.estado === 'convertida') return res.status(409).json({ error: 'La conversión se realiza por un endpoint específico' });
      updateData.estado = req.body.estado;
    }
    if (req.body?.fecha_validez !== undefined) {
      try {
        updateData.fecha_validez = validarFecha(req.body.fecha_validez);
      } catch (error) {
        return res.status(error.status).json({ error: error.message });
      }
    }
    if (req.body?.observaciones !== undefined) updateData.observaciones = String(req.body.observaciones).slice(0, 2000);
    if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

    Cotizacion.findById(req.params.id, (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al verificar cotizacion' });
      if (results.length === 0) return res.status(404).json({ error: 'Cotizacion no encontrada' });
      if (results[0].estado === 'convertida') return res.status(409).json({ error: 'Una cotización convertida no se puede modificar' });
      Cotizacion.update(req.params.id, updateData, (error, rows, result) => {
        if (error) return res.status(500).json({ error: 'Error al actualizar cotizacion' });
        if (!result || result.rowCount === 0) return res.status(409).json({ error: 'La cotización fue convertida simultáneamente' });
        res.json({ message: 'Cotizacion actualizada exitosamente' });
      });
    });
  },

  delete: (req, res) => {
    Cotizacion.findById(req.params.id, (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al verificar cotizacion' });
      if (results.length === 0) return res.status(404).json({ error: 'Cotizacion no encontrada' });
      if (results[0].estado === 'convertida') return res.status(409).json({ error: 'Una cotización convertida no se puede eliminar' });
      Cotizacion.delete(req.params.id, (error, rows, result) => {
        if (error) return res.status(500).json({ error: 'Error al eliminar cotizacion' });
        if (!result || result.rowCount === 0) return res.status(409).json({ error: 'La cotización fue convertida simultáneamente' });
        res.json({ message: 'Cotizacion eliminada exitosamente' });
      });
    });
  },

  getDetalles: (req, res) => {
    CotizacionDetalle.findByIdCotizacion(req.params.id, (err, detalles) => {
      if (err) return res.status(500).json({ error: 'Error al obtener detalles de cotizacion' });
      res.json(detalles);
    });
  },

  getResumen: (req, res) => {
    const { fechaInicio, fechaFin, todas } = req.query;
    const hoy = new Date();
    const inicio = todas === 'true' || (!fechaInicio && !fechaFin) ? null : (fechaInicio || `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`);
    const fin = todas === 'true' || (!fechaInicio && !fechaFin) ? null : (fechaFin || hoy.toISOString().slice(0, 10));
    Cotizacion.getResumenPeriodo(inicio, fin, (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener resumen de cotizaciones' });
      res.json(results[0] || {
        total_cotizaciones: 0,
        total_cotizado: 0,
        promedio_cotizacion: 0,
        pendientes: 0,
        aprobadas: 0,
        rechazadas: 0,
        convertidas: 0
      });
    });
  },

  convertirAVenta: async (req, res) => {
    const idCotizacion = idValido(req.params.id);
    const metodoPago = req.body?.metodo_pago || 'efectivo';
    if (!idCotizacion) return res.status(400).json({ error: 'ID de cotización inválido' });
    if (!METODOS_PAGO.has(metodoPago)) return res.status(400).json({ error: 'Método de pago inválido' });

    try {
      const resultado = await connection.withTransaction(async (client) => {
        const caja = await Caja.findAbiertaConCliente(client, req.user.id_usuario);
        if (!caja) throw crearError('Debes abrir una caja antes de convertir una cotización', 409);
        const quoteResult = await client.query(
          'SELECT * FROM cotizaciones WHERE id_cotizacion = $1 FOR UPDATE',
          [idCotizacion]
        );
        if (quoteResult.rowCount === 0) throw crearError('Cotización no encontrada', 404);
        const quote = quoteResult.rows[0];
        if (!['pendiente', 'aprobada'].includes(quote.estado)) throw crearError('La cotización no se puede convertir', 409);
        if (quote.fecha_validez && new Date(`${quote.fecha_validez}T23:59:59`) < new Date()) throw crearError('La cotización está vencida', 409);
        if (metodoPago === 'credito' && !quote.id_cliente) throw crearError('La cotización no tiene cliente para crédito');

        const detallesResult = await client.query(
          'SELECT * FROM cotizacion_detalles WHERE id_cotizacion = $1 ORDER BY id_detalle',
          [idCotizacion]
        );
        if (detallesResult.rowCount === 0) throw crearError('La cotización no tiene productos');

        const productos = [];
        for (const detalle of detallesResult.rows) {
          const productResult = await client.query(
            'SELECT id_producto, nombre, stock_actual FROM productos WHERE id_producto = $1 AND activo = TRUE FOR UPDATE',
            [detalle.id_producto]
          );
          if (productResult.rowCount === 0) throw crearError(`Producto ${detalle.id_producto} no encontrado`);
          const producto = productResult.rows[0];
          if (Number(producto.stock_actual) < detalle.cantidad) throw crearError(`Stock insuficiente para ${producto.nombre}`, 409);
          productos.push({ ...detalle, nombre: producto.nombre });
        }

        const lineas = productos.map((detalle) => {
          const bruto = aCentavos(detalle.precio_unitario) * detalle.cantidad;
          const descuentoLinea = Math.min(aCentavos(detalle.descuento_producto), bruto);
          return { ...detalle, netoCentavos: bruto - descuentoLinea };
        });
        const brutoCentavos = lineas.reduce((sum, linea) => sum + aCentavos(linea.precio_unitario) * linea.cantidad, 0);
        const descuentoLineasCentavos = lineas.reduce((sum, linea) => sum + aCentavos(linea.precio_unitario) * linea.cantidad - linea.netoCentavos, 0);
        const descuentoTotalCentavos = aCentavos(quote.descuento || 0);
        if (descuentoTotalCentavos < descuentoLineasCentavos || descuentoTotalCentavos > brutoCentavos) {
          throw crearError('El descuento de la cotización no es consistente con sus productos', 409);
        }
        const descuentoGlobalCentavos = descuentoTotalCentavos - descuentoLineasCentavos;
        const baseGlobalCentavos = lineas.reduce((sum, linea) => sum + linea.netoCentavos, 0);
        if (descuentoGlobalCentavos > 0 && baseGlobalCentavos <= 0) throw crearError('La cotización no tiene importe para aplicar el descuento', 409);
        let descuentoGlobalAsignado = 0;
        const lineasNetas = lineas.map((linea, index) => {
          const descuentoGlobalLinea = index === lineas.length - 1
            ? descuentoGlobalCentavos - descuentoGlobalAsignado
            : Math.floor((descuentoGlobalCentavos * linea.netoCentavos) / baseGlobalCentavos);
          descuentoGlobalAsignado += descuentoGlobalLinea;
          return { ...linea, subtotalCentavos: linea.netoCentavos - descuentoGlobalLinea };
        });
        const subtotalFinal = lineasNetas.reduce((sum, linea) => sum + linea.subtotalCentavos, 0);
        const ivaCentavos = Math.round(subtotalFinal * 0.16);
        const totalCentavos = subtotalFinal + ivaCentavos;
        const esCredito = metodoPago === 'credito';
        const idCaja = caja.id_caja;
        const saleResult = await client.query(
          `INSERT INTO ventas (id_cliente, id_usuario, id_caja, subtotal, iva, descuento, total, metodo_pago, estado, saldo_pendiente)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id_venta`,
           [quote.id_cliente, req.user.id_usuario || null, idCaja, subtotalFinal / 100, ivaCentavos / 100, descuentoTotalCentavos / 100, totalCentavos / 100, metodoPago, esCredito ? 'pendiente' : 'completada', esCredito ? totalCentavos / 100 : 0]

        );
        const idVenta = saleResult.rows[0].id_venta;

        for (const detalle of lineasNetas) {
          await client.query(
            `INSERT INTO venta_detalle (id_venta, id_producto, cantidad, precio_unitario, subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [idVenta, detalle.id_producto, detalle.cantidad, detalle.precio_unitario, detalle.subtotalCentavos / 100]
          );
          const stockResult = await client.query(
            'UPDATE productos SET stock_actual = stock_actual - $1 WHERE id_producto = $2 AND stock_actual >= $1',
            [detalle.cantidad, detalle.id_producto]
          );
          if (stockResult.rowCount !== 1) throw crearError(`Stock insuficiente para ${detalle.nombre}`, 409);
        }

        await client.query(
          "UPDATE cotizaciones SET estado = 'convertida' WHERE id_cotizacion = $1",
          [idCotizacion]
        );
        await registrarAccionEnCliente(client, req, 'convertir', 'cotizacion', idCotizacion, `Venta ${idVenta}`);
        return { idVenta, idCotizacion, total: totalCentavos / 100 };
      });

      res.status(201).json({ message: 'Cotización convertida a venta exitosamente', id_venta: resultado.idVenta, id_cotizacion: resultado.idCotizacion });
    } catch (error) {
      const status = error.status || (error.code === '23503' ? 400 : 500);
      res.status(status).json({ error: status === 500 ? 'Error al convertir cotización' : error.message });
    }
  }
};

module.exports = CotizacionController;
