const connection = require('../config/db_mysql');

const Cotizacion = {
  crearTabla: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS cotizaciones (
        id_cotizacion INT AUTO_INCREMENT PRIMARY KEY,
        id_cliente INT,
        fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_validez DATE,
        subtotal DECIMAL(10,2),
        iva DECIMAL(10,2),
        descuento DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2),
        estado VARCHAR(20) DEFAULT 'pendiente',
        observaciones TEXT,
        id_usuario INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
      )
    `;
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error al crear tabla cotizaciones:', err);
      } else {
        console.log('Tabla cotizaciones verificada/creada');
      }
    });
  },

  findAll: (callback) => {
    const sql = `
      SELECT c.*, 
        cl.nombre as cliente_nombre,
        cl.dni as cliente_dni,
        cl.telefono as cliente_telefono,
        cl.email as cliente_email,
        u.nombre as usuario_nombre
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
      LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
      ORDER BY c.fecha_emision DESC
    `;
    connection.query(sql, callback);
  },

  findById: (id, callback) => {
    const sql = `
      SELECT c.*, 
        cl.nombre as cliente_nombre,
        cl.dni as cliente_dni,
        cl.telefono as cliente_telefono,
        cl.email as cliente_email,
        u.nombre as usuario_nombre
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
      LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
      WHERE c.id_cotizacion = ?
    `;
    connection.query(sql, [id], callback);
  },

  findByCliente: (idCliente, callback) => {
    const sql = `
      SELECT c.*, 
        cl.nombre as cliente_nombre
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
      WHERE c.id_cliente = ?
      ORDER BY c.fecha_emision DESC
    `;
    connection.query(sql, [idCliente], callback);
  },

  findWithFilters: (filters, callback) => {
    let sql = `
      SELECT c.*, 
        cl.nombre as cliente_nombre,
        cl.dni as cliente_dni,
        cl.telefono as cliente_telefono,
        cl.email as cliente_email,
        u.nombre as usuario_nombre
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
      LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
      WHERE 1=1
    `;
    
    const conditions = [];
    const values = [];
    
    if (filters.id_cliente) {
      conditions.push('c.id_cliente = ?');
      values.push(filters.id_cliente);
    }
    
    if (filters.estado) {
      conditions.push('c.estado = ?');
      values.push(filters.estado);
    }
    
    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY c.fecha_emision DESC';
    
    connection.query(sql, values, callback);
  },

  create: (data, callback) => {
    const sql = `
      INSERT INTO cotizaciones (
        id_cliente, 
        fecha_validez, 
        subtotal, 
        iva, 
        descuento, 
        total, 
        estado, 
        observaciones, 
        id_usuario
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    connection.query(sql, [
      data.id_cliente || null,
      data.fecha_validez || null,
      data.subtotal || 0,
      data.iva || 0,
      data.descuento || 0,
      data.total || 0,
      data.estado || 'pendiente',
      data.observaciones || '',
      data.id_usuario || null
    ], callback);
  },

  update: (id, data, callback) => {
    const updates = [];
    const values = [];

    if (data.estado !== undefined) {
      updates.push('estado = ?');
      values.push(data.estado);
    }
    if (data.fecha_validez !== undefined) {
      updates.push('fecha_validez = ?');
      values.push(data.fecha_validez);
    }
    if (data.subtotal !== undefined) {
      updates.push('subtotal = ?');
      values.push(data.subtotal);
    }
    if (data.iva !== undefined) {
      updates.push('iva = ?');
      values.push(data.iva);
    }
    if (data.descuento !== undefined) {
      updates.push('descuento = ?');
      values.push(data.descuento);
    }
    if (data.total !== undefined) {
      updates.push('total = ?');
      values.push(data.total);
    }
    if (data.observaciones !== undefined) {
      updates.push('observaciones = ?');
      values.push(data.observaciones);
    }

    if (updates.length === 0) {
      return callback(new Error('No hay campos para actualizar'));
    }

    values.push(id);
    const sql = `UPDATE cotizaciones SET ${updates.join(', ')} WHERE id_cotizacion = ?`;
    connection.query(sql, values, callback);
  },

  delete: (id, callback) => {
    const sql = 'DELETE FROM cotizaciones WHERE id_cotizacion = ?';
    connection.query(sql, [id], callback);
  },

  getResumenPeriodo: (fechaInicio, fechaFin, callback) => {
    let sql = `
      SELECT 
        COUNT(*) as total_cotizaciones,
        SUM(total) as total_cotizado,
        AVG(total) as promedio_cotizacion,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'aprobada' THEN 1 END) as aprobadas,
        COUNT(CASE WHEN estado = 'rechazada' THEN 1 END) as rechazadas,
        COUNT(CASE WHEN estado = 'convertida' THEN 1 END) as convertidas
      FROM cotizaciones
    `;
    
    const values = [];
    
    if (fechaInicio && fechaFin) {
      sql += ' WHERE fecha_emision BETWEEN ? AND ?';
      values.push(fechaInicio, fechaFin);
    }
    
    connection.query(sql, values, callback);
  }
};

Cotizacion.crearTabla();
module.exports = Cotizacion;
