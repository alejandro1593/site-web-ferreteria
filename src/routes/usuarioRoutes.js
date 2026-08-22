const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/UsuarioController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const soloAdmin = roleMiddleware(['admin']);
const adminOGerente = roleMiddleware(['admin', 'gerente']);

// GET /api/usuarios - Obtener todos los usuarios
router.get('/', authMiddleware, adminOGerente, UsuarioController.getAll);

// GET /api/usuarios/:id - Obtener un usuario por ID
router.get('/:id', authMiddleware, adminOGerente, UsuarioController.getById);

// POST /api/usuarios - Crear nuevo usuario (solo admin)
router.post('/', authMiddleware, soloAdmin, UsuarioController.create);

// PUT /api/usuarios/:id - Actualizar usuario (solo admin)
router.put('/:id', authMiddleware, soloAdmin, UsuarioController.update);

// DELETE /api/usuarios/:id - Eliminar usuario (solo admin)
router.delete('/:id', authMiddleware, soloAdmin, UsuarioController.delete);

// PUT /api/usuarios/:id/desactivar - Desactivar usuario (solo admin)
router.put('/:id/desactivar', authMiddleware, soloAdmin, UsuarioController.desactivar);

// PUT /api/usuarios/:id/activar - Activar usuario (solo admin)
router.put('/:id/activar', authMiddleware, soloAdmin, UsuarioController.activar);

// PUT /api/usuarios/:id/password - Cambiar password (solo admin)
router.put('/:id/password', authMiddleware, soloAdmin, UsuarioController.cambiarPassword);

module.exports = router;
