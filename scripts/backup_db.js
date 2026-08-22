/**
 * Backup de la base de datos MySQL usando mysqldump.
 * Genera: backups/backup_AAAA-MM-DD_HHmmss.sql
 *
 * Uso manual:   node scripts/backup_db.js
 * Automático:   programar con el Programador de tareas de Windows:
 *               Programador de tareas → Crear tarea básica → Diaria
 *               Acción: iniciar programa  node.exe
 *               Argumentos: C:\Users\Usuario\Desktop\Ferreteria\scripts\backup_db.js
 */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'db_ferreteria';

const backupsDir = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const ahora = new Date();
const stamp = ahora.toISOString().slice(0, 19).replace(/[:T]/g, '-');
const archivo = path.join(backupsDir, `backup_${stamp}.sql`);

// Buscar mysqldump en PATH o en ubicaciones comunes de Windows
function encontrarMysqldump() {
  const candidatos = [
    'mysqldump',
    'C:\\xampp\\mysql\\bin\\mysqldump.exe',
    'C:\\wamp64\\bin\\mysql\\mysql5.7.36\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe'
  ];
  for (const candidato of candidatos) {
    try {
      require('child_process').execFileSync(candidato, ['--version'], { stdio: 'pipe' });
      return candidato;
    } catch (e) {
      // siguiente candidato
    }
  }
  return null;
}

const mysqldumpPath = encontrarMysqldump();
if (!mysqldumpPath) {
  console.error('❌ mysqldump no encontrado. Instale MySQL Client Tools o verifique XAMPP/WAMP.');
  process.exit(1);
}

console.log(`📦 Generando backup de "${DB_NAME}"...`);

execFile(
  mysqldumpPath,
  [`--host=${DB_HOST}`, `--user=${DB_USER}`, '--result-file=' + archivo, DB_NAME],
  { env: { ...process.env, MYSQL_PWD: DB_PASSWORD } },
  (err) => {
    if (err) {
      console.error('❌ Error al generar el backup:', err.message);
      process.exit(1);
    }

    const size = (fs.statSync(archivo).size / 1024).toFixed(1);
    console.log(`✅ Backup creado: ${archivo} (${size} KB)`);

    // Eliminar backups con más de 30 días
    const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
    fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
      .forEach(f => {
        const ruta = path.join(backupsDir, f);
        if (fs.statSync(ruta).mtimeMs < limite) {
          fs.unlinkSync(ruta);
          console.log(`🗑️  Backup antiguo eliminado: ${f}`);
        }
      });
  }
);
