const API_BASE_URL = 'http://localhost:3000/api';

// Cargar estadísticas
async function loadDashboardStats() {
    try {
        // Cargar estadísticas de ventas
        const salesSummary = await fetchAPI('/ventas/summary?fechaInicio=2025-01-01&fechaFin=2026-12-31');
        
        // Cargar total de cada entidad
        const categorias = await fetchAPI('/categorias');
        const proveedores = await fetchAPI('/proveedores');
        const clientes = await fetchAPI('/clientes');
        const productos = await fetchAPI('/productos');
        const usuarios = await fetchAPI('/usuarios');
        
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
        showAlert('Error al cargar estadísticas del dashboard', 'danger');
    }
}

// Cargar ventas recientes
async function loadRecentSales() {
    try {
        const ventas = await fetchAPI('/ventas');
        const recentSales = ventas.slice(0, 10); // Últimas 10 ventas
        
        const tbody = document.getElementById('recent-sales-tbody');
        
        if (recentSales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        No hay ventas registradas
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = recentSales.map(venta => `
            <tr>
                <td>#${venta.id_venta}</td>
                <td>${venta.cliente_nombre || 'Sin cliente'}</td>
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
        const productos = await fetchAPI('/productos/lowstock');
        
        const tbody = document.getElementById('low-stock-tbody');
        
        if (productos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        ✅ No hay productos con stock bajo
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
                        <strong>${producto.nombre}</strong>
                        <br>
                        <small>${producto.categoria_nombre}</small>
                    </td>
                    <td><code>${producto.codigo}</code></td>
                    <td>
                        <span class="stock-indicator ${stockStatus}">
                            ${producto.stock_actual}
                        </span>
                    </td>
                    <td>${producto.stock_minimo}</td>
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
        document.getElementById('low-stock-tbody').innerHTML = `
            <tr>
                <td colspan="5" class="alert alert-danger">
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