/**
 * Migración v2 - Ferretería
 * Crea tablas nuevas (compras, ajustes, auditoría) y columnas adicionales.
 * Es idempotente: se puede ejecutar varias veces sin romper nada.
 *
 * Uso: node scripts/migracion_v2.js
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_ferreteria',
    multipleStatements: true
  });

  console.log('=== MIGRACIÓN V2 ===\n');

  // ---- Tabla de compras a proveedores ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS compras (
      id_compra INT AUTO_INCREMENT PRIMARY KEY,
      id_proveedor INT NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      total DECIMAL(10,2) NOT NULL DEFAULT 0,
      estado ENUM('completada','anulada') DEFAULT 'completada',
      observaciones TEXT,
      id_usuario INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor)
    )
  `);
  console.log('✅ tabla compras');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS compra_detalles (
      id_detalle INT AUTO_INCREMENT PRIMARY KEY,
      id_compra INT NOT NULL,
      id_producto INT NOT NULL,
      cantidad INT NOT NULL,
      precio_costo DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (id_compra) REFERENCES compras(id_compra) ON DELETE CASCADE,
      FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
    )
  `);
  console.log('✅ tabla compra_detalles');

  // ---- Ajustes de inventario (conteo físico / mermas) ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS ajustes_inventario (
      id_ajuste INT AUTO_INCREMENT PRIMARY KEY,
      id_producto INT NOT NULL,
      stock_anterior INT NOT NULL,
      stock_nuevo INT NOT NULL,
      motivo VARCHAR(255) NOT NULL,
      id_usuario INT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
    )
  `);
  console.log('✅ tabla ajustes_inventario');

  // ---- Auditoría de acciones críticas ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS log_acciones (
      id_log INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario INT,
      username VARCHAR(50),
      accion VARCHAR(50) NOT NULL,
      entidad VARCHAR(50) NOT NULL,
      entidad_id INT,
      detalles VARCHAR(500),
      ip VARCHAR(45),
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ tabla log_acciones');

  // ---- Ventas a crédito: saldo pendiente ----
  try {
    await conn.query(`
      ALTER TABLE ventas
        ADD COLUMN saldo_pendiente DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total
    `);
    console.log('✅ columna ventas.saldo_pendiente agregada');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELD') {
      console.log('↷ columna ventas.saldo_pendiente ya existía');
    } else {
      throw err;
    }
  }

  // Inicializar saldo para créditos existentes pendientes
  const [r] = await conn.query(`
    UPDATE ventas
       SET saldo_pendiente = total
     WHERE metodo_pago = 'credito'
       AND estado <> 'completada'
       AND saldo_pendiente = 0
  `);
  if (r.affectedRows > 0) {
    console.log(`✅ ${r.affectedRows} ventas a crédito existentes actualizadas`);
  }

  await conn.end();
  console.log('\n=== MIGRACIÓN COMPLETADA ===');
}

main().catch(err => {
  console.error('❌ Error en migración:', err.message);
  process.exit(1);
});
