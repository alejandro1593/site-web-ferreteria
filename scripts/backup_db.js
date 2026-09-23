const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();
const { getConnectionOptions } = require('../src/config/db_postgres');

const tables = ['categorias', 'proveedores', 'clientes', 'usuarios', 'productos', 'caja', 'ventas', 'venta_detalle', 'compras', 'compra_detalles', 'cotizaciones', 'cotizacion_detalles', 'devoluciones', 'ajustes_inventario', 'log_acciones', 'pagos_venta'];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada');
  const directory = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(directory, { recursive: true });
  const client = new Client(getConnectionOptions(process.env.DATABASE_URL));
  await client.connect();
  const snapshot = { created_at: new Date().toISOString(), tables: {} };
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    for (const table of tables) {
      const result = await client.query(`SELECT * FROM "${table}"`);
      snapshot.tables[table] = result.rows;
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(directory, `backup_${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), { encoding: 'utf8', mode: 0o600 });
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(directory)) {
    if (!name.startsWith('backup_') || (!name.endsWith('.json') && !name.endsWith('.sql'))) continue;
    const target = path.join(directory, name);
    if (fs.statSync(target).mtimeMs < cutoff) fs.unlinkSync(target);
  }
  console.log(`Backup creado: ${file}`);
}

main().catch((error) => {
  console.error('Error al generar backup:', error.code || error.message);
  process.exit(1);
});
