const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No se proporcionó token de autenticación' });
    }

    // El formato debe ser: "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Formato de token inválido' });
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Agregar la información del usuario decodificada al objeto request
    req.user = decoded;

    // Continuar al siguiente middleware
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(500).json({ error: 'Error en la autenticación' });
  }
};

// Middleware para verificar roles
const roleMiddleware = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos suficientes' });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  roleMiddleware
};
