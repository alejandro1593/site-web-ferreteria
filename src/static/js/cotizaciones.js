let clientes = [];
let productos = [];
let productosCotizacion = [];

async function loadEstadisticas() {
    try {
        const resumen = await fetchAPIAuth('/cotizaciones/resumen');
        
        const statsHTML = `
            <div class="stat-card">
                <h3>📝 Total Cotizaciones</h3>
                <div class="value">${resumen.total_cotizaciones || 0}</div>
                <div class="trend">
                    Cotizaciones registradas
                </div>
            </div>
            <div class="stat-card">
                <h3>💰 Total Cotizado</h3>
                <div class="value">${formatCurrency(resumen.total_cotizado || 0)}</div>
                <div class="trend">
                    Suma de todas las cotizaciones
                </div>
            </div>
            <div class="stat-card">
                <h3>📊 Pendientes</h3>
                <div class="value">${resumen.pendientes || 0}</div>
                <div class="trend">
                    Por aprobar
                </div>
            </div>
            <div class="stat-card">
                <h3>✅ Aprobadas</h3>
                <div class="value">${resumen.aprobadas || 0}</div>
                <div class="trend">
                    Cotizaciones aprobadas
                </div>
            </div>
            <div class="stat-card">
                <h3>💵 Convertidas</h3>
                <div class="value">${resumen.convertidas || 0}</div>
                <div class="trend">
                    Convertidas en ventas
                </div>
            </div>
            <div class="stat-card">
                <h3>❌ Rechazadas</h3>
                <div class="value">${resumen.rechazadas || 0}</div>
                <div class="trend">
                    Cotizaciones rechazadas
                </div>
            </div>
        `;
        
        document.getElementById('cotizaciones-stats').innerHTML = statsHTML;
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        document.getElementById('cotizaciones-stats').innerHTML = `
            <div class="alert alert-danger">
                Error al cargar estadísticas
            </div>
        `;
    }
}

async function loadClientes() {
    try {
        clientes = await fetchAPIAuth('/clientes');
        
        const selectHTML = '<option value="">Seleccionar cliente...</option>' +
            clientes.map(cliente => `
                <option value="${cliente.id_cliente}">${cliente.nombre} (${cliente.dni})</option>
            `).join('');
        
        document.getElementById('cliente-select').innerHTML = selectHTML;
        
        const filtroHTML = '<option value="">Todos los clientes</option>' +
            clientes.map(cliente => `
                <option value="${cliente.id_cliente}">${cliente.nombre}</option>
            `).join('');
        
        const filtroElemento = document.getElementById('filtro-cliente');
        if (filtroElemento) {
            filtroElemento.innerHTML = filtroHTML;
        }
        
    } catch (error) {
        console.error('Error cargando clientes:', error);
        showNotification('Error al cargar clientes', 'error');
    }
}

