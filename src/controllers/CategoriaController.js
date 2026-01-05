const Categoria = require('../models/Categoria');

const CategoriaController = {
  // Obtener todas las categorías
  getAll: (req, res) => {
    Categoria.findAll((err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener categorías' });
      }
      res.json(results);
    });
  },

  // Obtener una categoría por ID
  getById: (req, res) => {
    const { id } = req.params;
    Categoria.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener categoría' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }
      res.json(results[0]);
    });
  },

  // Crear nueva categoría
  create: (req, res) => {
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    Categoria.create({ nombre, descripcion }, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
        }
        return res.status(500).json({ error: 'Error al crear categoría' });
      }
      res.status(201).json({ message: 'Categoría creada exitosamente', id: result.insertId });
    });
  },

  // Actualizar categoría
  update: (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    Categoria.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar categoría' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      Categoria.update(id, { nombre, descripcion }, (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
          }
          return res.status(500).json({ error: 'Error al actualizar categoría' });
        }
        res.json({ message: 'Categoría actualizada exitosamente' });
      });
    });
  },

  // Eliminar categoría
  delete: (req, res) => {
    const { id } = req.params;
    
    Categoria.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar categoría' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      Categoria.delete(id, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error al eliminar categoría' });
        }
        res.json({ message: 'Categoría eliminada exitosamente' });
      });
    });
  }
};

module.exports = CategoriaController;