const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { Client } = require('pg');
require('dotenv').config();
const { getConnectionOptions } = require('../src/config/db_postgres');

const tables = ['categorias', 'proveedores', 'clientes', 'usuarios', 'productos', 'caja', 'ventas', 'venta_detalle', 'compras', 'compra_detalles', 'cotizaciones', 'cotizacion_detalles', 'devoluciones', 'ajustes_inventario', 'log_acciones', 'pagos_venta'];
const identityColumns = { categorias: 'id_categoria', proveedores: 'id_proveedor', clientes: 'id_cliente', usuarios: 'id_usuario', productos: 'id_producto', caja: 'id_caja', ventas: 'id_venta', venta_detalle: 'id_detalle', compras: 'id_compra', compra_detalles: 'id_detalle', cotizaciones: 'id_cotizacion', cotizacion_detalles: 'id_detalle', devoluciones: 'id_devolucion', ajustes_inventario: 'id_ajuste', log_acciones: 'id_log', pagos_venta: 'id_pago' };

function checksumFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function writeChecksum(file) {
  const checksum = checksumFile(file);
  fs.writeFileSync(`${file}.sha256`, `${checksum}  ${path.basename(file)}\n`, { encoding: 'utf8', mode: 0o600 });
  return checksum;
}

function atomicWriteJson(file, snapshot) {
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(snapshot, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, file);
}

function pgDumpAvailable() {
  return spawnSync('pg_dump', ['--version'], { stdio: 'ignore' }).status === 0;
}

function dumpWithPgDump(directory, stamp) {
  const url = new URL(process.env.DATABASE_URL);
  const file = path.join(directory, `backup_${stamp}.dump`);
  const temporary = `${file}.tmp`;
  const env = { ...process.env, PGPASSWORD: decodeURIComponent(url.password || '') };
  const sslMode = url.searchParams.get('sslmode');
  if (process.env.DATABASE_SSL === 'false' || sslMode === 'disable') env.PGSSLMODE = 'disable';
  else env.PGSSLMODE = sslMode || 'verify-full';
  const sslRootCert = url.searchParams.get('sslrootcert');
  if (sslRootCert) env.PGSSLROOTCERT = sslRootCert;
  const args = [
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    '--host', url.hostname,
    '--port', url.port || '5432',
    '--username', decodeURIComponent(url.username),
    '--dbname', decodeURIComponent(url.pathname.replace(/^\//, '')),
    '--file', temporary
  ];
  const result = spawnSync('pg_dump', args, { env, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    throw new Error('pg_dump no pudo crear el respaldo');
  }
  fs.renameSync(temporary, file);
  return file;
}

async function jsonSnapshot() {
  const client = new Client(getConnectionOptions(process.env.DATABASE_URL));
  await client.connect();
  const snapshot = { created_at: new Date().toISOString(), format: 'json', tables: {} };
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    for (const table of tables) {
      const result = await client.query(`SELECT * FROM "${table}"`);
      snapshot.tables[table] = result.rows;
    }
    const migrations = await client.query('SELECT version, applied_at FROM schema_migrations ORDER BY version');
    snapshot.schema_migrations = migrations.rows;
    snapshot.sequences = {};
    for (const [table, column] of Object.entries(identityColumns)) {
      const sequence = await client.query('SELECT pg_get_serial_sequence($1, $2) AS name', [table, column]);
      if (!sequence.rows[0].name) continue;
      const sequenceName = sequence.rows[0].name.split('.').pop();
      const value = await client.query("SELECT last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename = $1", [sequenceName]);
      snapshot.sequences[table] = value.rows[0].last_value == null ? null : Number(value.rows[0].last_value);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
  return snapshot;
}

function cleanOldBackups(directory) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(directory)) {
    if (!name.startsWith('backup_') || (!name.endsWith('.json') && !name.endsWith('.dump') && !name.endsWith('.sha256') && !name.endsWith('.tmp'))) continue;
    const target = path.join(directory, name);
    if (fs.statSync(target).mtimeMs < cutoff) fs.unlinkSync(target);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada');
  const directory = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let file;
  if (pgDumpAvailable()) {
    file = dumpWithPgDump(directory, stamp);
  } else {
    const snapshot = await jsonSnapshot();
    file = path.join(directory, `backup_${stamp}.json`);
    atomicWriteJson(file, snapshot);
  }
  const checksum = writeChecksum(file);
  cleanOldBackups(directory);
  console.log(`Backup creado: ${file}`);
  console.log(`SHA-256: ${checksum}`);
}

main().catch((error) => {
  console.error('Error al generar backup:', error.code || error.message);
  process.exit(1);
});