async function loadProductos() {
    try {
        const productoSelect = document.getElementById('producto-cotizacion');
        
        if (!productoSelect) {
            console.error('Elemento producto-cotizacion no encontrado');
            return;
        }
        
        productos = await fetchAPIAuth('/productos');
        
        if (!productos || productos.length === 0) {
            productoSelect.innerHTML = '<option value="">No hay productos disponibles</option>';
            return;
        }
        
        const selectHTML = '<option value="">Seleccionar producto...</option>' +
            productos.map(producto => `
                <option value="${producto.id_producto}" 
                        data-precio="${producto.precio_venta}" 
                        data-stock="${producto.stock_actual}">
                    ${producto.nombre} (${producto.codigo}) - Stock: ${producto.stock_actual}
                </option>
            `).join('');
        
        productoSelect.innerHTML = selectHTML;
        
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

function abrirModalAgregarProducto() {
    const productoSelect = document.getElementById('producto-cotizacion');
    const cantidadInput = document.getElementById('cantidad-cotizacion');
    const descuentoInput = document.getElementById('descuento-cotizacion');
    
    if (!productoSelect || !cantidadInput || !descuentoInput) {
        return;
    }
    
    productoSelect.value = '';
    cantidadInput.value = 1;
    descuentoInput.value = 0;
    actualizarPrecioProducto();
    openModal('modal-agregar-producto');
}

function actualizarPrecioProducto() {
    const select = document.getElementById('producto-cotizacion');
    const precioElement = document.getElementById('precio-producto');
    const subtotalElement = document.getElementById('subtotal-producto');
    
    if (!select || !precioElement || !subtotalElement) {
        return;
    }
    
    if (!select.selectedOptions || select.selectedOptions.length === 0) {
        precioElement.textContent = formatCurrency(0);
        subtotalElement.textContent = formatCurrency(0);
        return;
    }
    
    const selectedOption = select.selectedOptions[0];
    
    if (selectedOption && selectedOption.value) {
        const precio = parseFloat(selectedOption.dataset.precio) || 0;
        const cantidad = parseInt(document.getElementById('cantidad-cotizacion').value) || 1;
        const descuento = parseFloat(document.getElementById('descuento-cotizacion').value) || 0;
        
        const subtotal = (precio * cantidad) - descuento;
        
        precioElement.textContent = formatCurrency(precio);
        subtotalElement.textContent = formatCurrency(subtotal);
    } else {
        precioElement.textContent = formatCurrency(0);
        subtotalElement.textContent = formatCurrency(0);
    }
}

function agregarProducto() {
    const productoSelect = document.getElementById('producto-cotizacion');
    const cantidadInput = document.getElementById('cantidad-cotizacion');
    const descuentoInput = document.getElementById('descuento-cotizacion');
    
    if (!productoSelect || !cantidadInput || !descuentoInput) {
        return;
    }
    
    const cantidad = parseInt(cantidadInput.value) || 1;
    const descuento = parseFloat(descuentoInput.value) || 0;
    
    if (!productoSelect.value) {
        showNotification('Por favor seleccione un producto', 'error');
        return;
    }
    
    if (!productoSelect.selectedOptions || productoSelect.selectedOptions.length === 0) {
        return;
    }
    
    const selectedOption = productoSelect.selectedOptions[0];
    const precio = parseFloat(selectedOption.dataset.precio) || 0;
    const stock = parseInt(selectedOption.dataset.stock) || 0;
    
    if (cantidad <= 0) {
        showNotification('La cantidad debe ser mayor a 0', 'error');
        return;
    }
    
    if (cantidad > stock) {
        showNotification(`Stock insuficiente. Disponible: ${stock}`, 'error');
        return;
    }
    
    if (descuento < 0) {
        showNotification('El descuento no puede ser negativo', 'error');
        return;
    }
    
    if (descuento > (precio * cantidad)) {
        showNotification('El descuento no puede ser mayor al subtotal', 'error');
        return;
    }
    
    const subtotal = (precio * cantidad) - descuento;
    
    const detalle = {
        id_producto: parseInt(productoSelect.value),
        producto_nombre: selectedOption.text.split(' (')[0],
        cantidad,
        precio_unitario: precio,
        descuento,
        subtotal
    };
    
    productosCotizacion.push(detalle);
    renderizarProductos();
    calcularTotales();
    closeModal('modal-agregar-producto');
    showNotification('Producto agregado correctamente', 'success');
}

function renderizarProductos() {
    const container = document.getElementById('productos-cotizacion');
    
    if (!container) {
        console.error('Contenedor productos-cotizacion no encontrado');
        return;
    }
    
    if (productosCotizacion.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                No hay productos agregados
            </div>
        `;
        return;
    }
    
    container.innerHTML = productosCotizacion.map((detalle, index) => `
        <div class="cart-item" style="margin-bottom: 10px;">
            <div class="cart-item-header">
                <span class="cart-item-name">${detalle.producto_nombre}</span>
                <button type="button" class="btn btn-danger btn-sm" onclick="eliminarProducto(${index})">
                    🗑️
                </button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <span>${detalle.cantidad} x ${formatCurrency(detalle.precio_unitario)}</span>
                <span style="font-weight: bold; color: #4CAF50;">${formatCurrency(detalle.subtotal)}</span>
            </div>
        </div>
    `).join('');
}

function eliminarProducto(index) {
    productosCotizacion.splice(index, 1);
    renderizarProductos();
    calcularTotales();
}

function calcularTotales() {
    const subtotalElement = document.getElementById('subtotal');
    const ivaElement = document.getElementById('iva');
    const descuentoElement = document.getElementById('descuento');
    const totalElement = document.getElementById('total');
    
    if (!subtotalElement || !ivaElement || !descuentoElement || !totalElement) {
        console.error('Elementos de totales no encontrados en el DOM');
        return;
    }
    
    let subtotal = 0;
    
    productosCotizacion.forEach(detalle => {
        subtotal += detalle.subtotal;
    });
    
    const descuento = 0;
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    
    subtotalElement.textContent = formatCurrency(subtotal);
    ivaElement.textContent = formatCurrency(iva);
    descuentoElement.textContent = formatCurrency(descuento);
    totalElement.textContent = formatCurrency(total);
}

async function crearCotizacion() {
    try {
        console.log('=== INICIO CREAR COTIZACIÓN ===');
        console.log('Token en localStorage:', localStorage.getItem('token') ? 'existe' : 'no existe');
        
        const idCliente = document.getElementById('cliente-select').value;
        const fechaValidez = document.getElementById('fecha-validez').value;
        const observaciones = document.getElementById('observaciones').value;
        
        console.log('Cliente seleccionado:', idCliente);
        console.log('Productos en cotización:', productosCotizacion.length);
        
        if (!idCliente) {
            showNotification('Por favor seleccione un cliente', 'error');
            return;
        }
        
        if (productosCotizacion.length === 0) {
            showNotification('Por favor agregue al menos un producto', 'error');
            return;
        }
        
        const data = {
            id_cliente: parseInt(idCliente),
            fecha_validez: fechaValidez,
            detalles: productosCotizacion,
            observaciones
        };
        
        console.log('Datos a enviar:', data);
        
        console.log('Enviando petición a /api/cotizaciones...');
        const response = await fetchAPIAuth('/cotizaciones', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        console.log('Respuesta del servidor:', response);
        
        showNotification('Cotización creada exitosamente', 'success');
        
        limpiarFormulario();
        loadEstadisticas();
        loadCotizaciones();
        
    } catch (error) {
        console.error('=== ERROR CREATING COTIZATION ===');
        console.error('Error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        showNotification('Error al crear la cotización: ' + error.message, 'error');
    }
}

function limpiarFormulario() {
    document.getElementById('cliente-select').value = '';
    document.getElementById('fecha-validez').value = '';
    document.getElementById('observaciones').value = '';
    productosCotizacion = [];
    renderizarProductos();
    calcularTotales();
}

async function loadCotizaciones() {
    const idCliente = document.getElementById('filtro-cliente')?.value;
    const estado = document.getElementById('filtro-estado')?.value;
    
    let url = '/cotizaciones';
    const params = [];
    
    if (idCliente) {
        params.push(`id_cliente=${idCliente}`);
    }
    
    if (estado) {
        params.push(`estado=${estado}`);
    }
    
    if (params.length > 0) {
        url += '?' + params.join('&');
    }
    
    try {
        const cotizaciones = await fetchAPIAuth(url);
        
        if (!cotizaciones || cotizaciones.length === 0) {
            document.getElementById('cotizaciones-tbody').innerHTML = `
                <tr>
                    <td colspan="11" class="empty-state">
                        No hay cotizaciones
                    </td>
                </tr>
            `;
            return;
        }
        
        const tbody = document.getElementById('cotizaciones-tbody');
        tbody.innerHTML = cotizaciones.map(cotizacion => {
            const estadoClass = {
                'pendiente': 'status-pending',
                'aprobada': 'status-active',
                'rechazada': 'status-inactive',
                'convertida': 'status-active'
            }[cotizacion.estado] || 'status-pending';
            
            const puedePagar = cotizacion.estado === 'pendiente';
            
            return `
                <tr>
                    <td>#${cotizacion.id_cotizacion}</td>
                    <td>${cotizacion.cliente_nombre}</td>
                    <td>${formatDate(cotizacion.fecha_emision)}</td>
                    <td>${cotizacion.fecha_validez ? formatDate(cotizacion.fecha_validez) : 'Sin vigencia'}</td>
                    <td>
                        <span class="status-badge ${estadoClass}">
                            ${cotizacion.estado}
                        </span>
                    </td>
                    <td>${formatCurrency(cotizacion.subtotal || 0)}</td>
                    <td><strong>${formatCurrency(cotizacion.total || 0)}</strong></td>
                    <td>
                        <div class="table-actions">
                            <button type="button" class="btn btn-info btn-sm" onclick="verDetalles(${cotizacion.id_cotizacion})" title="Ver detalles">
                                👁️
                            </button>
                            <button type="button" class="btn btn-success btn-sm" onclick="pagarCotizacion(${cotizacion.id_cotizacion})" ${!puedePagar ? 'disabled' : ''} title="Pagar (convertir a venta)">
                                💵
                            </button>
                            <button type="button" class="btn btn-warning btn-sm" onclick="exportarPDF(${cotizacion.id_cotizacion})" title="Exportar PDF">
                                📄
                            </button>
                            <button type="button" class="btn btn-danger btn-sm" onclick="eliminarCotizacion(${cotizacion.id_cotizacion})" title="Eliminar">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando cotizaciones:', error);
        document.getElementById('cotizaciones-tbody').innerHTML = `
            <tr>
                <td colspan="11" class="alert alert-danger">
                    Error al cargar cotizaciones
                </td>
            </tr>
        `;
    }
}

async function verDetalles(idCotizacion) {
    try {
        const detalles = await fetchAPIAuth(`/cotizaciones/${idCotizacion}/detalles`);
        
        const detallesHTML = `
            <div style="margin-bottom: 20px;">
                <h4>📋 Productos de la Cotización</h4>
                <div style="margin-top: 10px;">
                    ${detalles.map(detalle => `
                        <div style="padding: 10px; margin-bottom: 5px; background: #f0f0f0; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1;">
                                <strong>${detalle.producto_nombre}</strong><br>
                                <small>${detalle.producto_codigo} • Stock: ${detalle.stock_actual}</small>
                            </div>
                            <div style="text-align: right;">
                                <div>${detalle.cantidad} x ${formatCurrency(detalle.precio_unitario)}</div>
                                <div style="font-weight: bold; color: #4CAF50;">${formatCurrency(detalle.subtotal)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.getElementById('cotizacion-detalles-content').innerHTML = detallesHTML;
        openModal('modal-detalles-cotizacion');
        
    } catch (error) {
        console.error('Error cargando detalles de cotización:', error);
        showNotification('Error al cargar detalles de cotización', 'error');
    }
}

async function pagarCotizacion(idCotizacion) {
    document.getElementById('cotizacion-id-pago').value = idCotizacion;
    document.getElementById('metodo-pago').value = 'efectivo';
    openModal('modal-confirmar-pago');
}

async function confirmarPago() {
    const idCotizacion = document.getElementById('cotizacion-id-pago').value;
    const metodoPago = document.getElementById('metodo-pago').value;
    
    closeModal('modal-confirmar-pago');
    
    try {
        const response = await fetchAPIAuth(`/cotizaciones/${idCotizacion}/convertir`, {
            method: 'POST',
            body: {
                metodo_pago: metodoPago
            }
        });
        
        showNotification('Cotización convertida a venta exitosamente', 'success');
        loadCotizaciones();
        loadEstadisticas();
        
    } catch (error) {
        console.error('Error al convertir cotización en venta:', error);
        showNotification('Error al convertir cotización en venta: ' + error.message, 'error');
    }
}

async function eliminarCotizacion(idCotizacion) {
    if (!confirm('¿Está seguro de que desea eliminar esta cotización? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        await fetchAPIAuth(`/cotizaciones/${idCotizacion}`, {
            method: 'DELETE'
        });
        
        showNotification('Cotización eliminada exitosamente', 'success');
        loadCotizaciones();
        loadEstadisticas();
        
    } catch (error) {
        console.error('Error al eliminar cotización:', error);
        showNotification('Error al eliminar cotización: ' + error.message, 'error');
    }
}

async function exportarPDF(idCotizacion) {
    try {
        const { jsPDF } = window.jspdf;
        
        const cotizacion = await fetchAPIAuth(`/cotizaciones/${idCotizacion}`);
        const detalles = await fetchAPIAuth(`/cotizaciones/${idCotizacion}/detalles`);
        
        const doc = new jsPDF();
        
        let yPosition = 20;
        
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text('COTIZACIÓN', 105, yPosition, { align: 'center' });
        
        yPosition += 15;
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`No. ${cotizacion.id_cotizacion}`, 105, yPosition, { align: 'center' });
        
        yPosition += 15;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`Fecha Emisión: ${formatDate(cotizacion.fecha_emision)}`, 20, yPosition);
        doc.text(`Fecha Validez: ${cotizacion.fecha_validez ? formatDate(cotizacion.fecha_validez) : 'Sin vigencia'}`, 140, yPosition);
        
        yPosition += 10;
        doc.text(`Cliente: ${cotizacion.cliente_nombre}`, 20, yPosition);
        doc.text(`Estado: ${cotizacion.estado.toUpperCase()}`, 140, yPosition);
        
        yPosition += 15;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPosition, 190, yPosition);
        
        yPosition += 10;
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text('Detalle de Productos', 20, yPosition);
        
        yPosition += 10;
        
        const headers = ['Producto', 'Código', 'Cantidad', 'Precio Unit.', 'Subtotal'];
        const columnWidths = [70, 30, 20, 30, 30];
        let xPosition = 20;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        headers.forEach((header, index) => {
            doc.text(header, xPosition, yPosition);
            xPosition += columnWidths[index];
        });
        
        yPosition += 5;
        doc.setDrawColor(220, 220, 220);
        doc.line(20, yPosition, 190, yPosition);
        
        yPosition += 8;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        
        detalles.forEach(detalle => {
            xPosition = 20;
            const productName = detalle.producto_nombre.length > 35 ? 
                detalle.producto_nombre.substring(0, 35) + '...' : 
                detalle.producto_nombre;
            
            doc.text(productName, xPosition, yPosition);
            xPosition += columnWidths[0];
            
            doc.text(detalle.producto_codigo || '', xPosition, yPosition);
            xPosition += columnWidths[1];
            
            doc.text(detalle.cantidad.toString(), xPosition, yPosition);
            xPosition += columnWidths[2];
            
            doc.text(formatCurrency(detalle.precio_unitario), xPosition, yPosition);
            xPosition += columnWidths[3];
            
            doc.text(formatCurrency(detalle.subtotal), xPosition, yPosition);
            
            yPosition += 8;
        });
        
        yPosition += 10;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPosition, 190, yPosition);
        
        yPosition += 10;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text('Subtotal:', 140, yPosition);
        doc.text(formatCurrency(cotizacion.subtotal || 0), 190, yPosition, { align: 'right' });
        
        yPosition += 8;
        doc.text('IVA (16%):', 140, yPosition);
        doc.text(formatCurrency(cotizacion.iva || 0), 190, yPosition, { align: 'right' });
        
        yPosition += 8;
        doc.text('Descuento:', 140, yPosition);
        doc.text(formatCurrency(cotizacion.descuento || 0), 190, yPosition, { align: 'right' });
        
        yPosition += 8;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 100, 0);
        doc.text('TOTAL:', 140, yPosition);
        doc.text(formatCurrency(cotizacion.total || 0), 190, yPosition, { align: 'right' });
        
        if (cotizacion.observaciones) {
            yPosition += 15;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text('Observaciones:', 20, yPosition);
            yPosition += 8;
            const observacionesLines = doc.splitTextToSize(cotizacion.observaciones, 170);
            doc.text(observacionesLines, 20, yPosition);
        }
        
        yPosition = 280;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Sistema de Gestión de Ferretería', 105, yPosition, { align: 'center' });
        
        doc.save(`cotizacion_${idCotizacion}.pdf`);
        showNotification('PDF generado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error al generar PDF:', error);
        showNotification('Error al generar PDF: ' + error.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cotizacion-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    }
    
    loadClientes();
    loadProductos();
    loadEstadisticas();
    loadCotizaciones();
    
    const productoSelect = document.getElementById('producto-cotizacion');
    const cantidadInput = document.getElementById('cantidad-cotizacion');
    const descuentoInput = document.getElementById('descuento-cotizacion');
    
    if (productoSelect) {
        productoSelect.addEventListener('change', actualizarPrecioProducto);
    }
    
    if (cantidadInput) {
        cantidadInput.addEventListener('input', actualizarPrecioProducto);
    }
    
    if (descuentoInput) {
        descuentoInput.addEventListener('input', actualizarPrecioProducto);
    }
});
