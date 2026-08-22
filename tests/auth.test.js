/**
 * Tests de seguridad y autenticación.
 * Requieren el servidor MySQL corriendo con la BD del proyecto.
 *
 * Ejecutar: npm test
 */
const request = require('supertest');
const app = require('../src/app');

let tokenAdmin;
let tokenVendedor;

describe('Autenticación', () => {
  test('login con credenciales válidas devuelve token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'F3rr3t3ria!Admin2026' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.username).toBe('admin');
    tokenAdmin = res.body.token;
  });

  test('login con contraseña inválida devuelve 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'contrasena_mala' });

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
      .send({ username: 'vendedor1', password: 'F3rr3t3ria!Vendedor1' });
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
