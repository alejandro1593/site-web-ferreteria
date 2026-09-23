const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No se proporcionó token de autenticación' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Formato de token inválido' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const idUsuario = Number(decoded.id_usuario || decoded.id);
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) return res.status(401).json({ error: 'Token inválido' });

    Usuario.findById(idUsuario, (error, rows) => {
      if (error) return res.status(500).json({ error: 'Error en la autenticación' });
      const usuario = rows[0];
      if (!usuario || !usuario.activo) return res.status(401).json({ error: 'Sesión inválida' });
      if (Number(decoded.token_version || 0) !== Number(usuario.token_version || 0)) return res.status(401).json({ error: 'Sesión expirada' });

      req.user = {
        ...decoded,
        id_usuario: idUsuario,
        username: usuario.username,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo,
        token_version: Number(usuario.token_version || 0)
      };
      next();
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Token inválido' });
    if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expirado' });
    return res.status(500).json({ error: 'Error en la autenticación' });
  }
};

const roleMiddleware = (rolesPermitidos) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado' });
  if (!rolesPermitidos.includes(req.user.rol)) return res.status(403).json({ error: 'No tienes permisos suficientes' });
  next();
};

module.exports = { authMiddleware, roleMiddleware };
