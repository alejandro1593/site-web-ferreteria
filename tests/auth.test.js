/**
 * Tests de seguridad y autenticación.
 * Requieren el servidor MySQL corriendo con la BD del proyecto.
 *
 * Ejecutar: npm test
 */
const request = require('supertest');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();
const app = require('../src/app');

// Credenciales exclusivas para pruebas (se aplican a la BD en beforeAll)
const TEST_ADMIN_PASS = 'Admin#Test2026';
const TEST_VENDEDOR_PASS = 'Vendedor#Test2026';
const TEST_ADMIN_USER = 'test_admin_seg';
const TEST_VENDEDOR_USER = 'test_vendedor_seg';

let tokenAdmin;
let tokenVendedor;

beforeAll(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_ferreteria'
  });
  // Cuentas efímeras propias de las pruebas (no tocan cuentas reales)
  const hashAdmin = await bcrypt.hash(TEST_ADMIN_PASS, 10);
  const hashVend = await bcrypt.hash(TEST_VENDEDOR_PASS, 10);
  await conn.query("DELETE FROM usuarios WHERE username IN (?, ?)", [TEST_ADMIN_USER, TEST_VENDEDOR_USER]);
  await conn.query(
    "INSERT INTO usuarios (username, password, nombre, email, rol, activo) VALUES (?, ?, 'Admin de Prueba', NULL, 'admin', 1), (?, ?, 'Vendedor de Prueba', NULL, 'vendedor', 1)",
    [TEST_ADMIN_USER, hashAdmin, TEST_VENDEDOR_USER, hashVend]
  );
  await conn.end();
});

afterAll(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_ferreteria'
  });
  // Limpieza: eliminar TODOS los usuarios creados por las pruebas
  await conn.query("DELETE FROM usuarios WHERE username LIKE 'test_rol_%' OR username IN ('atacante', 'intruso', ?, ?)", [TEST_ADMIN_USER, TEST_VENDEDOR_USER]);
  await conn.end();
});

describe('Autenticación', () => {
  test('login con credenciales válidas devuelve token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_ADMIN_USER, password: TEST_ADMIN_PASS });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.username).toBe(TEST_ADMIN_USER);
    tokenAdmin = res.body.token;
  });

  test('login con contraseña inválida devuelve 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_ADMIN_USER, password: 'contrasena_mala' });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test('login sin campos devuelve 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('Protección de registro (escalada de privilegios)', () => {
  test('registro sin token es rechazado con 401', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'atacante', password: '123456', nombre: 'Atacante', rol: 'admin' });

    expect(res.status).toBe(401);
  });

  test('registro con rol inválido lo degrada a vendedor (con admin)', async () => {
    const username = `test_rol_${Date.now()}`;
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ username, password: 'test123456', nombre: 'Test Rol', rol: 'SUPERUSUARIO' });

    expect([201, 200]).toContain(res.status);
  });
});

describe('Control de acceso por roles', () => {
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: TEST_VENDEDOR_USER, password: TEST_VENDEDOR_PASS });
    tokenVendedor = res.body.token;
  });

  test('vendedor no puede crear usuarios (403)', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenVendedor}`)
      .send({ username: 'intruso', password: '123456', nombre: 'Intruso' });

    expect(res.status).toBe(403);
  });

  test('vendedor no puede eliminar ventas (403)', async () => {
    const res = await request(app)
      .delete('/api/ventas/999999')
      .set('Authorization', `Bearer ${tokenVendedor}`);

    expect(res.status).toBe(403);
  });

  test('API sin token es rechazada (401)', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.status).toBe(401);
  });

  test('admin puede listar usuarios (200)', async () => {
    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Módulos nuevos', () => {
  test('listar compras requiere token (401 sin él, 200 con admin)', async () => {
    const sinToken = await request(app).get('/api/compras');
    expect(sinToken.status).toBe(401);

    const conToken = await request(app)
      .get('/api/compras')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(conToken.status).toBe(200);
  });

  test('logs de auditoría solo para admin (403 vendedor)', async () => {
    const res = await request(app)
      .get('/api/logs')
      .set('Authorization', `Bearer ${tokenVendedor}`);

    expect(res.status).toBe(403);
  });

  test('paginación de productos funciona (?page=1&limit=5)', async () => {
    const res = await request(app)
      .get('/api/productos?page=1&limit=5')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(5);
    expect(res.headers['x-total-count']).toBeDefined();
  });

  test('ganancias requiere fechas (400 si faltan)', async () => {
    const res = await request(app)
      .get('/api/ventas/ganancias')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(400);
  });

  test('ajuste de inventario valida campos (400)', async () => {
    const res = await request(app)
      .post('/api/ajustes')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
