process.env.NODE_ENV = 'test';
require('dotenv').config();

const applicationDatabaseUrl = process.env.DATABASE_URL;
const connectionString = process.env.TEST_DATABASE_URL;

function databaseEndpoint(value) {
  const url = new URL(value);
  return `${url.protocol}//${url.host}${url.pathname}`;
}

function databaseSsl(value) {
  const url = new URL(value);
  const mode = url.searchParams.get('sslmode');
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (process.env.DATABASE_SSL === 'false' || mode === 'disable' || (!process.env.DATABASE_SSL && !mode && local)) return false;
  if (process.env.DATABASE_SSL === 'no-verify' || mode === 'no-verify') return { rejectUnauthorized: false };
  return { rejectUnauthorized: true };
}

if (connectionString && applicationDatabaseUrl && databaseEndpoint(connectionString) === databaseEndpoint(applicationDatabaseUrl)) {
  throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL');
}
if (connectionString) process.env.DATABASE_URL = connectionString;

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const db = require('../src/config/db_postgres');
const app = require('../src/app');


const TEST_ADMIN_PASS = 'Admin#Test2026';
const TEST_VENDEDOR_PASS = 'Vendedor#Test2026';
const RUN_ID = `${process.pid}_${Date.now()}`;
const TEST_ADMIN_USER = `test_admin_seg_${RUN_ID}`;
const TEST_VENDEDOR_USER = `test_vendedor_seg_${RUN_ID}`;

let tokenAdmin;
let tokenVendedor;
let adminId;
let vendedorId;
let ventaTestId;
const createdUserIds = [];

async function client() {
  const connection = new Client({ connectionString, ssl: databaseSsl(connectionString) });
  await connection.connect();
  return connection;
}

async function assertSafeTestDatabase(connection) {
  const result = await connection.query('SELECT current_database() AS database');
  if (!/test/i.test(result.rows[0].database)) {
    throw new Error(`La base de pruebas debe tener "test" en el nombre: ${result.rows[0].database}`);
  }
}

beforeAll(async () => {
  if (!connectionString) throw new Error('TEST_DATABASE_URL no configurada');
  const connection = await client();
  await assertSafeTestDatabase(connection);
  const hashAdmin = await bcrypt.hash(TEST_ADMIN_PASS, 10);
  const hashVendedor = await bcrypt.hash(TEST_VENDEDOR_PASS, 10);
  const result = await connection.query(
    `INSERT INTO usuarios (username, password, nombre, rol, activo)
     VALUES ($1, $2, 'Admin de Prueba', 'admin', TRUE),
            ($3, $4, 'Vendedor de Prueba', 'vendedor', TRUE)
     RETURNING id_usuario, username`,
    [TEST_ADMIN_USER, hashAdmin, TEST_VENDEDOR_USER, hashVendedor]
  );
  adminId = result.rows.find((row) => row.username === TEST_ADMIN_USER).id_usuario;
  vendedorId = result.rows.find((row) => row.username === TEST_VENDEDOR_USER).id_usuario;
  createdUserIds.push(adminId, vendedorId);
  const sale = await connection.query(
    `INSERT INTO ventas (id_cliente, id_usuario, subtotal, iva, descuento, total, saldo_pendiente, metodo_pago, estado)
     VALUES (NULL, $1, 0, 0, 0, 0, 0, 'efectivo', 'completada')
     RETURNING id_venta`,
    [adminId]
  );
  ventaTestId = sale.rows[0].id_venta;
  await connection.end();
});

afterAll(async () => {
  if (connectionString) {
    const connection = await client();
    if (ventaTestId) await connection.query('DELETE FROM ventas WHERE id_venta = $1', [ventaTestId]);
    if (createdUserIds.length > 0) await connection.query('DELETE FROM usuarios WHERE id_usuario = ANY($1::integer[])', [createdUserIds]);
    await connection.end();
  }
  await db.close();
});

describe('Autenticación', () => {
  test('login con credenciales válidas devuelve token', async () => {
    const response = await request(app).post('/api/auth/login').send({ username: TEST_ADMIN_USER, password: TEST_ADMIN_PASS });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    tokenAdmin = response.body.token;
  });

  test('login con contraseña inválida devuelve 401', async () => {
    const response = await request(app).post('/api/auth/login').send({ username: TEST_ADMIN_USER, password: 'contrasena_mala' });
    expect(response.status).toBe(401);
    expect(response.body.token).toBeUndefined();
  });

  test('login sin campos devuelve 400', async () => {
    const response = await request(app).post('/api/auth/login').send({});
    expect(response.status).toBe(400);
  });

  test('rechaza esquemas de autorización distintos de Bearer', async () => {
    const response = await request(app).get('/api/productos').set('Authorization', `Basic ${tokenAdmin}`);
    expect(response.status).toBe(401);
  });
});

