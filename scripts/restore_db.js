const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { Client } = require('pg');
require('dotenv').config();
const { getConnectionOptions } = require('../src/config/db_postgres');
const { statements, versionTwoStatements, versionThreeStatements, versionFourStatements } = require('./postgres_schema');

const tables = ['categorias', 'proveedores', 'clientes', 'usuarios', 'productos', 'caja', 'ventas', 'venta_detalle', 'compras', 'compra_detalles', 'cotizaciones', 'cotizacion_detalles', 'devoluciones', 'ajustes_inventario', 'log_acciones', 'pagos_venta'];
const identityColumns = { categorias: 'id_categoria', proveedores: 'id_proveedor', clientes: 'id_cliente', usuarios: 'id_usuario', productos: 'id_producto', caja: 'id_caja', ventas: 'id_venta', venta_detalle: 'id_detalle', compras: 'id_compra', compra_detalles: 'id_detalle', cotizaciones: 'id_cotizacion', cotizacion_detalles: 'id_detalle', devoluciones: 'id_devolucion', ajustes_inventario: 'id_ajuste', log_acciones: 'id_log', pagos_venta: 'id_pago' };

function quoteIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) throw new Error(`Identificador inválido en respaldo: ${value}`);
  return `"${value}"`;
}

function parseArguments() {
  const fileIndex = process.argv.indexOf('--file');
  const file = fileIndex >= 0 ? process.argv[fileIndex + 1] : null;
  if (!file || path.basename(file).startsWith('backup_') === false) {
    throw new Error('Uso: node scripts/restore_db.js --file <backup_*.dump|backup_*.json>');
  }
  return path.resolve(file);
}

function verifyChecksum(file) {
  const sidecar = `${file}.sha256`;
  if (!fs.existsSync(sidecar)) return;
  const expected = fs.readFileSync(sidecar, 'utf8').trim().split(/\s+/)[0];
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (!/^[a-f0-9]{64}$/i.test(expected) || expected.toLowerCase() !== actual.toLowerCase()) {
    throw new Error('El checksum del respaldo no coincide');
  }
}

