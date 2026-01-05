const Proveedor = require('../models/Proveedor');

const ProveedorController = {
  // Obtener todos los proveedores
  getAll: (req, res) => {
    Proveedor.findAll((err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener proveedores' });
      }
      res.json(results);
    });
  },

  // Obtener proveedor por ID
  getById: (req, res) => {
    const { id } = req.params;
    Proveedor.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener proveedor' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Proveedor no encontrado' });
      }
      res.json(results[0]);
    });
  },

  // Crear nuevo proveedor
  create: (req, res) => {
    const { nombre, contacto, telefono, email, direccion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    Proveedor.create({ nombre, contacto, telefono, email, direccion }, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error al crear proveedor' });
      }
      res.status(201).json({ message: 'Proveedor creado exitosamente', id: result.insertId });
    });
  },

  // Actualizar proveedor
  update: (req, res) => {
    const { id } = req.params;
    const { nombre, contacto, telefono, email, direccion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    Proveedor.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar proveedor' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Proveedor no encontrado' });
      }

      Proveedor.update(id, { nombre, contacto, telefono, email, direccion }, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error al actualizar proveedor' });
        }
        res.json({ message: 'Proveedor actualizado exitosamente' });
      });
    });
  },

  // Eliminar proveedor
  delete: (req, res) => {
    const { id } = req.params;
    
    Proveedor.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar proveedor' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Proveedor no encontrado' });
      }

      Proveedor.delete(id, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error al eliminar proveedor' });
        }
        res.json({ message: 'Proveedor eliminado exitosamente' });
      });
    });
  },

  // Buscar proveedor por nombre
  search: (req, res) => {
    const { nombre } = req.query;
    if (!nombre) {
      return res.status(400).json({ error: 'El término de búsqueda es requerido' });
    }
    Proveedor.searchByName(nombre, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al buscar proveedores' });
      }
      res.json(results);
    });
  }
};

module.exports = ProveedorController;