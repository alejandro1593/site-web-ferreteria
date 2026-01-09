const VentaDetalle = require('../models/VentaDetalle');

const VentaDetalleController = {
  // Obtener detalles de una venta
  getByIdVenta: (req, res) => {
    const { idVenta } = req.params;
    VentaDetalle.findByIdVenta(idVenta, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener detalles de venta' });
      }
      res.json(results);
    });
  },

  // Obtener historial de ventas de un producto
  getByProducto: (req, res) => {
    const { idProducto } = req.params;
    VentaDetalle.findByProducto(idProducto, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener historial de ventas' });
      }
      res.json(results);
    });
  },

  // Obtener productos más vendidos
  getTopProductos: (req, res) => {
    const { limit = 10 } = req.query;
    VentaDetalle.getTopProductos(parseInt(limit), (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener productos más vendidos' });
      }
      res.json(results);
    });
  },

  // Obtener productos más vendidos por categoría
  getTopProductosPorCategoria: (req, res) => {
    VentaDetalle.getTopProductosPorCategoria((err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener productos por categoría' });
      }
      res.json(results);
    });
  },

  // Obtener ventas por categoría
  getVentasPorCategoria: (req, res) => {
    VentaDetalle.getVentasPorCategoria((err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener ventas por categoría' });
      }
      res.json(results);
    });
  }
};

module.exports = VentaDetalleController;