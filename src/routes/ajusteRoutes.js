const express = require('express');
const router = express.Router();
const connection = require('../config/db_mysql');
const Ajuste = require('../models/Ajuste');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { registrarAccion } = require('../utils/audit');

const adminOGerente = roleMiddleware(['admin', 'gerente']);

// GET /api/ajustes - Historial de ajustes de inventario
router.get('/', authMiddleware, (req, res) => {
  Ajuste.findAll((err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener ajustes' });
    res.json(results);
  });
});

// POST /api/ajustes - Registrar ajuste de stock (conteo físico, merma, rotura)
router.post('/', authMiddleware, adminOGerente, (req, res) => {
  const { id_producto, stock_nuevo, motivo } = req.body || {};

  if (!id_producto || stock_nuevo === undefined || !motivo) {
    return res.status(400).json({ error: 'Producto, nuevo stock y motivo son requeridos' });
  }

  if (!Number.isInteger(Number(stock_nuevo)) || Number(stock_nuevo) < 0) {
    return res.status(400).json({ error: 'El nuevo stock debe ser un entero mayor o igual a 0' });
  }

  Ajuste.crear(id_producto, Number(stock_nuevo), motivo, req.user.id_usuario, (err, id) => {
    if (err) return res.status(400).json({ error: err.message || 'Error al registrar el ajuste' });
    registrarAccion(req, 'ajustar', 'producto', id_producto, `Stock ajustado a ${stock_nuevo}. Motivo: ${motivo}`);
    res.status(201).json({ message: 'Ajuste registrado exitosamente', id });
  });
});

module.exports = router;
