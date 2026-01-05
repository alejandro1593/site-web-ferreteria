const API_BASE_URL = 'http://localhost:3000/api';

// Inicializar fechas (últimos 30 días por defecto)
function inicializarFechas() {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    
    document.getElementById('fecha-fin').value = hoy.toISOString().split('T')[0];
    document.getElementById('fecha-inicio').value = hace30Dias.toISOString().split('T')[0];
}

// Cargar reportes
async function loadReportes() {
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    
    await loadSummary(fechaInicio, fechaFin);
    await loadTopProductos();
    await loadVentasHistorial(fechaInicio, fechaFin);
}

// Cargar resumen de ventas
async function loadSummary(fechaInicio, fechaFin) {
    try {
        const summary = await fetchAPI(`/ventas/summary?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        
        const summaryHTML = `
            <div class="summary-item">
                <h4>💰 Total Ventas</h4>
                <div class="value">${formatCurrency(summary.total_venta)}</div>
            </div>
            <div class="summary-item">
                <h4>📊 Cantidad</h4>
                <div class="value">${summary.total_ventas}</div>
            </div>
            <div class="summary-item">
                <h4>📦 Subtotal</h4>
                <div class="value">${formatCurrency(summary.total_subtotal)}</div>
            </div>
            <div class="summary-item">
                <h4>🧾 IVA</h4>
                <div class="value">${formatCurrency(summary.total_iva)}</div>
            </div>
            <div class="summary-item">
                <h4>📈 Promedio</h4>
                <div class="value">${formatCurrency(summary.promedio_venta)}</div>
            </div>
        `;
        
        document.getElementById('summary-grid').innerHTML = summaryHTML;
        
    } catch (error) {
        console.error('Error cargando resumen:', error);
        document.getElementById('summary-grid').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar el resumen de ventas
            </div>
        `;
    }
}

// Cargar productos más vendidos
async function loadTopProductos() {
    try {
        const topProductos = await fetchAPI('/venta-detalles/top?limit=10');
        
        if (topProductos.length === 0) {
            document.getElementById('top-products').innerHTML = `
                <div class="empty-state">
                    No hay datos disponibles
                </div>
            `;
            return;
        }
        
        const productosHTML = `
            <ul class="top-products-list">
                ${topProductos.map((prod, index) => `
                    <li>
                        <span class="rank">#${index + 1}</span>
                        <div class="product-info">
                            <div class="product-name">${prod.nombre}</div>
                            <small>${prod.codigo}</small>
                        </div>
                        <div class="sales-count">${prod.total_vendido} vendidos</div>
                    </li>
                `).join('')}
            </ul>
        `;
        
        document.getElementById('top-products').innerHTML = productosHTML;
        
    } catch (error) {
        console.error('Error cargando top productos:', error);
        document.getElementById('top-products').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar productos más vendidos
            </div>
        `;
    }
}

// Cargar ventas por categoría (simulado)
async function loadVentasPorCategoria() {
    try {
        const ventas = await fetchAPI('/ventas');
        
        // Simular datos por categoría
        const ventasPorCategoria = {};
        ventas.forEach(venta => {
            // En una implementación real, esto se calcula desde la base de datos
            // Por ahora, usamos datos de ejemplo
        });
        
        document.getElementById('ventas-por-categoria').innerHTML = `
            <div class="info-box">
                <h4>ℹ️ Información</h4>
                <p>Para ver ventas detalladas por categoría, utiliza el reporte completo.</p>
            </div>
        `;
        
    } catch (error) {
        console.error('Error cargando ventas por categoría:', error);
        document.getElementById('ventas-por-categoria').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar ventas por categoría
            </div>
        `;
    }
}

// Cargar histórico de ventas
async function loadVentasHistorial(fechaInicio, fechaFin) {
    try {
        const ventas = await fetchAPI(`/ventas/fecha?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        
        if (ventas.length === 0) {
            document.getElementById('ventas-historial-tbody').innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        No hay ventas en el período seleccionado
                    </td>
                </tr>
            `;
            return;
        }
        
        const tbody = document.getElementById('ventas-historial-tbody');
        tbody.innerHTML = ventas.map(venta => `
            <tr>
                <td>#${venta.id_venta}</td>
                <td>${formatDate(venta.fecha)}</td>
                <td>${venta.cliente_nombre || 'Sin cliente'}</td>
                <td>
                    <span class="status-badge status-${venta.estado === 'completada' ? 'active' : 'pending'}">
                        ${venta.estado}
                    </span>
                </td>
                <td>${venta.metodo_pago}</td>
                <td><strong>${formatCurrency(venta.total)}</strong></td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando histórico de ventas:', error);
        document.getElementById('ventas-historial-tbody').innerHTML = `
            <tr>
                <td colspan="7" class="alert alert-danger">
                    Error al cargar el histórico de ventas
                </td>
            </tr>
        `;
    }
}

// Generar reporte diario
async function generarReporteDiario() {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    
    document.getElementById('fecha-inicio').value = fechaHoy;
    document.getElementById('fecha-fin').value = fechaHoy;
    
    await loadReportes();
    
    showAlert('Reporte diario generado', 'success');
}

// Exportar ventas (descargar CSV)
async function exportarVentas() {
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;
    
    try {
        const ventas = await fetchAPI(`/ventas/fecha?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        
        // Crear CSV
        let csv = 'ID,Fecha,Cliente,Estado,MetodoPago,Total\n';
        ventas.forEach(venta => {
            csv += `${venta.id_venta},${venta.fecha},${venta.cliente_nombre || 'Sin cliente'},${venta.estado},${venta.metodo_pago},${venta.total}\n`;
        });
        
        // Descargar archivo
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ventas_${fechaInicio}_${fechaFin}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showAlert('Ventas exportadas exitosamente', 'success');
        
    } catch (error) {
        console.error('Error exportando ventas:', error);
        showAlert('Error al exportar las ventas', 'danger');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    inicializarFechas();
    loadReportes();
});