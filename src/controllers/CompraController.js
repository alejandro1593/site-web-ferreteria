const Compra = require('../models/Compra');
const { registrarAccion } = require('../utils/audit');

const CompraController = {
  getAll: (req, res) => {
    Compra.findAll((err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener compras' });
      res.json(results);
    });
  },

  getById: (req, res) => {
    Compra.findById(req.params.id, (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener compra' });
      if (results.length === 0) return res.status(404).json({ error: 'Compra no encontrada' });
      Compra.getDetalles(req.params.id, (err, detalles) => {
        if (err) return res.status(500).json({ error: 'Error al obtener detalles' });
        res.json({ ...results[0], detalles });
      });
    });
  },

  // Crear compra: aumenta stock y actualiza precio de costo
  create: (req, res) => {
    const { id_proveedor, observaciones, productos } = req.body || {};

    if (!id_proveedor || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: 'Proveedor y al menos un producto son requeridos' });
    }

    for (const p of productos) {
      if (!p.id_producto || !p.cantidad || p.cantidad <= 0 || !p.precio_costo || p.precio_costo < 0) {
        return res.status(400).json({ error: 'Cada producto requiere id, cantidad > 0 y precio de costo válido' });
      }
    }

    const total = productos.reduce((sum, p) => sum + p.cantidad * p.precio_costo, 0);

    const compraData = {
      id_proveedor,
      total,
      observaciones,
      id_usuario: req.user.id_usuario
    };

    Compra.create(compraData, productos, (err, idCompra) => {
      if (err) return res.status(500).json({ error: 'Error al registrar la compra' });
      registrarAccion(req, 'crear', 'compra', idCompra, `Compra por ${total}`);
      res.status(201).json({ message: 'Compra registrada exitosamente', id: idCompra, total });
    });
  },

  // Anular compra: descuenta el stock que había ingresado
  anular: (req, res) => {
    Compra.anular(req.params.id, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'No se pudo anular la compra' });
      registrarAccion(req, 'anular', 'compra', req.params.id);
      res.json({ message: 'Compra anulada exitosamente' });
    });
  }
};

module.exports = CompraController;
