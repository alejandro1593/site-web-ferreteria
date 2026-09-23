const { Pool } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
require('dotenv').config();

function normalizeConnectionString(connectionString) {
  if (!connectionString) return undefined;
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  return url.toString();
}

function getSslConfig(connectionString) {
  const configured = (process.env.DATABASE_SSL || '').toLowerCase();
  let mode = configured;
  if (!mode && connectionString) {
    try {
      mode = (new URL(connectionString).searchParams.get('sslmode') || '').toLowerCase();
    } catch (error) {
      mode = '';
    }
  }
  if (mode === 'false' || mode === 'disable') return false;
  if (mode === 'no-verify') return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

function getConnectionOptions(connectionString = process.env.DATABASE_URL) {
  return {
    connectionString: normalizeConnectionString(connectionString),
    ssl: getSslConfig(connectionString),
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000)
  };
}

const pool = new Pool(getConnectionOptions());

const transactionStorage = new AsyncLocalStorage();

pool.on('error', (error) => {
  console.error('Error inesperado del pool PostgreSQL:', error.code || 'UNKNOWN');
});

function convertPlaceholders(sql) {
  let result = '';
  let quote = null;
  let index = 0;

  for (let i = 0; i < sql.length; i += 1) {
    const character = sql[i];

    if (quote) {
      result += character;
      if (character === '\\' && i + 1 < sql.length) {
        result += sql[i + 1];
        i += 1;
      } else if (character === quote) {
        if (sql[i + 1] === quote) {
          result += sql[i + 1];
          i += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      result += character;
      continue;
    }

    if (character === '?') {
      index += 1;
      result += `$${index}`;
      continue;
    }

    result += character;
  }

  return result;
}

function normalizeSql(sql) {
  return convertPlaceholders(sql).replace(/\bCURDATE\s*\(\s*\)/gi, 'CURRENT_DATE');
}

function normalizeParams(params) {
  if (!Array.isArray(params)) return params;
  return params.map((value) => (value === undefined ? null : value));
}

function decorateRows(rows, result) {
  const output = Array.isArray(rows) ? rows : [];
  const first = output[0] || {};
  const id = first.id_usuario ?? first.id_producto ?? first.id_venta ?? first.id_detalle ?? first.id_compra ?? first.id_cotizacion ?? first.id_devolucion ?? first.id_caja ?? first.id_categoria ?? first.id_proveedor ?? first.id_cliente ?? first.id_ajuste ?? first.id_log;
  Object.defineProperty(output, 'insertId', { value: id, enumerable: false });
  Object.defineProperty(output, 'affectedRows', { value: result.rowCount, enumerable: false });
  return output;
}

async function execute(executor, sql, params = []) {
  try {
    const result = await executor.query(normalizeSql(sql), normalizeParams(params));
    return { result, rows: decorateRows(result.rows, result) };
  } catch (error) {
    if (error.code === '23505') error.code = 'ER_DUP_ENTRY';
    if (error.code === '23503') error.code = 'ER_NO_REFERENCED_ROW_2';
    throw error;
  }
}

function getExecutor() {
  const context = transactionStorage.getStore();
  return context ? context.client : pool;
}

function query(sql, params, callback) {
  let values = params;
  let done = callback;

  if (typeof params === 'function') {
    done = params;
    values = [];
  }

  const operation = execute(getExecutor(), sql, values || [])
    .then(({ result, rows }) => {
      if (done) {
        done(null, rows, result);
        return { rows, result };
      }
      return { rows, result };
    })
    .catch((error) => {
      if (done) {
        done(error, [], { rowCount: 0 });
        return { rows: [], result: { rowCount: 0 } };
      }
      throw error;
    });

  return operation;
}

function promise() {
  return {
    query: async (sql, params = []) => {
      const { result, rows } = await execute(getExecutor(), sql, params);
      return [rows, result];
    }
  };
}

async function withTransaction(callback) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = await pool.connect();
    try {
      return await transactionStorage.run({ client }, async () => {
        await client.query('BEGIN');
        try {
          const result = await callback(client);
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });
    } catch (error) {
      if (!['40P01', '40001'].includes(error.code) || attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, attempt * 25));
    } finally {
      client.release();
    }
  }
  throw new Error('No se pudo completar la transacción');
}

function beginTransaction(callback) {
  return pool.connect()
    .then((client) => transactionStorage.run({ client }, async () => {
      try {
        await client.query('BEGIN');
        callback(null);
      } catch (error) {
        client.release();
        callback(error);
      }
    }))
    .catch((error) => callback(error));
}

function finishTransaction(action, callback) {
  const context = transactionStorage.getStore();
  if (!context) return callback(new Error('No hay transacción activa'));
  return context.client.query(action)
    .then(() => {
      context.client.release();
      callback(null);
    })
    .catch((error) => {
      context.client.release();
      callback(error);
    });
}

function commit(callback) {
  return finishTransaction('COMMIT', callback);
}

function rollback(callback) {
  return finishTransaction('ROLLBACK', callback);
}

async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  promise,
  withTransaction,
  beginTransaction,
  commit,
  rollback,
  close,
  getClient: () => pool.connect(),
  getConnectionOptions,
  normalizeConnectionString,
  getSslConfig
};
