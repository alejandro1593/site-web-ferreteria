const connection = require('../config/db_mysql');
const bcrypt = require('bcrypt');
const Caja = require('../models/Caja');
const Usuario = require('../models/Usuario');

const CajaController = {
  getAll: (req, res) => {
    Caja.findAll((err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener cajas' });
      }
      res.json(results);
    });
  },

  getById: (req, res) => {
    const { id } = req.params;
    Caja.findById(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener caja' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Caja no encontrada' });
      }
      res.json(results[0]);
    });
  },

  getAbierta: (req, res) => {
    const { id_usuario } = req.query;
    
    if (!id_usuario) {
      return res.status(400).json({ error: 'ID de usuario es requerido' });
    }
    
    Caja.findAbierta(id_usuario, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener caja abierta' });
      }
      
      if (results.length === 0) {
        return res.json(null);
      }
      
      res.json(results[0]);
    });
  },

  abrirCaja: (req, res) => {
    const { id_usuario, password, monto_apertura, observaciones } = req.body || {};

    if (!id_usuario) {
      return res.status(400).json({ error: 'ID de usuario es requerido' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password del usuario es requerido' });
    }

    Usuario.findById(id_usuario, (err, userResults) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar usuario' });
      }

      if (userResults.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (!userResults[0].activo) {
        return res.status(400).json({ error: 'Usuario inactivo' });
      }

      bcrypt.compare(password, userResults[0].password, (err, isValid) => {
        if (err) {
          return res.status(500).json({ error: 'Error al verificar password' });
        }

        if (!isValid) {
          return res.status(401).json({ error: 'Password incorrecto' });
        }

        Caja.findAbierta(id_usuario, (err, results) => {
          if (err) {
            return res.status(500).json({ error: 'Error al verificar caja abierta' });
          }

          if (results.length > 0) {
            return res.status(400).json({ error: 'Ya existe una caja abierta para este usuario' });
          }

          const cajaData = {
            id_usuario: parseInt(id_usuario),
            monto_apertura: monto_apertura || 0,
            observaciones
          };

          Caja.create(cajaData, (err, result) => {
            if (err) {
              return res.status(500).json({ error: 'Error al abrir caja' });
            }

            res.status(201).json({
              message: 'Caja abierta exitosamente',
              id: result.insertId
            });
          });
        });
      });
    });
  },

  cerrarCaja: (req, res) => {
    const { id_usuario, password, monto_cierre, observaciones } = req.body || {};

    if (!id_usuario) {
      return res.status(400).json({ error: 'ID de usuario es requerido' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password del usuario es requerido' });
    }

    if (!monto_cierre && monto_cierre !== 0) {
      return res.status(400).json({ error: 'El monto de cierre es requerido' });
    }

    Usuario.findById(id_usuario, (err, userResults) => {
      if (err) {
        return res.status(500).json({ error: 'Error al verificar usuario' });
      }

      if (userResults.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      bcrypt.compare(password, userResults[0].password, (err, isValid) => {
        if (err) {
          return res.status(500).json({ error: 'Error al verificar password' });
        }

        if (!isValid) {
          return res.status(401).json({ error: 'Password incorrecto' });
        }

        Caja.findAbierta(id_usuario, (err, results) => {
          if (err) {
            return res.status(500).json({ error: 'Error al obtener caja abierta' });
          }

          if (results.length === 0) {
            return res.status(400).json({ error: 'No hay caja abierta para este usuario' });
          }

          const cajaAbierta = results[0];
          
          const montoApertura = parseFloat(cajaAbierta.monto_apertura) || 0;

          Caja.getResumenCaja(cajaAbierta.id_caja, (err, resumen) => {
            if (err) {
              console.error('Error en getResumenCaja:', err);
              return res.status(500).json({ error: 'Error al obtener resumen de caja' });
            }
            
            console.log('Resumen recibido:', resumen);
            console.log('Datos para cálculo:', {
              monto_apertura: montoApertura,
              total_ventas: resumen[0]?.total_ventas,
              total_devoluciones: resumen[0]?.total_devoluciones
            });

            const totalVentas = parseFloat(resumen[0]?.total_ventas) || 0;
            const totalDevoluciones = parseFloat(resumen[0]?.total_devoluciones) || 0;
            const montoEsperado = montoApertura + totalVentas - totalDevoluciones;
            
            console.log('Monto esperado calculado:', montoEsperado);

            const cierreData = {
              monto_cierre,
              monto_esperado: montoEsperado,
              observaciones
            };

            Caja.updateCierre(cajaAbierta.id_caja, cierreData, (err, result) => {
              if (err) {
                return res.status(500).json({ error: 'Error al cerrar caja' });
              }

              res.json({
                message: 'Caja cerrada exitosamente',
                monto_cierre,
                monto_esperado: montoEsperado,
                diferencia: monto_cierre - montoEsperado
              });
            });
          });
        });
      });
    });
  },

  getVentasCaja: (req, res) => {
    const { id } = req.params;
    Caja.getVentasCaja(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener ventas de la caja' });
      }
      res.json(results);
    });
  },

  getDevolucionesCaja: (req, res) => {
    const { id } = req.params;
    Caja.getDevolucionesCaja(id, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener devoluciones de la caja' });
      }
      res.json(results);
    });
  },

  getResumenCaja: (req, res) => {
    const { id } = req.params;
    
    Promise.all([
      new Promise((resolve, reject) => {
        Caja.findById(id, (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        });
      }),
      new Promise((resolve, reject) => {
        Caja.getResumenCaja(id, (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        });
      })
    ])
    .then(([caja, resumen]) => {
      if (!caja) {
        return res.status(404).json({ error: 'Caja no encontrada' });
      }

      console.log('📊 Resumen de caja calculado:', {
        monto_apertura: caja.monto_apertura,
        total_ventas: resumen?.total_ventas,
        total_devoluciones: resumen?.total_devoluciones,
        monto_esperado: (caja.monto_apertura || 0) + (parseFloat(resumen?.total_ventas) || 0) - (parseFloat(resumen?.total_devoluciones) || 0)
      });

      res.json({
        ...caja,
        resumen: resumen || {
          total_ventas: 0,
          total_devoluciones: 0,
          total_ventas_count: 0
        }
      });
    })
    .catch(err => {
      console.error('❌ Error en getResumenCaja:', err);
      res.status(500).json({ error: 'Error al obtener resumen de caja' });
    });
  },

  getCajasCerradas: (req, res) => {
    const { id_usuario, fecha_inicio, fecha_fin } = req.query;
    
    let sql = `
      SELECT 
        c.*,
        u.nombre as usuario_nombre,
        (SELECT COALESCE(SUM(v.total), 0) 
         FROM ventas v 
         WHERE v.fecha >= c.fecha_apertura 
         AND (v.fecha <= c.fecha_cierre OR c.fecha_cierre IS NULL)
         AND v.estado = 'completada') as total_ventas
      FROM caja c
      JOIN usuarios u ON c.id_usuario = u.id_usuario
      WHERE c.estado = 'cerrada'
    `;
    
    const params = [];
    
    if (id_usuario) {
      sql += ` AND c.id_usuario = ?`;
      params.push(id_usuario);
    }
    
    if (fecha_inicio && fecha_fin) {
      sql += ` AND c.fecha_apertura BETWEEN ? AND ?`;
      params.push(fecha_inicio, fecha_fin);
    }
    
    sql += ` ORDER BY c.fecha_apertura DESC`;
    
    connection.query(sql, params, (err, results) => {
      if (err) {
        console.error('Error obteniendo cajas cerradas:', err);
        return res.status(500).json({ error: 'Error al obtener cajas cerradas' });
      }
      
      res.json(results);
    });
  }
};

module.exports = CajaController;
