// Verificar estado del servidor
async function checkServerStatus() {
    try {
        await fetchAPIAuth('/');
        const statusSpan = document.getElementById('server-status');
        statusSpan.innerHTML = '<span class="status-badge status-200">✅ En línea</span>';
    } catch (error) {
        const statusSpan = document.getElementById('server-status');
        statusSpan.innerHTML = '<span class="status-badge status-500">❌ Fuera de línea</span>';
    }
}

// Probar endpoint
async function testEndpoint(method, url) {
    const responseArea = event.target.nextElementSibling;
    responseArea.classList.add('show');
    responseArea.innerHTML = '<span class="loading">⏳ Cargando...</span>';

    try {
        const data = await fetchAPIAuth(url, { method });

        const statusClass = 'status-200';
        const statusBadge = '<span class="status-badge status-200">200</span>';

        responseArea.innerHTML = `
            <div style="margin-top: 10px;">
                <strong>Respuesta:</strong> ${statusBadge}
            </div>
            <pre style="background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; margin-top: 10px; overflow-x: auto; font-family: 'Courier New', monospace;">${JSON.stringify(data, null,2)}</pre>
        `;
    } catch (error) {
        responseArea.innerHTML = `
            <div style="margin-top: 10px; color: #f44336;">
                <strong>Error:</strong> ${error.message}
            </div>
        `;
    }
}

// Verificar estado al cargar
document.addEventListener('DOMContentLoaded', checkServerStatus);