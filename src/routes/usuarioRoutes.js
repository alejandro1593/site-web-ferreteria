const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/UsuarioController');

// GET /api/usuarios - Obtener todos los usuarios
router.get('/', UsuarioController.getAll);

// GET /api/usuarios/:id - Obtener un usuario por ID
router.get('/:id', UsuarioController.getById);

// POST /api/usuarios - Crear nuevo usuario
router.post('/', UsuarioController.create);

// PUT /api/usuarios/:id - Actualizar usuario
router.put('/:id', UsuarioController.update);

// DELETE /api/usuarios/:id - Eliminar usuario
router.delete('/:id', UsuarioController.delete);

// PUT /api/usuarios/:id/desactivar - Desactivar usuario
router.put('/:id/desactivar', UsuarioController.desactivar);

// PUT /api/usuarios/:id/activar - Activar usuario
router.put('/:id/activar', UsuarioController.activar);

// PUT /api/usuarios/:id/password - Cambiar password
router.put('/:id/password', UsuarioController.cambiarPassword);

module.exports = router;