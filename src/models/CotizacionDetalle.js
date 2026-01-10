const connection = require('../config/db_mysql');

const CotizacionDetalle = {
  crearTabla: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS cotizacion_detalles (
        id_detalle INT AUTO_INCREMENT PRIMARY KEY,
        id_cotizacion INT NOT NULL,
        id_producto INT NOT NULL,
        cantidad INT NOT NULL,
        precio_unitario DECIMAL(10,2),
        descuento_producto DECIMAL(10,2) DEFAULT 0,
        subtotal DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_cotizacion) REFERENCES cotizaciones(id_cotizacion) ON DELETE CASCADE,
        FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE RESTRICT
      )
    `;
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error al crear tabla cotizacion_detalles:', err);
      } else {
        console.log('Tabla cotizacion_detalles verificada/creada');
      }
    });
  },

  findByIdCotizacion: (idCotizacion, callback) => {
    const sql = `
      SELECT cd.*, 
        p.nombre as producto_nombre,
        p.codigo as producto_codigo,
        p.descripcion as producto_descripcion,
        p.stock_actual,
        c.nombre as categoria_nombre
      FROM cotizacion_detalles cd
      JOIN productos p ON cd.id_producto = p.id_producto
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE cd.id_cotizacion = ?
      ORDER BY cd.id_detalle ASC
    `;
    connection.query(sql, [idCotizacion], callback);
  },

  create: (data, callback) => {
    const sql = `
      INSERT INTO cotizacion_detalles (
        id_cotizacion, 
        id_producto, 
        cantidad, 
        precio_unitario, 
        descuento_producto, 
        subtotal
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    connection.query(sql, [
      data.id_cotizacion,
      data.id_producto,
      data.cantidad,
      data.precio_unitario,
      data.descuento_producto || 0,
      data.subtotal
    ], callback);
  },

  delete: (id, callback) => {
    const sql = 'DELETE FROM cotizacion_detalles WHERE id_detalle = ?';
    connection.query(sql, [id], callback);
  },

  deleteByCotizacion: (idCotizacion, callback) => {
    const sql = 'DELETE FROM cotizacion_detalles WHERE id_cotizacion = ?';
    connection.query(sql, [idCotizacion], callback);
  }
};

CotizacionDetalle.crearTabla();
module.exports = CotizacionDetalle;
