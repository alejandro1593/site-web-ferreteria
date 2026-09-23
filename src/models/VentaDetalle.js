const connection = require('../config/db_postgres');

const VentaDetalle = {
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
      VALUES (?, ?, ?, ?, ?) RETURNING id_detalle
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
  },

  // Obtener productos más vendidos por categoría
  getTopProductosPorCategoria: (callback) => {
    const sql = `
      SELECT 
        c.id_categoria,
        c.nombre as categoria_nombre,
        p.id_producto,
        p.nombre as producto_nombre,
        p.codigo as producto_codigo,
        p.descripcion as producto_descripcion,
        p.precio_venta,
        SUM(vd.cantidad) as total_vendido,
        SUM(vd.subtotal) as total_recaudado,
        COUNT(DISTINCT vd.id_venta) as total_ventas,
        AVG(vd.precio_unitario) as precio_promedio
      FROM venta_detalle vd 
      JOIN productos p ON vd.id_producto = p.id_producto 
      JOIN ventas v ON vd.id_venta = v.id_venta 
      JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE v.estado = 'completada'
      GROUP BY c.id_categoria, p.id_producto
      ORDER BY c.nombre ASC, total_vendido DESC
    `;
    connection.query(sql, callback);
  },

  // Obtener resumen de ventas por categoría
  getVentasPorCategoria: (callback) => {
    const sql = `
      SELECT 
        c.id_categoria,
        c.nombre as categoria_nombre,
        COUNT(DISTINCT vd.id_venta) as total_ventas,
        SUM(vd.cantidad) as total_productos,
        SUM(vd.subtotal) as total_recaudado,
        COUNT(DISTINCT p.id_producto) as total_productos_distintos
      FROM venta_detalle vd 
      JOIN productos p ON vd.id_producto = p.id_producto 
      JOIN ventas v ON vd.id_venta = v.id_venta 
      JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE v.estado = 'completada'
      GROUP BY c.id_categoria
      ORDER BY total_recaudado DESC
    `;
    connection.query(sql, callback);
  }
};

module.exports = VentaDetalle;