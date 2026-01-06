const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const connection = require('../src/config/db_mysql');

async function testAuth() {
    try {
        console.log('🔐 Probando autenticación...');

        const username = 'admin';
        const password = 'admin123';

        console.log('Buscando usuario:', username);

        const [results] = await connection.promise().query(
            'SELECT * FROM usuarios WHERE username = ?',
            [username]
        );

        console.log('Usuario encontrado:', results.length > 0 ? 'Sí' : 'No');

        if (results.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }

        const usuario = results[0];
        console.log('Usuario:', usuario.username);
        console.log('Activo:', usuario.activo);

        const passwordValida = await bcrypt.compare(password, usuario.password);
        console.log('Contraseña válida:', passwordValida);

        if (!passwordValida) {
            console.log('❌ Contraseña inválida');
            return;
        }

        console.log('🔑 Generando token JWT...');

        const token = jwt.sign(
            {
                id: usuario.id_usuario,
                username: usuario.username,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        console.log('✅ Token generado:', token.substring(0, 50) + '...');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testAuth();
