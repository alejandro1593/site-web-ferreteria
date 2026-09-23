const express = require('express');
const router = express.Router();
const connection = require('../config/db_postgres');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// GET /api/logs - Ver auditoría de acciones (solo admin)
router.get('/', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  connection.query(
    'SELECT * FROM log_acciones ORDER BY fecha DESC LIMIT 300',
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener logs' });
      res.json(results);
    }
  );
});

module.exports = router;
