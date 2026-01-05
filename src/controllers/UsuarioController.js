const Usuario = require('../models/Usuario');
const bcrypt = require('bcrypt');

const UsuarioController = {
  // Obtener todos los usuarios (sin password)
  getAll: (req, res) => {
    Usuario.findAll((err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener usuarios' });
      }
      res.json(results);
    });
  },

  // Obtener usuario por ID (sin password)
  getById: (req, res) => {
    const { id } = req.params;
    Usuario.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener usuario' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.json(results[0]);
    });
  },

  // Crear nuevo usuario
  create: async (req, res) => {
    const { username, password, nombre, email, rol, activo } = req.body;
    
    if (!username || !password || !nombre) {
      return res.status(400).json({ error: 'Username, password y nombre son requeridos' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      Usuario.create({ 
        username, 
        password: hashedPassword, 
        nombre, 
        email, 
        rol: rol || 'vendedor', 
        activo 
      }, (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe un usuario con ese username o email' });
          }
          return res.status(500).json({ error: 'Error al crear usuario' });
        }
        res.status(201).json({ message: 'Usuario creado exitosamente', id: result.insertId });
      });
    } catch (error) {
      return res.status(500).json({ error: 'Error al encriptar password' });
    }
  },

  // Actualizar usuario
  update: (req, res) => {
    const { id } = req.params;
    const { username, nombre, email, rol, activo } = req.body;
    
    if (!username || !nombre) {
      return res.status(400).json({ error: 'Username y nombre son requeridos' });
    }

    Usuario.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar usuario' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      Usuario.update(id, { username, nombre, email, rol, activo }, (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe un usuario con ese username o email' });
          }
          return res.status(500).json({ error: 'Error al actualizar usuario' });
        }
        res.json({ message: 'Usuario actualizado exitosamente' });
      });
    });
  },

  // Eliminar usuario
  delete: (req, res) => {
    const { id } = req.params;
    
    Usuario.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar usuario' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      Usuario.delete(id, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error al eliminar usuario' });
        }
        res.json({ message: 'Usuario eliminado exitosamente' });
      });
    });
  },

  // Desactivar usuario
  desactivar: (req, res) => {
    const { id } = req.params;
    
    Usuario.desactivar(id, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error al desactivar usuario' });
      }
      res.json({ message: 'Usuario desactivado exitosamente' });
    });
  },

  // Activar usuario
  activar: (req, res) => {
    const { id } = req.params;
    
    Usuario.activar(id, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error al activar usuario' });
      }
      res.json({ message: 'Usuario activado exitosamente' });
    });
  },

  // Cambiar password
  cambiarPassword: async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'El password es requerido' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      Usuario.updatePassword(id, hashedPassword, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error al actualizar password' });
        }
        res.json({ message: 'Password actualizado exitosamente' });
      });
    } catch (error) {
      return res.status(500).json({ error: 'Error al encriptar password' });
    }
  }
};

module.exports = UsuarioController;