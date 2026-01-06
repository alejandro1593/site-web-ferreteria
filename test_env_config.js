require('dotenv').config();

console.log('=== VERIFICACIÓN DE CONFIGURACIÓN ===\n');

console.log('Variables de entorno cargadas:');
console.log(`DB_HOST: ${process.env.DB_HOST}`);
console.log(`DB_USER: ${process.env.DB_USER}`);
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***CONFIGURADO***' : 'VACÍO'}`);
console.log(`DB_NAME: ${process.env.DB_NAME}`);
console.log(`PORT: ${process.env.PORT}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '***CONFIGURADO***' : 'VACÍO'}`);
console.log(`JWT_EXPIRES_IN: ${process.env.JWT_EXPIRES_IN}`);
console.log('');

console.log('Comparación con valores por defecto:');
console.log(`DB_HOST por defecto: 'localhost' -> Usando: '${process.env.DB_HOST}'`);
console.log(`DB_USER por defecto: 'root' -> Usando: '${process.env.DB_USER}'`);
console.log(`DB_NAME por defecto: 'db_ferreteria' -> Usando: '${process.env.DB_NAME}'`);
console.log(`PORT por defecto: '3000' -> Usando: '${process.env.PORT}'`);
console.log('');

console.log('=== VERIFICACIÓN COMPLETADA ===');