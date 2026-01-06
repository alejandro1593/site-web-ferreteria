let clientes = [];
let ventas = [];
let resumen = {};
let clienteSeleccionado = null;

// Inicializar años disponibles
function initYears() {
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('year-select');
    
    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    yearSelect.value = currentYear;
}

// Cargar clientes
async function loadClientes() {
    try {
        clientes = await fetchAPIAuth('/clientes');

        const clienteSelect = document.getElementById('cliente-select');
        clienteSelect.innerHTML = '<option value="">Seleccionar cliente...</option>' +
            clientes.map(cli =>
                `<option value="${cli.id_cliente}">
                    ${cli.nombre} ${cli.apellido} - ${cli.dni}
                </option>`
            ).join('');

    } catch (error) {
        console.error('Error cargando clientes:', error);
        showNotification('Error al cargar clientes', 'error');
    }
}

// Cargar historial de cliente
async function cargarHistorialCliente() {
    const clienteId = document.getElementById('cliente-select').value;
    const year = document.getElementById('year-select').value;

    if (!clienteId) {
        ocultarHistorial();
        return;
    }

    clienteSeleccionado = clientes.find(c => c.id_cliente == clienteId);

    try {
        const data = await fetchAPIAuth(`/ventas/cliente/${clienteId}/historial?fechaInicio=${year}-01-01&fechaFin=${year}-12-31`);

        ventas = data.ventas || [];
        resumen = data.resumen || {};

        mostrarResumen();
        renderHistorial();
        mostrarHistorial();

    } catch (error) {
        console.error('Error cargando historial:', error);
        showNotification('Error al cargar historial del cliente', 'error');
    }
}

// Mostrar/ocultar secciones
function mostrarHistorial() {
    document.getElementById('cliente-info').style.display = 'block';
    document.getElementById('historial-container').style.display = 'block';
}

function ocultarHistorial() {
    document.getElementById('cliente-info').style.display = 'none';
    document.getElementById('historial-container').style.display = 'none';
}

// Mostrar resumen de compras
function mostrarResumen() {
    document.getElementById('total-gastado').textContent = formatCurrency(resumen.total_gastado || 0);
    document.getElementById('total-compras').textContent = resumen.total_compras || 0;
    document.getElementById('total-productos').textContent = resumen.total_productos || 0;
    document.getElementById('promedio-compra').textContent = formatCurrency(resumen.promedio_compra || 0);
}

