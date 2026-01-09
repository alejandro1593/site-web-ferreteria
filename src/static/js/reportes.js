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
    await loadVentasPorCategoria();
    await loadVentasHistorial(fechaInicio, fechaFin);
}

// Cargar resumen de ventas
async function loadSummary(fechaInicio, fechaFin) {
    try {
        const summary = await fetchAPIAuth(`/ventas/summary?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);

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
        const topProductos = await fetchAPIAuth('/venta-detalles/top?limit=10');

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
                        <span class="rank">#${index +1}</span>
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

// Cargar ventas por categoría
async function loadVentasPorCategoria() {
    console.log('📊 Cargando ventas por categoría...');
    
    try {
        const [resumenCategorias, productosPorCategoria] = await Promise.all([
            fetchAPIAuth('/venta-detalles/categoria/resumen'),
            fetchAPIAuth('/venta-detalles/categoria/top')
        ]);

        console.log('✅ Datos recibidos:');
        console.log('  - Resumen categorías:', resumenCategorias.length, 'categorías');
        console.log('  - Productos por categoría:', productosPorCategoria.length, 'productos');

        if (resumenCategorias.length === 0) {
            console.warn('⚠️ No hay datos de ventas por categoría');
            document.getElementById('ventas-por-categoria').innerHTML = `
                <div class="empty-state">
                    No hay datos de ventas por categoría
                </div>
            `;
            return;
        }

        let html = '';

        resumenCategorias.forEach(categoria => {
            console.log(`  Procesando categoría: ${categoria.categoria_nombre}`);
            const productosCategoria = productosPorCategoria.filter(p => p.id_categoria === categoria.id_categoria);
            const topProductos = productosCategoria.slice(0, 3);
            console.log(`    - Productos en categoría: ${productosCategoria.length}`);
            console.log(`    - Top productos: ${topProductos.length}`);

            html += `
                <div class="categoria-card" style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0; color: #667eea; font-size: 16px;">
                            ${categoria.categoria_nombre}
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; font-size: 12px;">
                            <div>
                                <strong>Ventas:</strong> ${categoria.total_ventas}
                            </div>
                            <div>
                                <strong>Productos:</strong> ${categoria.total_productos}
                            </div>
                            <div>
                                <strong>Total:</strong> ${formatCurrency(categoria.total_recaudado)}
                            </div>
                        </div>
                    </div>

                    ${topProductos.length > 0 ? `
                        <div>
                            <h5 style="margin: 0 0 10px 0; font-size: 13px; color: #333;">
                                🏆 Top Productos
                            </h5>
                            <div style="font-size: 12px;">
                                ${topProductos.map((producto, index) => `
                                    <div style="padding: 8px; margin-bottom: 5px; background: white; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                                        <div style="flex: 1;">
                                            <span style="font-weight: bold; color: #667eea;">#${index + 1}</span>
                                            <span style="margin-left: 8px; font-weight: 500;">${producto.producto_nombre}</span>
                                            <div style="color: #666; font-size: 11px; margin-top: 3px;">
                                                ${producto.producto_codigo} • ${formatCurrency(producto.precio_venta)} c/u
                                            </div>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="color: #4CAF50; font-weight: bold;">
                                                ${producto.total_vendido} vendidos
                                            </div>
                                            <div style="color: #666; font-size: 11px;">
                                                ${formatCurrency(producto.total_recaudado)}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        document.getElementById('ventas-por-categoria').innerHTML = html;
        console.log('✅ Ventas por categoría renderizadas correctamente');

    } catch (error) {
        console.error('❌ Error cargando ventas por categoría:', error);
        document.getElementById('ventas-por-categoria').innerHTML = `
            <div class="alert alert-danger">
                <strong>Error al cargar ventas por categoría</strong><br>
                ${error.message || 'Error desconocido'}
            </div>
        `;
    }
}

// Cargar histórico de ventas
async function loadVentasHistorial(fechaInicio, fechaFin) {
    try {
        const ventas = await fetchAPIAuth(`/ventas/fecha?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        
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
    
    showNotification('Reporte diario generado', 'success');
}

// Exportar ventas (descargar CSV)
async function exportarVentas() {
    const fechaInicio = document.getElementById('fecha-inicio').value;
    const fechaFin = document.getElementById('fecha-fin').value;

    try {
        const ventas = await fetchAPIAuth(`/ventas/fecha?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);

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

        showNotification('Ventas exportadas exitosamente', 'success');

    } catch (error) {
        console.error('Error exportando ventas:', error);
        showNotification('Error al exportar las ventas', 'error');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    inicializarFechas();
    loadReportes();
});
