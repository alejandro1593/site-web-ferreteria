const connection = require('../config/db_mysql');

const VentaDetalle = {
  // Crear tabla si no existe
  crearTabla: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS venta_detalle (
        id_detalle INT AUTO_INCREMENT PRIMARY KEY,
        id_venta INT,
        id_producto INT,
        cantidad INT NOT NULL,
        precio_unitario DECIMAL(10,2),
        subtotal DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE,
        FOREIGN KEY (id_producto) REFERENCES productos(id_producto) ON DELETE RESTRICT
      )
    `;
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error al crear tabla venta_detalle:', err);
      } else {
        console.log('Tabla venta_detalle verificada/creada');
      }
    });
  },

  // Obtener detalles de una venta con información del producto
  findByIdVenta: (idVenta, callback) => {
    const sql = `
      SELECT vd.*, 
        p.nombre as producto_nombre, 
        p.codigo as producto_codigo,
        p.descripcion as producto_descripcion
      FROM venta_detalle vd 
      JOIN productos p ON vd.id_producto = p.id_producto 
      WHERE vd.id_venta = ? 
      ORDER BY vd.id_detalle ASC
    `;
    connection.query(sql, [idVenta], callback);
  },

  // Crear detalle de venta
  create: (data, callback) => {
    const sql = `
      INSERT INTO venta_detalle (id_venta, id_producto, cantidad, precio_unitario, subtotal) 
      VALUES (?, ?, ?, ?, ?)
    `;
    connection.query(sql, [
      data.id_venta, 
      data.id_producto, 
      data.cantidad, 
      data.precio_unitario, 
      data.subtotal
    ], callback);
  },

  // Actualizar detalle de venta
  update: (id, data, callback) => {
    const sql = `
      UPDATE venta_detalle 
      SET id_producto = ?, cantidad = ?, precio_unitario = ?, subtotal = ? 
      WHERE id_detalle = ?
    `;
    connection.query(sql, [
      data.id_producto, 
      data.cantidad, 
      data.precio_unitario, 
      data.subtotal, 
      id
    ], callback);
  },

  // Eliminar detalle de venta
  delete: (id, callback) => {
    const sql = 'DELETE FROM venta_detalle WHERE id_detalle = ?';
    connection.query(sql, [id], callback);
  },

  // Obtener historial de ventas de un producto
  findByProducto: (idProducto, callback) => {
    const sql = `
      SELECT vd.*, v.fecha as venta_fecha, v.estado as venta_estado
      FROM venta_detalle vd 
      JOIN ventas v ON vd.id_venta = v.id_venta 
      WHERE vd.id_producto = ? 
      ORDER BY v.fecha DESC
    `;
    connection.query(sql, [idProducto], callback);
  },

  // Obtener productos más vendidos
  getTopProductos: (limit, callback) => {
    const sql = `
      SELECT 
        p.id_producto,
        p.nombre,
        p.codigo,
        SUM(vd.cantidad) as total_vendido,
        SUM(vd.subtotal) as total_recaudado,
        COUNT(DISTINCT vd.id_venta) as total_ventas
      FROM venta_detalle vd 
      JOIN productos p ON vd.id_producto = p.id_producto 
      JOIN ventas v ON vd.id_venta = v.id_venta 
      WHERE v.estado = 'completada'
      GROUP BY p.id_producto 
      ORDER BY total_vendido DESC 
      LIMIT ?
    `;
    connection.query(sql, [limit], callback);
  }
};

// Inicializar tabla
VentaDetalle.crearTabla();

module.exports = VentaDetalle;