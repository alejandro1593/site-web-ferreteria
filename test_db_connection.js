const connection = require('./src/config/db_mysql');

console.log('=== PRUEBA DE CONEXIÓN A LA BASE DE DATOS ===\n');

connection.ping((err) => {
    if (err) {
        console.error('❌ Error al hacer ping a la base de datos:', err);
        process.exit(1);
    }
    console.log('✅ Conexión a MySQL exitosa\n');
});

connection.query('SELECT DATABASE() as current_db', (err, results) => {
    if (err) {
        console.error('❌ Error obteniendo nombre de la base de datos:', err);
        process.exit(1);
    }
    console.log('📊 Base de datos actual:', results[0].current_db);
    console.log('');
});

connection.query('SHOW TABLES', (err, results) => {
    if (err) {
        console.error('❌ Error obteniendo tablas:', err);
        process.exit(1);
    }
    console.log('📋 Tablas en la base de datos:');
    results.forEach((row, index) => {
        const tableName = Object.values(row)[0];
        console.log(`  ${index + 1}. ${tableName}`);
    });
    console.log('');
});

connection.query('SELECT COUNT(*) as total_usuarios FROM usuarios', (err, results) => {
    if (err) {
        console.error('❌ Error contando usuarios:', err);
        process.exit(1);
    }
    console.log('👥 Total de usuarios:', results[0].total_usuarios);
    console.log('');
});

connection.query('SELECT * FROM usuarios LIMIT 5', (err, results) => {
    if (err) {
        console.error('❌ Error obteniendo usuarios:', err);
        process.exit(1);
    }
    console.log('📋 Primeros 5 usuarios:');
    results.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id_usuario}, Username: ${user.username}, Nombre: ${user.nombre}, Rol: ${user.rol}, Activo: ${user.activo}`);
    });
    console.log('');
});

setTimeout(() => {
    console.log('=== PRUEBA DE BASE DE DATOS COMPLETADA ===\n');
    connection.end();
    process.exit(0);
}, 1000);