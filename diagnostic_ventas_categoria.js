const fetch = (await import('node-fetch')).default;

const API_BASE_URL = 'http://localhost:3000/api';

console.log('=== PRUEBA DE DIAGNÓSTICO DE VENTAS POR CATEGORÍA ===\n');

// Obtener token
console.log('1. Obteniendo token de autenticación...');
const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
});

if (!loginResponse.ok) {
    console.error('❌ Error en login:', loginResponse.status);
    process.exit(1);
}

const loginData = await loginResponse.json();
const token = loginData.token;
console.log('✅ Token obtenido:', token.substring(0, 30) + '...');
console.log('');

// Obtener categorías disponibles
console.log('2. Obteniendo categorías disponibles...');
const categoriasResponse = await fetch(`${API_BASE_URL}/categorias`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

if (!categoriasResponse.ok) {
    console.error('❌ Error obteniendo categorías:', categoriasResponse.status);
    console.error('Response:', await categoriasResponse.text());
    process.exit(1);
}

const categorias = await categoriasResponse.json();
console.log(`✅ Categorías obtenidas: ${categorias.length}`);
categorias.forEach((cat, i) => {
    console.log(`   ${i + 1}. ${cat.nombre} (ID: ${cat.id_categoria})`);
});
console.log('');

// Prueba 1: Sin categoría (como al cargar inicialmente)
console.log('3. PRUEBA 1: Sin categoría (carga inicial)');
const prueba1Response = await fetch(`${API_BASE_URL}/ventas/fecha?fechaInicio=2024-01-01&fechaFin=2025-12-31`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

console.log('   URL: /ventas/fecha?fechaInicio=2024-01-01&fechaFin=2025-12-31');
console.log('   Status:', prueba1Response.status, prueba1Response.statusText);
if (!prueba1Response.ok) {
    console.error('   ❌ Error:', await prueba1Response.text());
} else {
    const ventas1 = await prueba1Response.json();
    console.log(`   ✅ Exitoso: ${ventas1.length} ventas`);
    if (ventas1.length > 0) {
        console.log(`   Primer venta: ID ${ventas1[0].id_venta}, Total ${ventas1[0].total}`);
    }
}
console.log('');

// Prueba 2: Con categoría específica (ID 1)
console.log('4. PRUEBA 2: Con categoría específica (ID: 1)');
const prueba2Response = await fetch(`${API_BASE_URL}/ventas/categoria/1?fechaInicio=2024-01-01&fechaFin=2025-12-31`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

console.log('   URL: /ventas/categoria/1?fechaInicio=2024-01-01&fechaFin=2025-12-31');
console.log('   Status:', prueba2Response.status, prueba2Response.statusText);
if (!prueba2Response.ok) {
    const errorText = await prueba2Response.text();
    console.error('   ❌ Error:', errorText);
    console.error('   Código HTTP:', prueba2Response.status);
} else {
    const ventas2 = await prueba2Response.json();
    console.log(`   ✅ Exitoso: ${ventas2.length} ventas`);
    if (ventas2.length > 0) {
        console.log(`   Primer venta: ID ${ventas2[0].id_venta}, Cliente: ${ventas2[0].cliente_nombre}`);
        if (ventas2[0].categoria_nombre) {
            console.log(`   Categoría: ${ventas2[0].categoria_nombre}`);
        } else {
            console.log('   ⚠️  El campo categoria_nombre no está en la respuesta');
        }
    }
}
console.log('');

// Prueba 3: Verificar qué devuelve findByCategoria cuando no hay datos
console.log('5. PRUEBA 3: Categoría sin ventas (ID: 999)');
const prueba3Response = await fetch(`${API_BASE_URL}/ventas/categoria/999?fechaInicio=2024-01-01&fechaFin=2025-12-31`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

console.log('   URL: /ventas/categoria/999?fechaInicio=2024-01-01&fechaFin=2025-12-31');
console.log('   Status:', prueba3Response.status, prueba3Response.statusText);
if (!prueba3Response.ok) {
    const errorText = await prueba3Response.text();
    console.error('   ❌ Error:', errorText);
} else {
    const ventas3 = await prueba3Response.json();
    console.log(`   ✅ Exitoso (array vacío esperado): ${ventas3.length} ventas`);
}
console.log('');

console.log('=== DIAGNÓSTICO COMPLETADO ===');
console.log('Si todas las pruebas fueron exitosas, el problema está en el frontend');
console.log('Si alguna prueba falló, el problema está en el backend');
console.log('');
console.log('Revisa los logs del servidor para ver qué está recibiendo exactamente');