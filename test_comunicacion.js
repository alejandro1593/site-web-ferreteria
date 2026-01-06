const API_BASE_URL = 'http://localhost:3000/api';

async function testBackendConnection() {
    const fetch = (await import('node-fetch')).default;
    console.log('=== PRUEBA DE COMUNICACIÓN FRONTEND-BACKEND ===\n');

    // 1. Primero hacer login para obtener token
    console.log('1. Intentando login...');
    try {
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        if (!loginResponse.ok) {
            console.error('❌ Error en login:', loginResponse.status, await loginResponse.text());
            return;
        }

        const loginData = await loginResponse.json();
        console.log('✅ Login exitoso');
        console.log('🔑 Token:', loginData.token.substring(0, 50) + '...');
        console.log('');

        const token = loginData.token;

        // 2. Obtener usuarios actuales
        console.log('2. Obteniendo usuarios...');
        const usuariosResponse = await fetch(`${API_BASE_URL}/usuarios`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!usuariosResponse.ok) {
            console.error('❌ Error obteniendo usuarios:', usuariosResponse.status, await usuariosResponse.text());
            return;
        }

        const usuariosData = await usuariosResponse.json();
        console.log('✅ Usuarios obtenidos:', usuariosData.length, 'usuarios');
        console.log('');

        // 3. Probar crear un nuevo usuario
        console.log('3. Creando nuevo usuario...');
        const nuevoUsuario = {
            username: 'test_user_' + Date.now(),
            password: 'test123',
            nombre: 'Usuario de Prueba',
            email: 'test@example.com',
            rol: 'vendedor',
            activo: true
        };

        console.log('📦 Datos a enviar:', nuevoUsuario);

        const createResponse = await fetch(`${API_BASE_URL}/usuarios`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoUsuario)
        });

        console.log('📡 Response status:', createResponse.status);
        console.log('📡 Response ok:', createResponse.ok);

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('❌ Error creando usuario:', createResponse.status);
            console.error('❌ Response:', errorText);
            return;
        }

        const createData = await createResponse.json();
        console.log('✅ Usuario creado exitosamente:', createData);
        console.log('');

        const nuevoUsuarioId = createData.id;
        console.log('📋 ID del usuario creado:', nuevoUsuarioId);
        console.log('');

        // 4. Probar actualizar el usuario
        console.log('4. Actualizando usuario...');
        const datosActualizacion = {
            username: nuevoUsuario.username,
            nombre: 'Usuario de Prueba Actualizado',
            email: 'test_updated@example.com',
            rol: 'vendedor',
            activo: true
        };

        console.log('📦 Datos de actualización:', datosActualizacion);

        const updateResponse = await fetch(`${API_BASE_URL}/usuarios/${nuevoUsuarioId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosActualizacion)
        });

        console.log('📡 Response status:', updateResponse.status);
        console.log('📡 Response ok:', updateResponse.ok);

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('❌ Error actualizando usuario:', updateResponse.status);
            console.error('❌ Response:', errorText);
            return;
        }

        const updateData = await updateResponse.json();
        console.log('✅ Usuario actualizado exitosamente:', updateData);
        console.log('');

        // 5. Verificar que el usuario se actualizó
        console.log('5. Verificando actualización...');
        const verifyResponse = await fetch(`${API_BASE_URL}/usuarios/${nuevoUsuarioId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!verifyResponse.ok) {
            console.error('❌ Error verificando usuario:', verifyResponse.status);
            return;
        }

        const verifyData = await verifyResponse.json();
        console.log('✅ Usuario verificado:', verifyData);
        console.log('');
        console.log('Nombre actualizado:', verifyData.nombre);
        console.log('Email actualizado:', verifyData.email);
        console.log('');

        // 6. Eliminar el usuario de prueba
        console.log('6. Eliminando usuario de prueba...');
        const deleteResponse = await fetch(`${API_BASE_URL}/usuarios/${nuevoUsuarioId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!deleteResponse.ok) {
            console.error('❌ Error eliminando usuario:', deleteResponse.status);
            return;
        }

        const deleteData = await deleteResponse.json();
        console.log('✅ Usuario eliminado exitosamente:', deleteData);
        console.log('');

        console.log('=== TODAS LAS PRUEBAS PASARON EXITOSAMENTE ===');

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
    }
}

testBackendConnection();