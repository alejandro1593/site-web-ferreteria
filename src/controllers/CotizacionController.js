const Cotizacion = require('../models/Cotizacion');
const CotizacionDetalle = require('../models/CotizacionDetalle');
const Venta = require('../models/Venta');
const VentaDetalle = require('../models/VentaDetalle');
const Producto = require('../models/Producto');

const CotizacionController = {
  getAll: (req, res) => {
    const { id_cliente, estado } = req.query;
    
    const filters = {};
    if (id_cliente) filters.id_cliente = id_cliente;
    if (estado) filters.estado = estado;
    
    if (Object.keys(filters).length > 0) {
      Cotizacion.findWithFilters(filters, (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Error al obtener cotizaciones' });
        }
        res.json(results);
      });
    } else {
      Cotizacion.findAll((err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Error al obtener cotizaciones' });
        }
        res.json(results);
      });
    }
  },

  getById: (req, res) => {
    const { id } = req.params;
    Cotizacion.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener cotizacion' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Cotizacion no encontrada' });
      }
      res.json(results[0]);
    });
  },

  getByCliente: (req, res) => {
    const { idCliente } = req.params;
    Cotizacion.findByCliente(idCliente, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener cotizaciones del cliente' });
      }
      res.json(results);
    });
  },

  create: (req, res) => {
    const userInfo = req.user;
    const { 
      id_cliente, 
      detalles, 
      fecha_validez, 
      observaciones 
    } = req.body || {};
    
    console.log('=== INICIO CREAR COTIZACIÓN ===');
    console.log('Usuario:', userInfo);
    console.log('Usuario ID:', userInfo?.id_usuario);
    console.log('ID Cliente:', id_cliente);
    console.log('Detalles:', detalles);
    console.log('Fecha Validez:', fecha_validez);
    console.log('Observaciones:', observaciones);
    
    if (!userInfo || !userInfo.id_usuario) {
      console.log('Error: No hay información de usuario');
      return res.status(401).json({ error: 'Usuario no autenticado correctamente' });
    }
    
    if (!detalles || detalles.length === 0) {
      console.log('Error: No hay detalles');
      return res.status(400).json({ error: 'Se debe incluir al menos un detalle' });
    }

    if (!id_cliente) {
      console.log('Error: No hay cliente');
      return res.status(400).json({ error: 'ID de cliente es requerido' });
    }

    CalcularTotales(detalles, (err, totales) => {
      if (err) {
        console.log('Error en CalcularTotales:', err);
        return res.status(400).json({ error: err.message });
      }

      const cotizacionData = {
        id_cliente,
        fecha_validez,
        subtotal: totales.subtotal,
        iva: totales.iva,
        descuento: totales.descuento,
        total: totales.total,
        estado: 'pendiente',
        observaciones,
        id_usuario: userInfo.id_usuario || userInfo.id
      };

      console.log('Datos de cotización a guardar:', cotizacionData);

        Cotizacion.create(cotizacionData, (err, result) => {
          if (err) {
            console.log('Error al crear cotización:', err);
            console.log('Error code:', err.code);
            console.log('Error message:', err.message);
            return res.status(500).json({ error: 'Error al crear cotizacion', details: err.message });
          }

          const idCotizacion = result.insertId;
          const totalFinal = totales.total;
          console.log('✅ Cotización creada con ID:', idCotizacion);

          const detallePromises = detalles.map(detalle => {
            return new Promise((resolve, reject) => {
              console.log('Creando detalle para producto:', detalle.id_producto);
              CotizacionDetalle.create({
                id_cotizacion: idCotizacion,
                id_producto: detalle.id_producto,
                cantidad: detalle.cantidad,
                precio_unitario: detalle.precio_unitario,
                descuento_producto: detalle.descuento || 0,
                subtotal: detalle.subtotal
              }, (err) => {
                if (err) {
                  console.log('❌ Error al crear detalle:', err);
                  reject(err);
                } else {
                  console.log('✅ Detalle creado para producto:', detalle.id_producto);
                  resolve();
                }
              });
            });
          });

          Promise.all(detallePromises)
            .then(() => {
              console.log('✅ Todos los detalles creados exitosamente');
              res.status(201).json({
                message: 'Cotizacion creada exitosamente',
                id: idCotizacion,
                total: totalFinal
              });
            })
            .catch(err => {
              console.log('❌ Error al crear detalles:', err);
              console.log('❌ Error details:', err.message);
              
              Cotizacion.delete(idCotizacion, () => {
                console.log('🗑️ Cotización eliminada por error en detalles');
              });
              
              res.status(500).json({ error: 'Error al crear detalles de cotizacion', details: err.message });
            });
        });
    });
  },

  update: (req, res) => {
    const { id } = req.params;
    const { estado, fecha_validez, observaciones } = req.body || {};

    const updateData = {};
    if (estado !== undefined) updateData.estado = estado;
    if (fecha_validez !== undefined) updateData.fecha_validez = fecha_validez;
    if (observaciones !== undefined) updateData.observaciones = observaciones;

    Cotizacion.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar cotizacion' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Cotizacion no encontrada' });
      }

      Cotizacion.update(id, updateData, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error al actualizar cotizacion' });
        }
        
        res.json({ message: 'Cotizacion actualizada exitosamente' });
      });
    });
  },

  delete: (req, res) => {
    const { id } = req.params;

    Cotizacion.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar cotizacion' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Cotizacion no encontrada' });
      }

      Cotizacion.delete(id, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error al eliminar cotizacion' });
        }

        res.json({ message: 'Cotizacion eliminada exitosamente' });
      });
    });
  },

  getDetalles: (req, res) => {
    const { id } = req.params;
    CotizacionDetalle.findByIdCotizacion(id, (err, detalles) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener detalles de cotizacion' });
      }
      res.json(detalles);
    });
  },

  getResumen: (req, res) => {
    const { fechaInicio, fechaFin, todas } = req.query;
    
    const hoy = new Date();
    
    let inicio = null;
    let fin = null;
    
    if (todas === 'true' || (!fechaInicio && !fechaFin)) {
      inicio = null;
      fin = null;
    } else {
      inicio = fechaInicio || `${hoy.getFullYear()}-${hoy.getMonth() + 1}-01`;
      fin = fechaFin || hoy.toISOString().split('T')[0];
    }
    
    Cotizacion.getResumenPeriodo(inicio, fin, (err, results) => {
      if (err) {
        console.error('Error en getResumen:', err);
        return res.status(500).json({ error: 'Error al obtener resumen de cotizaciones' });
      }

      if (results.length === 0) {
        return res.json({
          total_cotizaciones: 0,
          total_cotizado: 0,
          promedio_cotizacion: 0,
          pendientes: 0,
          aprobadas: 0,
          rechazadas: 0,
          convertidas: 0
        });
      }

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

  convertirAVenta: (req, res) => {
    const { id } = req.params;
    const { metodo_pago } = req.body || {};

    console.log('=== INICIO CONVERTIR COTIZACIÓN A VENTA ===');
    console.log('ID Cotización:', id);
    console.log('Método de pago:', metodo_pago);

    Cotizacion.findById(id, (err, results) => {
      if (err) {
        console.error('Error al buscar cotización:', err);
        return res.status(500).json({ error: 'Error al buscar cotización', details: err.message });
      }

      if (results.length === 0) {
        console.log('❌ Cotización no encontrada');
        return res.status(404).json({ error: 'Cotización no encontrada' });
      }

      const cotizacion = results[0];
      console.log('✅ Cotización encontrada:', cotizacion);
      console.log('Estado de la cotización:', cotizacion.estado);

      if (cotizacion.estado === 'convertida') {
        console.log('❌ La cotización ya está convertida');
        return res.status(400).json({ error: 'Esta cotización ya fue convertida en venta' });
      }

      CotizacionDetalle.findByIdCotizacion(id, (err, detalles) => {
        if (err) {
          console.error('Error al obtener detalles:', err);
          return res.status(500).json({ error: 'Error al obtener detalles de cotización', details: err.message });
        }

        console.log('📦 Detalles encontrados:', detalles);
        console.log('Número de detalles:', detalles ? detalles.length : 0);

        if (!detalles || detalles.length === 0) {
          console.log('❌ La cotización no tiene productos');
          return res.status(400).json({ error: 'La cotización no tiene productos' });
        }

        const ventaData = {
          id_cliente: cotizacion.id_cliente,
          subtotal: cotizacion.subtotal,
          iva: cotizacion.iva,
          descuento: cotizacion.descuento,
          total: cotizacion.total,
          metodo_pago: metodo_pago || 'efectivo',
          estado: 'completada'
        };

        console.log('💰 Datos de venta a crear:', ventaData);

        Venta.create(ventaData, (err, ventaResult) => {
          if (err) {
            console.error('❌ Error al crear venta:', err);
            console.error('Error code:', err.code);
            console.error('Error message:', err.message);
            return res.status(500).json({ error: 'Error al crear venta', details: err.message });
          }

          const idVenta = ventaResult.insertId;
          console.log('✅ Venta creada con ID:', idVenta);

          const detallePromises = detalles.map(detalle => {
            return new Promise((resolve, reject) => {
              console.log('Procesando detalle:', detalle);
              
              VentaDetalle.create({
                id_venta: idVenta,
                id_producto: detalle.id_producto,
                cantidad: detalle.cantidad,
                precio_unitario: detalle.precio_unitario,
                subtotal: detalle.subtotal
              }, (err) => {
                if (err) {
                  console.error('❌ Error al crear detalle de venta:', err);
                  return reject(err);
                }

                Producto.findById(detalle.id_producto, (err, prodResults) => {
                  if (err) {
                    console.error('❌ Error al buscar producto:', err);
                    return reject(err);
                  }
                  
                  if (prodResults.length > 0) {
                    const producto = prodResults[0];
                    const stockActual = producto.stock_actual;
                    const nuevoStock = stockActual - detalle.cantidad;
                    
                    console.log(`Producto ${detalle.id_producto}: Stock actual ${stockActual}, Cantidad ${detalle.cantidad}, Nuevo stock ${nuevoStock}`);
                    
                    if (nuevoStock < 0) {
                      console.error('❌ Stock insuficiente para producto', detalle.id_producto);
                      return reject(new Error(`Stock insuficiente para ${producto.nombre}`));
                    }
                    
                    Producto.updateStock(detalle.id_producto, nuevoStock, (err) => {
                      if (err) {
                        console.error('❌ Error al actualizar stock:', err);
                        return reject(err);
                      }
                      console.log(`✅ Stock actualizado para producto ${detalle.id_producto}`);
                      resolve();
                    });
                  } else {
                    console.log('⚠️ Producto no encontrado, saltando actualización de stock');
                    resolve();
                  }
                });
              });
            });
          });

          Promise.all(detallePromises)
            .then(() => {
              console.log('✅ Todos los detalles procesados correctamente');
              
              Cotizacion.update(id, { estado: 'convertida' }, (err) => {
                if (err) {
                  console.error('⚠️ Error al actualizar estado de cotización:', err);
                } else {
                  console.log('✅ Estado de cotización actualizado a convertida');
                }
              });

              res.status(201).json({
                message: 'Cotización convertida a venta exitosamente',
                id_venta: idVenta,
                id_cotizacion: id
              });
            })
            .catch(err => {
              console.error('❌ Error al procesar detalles:', err);
              res.status(400).json({ error: err.message || 'Error al procesar detalles de venta', details: err.message });
            });
        });
      });
    });
  }
};

function CalcularTotales(detalles, callback) {
  try {
    let subtotal = 0;
    
    detalles.forEach(detalle => {
      const subtotalItem = parseFloat(detalle.subtotal) || 0;
      subtotal += subtotalItem;
    });

    const descuentoGlobal = 0;
    const subtotalFinal = subtotal - descuentoGlobal;
    const iva = subtotalFinal * 0.16;
    const total = subtotalFinal + iva;

    callback(null, {
      subtotal: subtotalFinal,
      descuento: descuentoGlobal,
      iva: iva,
      total: total
    });
  } catch (error) {
    callback(error);
  }
}

module.exports = CotizacionController;
