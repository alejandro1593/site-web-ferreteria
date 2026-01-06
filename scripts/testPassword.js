const connection = require('../src/config/db_mysql');

async function testPasswordHash() {
    try {
        console.log('🔐 Probando hash de contraseña...');

        const [results] = await connection.promise().query(
            'SELECT password FROM usuarios WHERE username = ?',
            ['admin']
        );

        if (results.length === 0) {
            console.log('❌ Usuario admin no encontrado');
            return;
        }

        const passwordHash = results[0].password;
        console.log('📝 Hash almacenado:', passwordHash);
        console.log('📏 Longitud del hash:', passwordHash.length);

        const bcrypt = require('bcryptjs');

        const password = 'admin123';
        console.log('🔑 Contraseña a probar:', password);

        const isValid = await bcrypt.compare(password, passwordHash);
        console.log('✅ Contraseña válida:', isValid);

        if (!isValid) {
            console.log('🔄 Generando nuevo hash...');
            const newHash = await bcrypt.hash(password, 10);
            console.log('📝 Nuevo hash:', newHash);
            console.log('📏 Longitud del nuevo hash:', newHash.length);

            const [updateResult] = await connection.promise().query(
                'UPDATE usuarios SET password = ? WHERE username = ?',
                [newHash, 'admin']
            );

            console.log('✅ Contraseña actualizada en la base de datos');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testPasswordHash();
