// Cargar estadísticas
async function loadDashboardStats() {
    try {
        const currentYear = new Date().getFullYear();
        // Cargar estadísticas de ventas
        const salesSummary = await fetchAPIAuth(`/ventas/summary?fechaInicio=${currentYear}-01-01&fechaFin=${currentYear}-12-31`);

        // Cargar total de cada entidad
        const categorias = await fetchAPIAuth('/categorias');
        const proveedores = await fetchAPIAuth('/proveedores');
        const clientes = await fetchAPIAuth('/clientes');
        const productos = await fetchAPIAuth('/productos');
        const usuarios = await fetchAPIAuth('/usuarios');

        // Mostrar estadísticas
        const statsHTML = `
            <div class="stat-card">
                <h3>💰 Ventas Totales</h3>
                <div class="value">${formatCurrency(salesSummary.total_venta)}</div>
                <div class="trend up">
                    <i>↑</i> ${salesSummary.total_ventas} ventas realizadas
                </div>
            </div>
            <div class="stat-card">
                <h3>📦 Productos</h3>
                <div class="value">${productos.length}</div>
                <div class="trend">
                    En inventario
                </div>
            </div>
            <div class="stat-card">
                <h3>👥 Clientes</h3>
                <div class="value">${clientes.length}</div>
                <div class="trend">
                    Registrados
                </div>
            </div>
            <div class="stat-card">
                <h3>🏢 Proveedores</h3>
                <div class="value">${proveedores.length}</div>
                <div class="trend">
                    Activos
                </div>
            </div>
        `;

        document.getElementById('stats-grid').innerHTML = statsHTML;

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        showNotification('Error al cargar estadísticas del dashboard', 'error');
    }
}

// Cargar ventas recientes
async function loadRecentSales() {
    try {
        const ventas = await fetchAPIAuth('/ventas');
        const recentSales = ventas.slice(0, 10); // Últimas 10 ventas

        const tbody = document.getElementById('recent-sales-tbody');

        if (recentSales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="alert alert-info">
                        No hay ventas registradas
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = recentSales.map(venta => `
            <tr>
                <td>#${venta.id_venta}</td>
                <td>${esc(venta.cliente_nombre) || 'Sin cliente'}</td>
                <td>${formatDate(venta.fecha)}</td>
                <td>
                    <span class="status-badge status-${venta.estado === 'completada' ? 'active' : 'pending'}">
                        ${venta.estado}
                    </span>
                </td>
                <td><strong>${formatCurrency(venta.total)}</strong></td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error cargando ventas recientes:', error);
        showNotification('Error al cargar ventas recientes', 'error');
        document.getElementById('recent-sales-tbody').innerHTML = `
            <tr>
                <td colspan="5" class="alert alert-danger">
                    Error al cargar ventas
                </td>
            </tr>
        `;
    }
}

// Cargar productos con stock bajo
async function loadLowStockProducts() {
    try {
        const productos = await fetchAPIAuth('/productos/lowstock');

        const tbody = document.getElementById('low-stock-tbody');

        if (productos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="alert alert-success">
                        ✅ No hay productos con stock inferior a 20
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = productos.map(producto => {
            const stockStatus = producto.stock_actual === 0 ? 'stock-critical' : 'stock-low';
            const stockText = producto.stock_actual === 0 ? 'Sin stock' : 'Stock bajo';

            return `
                <tr>
                    <td>
                        <strong>${esc(producto.nombre)}</strong>
                        <br>
                        <small>${esc(producto.categoria_nombre)}</small>
                    </td>
                    <td><code>${esc(producto.codigo)}</code></td>
                    <td>
                        <span class="stock-indicator ${stockStatus}">
                            ${producto.stock_actual}
                        </span>
                    </td>
                    <td>
                        <span class="stock-indicator ${stockStatus}">
                            ${stockText}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error cargando productos con stock bajo:', error);
        showNotification('Error al cargar productos con stock bajo', 'error');
        document.getElementById('low-stock-tbody').innerHTML = `
            <tr>
                <td colspan="4" class="alert alert-danger">
                    Error al cargar productos
                </td>
            </tr>
        `;
    }
}

// Inicializar dashboard
async function initDashboard() {
    await loadDashboardStats();
    await loadRecentSales();
    await loadLowStockProducts();
}

// Cargar dashboard al inicio
document.addEventListener('DOMContentLoaded', initDashboard);

// Actualizar datos cada 30 segundos
setInterval(initDashboard, 30000);

// Cargar configuración de redes sociales desde localStorage
function loadSocialMediaConfig() {
    const config = JSON.parse(localStorage.getItem('socialMediaConfig') || '{}');
    
    // Actualizar URLs en los botones
    if (config.instagram) {
        document.getElementById('social-instagram').href = config.instagram;
    }
    if (config.facebook) {
        document.getElementById('social-facebook').href = config.facebook;
    }
    if (config.whatsapp) {
        const whatsappBtn = document.getElementById('social-whatsapp');
        whatsappBtn.href = config.whatsapp;
    }
    if (config.twitter) {
        document.getElementById('social-twitter').href = config.twitter;
    }
    
    // Llenar el formulario con valores guardados
    document.getElementById('instagram-url').value = config.instagram || '';
    document.getElementById('facebook-url').value = config.facebook || '';
    document.getElementById('whatsapp-url').value = config.whatsapp || '';
    document.getElementById('twitter-url').value = config.twitter || '';
}

// Guardar configuración de redes sociales
function saveSocialMedia() {
    const config = {
        instagram: document.getElementById('instagram-url').value.trim(),
        facebook: document.getElementById('facebook-url').value.trim(),
        whatsapp: document.getElementById('whatsapp-url').value.trim(),
        twitter: document.getElementById('twitter-url').value.trim()
    };
    
    // Guardar en localStorage
    localStorage.setItem('socialMediaConfig', JSON.stringify(config));
    
    // Actualizar botones
    loadSocialMediaConfig();
    
    // Cerrar modal
    closeModal('social-media-modal');
    
    // Mostrar notificación
    showNotification('Redes sociales actualizadas correctamente', 'success');
}

// Abrir modal de redes sociales
function openSocialMediaModal() {
    loadSocialMediaConfig();
    openModal('social-media-modal');
}

// Cargar configuración al inicio
document.addEventListener('DOMContentLoaded', loadSocialMediaConfig);
