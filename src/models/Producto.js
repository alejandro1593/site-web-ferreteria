const connection = require('../config/db_mysql');

const Producto = {
  // Crear tabla si no existe
  crearTabla: () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS productos (
        id_producto INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        descripcion TEXT,
        codigo VARCHAR(50) UNIQUE,
        precio_compra DECIMAL(10,2),
        precio_venta DECIMAL(10,2) NOT NULL,
        stock_actual INT DEFAULT 0,
        stock_minimo INT DEFAULT 0,
        id_categoria INT,
        id_proveedor INT,
        imagen VARCHAR(255),
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE SET NULL,
        FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor) ON DELETE SET NULL
      )
    `;
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error al crear tabla productos:', err);
      } else {
        console.log('Tabla productos verificada/creada');
      }
    });
  },

  // Obtener todos los productos con sus relaciones
  // Opcionalmente acepta { limit, offset } para paginación
  findAll: (options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    let sql = `
      SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre 
      FROM productos p 
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria 
      LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
      WHERE p.activo = TRUE 
      ORDER BY p.nombre ASC
    `;
    const params = [];
    if (options.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(Number(options.limit), Number(options.offset || 0));
    }
    connection.query(sql, params, callback);
  },

  // Contar productos activos
  countAll: (callback) => {
    connection.query('SELECT COUNT(*) AS total FROM productos WHERE activo = TRUE', callback);
  },

  // Obtener producto por ID
  findById: (id, callback) => {
    const sql = `
      SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre 
      FROM productos p 
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria 
      LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
      WHERE p.id_producto = ?
    `;
    connection.query(sql, [id], callback);
  },

  // Obtener productos por categoría
  findByCategoria: (idCategoria, callback) => {
    const sql = `
      SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre 
      FROM productos p 
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria 
      LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
      WHERE p.id_categoria = ? AND p.activo = TRUE 
      ORDER BY p.nombre ASC
    `;
    connection.query(sql, [idCategoria], callback);
  },

  // Buscar productos por nombre o código
  search: (termino, callback) => {
    const sql = `
      SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre 
      FROM productos p 
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria 
      LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor 
      WHERE (p.nombre LIKE ? OR p.descripcion LIKE ? OR p.codigo LIKE ?) AND p.activo = TRUE 
      ORDER BY p.nombre ASC
    `;
    connection.query(sql, [`%${termino}%`, `%${termino}%`, `%${termino}%`], callback);
  },

  // Crear nuevo producto
  create: (data, callback) => {
    const sql = `
      INSERT INTO productos (nombre, descripcion, codigo, precio_compra, precio_venta, stock_actual, stock_minimo, id_categoria, id_proveedor, imagen, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    connection.query(sql, [
      data.nombre, 
      data.descripcion, 
      data.codigo, 
      data.precio_compra, 
      data.precio_venta, 
      data.stock_actual || 0, 
      data.stock_minimo || 0, 
      data.id_categoria, 
      data.id_proveedor, 
      data.imagen, 
      data.activo !== false
    ], callback);
  },

  // Actualizar producto
  update: (id, data, callback) => {
    const sql = `
      UPDATE productos 
      SET nombre = ?, descripcion = ?, codigo = ?, precio_compra = ?, precio_venta = ?, 
          stock_actual = ?, stock_minimo = ?, id_categoria = ?, id_proveedor = ?, imagen = ?, activo = ? 
      WHERE id_producto = ?
    `;
    connection.query(sql, [
      data.nombre, 
      data.descripcion, 
      data.codigo, 
      data.precio_compra, 
      data.precio_venta, 
      data.stock_actual, 
      data.stock_minimo, 
      data.id_categoria, 
      data.id_proveedor, 
      data.imagen, 
      data.activo, 
      id
    ], callback);
  },

  // Eliminar producto (soft delete)
  delete: (id, callback) => {
    const sql = 'UPDATE productos SET activo = FALSE WHERE id_producto = ?';
    connection.query(sql, [id], callback);
  },

  // Actualizar stock
  updateStock: (id, cantidad, callback) => {
    const sql = 'UPDATE productos SET stock_actual = ? WHERE id_producto = ?';
    connection.query(sql, [cantidad, id], callback);
  },

  // Obtener productos con stock bajo
  getLowStock: (callback) => {
    const sql = `
      SELECT p.*, c.nombre as categoria_nombre 
      FROM productos p 
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria 
      WHERE p.stock_actual < 20 AND p.activo = TRUE 
      ORDER BY p.stock_actual ASC
    `;
    connection.query(sql, callback);
  },

  // Obtener producto por código
  findByCodigo: (codigo, callback) => {
    const sql = 'SELECT * FROM productos WHERE codigo = ? AND activo = TRUE';
    connection.query(sql, [codigo], callback);
  }
};

// Inicializar tabla
Producto.crearTabla();

module.exports = Producto;