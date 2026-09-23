const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
require('dotenv').config();
const { getConnectionOptions } = require('../src/config/db_postgres');

const tableColumns = {
  categorias: ['id_categoria', 'nombre', 'descripcion', 'created_at', 'updated_at'],
  proveedores: ['id_proveedor', 'nombre', 'contacto', 'telefono', 'email', 'direccion', 'created_at', 'updated_at'],
  clientes: ['id_cliente', 'nombre', 'apellido', 'dni', 'telefono', 'email', 'direccion', 'created_at', 'updated_at'],
  usuarios: ['id_usuario', 'username', 'password', 'nombre', 'email', 'rol', 'activo', 'token_version', 'created_at', 'updated_at'],
  productos: ['id_producto', 'nombre', 'descripcion', 'codigo', 'precio_compra', 'precio_venta', 'stock_actual', 'stock_minimo', 'id_categoria', 'id_proveedor', 'imagen', 'activo', 'created_at', 'updated_at'],
  caja: ['id_caja', 'id_usuario', 'fecha_apertura', 'fecha_cierre', 'monto_apertura', 'monto_cierre', 'monto_esperado', 'diferencia', 'estado', 'observaciones', 'created_at'],
  ventas: ['id_venta', 'id_cliente', 'id_usuario', 'id_caja', 'fecha', 'subtotal', 'iva', 'descuento', 'total', 'saldo_pendiente', 'metodo_pago', 'estado', 'created_at'],
  venta_detalle: ['id_detalle', 'id_venta', 'id_producto', 'cantidad', 'precio_unitario', 'subtotal', 'created_at'],
  pagos_venta: ['id_pago', 'id_venta', 'id_caja', 'id_usuario', 'tipo', 'monto', 'metodo', 'fecha'],
  compras: ['id_compra', 'id_proveedor', 'fecha', 'total', 'estado', 'observaciones', 'id_usuario', 'created_at'],
  compra_detalles: ['id_detalle', 'id_compra', 'id_producto', 'cantidad', 'precio_costo', 'subtotal', 'precio_compra_anterior'],
  cotizaciones: ['id_cotizacion', 'id_cliente', 'fecha_emision', 'fecha_validez', 'subtotal', 'iva', 'descuento', 'total', 'estado', 'observaciones', 'id_usuario', 'created_at'],
  cotizacion_detalles: ['id_detalle', 'id_cotizacion', 'id_producto', 'cantidad', 'precio_unitario', 'descuento_producto', 'subtotal', 'created_at'],
  devoluciones: ['id_devolucion', 'id_venta', 'id_producto', 'cantidad', 'motivo', 'fecha', 'monto_reembolso', 'metodo_reembolso', 'estado', 'id_usuario', 'created_at'],
  ajustes_inventario: ['id_ajuste', 'id_producto', 'stock_anterior', 'stock_nuevo', 'motivo', 'id_usuario', 'fecha'],
  log_acciones: ['id_log', 'id_usuario', 'username', 'accion', 'entidad', 'entidad_id', 'detalles', 'ip', 'fecha']
};

const sourceColumns = {
  usuarios: tableColumns.usuarios.filter((column) => column !== 'token_version'),
  ventas: tableColumns.ventas.filter((column) => !['id_usuario', 'id_caja'].includes(column)),
  compra_detalles: tableColumns.compra_detalles.filter((column) => column !== 'precio_compra_anterior')
};

const missingDefaults = {
  usuarios: { token_version: 0 }
};

const loadOrder = [
  'categorias',
  'proveedores',
  'clientes',
  'usuarios',
  'productos',
  'caja',
  'ventas',
  'venta_detalle',
  'pagos_venta',
  'compras',
  'compra_detalles',
  'cotizaciones',
  'cotizacion_detalles',
  'devoluciones',
  'ajustes_inventario',
  'log_acciones'
];

const sequenceColumns = {
  categorias: 'id_categoria',
  proveedores: 'id_proveedor',
  clientes: 'id_cliente',
  usuarios: 'id_usuario',
  productos: 'id_producto',
  caja: 'id_caja',
  ventas: 'id_venta',
  venta_detalle: 'id_detalle',
  pagos_venta: 'id_pago',
  compras: 'id_compra',
  compra_detalles: 'id_detalle',
  cotizaciones: 'id_cotizacion',
  cotizacion_detalles: 'id_detalle',
  devoluciones: 'id_devolucion',
  ajustes_inventario: 'id_ajuste',
  log_acciones: 'id_log'
};

function decodeEscape(character) {
  const escapes = {
    '0': '\0',
    b: '\b',
    n: '\n',
    r: '\r',
    t: '\t',
    Z: '\x1a',
    '\\': '\\',
    "'": "'",
    '"': '"'
  };
  return Object.prototype.hasOwnProperty.call(escapes, character) ? escapes[character] : character;
}

