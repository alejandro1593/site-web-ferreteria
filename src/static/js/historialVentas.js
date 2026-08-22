async function loadVentasStats() {
    try {
        const ventas = await fetchAPIAuth('/ventas');
        
        const totalVentas = ventas.length;
        const totalRecaudado = ventas.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);
        const totalItems = ventas.reduce((sum, v) => sum + (parseInt(v.total_items) || 0), 0);
        const ventaPromedio = totalVentas > 0 ? totalRecaudado / totalVentas : 0;
        
        const statsHTML = `
            <div class="stat-card">
                <h3>💰 Total Recaudado</h3>
                <div class="value">${formatCurrency(totalRecaudado)}</div>
                <div class="trend">
                    Total de ventas
                </div>
            </div>
            <div class="stat-card">
                <h3>🛒 Total Ventas</h3>
                <div class="value">${totalVentas}</div>
                <div class="trend">
                    Ventas realizadas
                </div>
            </div>
            <div class="stat-card">
                <h3>📦 Total Items</h3>
                <div class="value">${totalItems}</div>
                <div class="trend">
                    Productos vendidos
                </div>
            </div>
            <div class="stat-card">
                <h3>💳 Promedio</h3>
                <div class="value">${formatCurrency(ventaPromedio)}</div>
                <div class="trend">
                    Por venta
                </div>
            </div>
        `;
        
        document.getElementById('ventas-stats').innerHTML = statsHTML;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        document.getElementById('ventas-stats').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar estadísticas
            </div>
        `;
    }
}

async function loadVentas() {
    try {
        const ventas = await fetchAPIAuth('/ventas');
        
        if (ventas.length === 0) {
            document.getElementById('ventas-tbody').innerHTML = `
                <tr>
                    <td colspan="11" class="empty-state">
                        No hay ventas registradas
                    </td>
                </tr>
            `;
            return;
        }
        
        const tbody = document.getElementById('ventas-tbody');
        tbody.innerHTML = ventas.map(venta => `
            <tr>
                <td>#${venta.id_venta}</td>
                <td>${formatDate(venta.fecha)}</td>
                <td>${esc(venta.cliente_nombre) || 'Sin cliente'}</td>
                <td>
                    <span class="status-badge status-${venta.estado === 'completada' ? 'active' : 'pending'}">
                        ${esc(venta.estado)}
                    </span>
                </td>
                <td>${esc(venta.metodo_pago)}</td>
                <td>${venta.total_items || 0}</td>
                <td>${formatCurrency(venta.subtotal || 0)}</td>
                <td>${formatCurrency(venta.iva || 0)}</td>
                <td>${formatCurrency(venta.descuento || 0)}</td>
                <td><strong>${formatCurrency(venta.total)}</strong></td>
                <td class="text-center">
                    <button class="btn btn-primary btn-sm" onclick="verDetallesVenta(${venta.id_venta})">
                        👁️
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando ventas:', error);
        document.getElementById('ventas-tbody').innerHTML = `
            <tr>
                <td colspan="11" class="alert alert-danger">
                    Error al cargar ventas
                </td>
            </tr>
        `;
    }
}

async function verDetallesVenta(idVenta) {
    try {
        const [venta, detalles] = await Promise.all([
            fetchAPIAuth(`/ventas/${idVenta}`),
            fetchAPIAuth(`/ventas/${idVenta}/detalles`)
        ]);
        
        const detallesHTML = `
            <div style="margin-bottom: 20px;">
                <h4>Información de la Venta</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
                    <div><strong>ID:</strong> #${venta.id_venta}</div>
                    <div><strong>Fecha:</strong> ${formatDate(venta.fecha)}</div>
                    <div><strong>Cliente:</strong> ${venta.cliente_nombre || 'Sin cliente'}</div>
                    <div><strong>Estado:</strong> ${venta.estado}</div>
                    <div><strong>Método Pago:</strong> ${venta.metodo_pago}</div>
                    <div><strong>Total Items:</strong> ${venta.total_items || 0}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4>Desglose de Pagos</h4>
                <div style="margin-top: 10px;">
                    <div><strong>Subtotal:</strong> ${formatCurrency(venta.subtotal || 0)}</div>
                    <div><strong>IVA (16%):</strong> ${formatCurrency(venta.iva || 0)}</div>
                    <div><strong>Descuento:</strong> ${formatCurrency(venta.descuento || 0)}</div>
                    <div style="font-size: 1.2em; color: #4CAF50; font-weight: bold; margin-top: 10px;">
                        <strong>Total:</strong> ${formatCurrency(venta.total)}
                    </div>
                </div>
            </div>
            
            <div>
                <h4>Productos</h4>
                <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f0f0f0;">
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Producto</th>
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Precio</th>
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Cantidad</th>
                            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${detalles.map(detalle => `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #ddd;">
                                    <strong>${detalle.producto_nombre}</strong><br>
                                    <small>${detalle.producto_codigo}</small>
                                </td>
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatCurrency(detalle.precio_unitario)}</td>
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${detalle.cantidad}</td>
                                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatCurrency(detalle.subtotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('venta-detalles-content').innerHTML = detallesHTML;
        openModal('venta-detalles-modal');
        
    } catch (error) {
        console.error('Error cargando detalles:', error);
        showNotification('Error al cargar detalles de la venta', 'error');
    }
}

async function exportarVentasCSV() {
    try {
        const ventas = await fetchAPIAuth('/ventas');
        
        let csv = 'ID,Fecha,Cliente,Estado,MetodoPago,Items,Subtotal,IVA,Descuento,Total\n';
        ventas.forEach(venta => {
            csv += `${venta.id_venta},${venta.fecha},${venta.cliente_nombre || 'Sin cliente'},${venta.estado},${venta.metodo_pago},${venta.total_items || 0},${venta.subtotal || 0},${venta.iva || 0},${venta.descuento || 0},${venta.total}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ventas_todas_${new Date().toISOString().split('T')[0]}.csv`;
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

document.addEventListener('DOMContentLoaded', () => {
    loadVentasStats();
    loadVentas();
});
