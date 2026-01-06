const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/UsuarioController');
const { authMiddleware } = require('../middleware/auth');

// GET /api/usuarios - Obtener todos los usuarios
router.get('/', authMiddleware, UsuarioController.getAll);

// GET /api/usuarios/:id - Obtener un usuario por ID
router.get('/:id', authMiddleware, UsuarioController.getById);

// POST /api/usuarios - Crear nuevo usuario
router.post('/', authMiddleware, UsuarioController.create);

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', authMiddleware, UsuarioController.update);

// DELETE /api/usuarios/:id - Eliminar usuario
router.delete('/:id', authMiddleware, UsuarioController.delete);

// PUT /api/usuarios/:id/desactivar - Desactivar usuario
router.put('/:id/desactivar', authMiddleware, UsuarioController.desactivar);

// PUT /api/usuarios/:id/activar - Activar usuario
router.put('/:id/activar', authMiddleware, UsuarioController.activar);

// PUT /api/usuarios/:id/password - Cambiar password
router.put('/:id/password', authMiddleware, UsuarioController.cambiarPassword);

module.exports = router;