// Renderizar historial de compras
function renderHistorial() {
    const tbody = document.getElementById('historial-tbody');
    
    if (ventas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="alert alert-info">
                    No hay compras registradas para este cliente en el período seleccionado
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = ventas.map(venta => `
        <tr>
            <td><strong>#${venta.id_venta}</strong></td>
            <td>${formatDateTime(venta.fecha)}</td>
            <td>
                <small title="${venta.productos_resumen}">
                    ${venta.productos_resumen ? venta.productos_resumen.substring(0, 50) + (venta.productos_resumen.length > 50 ? '...' : '') : '-'}
                </small>
            </td>
            <td>${venta.total_items || 0}</td>
            <td>${formatCurrency(venta.subtotal)}</td>
            <td>${formatCurrency(venta.iva)}</td>
            <td>${formatCurrency(venta.descuento || 0)}</td>
            <td><strong>${formatCurrency(venta.total)}</strong></td>
            <td>${getPaymentMethodBadge(venta.metodo_pago)}</td>
            <td>${getStatusBadge(venta.estado)}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="verDetallesVenta(${venta.id_venta})" title="Ver detalles">
                    👁️
                </button>
            </td>
        </tr>
    `).join('');
}

// Ver detalles de venta
async function verDetallesVenta(idVenta) {
    try {
        const venta = await fetchAPIAuth(`/ventas/${idVenta}`);
        const detalles = await fetchAPIAuth(`/ventas/${idVenta}/detalles`);

        const clienteNombre = venta.cliente_nombre || 'Sin cliente';

        let detallesHTML = `
            <div class="venta-detalle-header">
                <div class="venta-detalle-info">
                    <h4>📋 Información de la Venta</h4>
                    <p><strong>Venta #${venta.id_venta}</strong></p>
                    <p>Fecha: ${formatDateTime(venta.fecha)}</p>
                    <p>Cliente: ${clienteNombre}</p>
                    <p>DNI Cliente: ${venta.cliente_dni || 'N/A'}</p>
                </div>
                <div class="venta-detalle-totales">
                    <h4>💰 Totales</h4>
                    <p>Subtotal: ${formatCurrency(venta.subtotal)}</p>
                    <p>IVA: ${formatCurrency(venta.iva)}</p>
                    ${venta.descuento > 0 ? `<p>Descuento: ${formatCurrency(venta.descuento)}</p>` : ''}
                    <p class="total">Total: ${formatCurrency(venta.total)}</p>
                    <p>Método: ${getPaymentMethodBadge(venta.metodo_pago)}</p>
                    <p>Estado: ${getStatusBadge(venta.estado)}</p>
                </div>
            </div>
            
            <h4>📦 Productos Comprados</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Código</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (detalles.length === 0) {
            detallesHTML += `
                <tr>
                    <td colspan="5" class="alert alert-warning">
                        No hay productos en esta venta
                    </td>
                </tr>
            `;
        } else {
            detallesHTML += detalles.map(detalle => `
                <tr>
                    <td>
                        <strong>${detalle.producto_nombre}</strong>
                        ${detalle.producto_descripcion ? `<br><small>${detalle.producto_descripcion.substring(0, 100)}${detalle.producto_descripcion.length > 100 ? '...' : ''}</small>` : ''}
                    </td>
                    <td><code>${detalle.producto_codigo}</code></td>
                    <td>${detalle.cantidad}</td>
                    <td>${formatCurrency(detalle.precio_unitario)}</td>
                    <td><strong>${formatCurrency(detalle.subtotal)}</strong></td>
                </tr>
            `).join('');
        }
        
        detallesHTML += `
                </tbody>
            </table>
        `;
        
        document.getElementById('venta-detalles-content').innerHTML = detallesHTML;
        document.getElementById('venta-detalles-title').textContent = `Detalles de Venta #${idVenta}`;
        openModal('venta-detalles-modal');
        
    } catch (error) {
        console.error('Error cargando detalles de venta:', error);
        showNotification('Error al cargar detalles de la venta', 'error');
    }
}

// Exportar historial a CSV
function exportarHistorialCSV() {
    if (!clienteSeleccionado || ventas.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    const year = document.getElementById('year-select').value;
    const clienteNombre = `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido || ''}`;
    
    let csvContent = `Historial de Compras - ${clienteNombre} (${year})\n\n`;
    csvContent += `Cliente: ${clienteNombre}\n`;
    csvContent += `DNI: ${clienteSeleccionado.dni || 'N/A'}\n`;
    csvContent += `Año: ${year}\n`;
    csvContent += `Total Gastado: ${formatCurrency(resumen.total_gastado || 0)}\n`;
    csvContent += `Total Compras: ${resumen.total_compras || 0}\n\n`;
    
    csvContent += `ID Venta,Fecha,Productos,Items,Subtotal,IVA,Descuento,Total,Método Pago,Estado\n`;
    
    ventas.forEach(venta => {
        const productos = (venta.productos_resumen || '').replace(/,/g, ';').replace(/\n/g, ' ');
        csvContent += `${venta.id_venta},"${venta.fecha}","${productos}",${venta.total_items || 0},${venta.subtotal},${venta.iva},${venta.descuento || 0},${venta.total},"${venta.metodo_pago}","${venta.estado}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `historial_${clienteSeleccionado.nombre}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Historial exportado en CSV correctamente', 'success');
}

// Exportar historial a PDF
function exportarHistorialPDF() {
    if (!clienteSeleccionado || ventas.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    const year = document.getElementById('year-select').value;
    const clienteNombre = `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido || ''}`;
    const fechaGeneracion = new Date().toLocaleString('es-MX');
    
    const printWindow = window.open('', '_blank');
    
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Historial de Compras - ${clienteNombre}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Arial', sans-serif;
                    font-size: 12px;
                    padding: 20px;
                    color: #333;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #667eea;
                    padding-bottom: 20px;
                }
                
                .header h1 {
                    color: #667eea;
                    font-size: 24px;
                    margin-bottom: 10px;
                }
                
                .header h2 {
                    color: #333;
                    font-size: 16px;
                    font-weight: normal;
                }
                
                .info-section {
                    margin-bottom: 30px;
                    padding: 15px;
                    background: #f9f9f9;
                    border-left: 4px solid #667eea;
                    border-radius: 5px;
                }
                
                .info-section h3 {
                    color: #667eea;
                    margin-bottom: 10px;
                    font-size: 14px;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                }
                
                .info-item {
                    display: flex;
                    justify-content: space-between;
                }
                
                .info-label {
                    font-weight: bold;
                    color: #666;
                }
                
                .info-value {
                    color: #333;
                }
                
                .resumen-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                    margin-bottom: 30px;
                }
                
                .resumen-card {
                    padding: 15px;
                    text-align: center;
                    background: #667eea;
                    color: white;
                    border-radius: 8px;
                }
                
                .resumen-card h4 {
                    font-size: 14px;
                    margin-bottom: 5px;
                    opacity: 0.9;
                }
                
                .resumen-card .value {
                    font-size: 20px;
                    font-weight: bold;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                
                thead {
                    background: #667eea;
                    color: white;
                }
                
                th {
                    padding: 12px;
                    text-align: left;
                    font-weight: bold;
                    font-size: 11px;
                    text-transform: uppercase;
                }
                
                td {
                    padding: 10px;
                    border-bottom: 1px solid #ddd;
                }
                
                tbody tr:nth-child(even) {
                    background: #f9f9f9;
                }
                
                tbody tr:hover {
                    background: #f0f0f0;
                }
                
                .text-right {
                    text-align: right;
                }
                
                .text-center {
                    text-align: center;
                }
                
                .badge {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: bold;
                }
                
                .badge-success {
                    background: #28a745;
                    color: white;
                }
                
                .badge-warning {
                    background: #ffc107;
                    color: #333;
                }
                
                .badge-danger {
                    background: #dc3545;
                    color: white;
                }
                
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    color: #666;
                    font-size: 11px;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }
                
                @media print {
                    body {
                        font-size: 11px;
                    }
                    
                    .resumen-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏪 Ferretería - Historial de Compras</h1>
                <h2>Reporte de Compras del Cliente</h2>
            </div>
            
            <div class="info-section">
                <h3>📋 Información del Cliente</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Nombre:</span>
                        <span class="info-value">${clienteNombre}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">DNI:</span>
                        <span class="info-value">${clienteSeleccionado.dni || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Año:</span>
                        <span class="info-value">${year}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Teléfono:</span>
                        <span class="info-value">${clienteSeleccionado.telefono || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="resumen-grid">
                <div class="resumen-card">
                    <h4>💰 Total Gastado</h4>
                    <div class="value">${formatCurrencyPDF(resumen.total_gastado || 0)}</div>
                </div>
                <div class="resumen-card">
                    <h4>🛒 Total Compras</h4>
                    <div class="value">${resumen.total_compras || 0}</div>
                </div>
                <div class="resumen-card">
                    <h4>📦 Productos</h4>
                    <div class="value">${resumen.total_productos || 0}</div>
                </div>
                <div class="resumen-card">
                    <h4>💳 Promedio</h4>
                    <div class="value">${formatCurrencyPDF(resumen.promedio_compra || 0)}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th># Venta</th>
                        <th>Fecha</th>
                        <th>Productos</th>
                        <th>Items</th>
                        <th>Subtotal</th>
                        <th>IVA</th>
                        <th>Descuento</th>
                        <th>Total</th>
                        <th>Método</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    ventas.forEach(venta => {
        html += `
            <tr>
                <td><strong>${venta.id_venta}</strong></td>
                <td>${formatDateTimePDF(venta.fecha)}</td>
                <td>${venta.productos_resumen || '-'}</td>
                <td class="text-center">${venta.total_items || 0}</td>
                <td class="text-right">${formatCurrencyPDF(venta.subtotal)}</td>
                <td class="text-right">${formatCurrencyPDF(venta.iva)}</td>
                <td class="text-right">${formatCurrencyPDF(venta.descuento || 0)}</td>
                <td class="text-right"><strong>${formatCurrencyPDF(venta.total)}</strong></td>
                <td>${venta.metodo_pago || '-'}</td>
                <td class="text-center">
                    <span class="badge ${venta.estado === 'completada' ? 'badge-success' : venta.estado === 'pendiente' ? 'badge-warning' : 'badge-danger'}">
                        ${venta.estado}
                    </span>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            
            <div class="footer">
                <p>Fecha de generación: ${fechaGeneracion}</p>
                <p>Sistema de Gestión de Ferretería © ${new Date().getFullYear()}</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
    };
    
    showNotification('PDF generado. Seleccione "Guardar como PDF" en el diálogo de impresión', 'success');
}

// Función auxiliar para formatear moneda en el PDF
function formatCurrencyPDF(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

// Función auxiliar para formatear fecha en el PDF
function formatDateTimePDF(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Obtener parámetros de la URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        cliente: params.get('cliente'),
        anio: params.get('anio')
    };
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    initYears();
    loadClientes().then(() => {
        const params = getUrlParams();
        
        if (params.cliente && params.anio) {
            document.getElementById('cliente-select').value = params.cliente;
            document.getElementById('year-select').value = params.anio;
            
            if (document.getElementById('cliente-select').value === params.cliente) {
                cargarHistorialCliente();
            }
        }
    });
});
