const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/login - Iniciar sesión
router.post('/login', AuthController.login);

// POST /api/auth/register - Registrar nuevo usuario
router.post('/register', AuthController.register);

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', authMiddleware, AuthController.logout);

// GET /api/auth/verify - Verificar token
router.get('/verify', authMiddleware, AuthController.verifyToken);

// POST /api/auth/change-password - Cambiar contraseña
router.post('/change-password', authMiddleware, AuthController.changePassword);

module.exports = router;
