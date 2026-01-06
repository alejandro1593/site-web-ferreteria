const bcrypt = require('bcryptjs');
const connection = require('../src/config/db_mysql');

async function crearUsuarioAdmin() {
    try {
        // Verificar si ya existe un usuario admin
        const [adminExists] = await connection.promise().query(
            'SELECT * FROM usuarios WHERE username = ?',
            ['admin']
        );

        if (adminExists.length > 0) {
            console.log('✅ El usuario admin ya existe');
            process.exit(0);
        }

        // Hash de la contraseña
        const password = await bcrypt.hash('admin123', 10);

        // Insertar usuario admin
        const [result] = await connection.promise().query(
            'INSERT INTO usuarios (username, password, nombre, email, rol, activo) VALUES (?, ?, ?, ?, ?, ?)',
            ['admin', password, 'Administrador', 'admin@ferreteria.com', 'admin', true]
        );

        console.log('✅ Usuario admin creado exitosamente');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('   ⚠️  Por favor, cambia la contraseña después del primer inicio de sesión');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creando usuario admin:', error);
        process.exit(1);
    }
}

crearUsuarioAdmin();