function parseString(value, start) {
  const quote = value[start];
  let result = '';
  let index = start + 1;

  while (index < value.length) {
    const character = value[index];
    if (character === '\\') {
      result += decodeEscape(value[index + 1] || '\\');
      index += 2;
      continue;
    }
    if (character === quote) {
      if (value[index + 1] === quote) {
        result += quote;
        index += 2;
        continue;
      }
      return { value: result, end: index + 1 };
    }
    result += character;
    index += 1;
  }

  throw new Error('Cadena MySQL sin cerrar');
}

function parseTuple(value, start) {
  if (value[start] !== '(') throw new Error('Tupla MySQL inválida');
  const values = [];
  let index = start + 1;

  while (index < value.length) {
    while (/\s/.test(value[index] || '')) index += 1;
    if (value[index] === ')' || value[index] === ',') {
      values.push(null);
    } else if (value[index] === "'" || value[index] === '"') {
      const parsed = parseString(value, index);
      values.push(parsed.value);
      index = parsed.end;
    } else {
      const tokenStart = index;
      while (index < value.length && value[index] !== ',' && value[index] !== ')') index += 1;
      const token = value.slice(tokenStart, index).trim();
      values.push(token.toUpperCase() === 'NULL' ? null : token);
    }

    while (/\s/.test(value[index] || '')) index += 1;
    if (value[index] === ',') {
      index += 1;
      continue;
    }
    if (value[index] === ')') return { values, end: index + 1 };
    throw new Error('Separador MySQL inválido');
  }

  throw new Error('Tupla MySQL sin cerrar');
}

function parseValues(value) {
  const rows = [];
  let index = 0;
  while (index < value.length) {
    while (/\s|,/.test(value[index] || '')) index += 1;
    if (index >= value.length) break;
    if (value[index] !== '(') throw new Error('Lista de valores MySQL inválida');
    const parsed = parseTuple(value, index);
    rows.push(parsed.values);
    index = parsed.end;
  }
  return rows;
}

function findStatementEnd(content, start) {
  let quote = null;
  for (let index = start; index < content.length; index += 1) {
    const character = content[index];
    if (quote) {
      if (character === '\\') {
        index += 1;
        continue;
      }
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === ';') return index;
  }
  throw new Error('Sentencia SQL sin terminador');
}

function normalizeColumnName(value) {
  let column = value.trim();
  if (column.startsWith('`') && column.endsWith('`')) column = column.slice(1, -1).replace(/``/g, '`');
  if (column.startsWith('"') && column.endsWith('"')) column = column.slice(1, -1).replace(/""/g, '"');
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(column)) throw new Error(`Columna no permitida: ${value}`);
  return column.toLowerCase();
}

function parseColumnList(value) {
  if (!value) return null;
  const columns = value.split(',').map(normalizeColumnName);
  if (new Set(columns).size !== columns.length) throw new Error('Lista de columnas duplicada');
  return columns;
}

function normalizeValue(table, column, value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  if (value.startsWith('0000-00-00')) return null;
  if ((table === 'usuarios' && column === 'activo') || (table === 'productos' && column === 'activo')) {
    return value === '1' || value.toLowerCase() === 'true';
  }
  return value;
}

function findStatements(content) {
  if (/\bINSERT\s+IGNORE\b/i.test(content)) throw new Error('El dump contiene INSERT IGNORE no soportado');
  if (/\bREPLACE\s+INTO\b|\bLOAD\s+DATA\b/i.test(content)) throw new Error('El dump contiene DML no soportado');

  const statements = [];
  const insertPattern = /\bINSERT\s+INTO\b/gi;
  let match;
  while ((match = insertPattern.exec(content))) {
    const end = findStatementEnd(content, match.index);
    const raw = content.slice(match.index, end);
    const header = raw.match(/^INSERT\s+INTO\s+`?([A-Za-z0-9_]+)`?\s*(?:\(([^)]*)\))?\s*VALUES\s*([\s\S]*)$/i);
    if (!header) throw new Error('No se pudo interpretar una sentencia INSERT');
    const table = header[1].toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(tableColumns, table)) throw new Error(`Tabla no permitida: ${table}`);

    const explicitColumns = parseColumnList(header[2]);
    const inputColumns = explicitColumns || sourceColumns[table] || tableColumns[table];
    const targetColumns = tableColumns[table];
    for (const column of inputColumns) {
      if (!targetColumns.includes(column)) throw new Error(`Columna no soportada en ${table}: ${column}`);
    }

    const rows = parseValues(header[3]).map((row) => {
      if (row.length !== inputColumns.length) throw new Error(`Número de columnas inválido en ${table}`);
      const valuesByColumn = new Map(inputColumns.map((column, index) => [column, row[index]]));
      return targetColumns.map((column) => normalizeValue(
        table,
        column,
        valuesByColumn.has(column) ? valuesByColumn.get(column) : (missingDefaults[table] && missingDefaults[table][column])
      ));
    });

    statements.push({ table, rows });
    insertPattern.lastIndex = end + 1;
  }
  return statements;
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function assertEmpty(client) {
  for (const table of loadOrder) {
    const result = await client.query(`SELECT COUNT(*)::integer AS total FROM ${quoteIdentifier(table)}`);
    if (result.rows[0].total > 0) throw new Error(`La tabla ${table} ya contiene datos`);
  }
}

