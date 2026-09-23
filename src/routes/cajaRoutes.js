const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const CajaController = require('../controllers/CajaController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const financeRoles = roleMiddleware(['admin', 'gerente', 'supervisor', 'cajero']);
const cashRoles = roleMiddleware(['admin', 'gerente', 'supervisor', 'cajero']);
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Demasiados intentos. Espere 15 minutos' }
});

router.get('/', authMiddleware, financeRoles, CajaController.getAll);
router.get('/abierta', authMiddleware, cashRoles, CajaController.getAbierta);
router.get('/cerradas', authMiddleware, financeRoles, CajaController.getCajasCerradas);
router.get('/:id', authMiddleware, financeRoles, CajaController.getById);
router.get('/:id/ventas', authMiddleware, financeRoles, CajaController.getVentasCaja);
router.get('/:id/devoluciones', authMiddleware, financeRoles, CajaController.getDevolucionesCaja);
router.get('/:id/resumen', authMiddleware, financeRoles, CajaController.getResumenCaja);
router.post('/abrir', authMiddleware, cashRoles, sensitiveLimiter, CajaController.abrirCaja);
router.post('/cerrar', authMiddleware, cashRoles, sensitiveLimiter, CajaController.cerrarCaja);

module.exports = router;
