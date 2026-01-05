const Cliente = require('../models/Cliente');

const ClienteController = {
  // Obtener todos los clientes
  getAll: (req, res) => {
    Cliente.findAll((err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener clientes' });
      }
      res.json(results);
    });
  },

  // Obtener cliente por ID
  getById: (req, res) => {
    const { id } = req.params;
    Cliente.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener cliente' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      res.json(results[0]);
    });
  },

  // Crear nuevo cliente
  create: (req, res) => {
    const { nombre, apellido, dni, telefono, email, direccion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    Cliente.create({ nombre, apellido, dni, telefono, email, direccion }, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Ya existe un cliente con ese DNI' });
        }
        return res.status(500).json({ error: 'Error al crear cliente' });
      }
      res.status(201).json({ message: 'Cliente creado exitosamente', id: result.insertId });
    });
  },

  // Actualizar cliente
  update: (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, dni, telefono, email, direccion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    Cliente.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar cliente' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      Cliente.update(id, { nombre, apellido, dni, telefono, email, direccion }, (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe un cliente con ese DNI' });
          }
          return res.status(500).json({ error: 'Error al actualizar cliente' });
        }
        res.json({ message: 'Cliente actualizado exitosamente' });
      });
    });
  },

  // Eliminar cliente
  delete: (req, res) => {
    const { id } = req.params;
    
    Cliente.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar cliente' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      Cliente.delete(id, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error al eliminar cliente' });
        }
        res.json({ message: 'Cliente eliminado exitosamente' });
      });
    });
  },

  // Buscar cliente por nombre, apellido o DNI
  search: (req, res) => {
    const { termino } = req.query;
    if (!termino) {
      return res.status(400).json({ error: 'El término de búsqueda es requerido' });
    }
    Cliente.search(termino, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al buscar clientes' });
      }
      res.json(results);
    });
  },

  // Obtener cliente por DNI
  getByDni: (req, res) => {
    const { dni } = req.params;
    Cliente.findByDni(dni, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener cliente' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      res.json(results[0]);
    });
  }
};

module.exports = ClienteController;