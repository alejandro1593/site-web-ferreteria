const connection = require('../src/config/db_mysql');

async function verificarAdmin() {
    try {
        console.log('🔍 Verificando usuario admin...');

        const [results] = await connection.promise().query(
            'SELECT id_usuario, username, nombre, rol, activo FROM usuarios WHERE username = ?',
            ['admin']
        );

        if (results.length === 0) {
            console.log('❌ No existe usuario admin');
            console.log('📝 Ejecuta: node scripts/createAdmin.js para crearlo');
            process.exit(1);
        }

        const usuario = results[0];
        console.log('✅ Usuario admin encontrado:');
        console.log('   ID:', usuario.id_usuario);
        console.log('   Username:', usuario.username);
        console.log('   Nombre:', usuario.nombre);
        console.log('   Rol:', usuario.rol);
        console.log('   Activo:', usuario.activo);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error verificando admin:', error);
        process.exit(1);
    }
}

verificarAdmin();
