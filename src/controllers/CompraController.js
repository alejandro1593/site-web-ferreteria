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

    const proveedorId = Number(id_proveedor);
    if (!Number.isInteger(proveedorId) || proveedorId <= 0) return res.status(400).json({ error: 'Proveedor inválido' });
    for (const p of productos) {
      const productoId = Number(p.id_producto);
      const cantidad = Number(p.cantidad);
      const precio = Number(p.precio_costo);
      if (!Number.isInteger(productoId) || productoId <= 0 || !Number.isInteger(cantidad) || cantidad <= 0 || !Number.isFinite(precio) || precio < 0) {
        return res.status(400).json({ error: 'Cada producto requiere id, cantidad entera positiva y precio de costo válido' });
      }
      p.id_producto = productoId;
      p.cantidad = cantidad;
      p.precio_costo = precio;
    }

    const total = productos.reduce((sum, p) => sum + p.cantidad * p.precio_costo, 0);

    const compraData = {
      id_proveedor: proveedorId,
      total,
      observaciones,
      id_usuario: req.user.id_usuario
    };

    Compra.create(compraData, productos, (err, idCompra) => {
      if (err) {
        const status = ['DUPLICATE_PRODUCT', 'PRODUCT_NOT_FOUND'].includes(err.code) ? 400 : 500;
        return res.status(status).json({ error: status === 400 ? err.message : 'Error al registrar la compra' });
      }
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
