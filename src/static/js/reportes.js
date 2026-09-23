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
    await loadGanancias(fechaInicio, fechaFin);
}

// Cargar ganancias del período (ingresos vs costo estimado)
async function loadGanancias(fechaInicio, fechaFin) {
    const container = document.getElementById('ganancias-content');
    if (!container) return;

    try {
        const g = await fetchAPIAuth(`/ventas/ganancias?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);

        container.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item" style="background: #e8f5e9; color: #1b5e20; border-radius: 10px;">
                    <h4>💵 Ganancia Estimada</h4>
                    <div class="value">${formatCurrency(g.ganancia_estimada || 0)}</div>
                </div>
                <div class="summary-item">
                    <h4>🛒 Ingresos Brutos</h4>
                    <div class="value">${formatCurrency(g.ingresos_brutos || 0)}</div>
                </div>
                <div class="summary-item">
                    <h4>📦 Costo Estimado</h4>
                    <div class="value">${formatCurrency(g.costo_estimado || 0)}</div>
                </div>
                <div class="summary-item">
                    <h4>📊 Margen</h4>
                    <div class="value">${g.margen_porcentaje !== null && g.margen_porcentaje !== undefined ? g.margen_porcentaje + '%' : '-'}</div>
                </div>
            </div>
            <p style="margin-top: 15px; color: #666;">
                <small>⚠️ El costo se estima con el precio de compra actual de cada producto.</small>
            </p>
        `;
    } catch (error) {
        console.error('Error cargando ganancias:', error);
        container.innerHTML = `
            <div class="alert alert-danger">Error al cargar ganancias</div>
        `;
    }
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
                        <span class="rank">#${index + 1}</span>
                        <div class="product-info">
                            <div class="product-name">${esc(prod.nombre)}</div>
                            <small>${esc(prod.codigo)}</small>
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
                            ${esc(categoria.categoria_nombre)}
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
                                             <span style="margin-left: 8px; font-weight: 500;">${esc(producto.producto_nombre)}</span>
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

// Generar reporte diario
async function generarReporteDiario() {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];
    
    document.getElementById('fecha-inicio').value = fechaHoy;
    document.getElementById('fecha-fin').value = fechaHoy;
    
    await loadReportes();
    
    showNotification('Reporte diario generado', 'success');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    inicializarFechas();
    loadReportes();
});
