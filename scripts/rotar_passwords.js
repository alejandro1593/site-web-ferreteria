/**
 * Rotación de contraseñas del sistema.
 * Reemplaza las contraseñas débiles del seed por contraseñas fuertes.
 *
 * Uso: node scripts/rotar_passwords.js
 * ⚠️ Ejecutar una sola vez y guardar las contraseñas impresas en un lugar seguro.
 */
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

const NUEVAS_PASSWORDS = {
  admin:        'F3rr3t3ria!Admin2026',
  gerente:      'F3rr3t3ria!Geraente2026',
  supervisor1:  'F3rr3t3ria!Supervisor1',
  supervisor2:  'F3rr3t3ria!Supervisor2',
  cajera:       'F3rr3t3ria!Cajera2026',
  cajero1:      'F3rr3t3ria!Cajero1',
  cajero2:      'F3rr3t3ria!Cajero2',
  almacenista1: 'F3rr3t3ria!Almacen1',
  almacenista2: 'F3rr3t3ria!Almacen2',
  vendedor1:    'F3rr3t3ria!Vendedor1'
};

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_ferreteria'
  });

  console.log('=== ROTACIÓN DE CONTRASEÑAS ===\n');

  let actualizados = 0;
  for (const [username, nuevaPassword] of Object.entries(NUEVAS_PASSWORDS)) {
    // Verificar que el usuario exista antes de actualizar
    const [users] = await conn.query('SELECT id_usuario FROM usuarios WHERE username = ?', [username]);
    if (users.length === 0) {
      console.log(`↷ ${username}: no existe en la BD, omitido`);
      continue;
    }

    const hash = await bcrypt.hash(nuevaPassword, 10);
    await conn.query('UPDATE usuarios SET password = ? WHERE username = ?', [hash, username]);
    actualizados++;
    console.log(`✅ ${username} → ${nuevaPassword}`);
  }

  await conn.end();
  console.log(`\n=== ${actualizados} contraseñas actualizadas ===`);
  console.log('⚠️  Guarde esta lista en un lugar seguro. Puede cambiarlas desde la aplicación.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
