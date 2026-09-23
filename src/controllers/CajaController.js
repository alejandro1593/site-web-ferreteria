const connection = require('../config/db_postgres');
const bcrypt = require('bcryptjs');
const Caja = require('../models/Caja');
const Usuario = require('../models/Usuario');
const { registrarAccion } = require('../utils/audit');

function usuarioActual(req) {
  return Number(req.user && req.user.id_usuario);
}

function montoValido(value, required = true) {
  if ((value === undefined || value === null || value === '') && !required) return 0;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function puedeAccederCaja(req, caja) {
  return caja && (['admin', 'gerente', 'supervisor'].includes(req.user.rol) || Number(caja.id_usuario) === Number(req.user.id_usuario));
}

const CajaController = {
  getAll: (req, res) => {
    Caja.findAll((err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener cajas' });
      const visibles = req.user.rol === 'cajero' ? results.filter((caja) => Number(caja.id_usuario) === Number(req.user.id_usuario)) : results;
      res.json(visibles);
    });
  },

  getById: (req, res) => {
    Caja.findById(req.params.id, (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener caja' });
      if (results.length === 0) return res.status(404).json({ error: 'Caja no encontrada' });
      if (!puedeAccederCaja(req, results[0])) return res.status(403).json({ error: 'No tiene acceso a esta caja' });
      res.json(results[0]);
    });
  },

  getAbierta: (req, res) => {
    const idUsuario = usuarioActual(req);
    if (!idUsuario) return res.status(401).json({ error: 'Usuario no autenticado' });
    Caja.findAbierta(idUsuario, (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener caja abierta' });
      res.json(results[0] || null);
    });
  },

  abrirCaja: async (req, res) => {
    const idUsuario = usuarioActual(req);
    const password = req.body?.password;
    const montoApertura = montoValido(req.body?.monto_apertura, false);
    if (!idUsuario || !password || montoApertura === null) return res.status(400).json({ error: 'Password y monto de apertura válido son requeridos' });

    try {
      const usuario = await new Promise((resolve, reject) => Usuario.findByIdWithPassword(idUsuario, (err, rows) => err ? reject(err) : resolve(rows[0])));
      if (!usuario || !usuario.activo) return res.status(403).json({ error: 'Usuario no disponible' });
      const validPassword = await bcrypt.compare(password, usuario.password);
      if (!validPassword) return res.status(401).json({ error: 'Password incorrecto' });

      const abierta = await new Promise((resolve, reject) => Caja.findAbierta(idUsuario, (err, rows) => err ? reject(err) : resolve(rows[0])));
      if (abierta) return res.status(409).json({ error: 'Ya existe una caja abierta para este usuario' });

      const idCaja = await new Promise((resolve, reject) => Caja.create({ id_usuario: idUsuario, monto_apertura: montoApertura, observaciones: req.body?.observaciones || '' }, (err, rows) => err ? reject(err) : resolve(rows.insertId)));
      registrarAccion(req, 'abrir', 'caja', idCaja, `Monto ${montoApertura}`);
      res.status(201).json({ message: 'Caja abierta exitosamente', id: idCaja });
    } catch (error) {
      if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe una caja abierta para este usuario' });
      res.status(500).json({ error: 'Error al abrir caja' });
    }
  },

  cerrarCaja: async (req, res) => {
    const idUsuario = usuarioActual(req);
    const password = req.body?.password;
    const montoCierre = montoValido(req.body?.monto_cierre);
    if (!idUsuario || !password || montoCierre === null) return res.status(400).json({ error: 'Password y monto de cierre válido son requeridos' });

    try {
      const usuario = await new Promise((resolve, reject) => Usuario.findByIdWithPassword(idUsuario, (err, rows) => err ? reject(err) : resolve(rows[0])));
      if (!usuario || !usuario.activo) return res.status(403).json({ error: 'Usuario no disponible' });
      const validPassword = await bcrypt.compare(password, usuario.password);
      if (!validPassword) return res.status(401).json({ error: 'Password incorrecto' });

      const caja = await new Promise((resolve, reject) => Caja.findAbierta(idUsuario, (err, rows) => err ? reject(err) : resolve(rows[0])));
      if (!caja) return res.status(400).json({ error: 'No hay caja abierta para este usuario' });
      const resumen = await new Promise((resolve, reject) => Caja.getResumenCaja(caja.id_caja, (err, rows) => err ? reject(err) : resolve(rows[0] || {})));
      const montoEsperado = Number(caja.monto_apertura) + Number(resumen.total_ventas || 0) + Number(resumen.total_abonos || 0) - Number(resumen.total_devoluciones || 0);
      const result = await new Promise((resolve, reject) => Caja.updateCierre(caja.id_caja, { monto_cierre: montoCierre, monto_esperado: montoEsperado, observaciones: req.body?.observaciones || '' }, (err, rows) => err ? reject(err) : resolve(rows)));
      if (result.affectedRows === 0) return res.status(409).json({ error: 'La caja ya fue cerrada' });
      registrarAccion(req, 'cerrar', 'caja', caja.id_caja, `Diferencia ${montoCierre - montoEsperado}`);
      res.json({ message: 'Caja cerrada exitosamente', monto_cierre: montoCierre, monto_esperado: montoEsperado, diferencia: Number((montoCierre - montoEsperado).toFixed(2)) });
    } catch (error) {
      res.status(500).json({ error: 'Error al cerrar caja' });
    }
  },

  getVentasCaja: (req, res) => {
    Caja.findById(req.params.id, (error, cajas) => {
      if (error) return res.status(500).json({ error: 'Error al verificar caja' });
      if (cajas.length === 0) return res.status(404).json({ error: 'Caja no encontrada' });
      if (!puedeAccederCaja(req, cajas[0])) return res.status(403).json({ error: 'No tiene acceso a esta caja' });
      Caja.getVentasCaja(req.params.id, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener ventas de la caja' });
        res.json(results);
      });
    });
  },

  getDevolucionesCaja: (req, res) => {
    Caja.findById(req.params.id, (error, cajas) => {
      if (error) return res.status(500).json({ error: 'Error al verificar caja' });
      if (cajas.length === 0) return res.status(404).json({ error: 'Caja no encontrada' });
      if (!puedeAccederCaja(req, cajas[0])) return res.status(403).json({ error: 'No tiene acceso a esta caja' });
      Caja.getDevolucionesCaja(req.params.id, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener devoluciones de la caja' });
        res.json(results);
      });
    });
  },

  getResumenCaja: async (req, res) => {
    try {
      const [caja, resumen] = await Promise.all([
        new Promise((resolve, reject) => Caja.findById(req.params.id, (err, rows) => err ? reject(err) : resolve(rows[0]))),
        new Promise((resolve, reject) => Caja.getResumenCaja(req.params.id, (err, rows) => err ? reject(err) : resolve(rows[0] || {})))
      ]);
       if (!caja) return res.status(404).json({ error: 'Caja no encontrada' });
       if (!puedeAccederCaja(req, caja)) return res.status(403).json({ error: 'No tiene acceso a esta caja' });
       res.json({ ...caja, resumen });
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener resumen de caja' });
    }
  },

  getCajasCerradas: (req, res) => {
    const { id_usuario, fecha_inicio, fecha_fin } = req.query;
    let sql = `
      SELECT c.*, u.nombre as usuario_nombre,
        COALESCE((SELECT SUM(v.total) FROM ventas v WHERE v.id_caja = c.id_caja AND v.estado = 'completada' AND v.metodo_pago = 'efectivo'), 0) as total_ventas
      FROM caja c
      JOIN usuarios u ON c.id_usuario = u.id_usuario
      WHERE c.estado = 'cerrada'
    `;
    const params = [];
    if (req.user.rol === 'cajero') {
      sql += ' AND c.id_usuario = ?';
      params.push(req.user.id_usuario);
    } else if (id_usuario) {
      sql += ' AND c.id_usuario = ?';
      params.push(id_usuario);
    }
    if (fecha_inicio && fecha_fin) {
      sql += ' AND c.fecha_apertura >= CAST(? AS date) AND c.fecha_apertura < CAST(? AS date) + INTERVAL \'1 day\'';
      params.push(fecha_inicio, fecha_fin);
    }
    sql += ' ORDER BY c.fecha_apertura DESC';
    connection.query(sql, params, (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener cajas cerradas' });
      res.json(results);
    });
  }
};

module.exports = CajaController;
