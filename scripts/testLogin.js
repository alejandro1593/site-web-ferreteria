const http = require('http');

async function testLogin() {
    const postData = JSON.stringify({
        username: 'admin',
        password: 'admin123'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    try {
        console.log('🔐 Probando login...');

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('Status:', res.statusCode);
                console.log('Respuesta:', data);

                try {
                    const parsedData = JSON.parse(data);

                    if (res.statusCode === 200 && parsedData.token) {
                        console.log('✅ Login exitoso!');
                        console.log('Token:', parsedData.token.substring(0, 50) + '...');
                        console.log('Usuario:', parsedData.usuario.nombre);
                    } else {
                        console.log('❌ Login falló');
                        console.log('Error:', parsedData.error);
                    }
                } catch (e) {
                    console.log('❌ Error parsing JSON:', e.message);
                }

                process.exit(0);
            });
        });

        req.on('error', (e) => {
            console.error('❌ Error en petición:', e.message);
            process.exit(1);
        });

        req.write(postData);
        req.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testLogin();
