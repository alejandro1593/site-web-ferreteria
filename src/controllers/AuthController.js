const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const connection = require('../config/db_mysql');

const AuthController = {
  // Login de usuario
  login: async (req, res) => {
    const { username, password } = req.body || {};

    console.log('Intento de login para username:', username);

    // Validar campos requeridos
    if (!username || !password) {
      console.log('Error: Username y password son requeridos');
      return res.status(400).json({ error: 'Username y password son requeridos' });
    }

    try {
      // Buscar usuario por username usando promesa
      const [results] = await connection.promise().query(
        'SELECT * FROM usuarios WHERE username = ?',
        [username]
      );

      console.log('Usuario encontrado:', results.length > 0 ? 'Sí' : 'No');

      if (results.length === 0) {
        console.log('Error: Usuario no encontrado');
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const usuario = results[0];

      // Verificar si el usuario está activo
      if (!usuario.activo) {
        console.log('Error: Usuario inactivo');
        return res.status(401).json({ error: 'Usuario inactivo. Contacte al administrador' });
      }

      // Comparar contraseña hasheada
      const passwordValida = await bcrypt.compare(password, usuario.password);
      console.log('Contraseña válida:', passwordValida);

      if (!passwordValida) {
        console.log('Error: Contraseña inválida');
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Generar token JWT
      const token = jwt.sign(
        {
          id_usuario: usuario.id_usuario,
          username: usuario.username,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      console.log('Token generado exitosamente');

      // Preparar datos de respuesta (sin password)
      const usuarioResponse = {
        id_usuario: usuario.id_usuario,
        username: usuario.username,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo
      };

      res.json({
        message: 'Login exitoso',
        token,
        usuario: usuarioResponse
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Registro de nuevo usuario
  register: (req, res) => {
    const { username, password, nombre, email, rol } = req.body || {};

    // Validar campos requeridos
    if (!username || !password || !nombre) {
      return res.status(400).json({ error: 'Username, password y nombre son requeridos' });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Hash de la contraseña antes de guardar
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Error al hashear contraseña:', err);
        return res.status(500).json({ error: 'Error en el servidor' });
      }

      // Crear usuario con contraseña hasheada
      Usuario.create({
        username,
        password: hashedPassword,
        nombre,
        email,
        rol: rol || 'vendedor'
      }, (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El username o email ya existe' });
          }
          return res.status(500).json({ error: 'Error al crear usuario' });
        }

        res.status(201).json({
          message: 'Usuario registrado exitosamente',
          id: result.insertId
        });
      });
    });
  },

  // Verificar token (para validar si sigue siendo válido)
  verifyToken: (req, res) => {
    // El token ya fue verificado por el middleware de autenticación
    // Solo retornamos la información del usuario decodificada
    res.json({
      valid: true,
      usuario: req.user
    });
  },

  // Logout (en JWT se hace del lado del cliente eliminando el token)
  logout: (req, res) => {
    res.json({ message: 'Logout exitoso' });
  },

  // Cambiar contraseña
  changePassword: (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    const userId = req.user.id_usuario; // ID del usuario autenticado

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Obtener usuario actual
    Usuario.findById(userId, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error en el servidor' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const usuario = results[0];

      // Verificar contraseña actual
      bcrypt.compare(oldPassword, usuario.password, (err, isValid) => {
        if (err) {
          return res.status(500).json({ error: 'Error en el servidor' });
        }

        if (!isValid) {
          return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        // Hash de la nueva contraseña
        bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
          if (err) {
            return res.status(500).json({ error: 'Error en el servidor' });
          }

          // Actualizar contraseña
          Usuario.updatePassword(userId, hashedPassword, (err) => {
            if (err) {
              return res.status(500).json({ error: 'Error al actualizar contraseña' });
            }

            res.json({ message: 'Contraseña actualizada exitosamente' });
          });
        });
      });
    });
  }
};

module.exports = AuthController;
