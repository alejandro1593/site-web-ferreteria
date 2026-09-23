process.env.NODE_ENV = 'test';
require('dotenv').config({ quiet: true });

const applicationDatabaseUrl = process.env.DATABASE_URL;
const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error('TEST_DATABASE_URL no configurada');

function databaseName(value) {
  return decodeURIComponent(new URL(value).pathname.replace(/^\//, ''));
}

if (applicationDatabaseUrl && databaseName(connectionString) === databaseName(applicationDatabaseUrl)) {
  throw new Error('TEST_DATABASE_URL no puede apuntar a la base de aplicación');
}
process.env.DATABASE_URL = connectionString;

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const db = require('../src/config/db_postgres');
const app = require('../src/app');

const runId = `${process.pid}_${Date.now()}`;
const password = 'Caja#Test2026';
const username = `test_caja_${runId}`;
const categoryName = `Categoría caja ${runId}`;
const productCode = `CAJA-${runId}`;
let userId;
let categoryId;
let productId;
let clientId;
let cajaId;
let ventaId;
let creditVentaId;
let token;

function connection() {
  return new Client(db.getConnectionOptions(connectionString));
}

beforeAll(async () => {
  const client = await connection().connect();
  const current = await client.query('SELECT current_database() AS database');
  if (!/(test|restore|staging)/i.test(current.rows[0].database)) {
    await client.end();
    throw new Error('La base de pruebas debe tener "test", "restore" o "staging" en el nombre');
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await client.query(
    `INSERT INTO usuarios (username, password, nombre, rol, activo)
     VALUES ($1, $2, 'Usuario Caja', 'cajero', TRUE)
     RETURNING id_usuario`,
    [username, hash]
  );
  userId = user.rows[0].id_usuario;
  const clientResult = await client.query(
    `INSERT INTO clientes (nombre, apellido, dni)
     VALUES ('Cliente', 'Caja Test', $1)
     RETURNING id_cliente`,
    [`9900${runId.slice(-6)}`]
  );
  clientId = clientResult.rows[0].id_cliente;
  const category = await client.query(
    `INSERT INTO categorias (nombre) VALUES ($1) RETURNING id_categoria`,
    [categoryName]
  );
  categoryId = category.rows[0].id_categoria;
  const product = await client.query(
    `INSERT INTO productos (nombre, codigo, precio_compra, precio_venta, stock_actual, stock_minimo, id_categoria, activo)
     VALUES ($1, $2, 5, 10, 10, 1, $3, TRUE)
     RETURNING id_producto`,
    [`Producto caja ${runId}`, productCode, categoryId]
  );
  productId = product.rows[0].id_producto;
  await client.end();
  const response = await request(app).post('/api/auth/login').send({ username, password });
  expect(response.status).toBe(200);
  token = response.body.token;
});

afterAll(async () => {
  const client = await connection().connect();
   for (const id of [ventaId, creditVentaId].filter(Boolean)) {
     await client.query('DELETE FROM pagos_venta WHERE id_venta = $1', [id]);
     await client.query('DELETE FROM devoluciones WHERE id_venta = $1', [id]);
     await client.query('DELETE FROM venta_detalle WHERE id_venta = $1', [id]);
     await client.query('DELETE FROM ventas WHERE id_venta = $1', [id]);
   }
   if (cajaId) await client.query('DELETE FROM caja WHERE id_caja = $1', [cajaId]);
   if (productId) await client.query('DELETE FROM productos WHERE id_producto = $1', [productId]);
   if (categoryId) await client.query('DELETE FROM categorias WHERE id_categoria = $1', [categoryId]);
   if (clientId) await client.query('DELETE FROM clientes WHERE id_cliente = $1', [clientId]);
   if (userId) await client.query('DELETE FROM usuarios WHERE id_usuario = $1', [userId]);

  await client.end();
  await db.close();
});

describe('Caja y ventas', () => {
  test('rechaza una venta sin caja abierta', async () => {
    const response = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({ metodo_pago: 'efectivo', detalles: [{ id_producto: productId, cantidad: 1 }] });
    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/caja/i);
  });

  test('asocia una venta a la caja abierta', async () => {
    const open = await request(app)
      .post('/api/caja/abrir')
      .set('Authorization', `Bearer ${token}`)
      .send({ password, monto_apertura: 0 });
    expect(open.status).toBe(201);
    cajaId = open.body.id;

    const response = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({ metodo_pago: 'efectivo', detalles: [{ id_producto: productId, cantidad: 1 }] });
    expect(response.status).toBe(201);
    ventaId = response.body.id;
    expect(ventaId).toBeDefined();

    const client = await connection().connect();
     const sale = await client.query('SELECT id_caja, id_usuario FROM ventas WHERE id_venta = $1', [ventaId]);
     const caja = await client.query('SELECT fecha_apertura FROM caja WHERE id_caja = $1', [cajaId]);
     await client.end();
     expect(sale.rows[0].id_caja).toBe(cajaId);
     expect(sale.rows[0].id_usuario).toBe(userId);
     expect(caja.rows[0].fecha_apertura).toBeTruthy();

  });

  test('devuelve crédito sin overdibujar saldo ni caja', async () => {
    const sale = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id_cliente: clientId,
        metodo_pago: 'credito',
        detalles: [{ id_producto: productId, cantidad: 2 }]
      });
    expect(sale.status).toBe(201);
    creditVentaId = sale.body.id;

    const returned = await request(app)
      .post('/api/devoluciones')
      .set('Authorization', `Bearer ${token}`)
      .send({ id_venta: creditVentaId, id_producto: productId, cantidad: 1 });
    expect(returned.status).toBe(201);
    expect(returned.body.monto_reembolso).toBe(11.6);

    const adjustment = await connection().connect();
    await adjustment.query('UPDATE ventas SET saldo_pendiente = 5 WHERE id_venta = $1', [creditVentaId]);
    await adjustment.end();

    const excessiveReturn = await request(app)
      .post('/api/devoluciones')
      .set('Authorization', `Bearer ${token}`)
      .send({ id_venta: creditVentaId, id_producto: productId, cantidad: 1 });
    expect(excessiveReturn.status).toBe(409);
    expect(excessiveReturn.body.error).toMatch(/saldo|nota/i);

    const client = await connection().connect();
    const result = await client.query(
      `SELECT v.saldo_pendiente, v.estado, p.metodo, p.id_devolucion
       FROM ventas v
       JOIN pagos_venta p ON p.id_venta = v.id_venta AND p.tipo = 'reembolso'
       WHERE v.id_venta = $1`,
      [creditVentaId]
    );
    await client.end();
    expect(Number(result.rows[0].saldo_pendiente)).toBe(5);
    expect(result.rows[0].estado).toBe('pendiente');
    expect(result.rows[0].metodo).toBe('credito');
     expect(result.rows[0].id_devolucion).toBeTruthy();
   }, 15000);


  test('cierra la caja con el resumen de la venta', async () => {
    const close = await request(app)
      .post('/api/caja/cerrar')
      .set('Authorization', `Bearer ${token}`)
      .send({ password, monto_cierre: 11.60 });
    expect(close.status).toBe(200);
    expect(close.body.monto_esperado).toBe(11.6);

    const client = await connection().connect();
    const caja = await client.query('SELECT estado, monto_esperado FROM caja WHERE id_caja = $1', [cajaId]);
    await client.end();
    expect(caja.rows[0].estado).toBe('cerrada');
    expect(Number(caja.rows[0].monto_esperado)).toBe(11.6);
  });
});
