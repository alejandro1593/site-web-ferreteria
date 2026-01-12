const Venta = require('../models/Venta');
const VentaDetalle = require('../models/VentaDetalle');
const Producto = require('../models/Producto');

const VentaController = {
  // Obtener todas las ventas
  getAll: (req, res) => {
    Venta.findAll((err, results) => {
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

  // Crear nueva venta
  create: (req, res) => {
    const { id_cliente, detalles, metodo_pago, descuento = 0 } = req.body || {};
    
    if (!detalles || detalles.length === 0) {
      return res.status(400).json({ error: 'Se debe incluir al menos un detalle' });
    }

    // Validar y procesar detalles
    let subtotal = 0;
    const promises = detalles.map(detalle => {
      return new Promise((resolve, reject) => {
        Producto.findById(detalle.id_producto, (err, results) => {
          if (err) {
            return reject(err);
          }
          if (results.length === 0) {
            return reject(new Error(`Producto ${detalle.id_producto} no encontrado`));
          }
          const producto = results[0];
          if (producto.stock_actual < detalle.cantidad) {
            return reject(new Error(`Stock insuficiente para ${producto.nombre}`));
          }
          detalle.precio_unitario = producto.precio_venta;
          detalle.subtotal = producto.precio_venta * detalle.cantidad;
          subtotal += detalle.subtotal;
          resolve(detalle);
        });
      });
    });

    Promise.all(promises)
      .then(() => {
        const iva = subtotal * 0.16; // 16% IVA
        const total = subtotal + iva - descuento;

          Venta.create({
            id_cliente,
            subtotal,
            iva,
            descuento,
            total,
            metodo_pago,
            estado: 'completada'
          }, (err, result) => {
            if (err) {
              return res.status(500).json({ error: 'Error al crear venta' });
            }

            const idVenta = result.insertId;

          // Crear detalles y actualizar stock
          const detallePromises = detalles.map(detalle => {
            return new Promise((resolve, reject) => {
              // Crear detalle
              VentaDetalle.create({
                id_venta: idVenta,
                id_producto: detalle.id_producto,
                cantidad: detalle.cantidad,
                precio_unitario: detalle.precio_unitario,
                subtotal: detalle.subtotal
              }, (err) => {
                if (err) {
                  return reject(err);
                }

                // Actualizar stock
                Producto.findById(detalle.id_producto, (err, results) => {
                  if (err) {
                    return reject(err);
                  }
                  const nuevoStock = results[0].stock_actual - detalle.cantidad;
                  Producto.updateStock(detalle.id_producto, nuevoStock, (err) => {
                    if (err) {
                      return reject(err);
                    }
                    resolve();
                  });
                });
              });
            });
          });

          Promise.all(detallePromises)
            .then(() => {
              res.status(201).json({ 
                message: 'Venta creada exitosamente', 
                id: idVenta,
                total 
              });
            })
            .catch(err => {
              res.status(500).json({ error: 'Error al crear detalles de venta' });
            });
        });
      })
      .catch(err => {
        res.status(400).json({ error: err.message || 'Error en el procesamiento de la venta' });
      });
  },

  // Eliminar venta
  delete: (req, res) => {
    const { id } = req.params;
    
    Venta.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar venta' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Venta no encontrada' });
      }

      Venta.delete(id, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error al eliminar venta' });
        }
        res.json({ message: 'Venta eliminada exitosamente' });
      });
    });
  }
};

module.exports = VentaController;