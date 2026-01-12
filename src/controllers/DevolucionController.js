const connection = require('../config/db_mysql');
const Devolucion = require('../models/Devolucion');
const Venta = require('../models/Venta');
const Producto = require('../models/Producto');

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

  create: (req, res) => {
    const { id_venta, id_producto, cantidad, motivo, metodo_reembolso, id_usuario } = req.body || {};
    
    if (!id_venta || !id_producto || !cantidad) {
      return res.status(400).json({ error: 'id_venta, id_producto y cantidad son requeridos' });
    }

    if (cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    }

    VerificarVentaProducto(id_venta, id_producto, cantidad, (err, ventaInfo) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const monto_reembolso = ventaInfo.precio_unitario * cantidad;

      const devolucionData = {
        id_venta,
        id_producto,
        cantidad,
        motivo: motivo || 'Devolución de producto',
        monto_reembolso,
        metodo_reembolso: metodo_reembolso || ventaInfo.metodo_pago,
        estado: 'completada',
        id_usuario
      };

      Devolucion.create(devolucionData, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error al crear devolución' });
        }

        Producto.findById(id_producto, (err, productoResult) => {
          if (!err && productoResult.length > 0) {
            const nuevoStock = productoResult[0].stock_actual + cantidad;
            Producto.updateStock(id_producto, nuevoStock, (err) => {
              if (err) {
                console.error('Error actualizando stock:', err);
              }
            });
          }
        });

        res.status(201).json({
          message: 'Devolución creada exitosamente',
          id: result.insertId,
          monto_reembolso
        });
      });
    });
  },

  getDevolucionesPorPeriodo: (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    
    const hoy = new Date();
    const inicio = fechaInicio || `${hoy.getFullYear()}-${hoy.getMonth() + 1}-01`;
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

    Devolucion.getResumenDevolucionesSinFiltros((err, results) => {
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

function VerificarVentaProducto(idVenta, idProducto, cantidad, callback) {
  const sql = `
    SELECT vd.precio_unitario, v.metodo_pago
    FROM venta_detalle vd
    JOIN ventas v ON vd.id_venta = v.id_venta
    WHERE vd.id_venta = ? AND vd.id_producto = ?
  `;

  connection.query(sql, [idVenta, idProducto], (err, results) => {
    if (err) {
      return callback(err);
    }
    
    if (results.length === 0) {
      return callback(new Error('El producto no se encuentra en la venta especificada'));
    }

    const ventaInfo = {
      precio_unitario: results[0].precio_unitario,
      metodo_pago: results[0].metodo_pago
    };

    callback(null, ventaInfo);
  });
}

module.exports = DevolucionController;