function connectionEnvironment() {
  const url = new URL(process.env.DATABASE_URL);
  const env = { ...process.env, PGPASSWORD: decodeURIComponent(url.password || '') };
  const sslMode = url.searchParams.get('sslmode');
  if (process.env.DATABASE_SSL === 'false' || sslMode === 'disable') env.PGSSLMODE = 'disable';
  else env.PGSSLMODE = sslMode || 'verify-full';
  const sslRootCert = url.searchParams.get('sslrootcert');
  if (sslRootCert) env.PGSSLROOTCERT = sslRootCert;
  return {
    env,
    args: [
      '--host', url.hostname,
      '--port', url.port || '5432',
      '--username', decodeURIComponent(url.username),
      '--dbname', decodeURIComponent(url.pathname.replace(/^\//, ''))
    ]
  };
}

async function assertSafeTarget(client, format) {
  const database = await client.query('SELECT current_database() AS name');
  const databaseName = database.rows[0].name;
  if (!/(^|[_-])(test|restore|staging)($|[_-])/i.test(databaseName)) {
    throw new Error(`Restauración bloqueada: la base ${databaseName} no es de prueba`);
  }
  if (process.env.RESTORE_TARGET_DATABASE !== databaseName) {
    throw new Error(`Define RESTORE_TARGET_DATABASE=${databaseName} para confirmar el destino`);
  }
  const existing = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
  const names = existing.rows.map((row) => row.table_name);
  if (format === 'dump' && names.length > 0) throw new Error('Restauración bloqueada: la base ya contiene tablas');
  if (format === 'json' && names.some((name) => name !== 'schema_migrations')) {
    throw new Error('Restauración bloqueada: la base ya contiene tablas de datos');
  }
  if (format === 'json' && names.includes('schema_migrations')) {
    const migrations = await client.query('SELECT COUNT(*)::integer AS count FROM schema_migrations');
    if (migrations.rows[0].count > 0) throw new Error('Restauración bloqueada: la base ya tiene migraciones aplicadas');
  }
}

async function applySchema(client) {
  for (const statement of statements) await client.query(statement);
  await client.query('INSERT INTO schema_migrations (version) VALUES (1) ON CONFLICT (version) DO NOTHING');
  const version = await client.query('SELECT COALESCE(MAX(version), 0)::integer AS version FROM schema_migrations');
  if (version.rows[0].version < 2) {
    for (const statement of versionTwoStatements) await client.query(statement);
    await client.query('INSERT INTO schema_migrations (version) VALUES (2) ON CONFLICT (version) DO NOTHING');
  }
  const versionAfterTwo = await client.query('SELECT COALESCE(MAX(version), 0)::integer AS version FROM schema_migrations');
  if (versionAfterTwo.rows[0].version < 3) {
    for (const statement of versionThreeStatements) await client.query(statement);
    await client.query('INSERT INTO schema_migrations (version) VALUES (3) ON CONFLICT (version) DO NOTHING');
  }
  const versionAfterThree = await client.query('SELECT COALESCE(MAX(version), 0)::integer AS version FROM schema_migrations');
  if (versionAfterThree.rows[0].version < 4) {
    for (const statement of versionFourStatements) await client.query(statement);
    await client.query('INSERT INTO schema_migrations (version) VALUES (4) ON CONFLICT (version) DO NOTHING');
  }
}

function runPgRestore(file) {
  const { env, args } = connectionEnvironment();
  const result = spawnSync('pg_restore', [...args, '--single-transaction', '--no-owner', '--no-privileges', '--exit-on-error', file], { env, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error('pg_restore no pudo restaurar el respaldo');
}

async function restoreJson(file) {
  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!snapshot.tables || typeof snapshot.tables !== 'object' || Array.isArray(snapshot.tables)) throw new Error('Respaldo JSON sin tablas');
  for (const [table, rows] of Object.entries(snapshot.tables)) {
    if (!tables.includes(table) || !Array.isArray(rows)) throw new Error(`Contenido de respaldo inválido: ${table}`);
  }
  const client = new Client(getConnectionOptions(process.env.DATABASE_URL));
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(724319)');
    await assertSafeTarget(client, 'json');
    await applySchema(client);
    for (const table of tables) {
      for (const row of snapshot.tables[table] || []) {
        const columns = Object.keys(row);
        if (columns.length === 0) continue;
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = columns.map((column) => row[column]);
        await client.query(`INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${placeholders})`, values);
      }
    }
    for (const table of tables) {
      const identityColumn = identityColumns[table];
      const sequence = await client.query(`SELECT pg_get_serial_sequence('${table}', '${identityColumn}') AS name`);
      if (sequence.rows[0].name) {
        const maximum = await client.query(`SELECT COALESCE(MAX(${quoteIdentifier(identityColumn)}), 0) + 1 AS value FROM ${quoteIdentifier(table)}`);
        const savedSequence = Number(snapshot.sequences?.[table]);
        const nextSequence = Math.max(Number(maximum.rows[0].value), Number.isFinite(savedSequence) ? savedSequence : 0);
        await client.query('SELECT setval($1, $2, false)', [sequence.rows[0].name, nextSequence]);
      }
    }
    await client.query('COMMIT');
    console.log('Respaldo JSON restaurado correctamente');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada');
  if (process.env.RESTORE_ALLOW !== 'true') throw new Error('Define RESTORE_ALLOW=true para confirmar una restauración');
  const file = parseArguments();
  if (!fs.existsSync(file)) throw new Error(`No existe el respaldo: ${file}`);
  verifyChecksum(file);
  if (file.endsWith('.dump')) {
    const client = new Client(getConnectionOptions(process.env.DATABASE_URL));
    await client.connect();
    await client.query('SELECT pg_advisory_lock(724320)');
    try {
      await assertSafeTarget(client, 'dump');
      runPgRestore(file);
    } finally {
      await client.query('SELECT pg_advisory_unlock(724320)').catch(() => {});
      await client.end();
    }
    console.log('Respaldo PostgreSQL restaurado correctamente');
    return;
  }
  if (file.endsWith('.json')) {
    await restoreJson(file);
    return;
  }
  throw new Error('Formato de respaldo no soportado');
}

main().catch((error) => {
  console.error('Error al restaurar:', error.code || error.message);
  process.exit(1);
});