describe('Registro y revocación', () => {
  test('registro sin token es rechazado', async () => {
    const response = await request(app).post('/api/auth/register').send({ username: 'atacante', password: '123456', nombre: 'Atacante', rol: 'admin' });
    expect(response.status).toBe(401);
  });

  test('registro con rol inválido degrada a vendedor', async () => {
    const username = `test_rol_${RUN_ID}`;
    const response = await request(app).post('/api/auth/register').set('Authorization', `Bearer ${tokenAdmin}`).send({ username, password: 'TestRol2026', nombre: 'Test Rol', rol: 'SUPERUSUARIO' });
    expect(response.status).toBe(201);
    const connection = await client();
    const result = await connection.query('SELECT id_usuario, rol FROM usuarios WHERE username = $1', [username]);
    await connection.end();
    createdUserIds.push(result.rows[0].id_usuario);
    expect(result.rows[0].rol).toBe('vendedor');
  });

  test('registro con contraseña débil es rechazado', async () => {
    const response = await request(app).post('/api/auth/register').set('Authorization', `Bearer ${tokenAdmin}`).send({ username: `test_debil_${RUN_ID}`, password: 'corta', nombre: 'Test Débil' });
    expect(response.status).toBe(400);
  });

  test('un token deja de funcionar al desactivar al usuario', async () => {
    const tokenBeforeDisable = await loginVendedor();
    const disable = await request(app).put(`/api/usuarios/${vendedorId}/desactivar`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(disable.status).toBe(200);
    const response = await request(app).get('/api/productos').set('Authorization', `Bearer ${tokenBeforeDisable}`);
    expect(response.status).toBe(401);
    const activate = await request(app).put(`/api/usuarios/${vendedorId}/activar`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(activate.status).toBe(200);
  });
});

async function loginVendedor() {
  const response = await request(app).post('/api/auth/login').send({ username: TEST_VENDEDOR_USER, password: TEST_VENDEDOR_PASS });
  tokenVendedor = response.body.token;
  return tokenVendedor;
}

describe('Control de acceso por roles', () => {
  beforeAll(async () => {
    await loginVendedor();
  });

  test('vendedor no puede crear usuarios', async () => {
    const response = await request(app).post('/api/usuarios').set('Authorization', `Bearer ${tokenVendedor}`).send({ username: 'intruso', password: '123456', nombre: 'Intruso' });
    expect(response.status).toBe(403);
  });

  test('vendedor no puede eliminar ventas', async () => {
    const response = await request(app).delete('/api/ventas/999999').set('Authorization', `Bearer ${tokenVendedor}`);
    expect(response.status).toBe(403);
  });

  test('API sin token es rechazada', async () => {
    const response = await request(app).get('/api/productos');
    expect(response.status).toBe(401);
  });

  test('admin puede listar usuarios', async () => {
    const response = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('el detalle de usuario no expone el hash de contraseña', async () => {
    const response = await request(app).get(`/api/usuarios/${vendedorId}`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(response.status).toBe(200);
    expect(response.body.password).toBeUndefined();
  });
});

describe('Módulos', () => {
  test('health endpoint comprueba la base de datos', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('ok');
  });

  test('compras requiere token y permite consulta con admin', async () => {
    const sinToken = await request(app).get('/api/compras');
    expect(sinToken.status).toBe(401);
    const conToken = await request(app).get('/api/compras').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(conToken.status).toBe(200);
  });

  test('logs son solo para admin', async () => {
    const response = await request(app).get('/api/logs').set('Authorization', `Bearer ${tokenVendedor}`);
    expect(response.status).toBe(403);
  });

  test('paginación de productos funciona', async () => {
    const response = await request(app).get('/api/productos?page=1&limit=5').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(response.status).toBe(200);
    expect(response.body.length).toBeLessThanOrEqual(5);
    expect(response.headers['x-total-count']).toBeDefined();
  });

  test('ganancias requiere fechas', async () => {
    const response = await request(app).get('/api/ventas/ganancias').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(response.status).toBe(400);
  });

  test('detalles de venta se consultan correctamente', async () => {
    const response = await request(app).get(`/api/ventas/${ventaTestId}/detalles`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('ajuste de inventario valida campos', async () => {
    const response = await request(app).post('/api/ajustes').set('Authorization', `Bearer ${tokenAdmin}`).send({});
    expect(response.status).toBe(400);
  });

  test('no permite anular una venta sin caja asociada', async () => {
    const response = await request(app).delete(`/api/ventas/${ventaTestId}`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/caja/i);
  });

  test('logout revoca el token actual', async () => {
    const response = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(response.status).toBe(200);
    const verify = await request(app).get('/api/auth/verify').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(verify.status).toBe(401);
  });
});
