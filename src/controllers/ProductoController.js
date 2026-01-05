const Producto = require('../models/Producto');

const ProductoController = {
  // Obtener todos los productos
  getAll: (req, res) => {
    Producto.findAll((err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener productos' });
      }
      res.json(results);
    });
  },

  // Obtener producto por ID
  getById: (req, res) => {
    const { id } = req.params;
    Producto.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener producto' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json(results[0]);
    });
  },

  // Obtener productos por categoría
  getByCategoria: (req, res) => {
    const { idCategoria } = req.params;
    Producto.findByCategoria(idCategoria, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener productos' });
      }
      res.json(results);
    });
  },

  // Buscar productos
  search: (req, res) => {
    const { termino } = req.query;
    if (!termino) {
      return res.status(400).json({ error: 'El término de búsqueda es requerido' });
    }
    Producto.search(termino, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al buscar productos' });
      }
      res.json(results);
    });
  },

  // Obtener productos con stock bajo
  getLowStock: (req, res) => {
    Producto.getLowStock((err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener productos' });
      }
      res.json(results);
    });
  },

  // Crear nuevo producto
  create: (req, res) => {
    const { nombre, descripcion, codigo, precio_compra, precio_venta, stock_actual, stock_minimo, id_categoria, id_proveedor, imagen, activo } = req.body;
    
    if (!nombre || !precio_venta) {
      return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' });
    }

    Producto.create({ 
      nombre, 
      descripcion, 
      codigo, 
      precio_compra, 
      precio_venta, 
      stock_actual, 
      stock_minimo, 
      id_categoria, 
      id_proveedor, 
      imagen, 
      activo 
    }, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Ya existe un producto con ese código' });
        }
        return res.status(500).json({ error: 'Error al crear producto' });
      }
      res.status(201).json({ message: 'Producto creado exitosamente', id: result.insertId });
    });
  },

  // Actualizar producto
  update: (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, codigo, precio_compra, precio_venta, stock_actual, stock_minimo, id_categoria, id_proveedor, imagen, activo } = req.body;
    
    if (!nombre || !precio_venta) {
      return res.status(400).json({ error: 'Nombre y precio de venta son requeridos' });
    }

    Producto.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar producto' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      Producto.update(id, { 
        nombre, 
        descripcion, 
        codigo, 
        precio_compra, 
        precio_venta, 
        stock_actual, 
        stock_minimo, 
        id_categoria, 
        id_proveedor, 
        imagen, 
        activo 
      }, (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe un producto con ese código' });
          }
          return res.status(500).json({ error: 'Error al actualizar producto' });
        }
        res.json({ message: 'Producto actualizado exitosamente' });
      });
    });
  },

  // Eliminar producto (soft delete)
  delete: (req, res) => {
    const { id } = req.params;
    
    Producto.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar producto' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      Producto.delete(id, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error al eliminar producto' });
        }
        res.json({ message: 'Producto eliminado exitosamente' });
      });
    });
  },

  // Actualizar stock de producto
  updateStock: (req, res) => {
    const { id } = req.params;
    const { cantidad } = req.body;
    
    if (cantidad === undefined || cantidad < 0) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    Producto.updateStock(id, cantidad, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error al actualizar stock' });
      }
      res.json({ message: 'Stock actualizado exitosamente' });
    });
  },

  // Obtener producto por código
  getByCodigo: (req, res) => {
    const { codigo } = req.params;
    Producto.findByCodigo(codigo, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener producto' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json(results[0]);
    });
  }
};

module.exports = ProductoController;