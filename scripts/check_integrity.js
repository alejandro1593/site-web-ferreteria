const { Client } = require('pg');
const db = require('../src/config/db_postgres');

function connectionOptions() {
  return db.getConnectionOptions(process.env.DATABASE_URL);
}

function closeEnough(left, right) {
  return Math.abs(Number(left) - Number(right)) <= 0.009;
}

async function main() {
  const client = new Client(connectionOptions());
  const checks = [];
  try {
    await client.connect();
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const sales = await client.query(`SELECT COUNT(*)::integer AS total
      FROM ventas
      WHERE id_usuario IS NULL OR id_caja IS NULL`);
    const openCajas = await client.query(`SELECT id_usuario, COUNT(*)::integer AS total
      FROM caja
      WHERE estado = 'abierta'
      GROUP BY id_usuario
      HAVING COUNT(*) > 1`);
    const stock = await client.query('SELECT COUNT(*)::integer AS total FROM productos WHERE stock_actual < 0');
    const badBalances = await client.query(`SELECT COUNT(*)::integer AS total
      FROM ventas
      WHERE saldo_pendiente < 0
         OR saldo_pendiente > total
         OR (metodo_pago <> 'credito' AND saldo_pendiente <> 0)
         OR (metodo_pago = 'credito' AND estado = 'completada' AND saldo_pendiente <> 0)
         OR (metodo_pago = 'credito' AND estado = 'pendiente' AND saldo_pendiente <= 0)`);
    const excessReturns = await client.query(`SELECT COUNT(*)::integer AS total
      FROM (
        SELECT d.id_venta, d.id_producto
        FROM devoluciones d
        LEFT JOIN venta_detalle vd ON vd.id_venta = d.id_venta AND vd.id_producto = d.id_producto
        WHERE d.estado = 'completada'
        GROUP BY d.id_venta, d.id_producto
        HAVING COALESCE(SUM(d.cantidad), 0) > COALESCE(SUM(vd.cantidad), 0)
      ) excess`);
    const orphanRefunds = await client.query(`SELECT COUNT(*)::integer AS total
      FROM pagos_venta p
      WHERE p.tipo = 'reembolso'
        AND p.id_devolucion IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM devoluciones d WHERE d.id_devolucion = p.id_devolucion)`);
    const reconciliation = await client.query(`SELECT c.id_caja, c.monto_esperado, c.monto_apertura, c.semantica_legacy,
        COALESCE((SELECT SUM(v.total) FROM ventas v WHERE v.id_caja = c.id_caja AND v.estado = 'completada'), 0)::numeric AS ventas_total,
        COALESCE((SELECT SUM(v.total) FROM ventas v WHERE v.id_caja = c.id_caja AND v.estado = 'completada' AND v.metodo_pago = 'efectivo'), 0)::numeric AS ventas_efectivo,
        COALESCE((SELECT SUM(p.monto) FROM pagos_venta p WHERE p.id_caja = c.id_caja AND p.tipo = 'abono' AND p.metodo = 'efectivo'), 0)::numeric AS abonos,
        COALESCE((SELECT SUM(p.monto) FROM pagos_venta p WHERE p.id_caja = c.id_caja AND p.tipo = 'reembolso' AND p.metodo = 'efectivo'), 0)::numeric
          + COALESCE((SELECT SUM(d.monto_reembolso) FROM devoluciones d JOIN ventas v ON v.id_venta = d.id_venta WHERE v.id_caja = c.id_caja AND d.estado = 'completada' AND d.metodo_reembolso = 'efectivo' AND NOT EXISTS (SELECT 1 FROM pagos_venta p WHERE p.tipo = 'reembolso' AND (p.id_devolucion = d.id_devolucion OR (p.id_devolucion IS NULL AND p.id_venta = d.id_venta)))), 0)::numeric AS reembolsos_efectivo,
        COALESCE((SELECT SUM(d.monto_reembolso) FROM devoluciones d JOIN ventas v ON v.id_venta = d.id_venta WHERE v.id_caja = c.id_caja AND d.estado = 'completada' AND NOT EXISTS (SELECT 1 FROM pagos_venta p WHERE p.tipo = 'reembolso' AND (p.id_devolucion = d.id_devolucion OR (p.id_devolucion IS NULL AND p.id_venta = d.id_venta)))), 0)::numeric AS reembolsos_total,
        (SELECT COUNT(*) FROM ventas v WHERE v.id_caja = c.id_caja)::integer
          + (SELECT COUNT(*) FROM pagos_venta p WHERE p.id_caja = c.id_caja)::integer AS movimientos
      FROM caja c
      WHERE c.estado = 'cerrada'
      ORDER BY c.id_caja`);
    const evaluated = reconciliation.rows.map(row => {
      const legacy = Number(row.monto_apertura) + Number(row.ventas_total) + Number(row.abonos) - Number(row.reembolsos_total);
      const cash = Number(row.monto_apertura) + Number(row.ventas_efectivo) + Number(row.abonos) - Number(row.reembolsos_efectivo);
      const legacyMatch = closeEnough(row.monto_esperado, legacy);
      const cashMatch = closeEnough(row.monto_esperado, cash);
      return {
        id_caja: row.id_caja,
        monto_esperado: row.monto_esperado,
        calculo_legacy: legacy.toFixed(2),
        calculo_caja: cash.toFixed(2),
        movimientos: row.movimientos,
        sin_movimientos: Number(row.movimientos) === 0,
        semantica_legacy: Boolean(row.semantica_legacy) && legacyMatch && !cashMatch,
        legacy_match: legacyMatch,
        cash_match: cashMatch
      };
    });
    const active = evaluated.filter(row => !row.sin_movimientos);
    const mismatches = active.filter(row => !row.cash_match && !(row.semantica_legacy && row.legacy_match));
    const legacy = evaluated.filter(row => row.semantica_legacy);
    const huerfanas = evaluated.filter(row => row.sin_movimientos);
    checks.push({ name: 'ventas_sin_asociacion', value: sales.rows[0].total, blocking: true });
    checks.push({ name: 'cajas_abiertas_duplicadas', value: openCajas.rows.length, blocking: true });
    checks.push({ name: 'stock_negativo', value: stock.rows[0].total, blocking: true });
    checks.push({ name: 'saldos_venta_inconsistentes', value: badBalances.rows[0].total, blocking: true });
    checks.push({ name: 'devoluciones_supera_cantidad', value: excessReturns.rows[0].total, blocking: true });
    checks.push({ name: 'reembolsos_huerfanos', value: orphanRefunds.rows[0].total, blocking: true });
    checks.push({ name: 'cajas_descuadradas', value: mismatches.length, blocking: true, details: mismatches });
    checks.push({ name: 'cajas_historicas_sin_movimientos', value: huerfanas.length, blocking: false, details: huerfanas });
    checks.push({ name: 'cajas_semantica_legacy', value: legacy.length, blocking: false, details: legacy });
    const failed = checks.some(check => check.blocking && check.value > 0);
    await client.query('COMMIT');
    console.log(JSON.stringify({ checked_at: new Date().toISOString(), ok: !failed, checks }, null, 2));
    if (failed) process.exitCode = 1;
  } finally {
    await client.end();
    await db.close();
  }
}

main().catch(error => {
  console.error('Error al verificar integridad:', error.code || error.message);
  process.exitCode = 1;
});