async function lockDestination(client) {
  const tables = ['schema_migrations', ...loadOrder].map(quoteIdentifier).join(', ');
  await client.query(`LOCK TABLE ${tables} IN ACCESS EXCLUSIVE MODE`);
}

async function insertRows(client, table, rows) {
  if (rows.length === 0) return;
  const columns = tableColumns[table];
  const batchSize = 250;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const values = [];
    const placeholders = batch.map((row, rowIndex) => {
      if (row.length !== columns.length) throw new Error(`Número de columnas inválido en ${table}`);
      const placeholdersRow = columns.map((column, columnIndex) => {
        values.push(row[columnIndex]);
        return `$${rowIndex * columns.length + columnIndex + 1}`;
      });
      return `(${placeholdersRow.join(', ')})`;
    });
    const columnList = columns.map(quoteIdentifier).join(', ');
    await client.query(`INSERT INTO ${quoteIdentifier(table)} (${columnList}) VALUES ${placeholders.join(', ')}`, values);
  }
}

async function verifyCounts(client, grouped) {
  for (const table of loadOrder) {
    const result = await client.query(`SELECT COUNT(*)::integer AS total FROM ${quoteIdentifier(table)}`);
    if (result.rows[0].total !== grouped.get(table).length) {
      throw new Error(`Conteo inesperado en ${table}`);
    }
  }
}

async function resetSequences(client) {
  for (const table of loadOrder) {
    const column = sequenceColumns[table];
    const sequence = await client.query('SELECT pg_get_serial_sequence($1, $2) AS name', [table, column]);
    if (!sequence.rows[0].name) throw new Error(`No se encontró la secuencia de ${table}`);
    const maxResult = await client.query(`SELECT COALESCE(MAX(${quoteIdentifier(column)}), 1) AS value, COUNT(*)::integer AS total FROM ${quoteIdentifier(table)}`);
    await client.query('SELECT setval($1, $2, $3)', [sequence.rows[0].name, maxResult.rows[0].value, maxResult.rows[0].total > 0]);
  }
}

function resolveDumpPath(args) {
  const value = args.find((argument) => !argument.startsWith('--')) || process.env.MYSQL_DUMP_PATH;
  if (!value) throw new Error('Uso: node scripts/import_mysql_dump.js <archivo.sql>');
  const dumpPath = path.resolve(value);
  if (!fs.existsSync(dumpPath) || !fs.statSync(dumpPath).isFile()) throw new Error(`No se encontró el dump: ${dumpPath}`);
  return dumpPath;
}

async function importDump() {
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun && !process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada');
  const dumpPath = resolveDumpPath(process.argv.slice(2));
  const content = fs.readFileSync(dumpPath, 'utf8');
  const statements = findStatements(content);
  const grouped = new Map(loadOrder.map((table) => [table, []]));
  for (const statement of statements) grouped.get(statement.table).push(...statement.rows);
  const userIndex = tableColumns.ventas.indexOf('id_usuario');
  const cajaIndex = tableColumns.ventas.indexOf('id_caja');
  const unlinkedSales = grouped.get('ventas').filter((row) => row[userIndex] == null || row[cajaIndex] == null).length;
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  console.log(`Origen: ${dumpPath}`);
  console.log(`SHA-256: ${hash}`);
  if (unlinkedSales > 0) console.log(`AVISO: ${unlinkedSales} ventas requieren vendedor y caja antes de importar`);
  if (dryRun) {
    for (const table of loadOrder) console.log(`${table}: ${grouped.get(table).length}`);
    console.log('Validación completada sin escribir en PostgreSQL');
    return;
  }
  if (unlinkedSales > 0) throw new Error('La importación se detuvo: hay ventas sin id_usuario o id_caja');

  const client = new Client(getConnectionOptions(process.env.DATABASE_URL));
  await client.connect();
  try {
    await client.query('BEGIN');
    await lockDestination(client);
    await assertEmpty(client);
    for (const table of loadOrder) await insertRows(client, table, grouped.get(table));
    await verifyCounts(client, grouped);
    await resetSequences(client);
    await client.query('COMMIT');
    for (const table of loadOrder) console.log(`${table}: ${grouped.get(table).length}`);
    console.log('Importación completada');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  importDump().catch((error) => {
    console.error('Error de importación:', error.message || 'fallo controlada');
    process.exit(1);
  });
}

module.exports = { importDump, findStatements, parseValues, tableColumns, sourceColumns, loadOrder };
